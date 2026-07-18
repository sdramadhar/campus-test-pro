import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CollegeStatus, Role } from "../../../../generated/phase5-client";
import { PrismaService } from "../../prisma/prisma.service";
import { env } from "../../config/environment";
import {
  AccessTokenPayload,
  AuthenticatedUser,
  CookieRequest,
} from "../auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CookieRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: env().JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Authentication required.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { college: true },
    });
    if (
      !user ||
      !user.isActive ||
      user.role !== payload.role ||
      (user.college &&
        (!user.college.isActive ||
          user.college.status !== CollegeStatus.ACTIVE))
    ) {
      throw new UnauthorizedException("Authentication required.");
    }

    if (
      user.role !== Role.SUPER_ADMIN &&
      user.collegeId !== payload.collegeId
    ) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.user = {
      id: user.id,
      email: user.email,
      studentId: user.studentId,
      name: user.name,
      role: user.role,
      collegeId: user.collegeId,
      collegeName: user.college?.name ?? null,
    } satisfies AuthenticatedUser;

    return true;
  }

  private extractToken(request: CookieRequest): string | null {
    const authorization = request.headers.authorization;
    const headerValue = Array.isArray(authorization)
      ? authorization[0]
      : authorization;
    if (headerValue?.startsWith("Bearer ")) {
      return headerValue.slice("Bearer ".length);
    }

    return request.cookies?.accessToken ?? null;
  }
}
