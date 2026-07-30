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
  assert(source.includes("/question-import-sets"));
  assert(source.includes("Question Bank or Question"));
  assert(source.includes("Imported question banks"));
  assert(source.includes("Select a question bank or question"));
  assert(source.includes("onAddImportSet"));
  assert(source.includes("startsWith(\"import:\")"));
  assert(source.includes("questionImportSets"));
  assert(source.includes("shouldShowIndividualQuestions"));
  assert(source.includes("questionImportSets.length === 0 && questions.length > 0"));
  assert(source.includes("document.addEventListener(\"visibilitychange\""));
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
  assert(source.includes("persistAllSections"));
  assert(source.includes("await persistSection(sectionId)"));
  assert(source.includes("await persistAllSections();"));
  assert(source.includes("questionLabel(question)"));
  assert(source.includes("No active questions or imported question banks found for"));
  assert(source.includes("Returned question count"));
  assert(source.includes("Open Question Bank"));

  console.log("Assessment builder Step 2 tests passed.");
}

main();
