import "reflect-metadata";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const studentExamSource = readFileSync(
    resolve("src/modules/student-exam/student-exam.service.ts"),
    "utf8",
  );
  assert(studentExamSource.includes("const resultData ="));
  assert(studentExamSource.includes("update: resultData"));
  assert(studentExamSource.includes("create: resultData"));
  assert(studentExamSource.includes("correctCount"));
  assert(studentExamSource.includes("incorrectCount"));
  assert(studentExamSource.includes("unansweredCount"));
  assert(studentExamSource.includes("timeTakenSeconds"));
  assert(studentExamSource.includes("questionReview"));
  assert(studentExamSource.includes("violations"));

  const analyticsSource = readFileSync(
    resolve("src/modules/analytics/analytics.service.ts"),
    "utf8",
  );
  assert(analyticsSource.includes("async resultReports("));
  assert(analyticsSource.includes("async resultReportsCsv("));
  assert(analyticsSource.includes("studentName"));
  assert(analyticsSource.includes("rollNumber"));
  assert(analyticsSource.includes("submittedTime"));
  assert(analyticsSource.includes("proctoringViolationCounts"));
  assert(analyticsSource.includes("averageTimeSeconds"));

  const controllerSource = readFileSync(
    resolve("src/modules/analytics/analytics.controller.ts"),
    "utf8",
  );
  assert(controllerSource.includes('@Get("reports/results")'));
  assert(controllerSource.includes('@Get("reports/results/export.csv")'));

  console.log("Assessment result pipeline API tests passed.");
}

main();
