import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  AuditEvent,
  CollegeStatus,
  PasswordResetStatus,
  Prisma,
  Role,
} from "../../../generated/phase5-client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/environment";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = Number(
    process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900,
  );

  private readonly refreshTokenTtlSeconds = Number(
    process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604800,
  );

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  async login(
    identifier: string,
    password: string,
    context: RequestContext,
  ): Promise<AuthResult> {
    await this.enforceLoginRateLimit(identifier, context.ipAddress);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { studentId: { equals: identifier, mode: "insensitive" } },
        ],
      },
      include: { college: true },
    });

    if (!user || !user.passwordHash) {
      await this.audit(AuditEvent.LOGIN_FAILURE, null, null, null, {
        identifier,
        reason: "invalid_credentials",
      });
      throw new UnauthorizedException("Invalid email/student ID or password.");
    }

    if (
      !user.isActive ||
      (user.college &&
        (!user.college.isActive ||
          user.college.status !== CollegeStatus.ACTIVE))
    ) {
      await this.audit(
        AuditEvent.LOGIN_FAILURE,
        user.id,
        user.collegeId,
        user.role,
        {
          reason: "disabled_account",
        },
      );
      throw new ForbiddenException("This account is disabled.");
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      await this.audit(
        AuditEvent.LOGIN_FAILURE,
        user.id,
        user.collegeId,
        user.role,
        {
          reason: "invalid_credentials",
        },
      );
      throw new UnauthorizedException("Invalid email/student ID or password.");
    }

    const authResult = await this.createSession(user, context);
    await this.audit(
      AuditEvent.LOGIN_SUCCESS,
      user.id,
      user.collegeId,
      user.role,
      {
        ipAddress: context.ipAddress,
      },
    );

    return authResult;
  }

  async refresh(
    refreshToken: string | undefined,
    context: RequestContext,
  ): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token required.");
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { college: true } } },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      !storedToken.user.isActive ||
      (storedToken.user.college &&
        (!storedToken.user.college.isActive ||
          storedToken.user.college.status !== CollegeStatus.ACTIVE))
    ) {
      throw new UnauthorizedException("Refresh token invalid.");
    }

    const nextSession = await this.createSession(storedToken.user, context);
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedById: await this.findRefreshTokenId(nextSession.refreshToken),
      },
    });

    await this.audit(
      AuditEvent.REFRESH,
      storedToken.user.id,
      storedToken.user.collegeId,
      storedToken.user.role,
      { ipAddress: context.ipAddress },
    );

    return nextSession;
  }

  async logout(
    refreshToken: string | undefined,
    user: AuthenticatedUser | null,
  ): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit(
      AuditEvent.LOGOUT,
      user?.id ?? null,
      user?.collegeId ?? null,
      user?.role ?? null,
      {
        reason: refreshToken ? "token_revoked" : "no_refresh_cookie",
      },
    );
  }

  async profile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { college: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication required.");
    }

    return this.toProfile(user);
  }

  async requestPasswordReset(
    identifier: string,
    context: RequestContext,
  ): Promise<void> {
    await this.enforcePasswordResetRateLimit(identifier, context.ipAddress);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { studentId: { equals: identifier, mode: "insensitive" } },
        ],
      },
      include: { college: true },
    });

    if (
      !user ||
      !user.isActive ||
      (user.college &&
        (!user.college.isActive ||
          user.college.status !== CollegeStatus.ACTIVE))
    ) {
      await this.audit(
        AuditEvent.PASSWORD_RESET_REQUEST,
        user?.id ?? null,
        user?.collegeId ?? null,
        user?.role ?? null,
        {
          accepted: false,
        },
      );
      return;
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, status: PasswordResetStatus.ACTIVE },
      data: { status: PasswordResetStatus.REVOKED },
    });

    const token = randomBytes(48).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    const frontendUrl =
      env().FRONTEND_URL || env().WEB_ORIGIN || "http://localhost:3000";
    await this.email.queue({
      userId: user.id,
      toEmail: user.email,
      template: "password-reset",
      subject: "Reset your CampusTest Pro password",
      metadata: {
        resetUrl: `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
        expiresMinutes: 30,
      },
    });
    await this.audit(
      AuditEvent.PASSWORD_RESET_REQUEST,
      user.id,
      user.collegeId,
      user.role,
      {
        accepted: true,
      },
    );
  }

  async resetPassword(
    token: string,
    password: string,
    context: RequestContext,
  ): Promise<void> {
    await this.enforcePasswordResetRateLimit("token", context.ipAddress);
    const tokenHash = this.hashToken(token);
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { college: true } } },
    });
    if (
      !reset ||
      reset.status !== PasswordResetStatus.ACTIVE ||
      reset.expiresAt <= new Date() ||
      !reset.user.isActive ||
      (reset.user.college &&
        (!reset.user.college.isActive ||
          reset.user.college.status !== CollegeStatus.ACTIVE))
    ) {
      throw new UnauthorizedException(
        "Password reset token is invalid or expired.",
      );
    }

    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.passwordResetToken.update({
        where: { id: reset.id },
        data: { status: PasswordResetStatus.USED, usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          event: AuditEvent.PASSWORD_RESET_COMPLETE,
          userId: reset.userId,
          collegeId: reset.user.collegeId,
          actorRole: reset.user.role,
          metadata: { ipAddress: context.ipAddress },
        },
      });
    });
  }

  private async createSession(
    user: Prisma.UserGetPayload<{ include: { college: true } }>,
    context: RequestContext,
  ): Promise<AuthResult> {
    const profile = this.toProfile(user);
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      collegeId: user.collegeId,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env().JWT_ACCESS_SECRET,
      expiresIn: this.accessTokenTtlSeconds,
    });
    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    });

    return { accessToken, refreshToken, user: profile };
  }

  private async findRefreshTokenId(
    refreshToken: string,
  ): Promise<string | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      select: { id: true },
    });

    return token?.id ?? null;
  }

  private toProfile(
    user: Prisma.UserGetPayload<{ include: { college: true } }>,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      studentId: user.studentId,
      name: user.name,
      role: user.role,
      collegeId: user.collegeId,
      collegeName: user.college?.name ?? null,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async enforceLoginRateLimit(
    identifier: string,
    ipAddress: string | null,
  ): Promise<void> {
    const normalized = identifier.trim().toLowerCase();
    const key = `login-rate:${ipAddress ?? "unknown"}:${normalized}`;
    const attempts = await this.redis.client.incr(key);
    if (attempts === 1) {
      await this.redis.client.expire(key, 15 * 60);
    }

    if (attempts > 10) {
      throw new HttpException(
        "Too many login attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async enforcePasswordResetRateLimit(
    identifier: string,
    ipAddress: string | null,
  ): Promise<void> {
    const normalized = identifier.trim().toLowerCase();
    const key = `password-reset-rate:${ipAddress ?? "unknown"}:${normalized}`;
    const attempts = await this.redis.client.incr(key);
    if (attempts === 1) {
      await this.redis.client.expire(key, 60 * 60);
    }
    if (attempts > 5) {
      throw new HttpException(
        "Too many password reset attempts. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async audit(
    event: AuditEvent,
    userId: string | null,
    collegeId: string | null,
    actorRole: Role | null,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        event,
        userId,
        collegeId,
        actorRole,
        metadata,
      },
    });
  }
}
