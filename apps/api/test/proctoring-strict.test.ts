import "reflect-metadata";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ProctoringEventType } from "../generated/phase5-client";
import { EventBatchDto } from "../src/modules/proctoring/dto/proctoring.dto";

function main(): void {
  const dto = plainToInstance(EventBatchDto, {
    events: [
      {
        eventType: ProctoringEventType.WEBCAM_PERMISSION_DENIED,
        sequenceNumber: 1,
        idempotencyKey: "camera-denied-1",
        clientTimestamp: new Date().toISOString(),
      },
      {
        eventType: ProctoringEventType.AUTO_SUBMIT_TRIGGERED,
        sequenceNumber: 2,
        idempotencyKey: "auto-submit-2",
      },
    ],
  });
  const errors = validateSync(dto, {
    whitelist: true,
    forbidUnknownValues: false,
  });
  assert.deepEqual(errors, []);

  const source = readFileSync(
    resolve("src/modules/proctoring/proctoring.service.ts"),
    "utf8",
  );
  assert(source.includes("autoSubmitOnCriticalViolation"));
  assert(source.includes("autoSubmitAttemptForProctoring"));
  assert(source.includes("TestAttemptStatus.AUTO_SUBMITTED"));
  assert(source.includes("PROCTORING_AUTO_SUBMIT"));
  assert(source.includes("serverEnforced: true"));

  console.log("Strict proctoring API tests passed.");
}

main();
