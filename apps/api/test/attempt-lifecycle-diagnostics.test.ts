import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const serviceSource = readFileSync(
    resolve("src/modules/student-exam/student-exam.service.ts"),
    "utf8",
  );
  const dtoSource = readFileSync(
    resolve("src/modules/student-exam/dto/student-exam.dto.ts"),
    "utf8",
  );

  for (const field of [
    "assessmentId",
    "attemptId",
    "durationMinutes",
    "startTime",
    "endTime",
    "remainingTime",
    "questionCount",
    "submitReason",
  ]) {
    assert(
      serviceSource.includes(field),
      `student attempt lifecycle logs include ${field}`,
    );
  }

  assert(serviceSource.includes("attempt_started"));
  assert(serviceSource.includes("attempt_time_checked"));
  assert(serviceSource.includes("attempt_submit_requested"));
  assert(serviceSource.includes("attempt_auto_submit_requested"));
  assert(serviceSource.includes("remainingSeconds(expiresAt"));
  assert(dtoSource.includes("reason?: string"));

  console.log("Attempt lifecycle diagnostics tests passed.");
}

main();
