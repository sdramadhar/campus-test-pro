import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createProctoringEvent,
  eventSeverity,
  isForbiddenExamShortcut,
  resolveRuntimePolicy,
  strictModeRequired,
} from "../app/lib/strict-proctoring";

function main(): void {
  const policy = resolveRuntimePolicy(
    { proctoringEnabled: true, cameraRequired: true, fullscreenRequired: true },
    false,
  );
  assert.equal(strictModeRequired(policy), true);
  assert.equal(policy.cameraRequired, true);
  assert.equal(policy.fullscreenRequired, true);
  assert.equal(policy.autoSubmitOnCriticalViolation, true);

  const inactive = resolveRuntimePolicy(null, false);
  assert.equal(strictModeRequired(inactive), false);
  assert.equal(inactive.cameraRequired, false);

  assert.equal(
    isForbiddenExamShortcut({
      key: "c",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    true,
  );
  assert.equal(
    isForbiddenExamShortcut({
      key: "b",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    false,
  );

  const payload = createProctoringEvent("FULLSCREEN_EXIT", 7);
  assert.equal(payload.eventType, "FULLSCREEN_EXIT");
  assert.equal(payload.sequenceNumber, 7);
  assert(payload.idempotencyKey.includes("fullscreen_exit"));
  assert.equal(eventSeverity("WEBCAM_PERMISSION_DENIED"), "critical");
  assert.equal(eventSeverity("COPY"), "warning");

  const attemptSource = readFileSync(
    resolve("app/student/attempts/[attemptId]/page.tsx"),
    "utf8",
  );
  const helperSource = readFileSync(
    resolve("app/lib/strict-proctoring.ts"),
    "utf8",
  );
  assert(attemptSource.includes("navigator.mediaDevices.getUserMedia"));
  assert(attemptSource.includes("requestFullscreen"));
  assert(helperSource.includes("proctoring/events/batch"));
  assert(helperSource.includes("proctoring/heartbeat"));
  assert(helperSource.includes("proctoring/evidence"));
  assert(attemptSource.includes("Start Camera Check"));
  assert(attemptSource.includes("AUTO_SUBMIT_TRIGGERED"));

  console.log("Strict proctoring web tests passed.");
}

main();
