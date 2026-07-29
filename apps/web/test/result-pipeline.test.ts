import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const reportsSource = readFileSync(
    resolve("app/components/result-reports-panel.tsx"),
    "utf8",
  );
  assert(reportsSource.includes("/api/v1/reports/results"));
  assert(reportsSource.includes("/api/v1/reports/results/export.csv"));
  assert(reportsSource.includes("studentName"));
  assert(reportsSource.includes("rollNumber"));
  assert(reportsSource.includes("submittedTime"));
  assert(reportsSource.includes("violations"));
  assert(reportsSource.includes("authenticatedFetch"));

  const adminPageSource = readFileSync(
    resolve("app/admin/reports/page.tsx"),
    "utf8",
  );
  assert(adminPageSource.includes("ResultReportsPanel"));

  const assessmentPageSource = readFileSync(
    resolve("app/assessments/[id]/results/page.tsx"),
    "utf8",
  );
  assert(assessmentPageSource.includes("assessmentId={id}"));

  const studentResultSource = readFileSync(
    resolve("app/student/results/[resultId]/page.tsx"),
    "utf8",
  );
  assert(studentResultSource.includes("Time Taken"));
  assert(studentResultSource.includes("Violations"));
  assert(studentResultSource.includes("Question Review"));

  console.log("Assessment result pipeline web tests passed.");
}

main();
