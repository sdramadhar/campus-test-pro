import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const dtoSource = readFileSync(
    resolve("src/modules/ai-workflows/dto/ai-workflows.dto.ts"),
    "utf8",
  );
  const serviceSource = readFileSync(
    resolve("src/modules/ai-workflows/ai-workflows.service.ts"),
    "utf8",
  );

  assert(dtoSource.includes("idempotencyKey?: string"));
  assert(serviceSource.includes("const idempotencyKey = this.optional(dto.idempotencyKey)"));
  assert(serviceSource.includes("promptVariables"));
  assert(serviceSource.includes('path: ["idempotencyKey"]'));
  assert(serviceSource.includes("equals: idempotencyKey"));
  assert(serviceSource.includes("return { success: true, data: await this.getJobData(user, existingJob.id) }"));

  console.log("AI generation idempotency tests passed.");
}

main();
