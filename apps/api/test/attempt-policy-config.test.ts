import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
  const service = readFileSync(
    resolve("src/modules/student-exam/student-exam.service.ts"),
    "utf8",
  );
  const questionBankService = readFileSync(
    resolve("src/modules/question-bank/question-bank.service.ts"),
    "utf8",
  );
  const questionBankDto = readFileSync(
    resolve("src/modules/question-bank/dto/question-bank.dto.ts"),
    "utf8",
  );

  assert(schema.includes("enum AttemptScoringPolicy"));
  assert(schema.includes("maxAttempts            Int                           @default(3)"));
  assert(schema.includes("attemptScoringPolicy   AttemptScoringPolicy          @default(BEST)"));
  assert(schema.includes("model AssessmentAttemptGrant"));
  assert(questionBankService.includes("maxAttempts: dto.maxAttempts ?? 3"));
  assert(questionBankService.includes('attemptScoringPolicy: dto.attemptScoringPolicy ?? "BEST"'));
  assert(questionBankDto.includes("@Max(10)"));
  assert(service.includes("countedAttemptStatuses"));
  assert(service.includes("Maximum attempt limit reached."));
  assert(service.includes("TransactionIsolationLevel.Serializable"));
  assert(service.includes("validateStartProctoringReadiness"));
  assert(service.includes("Camera permission is required before starting."));
  assert(service.includes("Fullscreen mode is required before starting."));
  assert(service.includes("resetStudentAttempts"));
  assert(service.includes("grantStudentAttempt"));
  assert(service.includes("selectFinalResult"));
  assert(schema.includes("BEST"));
  assert(service.includes("AttemptScoringPolicy.LATEST"));
  assert(service.includes("AttemptScoringPolicy.FIRST"));

  console.log("Attempt policy configuration tests passed.");
}

main();
