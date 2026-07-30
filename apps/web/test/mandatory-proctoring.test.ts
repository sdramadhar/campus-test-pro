import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const instructions = readFileSync(
    resolve("app/student/tests/[assessmentId]/instructions/page.tsx"),
    "utf8",
  );
  const attemptPage = readFileSync(
    resolve("app/student/attempts/[attemptId]/page.tsx"),
    "utf8",
  );
  const testsPage = readFileSync(resolve("app/student/tests/page.tsx"), "utf8");
  const proctoring = readFileSync(
    resolve("app/lib/strict-proctoring.ts"),
    "utf8",
  );

  assert(instructions.includes("mediaDevices.getUserMedia"));
  assert(instructions.includes("video: true"));
  assert(instructions.includes("audio: false"));
  assert(instructions.includes("requestFullscreen"));
  assert(instructions.includes("No active camera video track was detected."));
  assert(instructions.includes("cameraReady"));
  assert(instructions.includes("fullscreenReady"));
  assert(instructions.includes("cameraReady,"));
  assert(instructions.includes("fullscreenReady,"));
  assert(attemptPage.includes('"CAMERA_DISABLED"'));
  assert(attemptPage.includes('"PAGE_RELOAD_ATTEMPT"'));
  assert(attemptPage.includes("remaining === null"));
  assert(testsPage.includes("Attempts Used"));
  assert(testsPage.includes("Retry Test"));
  assert(testsPage.includes("Start Attempt"));
  assert(proctoring.includes('| "CAMERA_DISABLED"'));
  assert(proctoring.includes('| "PAGE_RELOAD_ATTEMPT"'));
  assert(proctoring.includes("flagThreshold"));

  console.log("Mandatory proctoring web tests passed.");
}

main();
