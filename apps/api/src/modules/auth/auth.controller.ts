import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/environment";
import { AuthService } from "./auth.service";
import { AuthenticatedUser } from "./auth.types";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Roles } from "./decorators/roles.decorator";
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  UserProfileDto,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./dto/auth.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

interface AuthResponseBody {
  accessToken: string;
  user: UserProfileDto;
}

interface AuthHttpRequest extends Request {
  cookies: Record<string, string | undefined>;
}

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: "Authenticated session." })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseBody> {
    const parsed = this.parseLogin(dto);
    const result = await this.authService.login(
      parsed.identifier,
      parsed.password,
      {
        ipAddress: request.ip ?? null,
        userAgent: request.get("user-agent") ?? null,
      },
    );

    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("forgot-password")
  @HttpCode(200)
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: "Password reset request accepted when eligible.",
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<{ success: true; message: string }> {
    const parsed = forgotPasswordSchema.parse(dto);
    await this.authService.requestPasswordReset(parsed.identifier, {
      ipAddress: request.ip ?? null,
      userAgent: request.get("user-agent") ?? null,
    });
    return {
      success: true,
      message:
        "If the account can reset its password, reset instructions have been sent.",
    };
  }

  @Post("reset-password")
  @HttpCode(200)
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: "Password reset completed." })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<{ success: true }> {
    const parsed = resetPasswordSchema.parse(dto);
    await this.authService.resetPassword(parsed.token, parsed.password, {
      ipAddress: request.ip ?? null,
      userAgent: request.get("user-agent") ?? null,
    });
    return { success: true };
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOkResponse({ description: "Rotated refresh token and new access token." })
  async refresh(
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseBody> {
    const result = await this.authService.refresh(
      request.cookies.refreshToken,
      {
        ipAddress: request.ip ?? null,
        userAgent: request.get("user-agent") ?? null,
      },
    );

    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: "Session logged out." })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(request.cookies.refreshToken, user);
    this.clearAuthCookies(response);

    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserProfileDto })
  async me(@CurrentUser() user: UserProfileDto): Promise<UserProfileDto> {
    return this.authService.profile(user.id);
  }

  @Get("college-admin-check")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COLLEGE_ADMIN)
  @ApiOkResponse({ description: "Role guard verification route." })
  collegeAdminCheck(): { allowed: true } {
    return { allowed: true };
  }

  private parseLogin(dto: LoginDto): z.infer<typeof loginSchema> {
    const parsed = loginSchema.safeParse(dto);
    if (!parsed.success) {
      throw new UnauthorizedException("Invalid email/student ID or password.");
    }

    return parsed.data;
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const current = env();
    const secure = current.COOKIE_SECURE;
    const domain = current.COOKIE_DOMAIN || undefined;
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: current.ACCESS_TOKEN_TTL_SECONDS * 1000,
      path: "/",
      domain,
    });
    response.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: current.REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: "/api/v1/auth",
      domain,
    });
  }

  private clearAuthCookies(response: Response): void {
    const domain = env().COOKIE_DOMAIN || undefined;
    response.clearCookie("accessToken", { path: "/", domain });
    response.clearCookie("refreshToken", { path: "/api/v1/auth", domain });
  }
}
