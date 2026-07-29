import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const panelSource = readFileSync(
    resolve("app/components/ai-generate-panel.tsx"),
    "utf8",
  );

  assert(panelSource.includes("configurationMessage"));
  assert(panelSource.includes("status?.configurationMessage"));
  assert(!panelSource.includes('"AI features are disabled."'));
  assert(panelSource.includes("idempotencyKey: createGenerationIdempotencyKey()"));
  assert(panelSource.includes('setMessage("Generation job queued.")'));

  const reviewSource = readFileSync(
    resolve("app/components/ai-review-panel.tsx"),
    "utf8",
  );
  assert(reviewSource.includes('failedJob = job?.status === "FAILED" ? job : null'));
  assert(reviewSource.includes("AI generation failed."));
  assert(reviewSource.includes("failedJob.errorCode"));
  assert(reviewSource.includes("failedJob.failedAt"));

  console.log("AI generate panel configuration tests passed.");
}

main();
