import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { questionPayload, QuestionFormValues } from "../app/lib/question-bank";

function main(): void {
  const values: QuestionFormValues = {
    subjectId: "python-subject",
    topic: "Python",
    title: "CODATHON",
    questionText: "Solve the Python challenge.",
    questionType: "SINGLE_CHOICE",
    difficulty: "MEDIUM",
    defaultMarks: 2,
    defaultNegativeMarks: 0.5,
    explanation: "Use Python.",
    status: "ACTIVE",
    tagsText: "python",
    options: [
      {
        optionKey: "A",
        optionText: "Correct",
        displayOrder: 1,
        isCorrect: true,
      },
      {
        optionKey: "B",
        optionText: "Wrong",
        displayOrder: 2,
        isCorrect: false,
      },
    ],
    testCases: [],
  };
  const payload = questionPayload(values);

  assert.equal(payload.title, "CODATHON");
  assert.equal(payload.questionText, "Solve the Python challenge.");
  assert.equal(payload.subjectId, "python-subject");
  assert.equal(payload.difficulty, "MEDIUM");
  assert.equal(payload.type, "SINGLE_CHOICE");
  assert.equal(payload.marks, 2);
  assert.equal(payload.negativeMarks, 0.5);
  assert.equal(payload.explanation, "Use Python.");
  assert.deepEqual(payload.tags, ["python"]);
  assert.equal(payload.status, "ACTIVE");
  assert.equal(
    (payload.options as Array<{ isCorrect?: boolean }>).filter(
      (option) => option.isCorrect,
    ).length,
    1,
  );

  const formSource = readFileSync(resolve("app/components/question-form.tsx"), "utf8");
  const listSource = readFileSync(resolve("app/components/question-list.tsx"), "utf8");
  assert(formSource.includes("campustest-question-toast"));
  assert(listSource.includes("campustest-question-toast"));

  console.log("Question create web tests passed.");
}

main();
