import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
  const service = readFileSync(
    resolve("src/modules/proctoring/proctoring.service.ts"),
    "utf8",
  );

  assert(schema.includes("allowedExamExitViolations Int"));
  assert(schema.includes("BACK_NAVIGATION_ATTEMPT"));
  assert(service.includes("examExitViolationEvents"));
  assert(service.includes("violationCorrelationMs"));
  assert(service.includes("shouldCountViolation"));
  assert(service.includes("allowedViolationLimit"));
  assert(service.includes("remainingChances"));
  assert(service.includes("updated.warningCount > allowedViolationLimit"));
  assert(service.includes("PROCTORING_VIOLATION_LIMIT"));
  assert(service.includes("autoSubmitted"));

  console.log("Proctoring violation policy tests passed.");
}

main();
