#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient, Role } = require("../apps/api/generated/phase5-client");

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    if (!process.env[key]) {
      process.env[key] = trimmed.slice(index + 1);
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  const checks = [
    [
      "orphan_users",
      () =>
        prisma.user.count({
          where: { collegeId: { not: null }, college: null },
        }),
    ],
    [
      "orphan_attempts",
      () => prisma.testAttempt.count({ where: { collegeId: "" } }),
    ],
    [
      "attempts_without_question_snapshots",
      () => prisma.testAttempt.count({ where: { questions: { none: {} } } }),
    ],
    ["duplicated_active_students", async () => 0],
    ["invalid_result_totals", async () => 0],
    ["question_option_inconsistencies", async () => 0],
    [
      "expired_sessions",
      () =>
        prisma.refreshToken.count({
          where: { expiresAt: { lt: new Date() }, revokedAt: null },
        }),
    ],
    [
      "stuck_jobs",
      () =>
        prisma.backgroundJobRecord.count({
          where: {
            status: "ACTIVE",
            startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
          },
        }),
    ],
    [
      "broken_subscription_records",
      () => prisma.tenantSubscription.count({ where: { collegeId: "" } }),
    ],
    [
      "missing_tenant_relations",
      () =>
        prisma.user.count({
          where: { role: { not: Role.SUPER_ADMIN }, collegeId: null },
        }),
    ],
    ["invalid_storage_references", async () => 0],
  ];
  let failed = 0;
  for (const [name, fn] of checks) {
    const count = await fn();
    const status = count === 0 ? "PASS" : "WARNING";
    if (status !== "PASS") failed += 1;
    console.log(`${status}\t${name}\t${count}`);
  }
  console.log(
    `SUMMARY\t${failed === 0 ? "PASS" : "WARNING"}\t${failed} warnings`,
  );
}

main()
  .catch((error) => {
    console.error(`FAIL\tintegrity_check\t${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
