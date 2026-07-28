import { CookieOptions } from "express";
import { AppEnvironment, env } from "../config/environment";

type AuthCookieEnvironment = Pick<
  AppEnvironment,
  | "ACCESS_TOKEN_TTL_SECONDS"
  | "APP_ENV"
  | "COOKIE_DOMAIN"
  | "COOKIE_SECURE"
  | "NODE_ENV"
  | "REFRESH_TOKEN_TTL_SECONDS"
>;

export function authCookieOptions(
  current: AuthCookieEnvironment = env(),
): {
  accessToken: CookieOptions;
  refreshToken: CookieOptions;
  clearAccessToken: CookieOptions;
  clearRefreshToken: CookieOptions;
} {
  const production =
    current.NODE_ENV === "production" || current.APP_ENV === "production";
  const domain = current.COOKIE_DOMAIN || undefined;
  const sameSite = production ? "none" : "lax";
  const secure = production ? true : current.COOKIE_SECURE;

  return {
    accessToken: {
      httpOnly: true,
      sameSite,
      secure,
      maxAge: current.ACCESS_TOKEN_TTL_SECONDS * 1000,
      path: "/",
      domain,
    },
    refreshToken: {
      httpOnly: true,
      sameSite,
      secure,
      maxAge: current.REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: "/api/v1/auth",
      domain,
    },
    clearAccessToken: {
      sameSite,
      secure,
      path: "/",
      domain,
    },
    clearRefreshToken: {
      sameSite,
      secure,
      path: "/api/v1/auth",
      domain,
    },
  };
}
