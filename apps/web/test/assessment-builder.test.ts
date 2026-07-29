import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function main(): void {
  const source = readFileSync(
    resolve("app/components/assessment-builder.tsx"),
    "utf8",
  );

  assert(source.includes("SectionEditor"));
  assert(source.includes("expandedSectionId"));
  assert(source.includes("selectedSubjectId"));
  assert(source.includes("/question-options"));
  assert(source.includes('query.set("subjectId", selectedSubjectId)'));
  assert(source.includes("attachedQuestionCount"));
  assert(source.includes("Section Name"));
  assert(source.includes("Description"));
  assert(source.includes("Marks"));
  assert(source.includes("Question Order"));
  assert(source.includes("Add Question"));
  assert(source.includes("Continue to Step 3"));
  assert(source.includes("sectionId"));
  assert(source.includes("Save Section"));
  assert(source.includes("questionLabel(question)"));
  assert(source.includes("No active questions found for"));
  assert(source.includes("Returned question count"));
  assert(source.includes("Open Question Bank"));

  console.log("Assessment builder Step 2 tests passed.");
}

main();
