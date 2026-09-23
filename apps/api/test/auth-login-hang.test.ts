import assert from "node:assert/strict";
import { HttpException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../src/modules/auth/auth.service";

async function main(): Promise<void> {
  process.env.AUTH_RATE_LIMIT_TIMEOUT_MS = "5";
  process.env.AUTH_DEPENDENCY_TIMEOUT_MS = "100";
  process.env.AUTH_AUDIT_TIMEOUT_MS = "50";

  const prisma = {
    user: {
      findFirst: async () => null,
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
  };
  const redis = {
    client: {
      incr: () => new Promise<number>(() => undefined),
      expire: async () => 1,
    },
  };

  const service = new AuthService(
    prisma as never,
    redis as never,
    {} as never,
    {} as never,
  );

  const started = Date.now();
  await assert.rejects(
    service.login("student@demo-college.local", "Student@12345", {
      ipAddress: "127.0.0.1",
      userAgent: "auth-login-hang-test",
    }),
    UnauthorizedException,
  );
  const elapsed = Date.now() - started;
  assert(
    elapsed < 1000,
    `Login should not hang when Redis rate limiting is unavailable. Took ${elapsed.toString()}ms.`,
  );

  for (let attempt = 2; attempt <= 10; attempt += 1) {
    await assert.rejects(
      service.login("student@demo-college.local", "Student@12345", {
        ipAddress: "127.0.0.1",
        userAgent: "auth-login-hang-test",
      }),
      UnauthorizedException,
    );
  }
  await assert.rejects(
    service.login("student@demo-college.local", "Student@12345", {
      ipAddress: "127.0.0.1",
      userAgent: "auth-login-hang-test",
    }),
    (error) => error instanceof HttpException && error.getStatus() === 429,
  );

  console.log("Auth login hang regression test passed.");
}

void main();
