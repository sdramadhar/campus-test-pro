import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const schema = readFileSync(resolve("prisma/schema.prisma"), "utf8");
  const service = readFileSync(
    resolve("src/modules/question-bank/question-bank.service.ts"),
    "utf8",
  );
  const controller = readFileSync(
    resolve("src/modules/question-bank/question-bank.controller.ts"),
    "utf8",
  );
  const dto = readFileSync(
    resolve("src/modules/question-bank/dto/question-bank.dto.ts"),
    "utf8",
  );

  assert(schema.includes("importJobId"));
  assert(schema.includes("questionImportJobs QuestionImportJob[]"));
  assert(schema.includes("questions"));
  assert(schema.includes("Question[]"));
  assert(schema.includes("@@index([importJobId])"));
  assert(schema.includes("@@index([subjectId])"));

  assert(dto.includes("fileName?: string"));
  assert(dto.includes("AssessmentImportSetDto"));
  assert(controller.includes(":id/question-import-sets"));
  assert(controller.includes(":id/question-import-sets/:jobId/questions"));

  assert(service.includes("assessmentQuestionImportSets"));
  assert(service.includes("addAssessmentImportSetQuestions"));
  assert(service.includes("status: { in: [\"COMPLETED\", \"COMPLETED_WITH_ERRORS\"] }"));
  assert(service.includes("status: QuestionStatus.ACTIVE"));
  assert(service.includes("skipDuplicates: true"));
  assert(service.includes("legacy-imported-"));
  assert(service.includes("importJobId: job.id"));
  assert(service.includes("fileName: this.optional(dto.fileName)"));

  console.log("Question import set assessment tests passed.");
}

main();
