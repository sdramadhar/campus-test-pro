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
  assert.equal(policy.allowedExamExitViolations, 2);
  assert.equal(policy.violationLimit, 3);

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
  assert.equal(eventSeverity("BACK_NAVIGATION_ATTEMPT"), "warning");

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
  assert(attemptSource.includes("examMode"));
  assert(!attemptSource.includes("<aside className=\"sidebar\""));
  assert(attemptSource.includes("exam-warning-overlay"));
  assert(attemptSource.includes("Fullscreen exited. Return to fullscreen to continue the exam."));
  assert(attemptSource.includes("Final Warning"));
  assert(attemptSource.includes("Return to Fullscreen"));
  assert(attemptSource.includes("/audio/exam-alert.wav"));
  assert(attemptSource.includes("new Audio(\"/audio/exam-alert.wav\")"));
  assert(attemptSource.includes("audio.preload = \"auto\""));
  assert(attemptSource.includes("audio.volume = 1.0"));
  assert(attemptSource.includes("audio.currentTime = 0"));
  assert(attemptSource.includes("await audio.play()"));
  assert(attemptSource.includes("pendingAlarmReplayRef"));
  assert(attemptSource.includes("unlockWarningAudio"));
  assert(attemptSource.includes("Exam warning sound played"));
  assert(attemptSource.includes('"BACK_NAVIGATION_ATTEMPT"'));
  assert(attemptSource.includes("Object.defineProperty(event, \"returnValue\""));
  assert(attemptSource.includes("serverAutoSubmitted"));
  assert(attemptSource.includes("Exam automatically submitted"));
  assert(attemptSource.includes("stopCameraStream"));
  assert(!attemptSource.includes("lastEventRef"));
  assert(helperSource.includes("proctoring/events/batch"));
  assert(helperSource.includes("proctoring/heartbeat"));
  assert(helperSource.includes("proctoring/evidence"));
  assert(helperSource.includes("allowedExamExitViolations"));
  assert(attemptSource.includes("Start Camera Check"));
  assert(helperSource.includes("AUTO_SUBMIT_TRIGGERED"));

  console.log("Strict proctoring web tests passed.");
}

main();
