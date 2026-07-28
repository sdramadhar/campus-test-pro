import assert from "node:assert/strict";
import { authCookieOptions } from "../src/modules/auth/auth-cookies";

const baseEnv = {
  ACCESS_TOKEN_TTL_SECONDS: 900,
  APP_ENV: "local",
  COOKIE_DOMAIN: undefined,
  COOKIE_SECURE: false,
  NODE_ENV: "development",
  REFRESH_TOKEN_TTL_SECONDS: 604800,
} as const;

const production = authCookieOptions({
  ...baseEnv,
  APP_ENV: "production",
  NODE_ENV: "production",
});

for (const cookie of [production.accessToken, production.refreshToken]) {
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, "none");
}

const development = authCookieOptions(baseEnv);
assert.equal(development.accessToken.sameSite, "lax");
assert.equal(development.accessToken.secure, false);

console.log("Auth cookie option tests passed.");
