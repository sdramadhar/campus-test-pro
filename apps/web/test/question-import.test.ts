import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  parseQuestionImportCsv,
  parseQuestionImportTable,
  parseQuestionImportWorkbook,
  questionImportColumns,
  questionImportTemplateCsv,
} from "../app/lib/question-import";

const subjectId = "python-subject";

function csvFor(rows: string[][]): string {
  return [
    questionImportColumns.join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

function validRow(index = 1): string[] {
  return [
    "Python",
    `Python question ${String(index)}`,
    `What does Python expression ${String(index)} evaluate to?`,
    "SINGLE_CHOICE",
    "MEDIUM",
    "1",
    "0",
    "A",
    "B",
    "C",
    "D",
    "A",
    "Because A is correct.",
    "python,basics",
  ];
}

function workbookBuffer(rows: string[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...questionImportColumns], ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Questions");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function main(): void {
  const validCsv = parseQuestionImportCsv(csvFor([validRow()]), subjectId);
  assert.equal(validCsv.validRows, 1);
  const importedQuestion = validCsv.payload.rows[0];
  assert(importedQuestion);
  assert.equal(importedQuestion.subjectId, subjectId);
  assert.equal(importedQuestion.status, "ACTIVE");
  assert.equal(importedQuestion.metadata.explanation, "Because A is correct.");
  assert.deepEqual(importedQuestion.tags, ["python", "basics"]);

  const mappedOptions = importedQuestion.options;
  assert.equal(mappedOptions.length, 4);
  assert.equal(mappedOptions.filter((option) => option.isCorrect).length, 1);
  assert.equal(mappedOptions.find((option) => option.isCorrect)?.optionKey, "A");

  const validXlsx = parseQuestionImportWorkbook(workbookBuffer([validRow(2)]), subjectId);
  assert.equal(validXlsx.validRows, 1);
  assert.equal(validXlsx.payload.rows[0]?.title, "Python question 2");

  const invalid = parseQuestionImportCsv(
    csvFor([[...validRow(3).slice(0, 2), "", ...validRow(3).slice(3, 11), "Z", ...validRow(3).slice(12)]]),
    subjectId,
  );
  assert.equal(invalid.validRows, 0);
  assert(invalid.errors.some((error) => error.field === "questionText"));
  assert(invalid.errors.some((error) => error.field === "correctOption"));

  const duplicate = parseQuestionImportCsv(
    csvFor([validRow(4), validRow(4)]),
    subjectId,
  );
  assert.equal(duplicate.validRows, 1);
  assert.equal(duplicate.duplicateRows, 1);

  const existingDuplicate = parseQuestionImportCsv(
    csvFor([validRow(5)]),
    subjectId,
    ["What does Python expression 5 evaluate to?"],
  );
  assert.equal(existingDuplicate.validRows, 0);
  assert.equal(existingDuplicate.duplicateRows, 1);

  const wrongSubject = parseQuestionImportCsv(csvFor([validRow(6)]), "");
  assert.equal(wrongSubject.validRows, 0);
  assert(wrongSubject.errors.some((error) => error.field === "subject"));

  const fifty = parseQuestionImportCsv(
    csvFor(Array.from({ length: 50 }, (_value, index) => validRow(index + 10))),
    subjectId,
  );
  assert.equal(fifty.validRows, 50);

  const fiveHundred = parseQuestionImportTable(
    [
      [...questionImportColumns],
      ...Array.from({ length: 500 }, (_value, index) => validRow(index + 100)),
    ],
    subjectId,
  );
  assert.equal(fiveHundred.validRows, 500);

  const template = questionImportTemplateCsv();
  for (const column of questionImportColumns) {
    assert(template.includes(column));
  }

  console.log("Question import parser tests passed.");
}

main();

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
