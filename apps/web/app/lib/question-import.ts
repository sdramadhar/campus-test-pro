import * as XLSX from "xlsx";

export const questionImportColumns = [
  "topic",
  "title",
  "questionText",
  "questionType",
  "difficulty",
  "defaultMarks",
  "defaultNegativeMarks",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "explanation",
  "tags",
] as const;

export type QuestionImportColumn = (typeof questionImportColumns)[number];

export interface QuestionImportOption {
  optionKey: string;
  optionText: string;
  displayOrder: number;
  isCorrect: boolean;
}

export interface QuestionImportRowPayload {
  subjectId: string;
  topic: string;
  title: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  defaultMarks: number;
  defaultNegativeMarks: number;
  explanation?: string;
  status: "ACTIVE";
  options: QuestionImportOption[];
  tags: string[];
  metadata: { explanation?: string; importedFrom: "question-import" };
}

export interface QuestionImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface QuestionImportPreviewRow {
  row: number;
  title: string;
  questionText: string;
  topic: string;
  difficulty: string;
  duplicate: boolean;
  errors: QuestionImportValidationError[];
  payload?: QuestionImportRowPayload;
}

export interface QuestionImportParseResult {
  rows: QuestionImportPreviewRow[];
  payload: { rows: QuestionImportRowPayload[] };
  missingColumns: string[];
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  errors: QuestionImportValidationError[];
}

const allowedDifficulty = new Set(["EASY", "MEDIUM", "HARD"]);
const allowedCorrectOptions = new Set(["A", "B", "C", "D"]);

export function parseQuestionImportCsv(
  csv: string,
  subjectId: string,
  existingQuestionTexts: Iterable<string> = [],
): QuestionImportParseResult {
  return parseQuestionImportTable(
    parseCsv(csv),
    subjectId,
    existingQuestionTexts,
  );
}

export function parseQuestionImportWorkbook(
  data: ArrayBuffer,
  subjectId: string,
  existingQuestionTexts: Iterable<string> = [],
): QuestionImportParseResult {
  const workbook = XLSX.read(data, { cellDates: true, type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!sheet) {
    return emptyResult([{ row: 1, field: "file", message: "Workbook has no sheets." }]);
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: "",
    header: 1,
    raw: true,
  });
  return parseQuestionImportTable(rows, subjectId, existingQuestionTexts);
}

export function parseQuestionImportTable(
  rows: unknown[][],
  subjectId: string,
  existingQuestionTexts: Iterable<string> = [],
): QuestionImportParseResult {
  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((value) => normalizeHeader(value));
  const missingColumns = questionImportColumns.filter(
    (column) => !headers.includes(column),
  );
  const errors: QuestionImportValidationError[] = missingColumns.map((column) => ({
    row: 1,
    field: column,
    message: `Missing column ${column}.`,
  }));
  const seenTexts = new Set(
    [...existingQuestionTexts].map((text) => normalizeQuestionText(text)),
  );
  const fileTexts = new Set<string>();
  const previewRows: QuestionImportPreviewRow[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const record = rowToRecord(headers, row);
    if (isEmptyRecord(record)) return;
    const rowErrors = validateRecord(record, rowNumber, subjectId);
    const normalizedText = normalizeQuestionText(record.questionText ?? "");
    const duplicate =
      normalizedText.length > 0 &&
      (seenTexts.has(normalizedText) || fileTexts.has(normalizedText));
    if (duplicate) {
      rowErrors.push({
        row: rowNumber,
        field: "questionText",
        message: "Duplicate question text was detected.",
      });
    }
    if (normalizedText) fileTexts.add(normalizedText);
    const payload =
      rowErrors.length === 0 && missingColumns.length === 0
        ? toQuestionPayload(record, subjectId)
        : undefined;
    previewRows.push({
      row: rowNumber,
      title: record.title ?? "",
      questionText: record.questionText ?? "",
      topic: record.topic ?? "",
      difficulty: record.difficulty ?? "",
      duplicate,
      errors: rowErrors,
      payload,
    });
    errors.push(...rowErrors);
  });

  const validPayload = previewRows
    .map((row) => row.payload)
    .filter((row): row is QuestionImportRowPayload => Boolean(row));
  const duplicateRows = previewRows.filter((row) => row.duplicate).length;
  const invalidRows = previewRows.filter(
    (row) => row.errors.length > 0 || missingColumns.length > 0,
  ).length;

  return {
    rows: previewRows,
    payload: { rows: validPayload },
    missingColumns,
    totalRows: previewRows.length,
    validRows: validPayload.length,
    duplicateRows,
    invalidRows,
    errors,
  };
}

export function questionImportTemplateCsv(): string {
  const example = [
    "Programming",
    "Python list indexing",
    "Which index accesses the first item in a Python list?",
    "SINGLE_CHOICE",
    "EASY",
    "1",
    "0",
    "0",
    "1",
    "-1",
    "None",
    "A",
    "Python lists are zero-indexed.",
    "python,lists",
  ];
  return [
    questionImportColumns.join(","),
    example.map(csvEscape).join(","),
  ].join("\n");
}

function emptyResult(errors: QuestionImportValidationError[]): QuestionImportParseResult {
  return {
    rows: [],
    payload: { rows: [] },
    missingColumns: [...questionImportColumns],
    totalRows: 0,
    validRows: 0,
    duplicateRows: 0,
    invalidRows: 0,
    errors,
  };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index] ?? "";
    const next = csv[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: unknown): string {
  const header = stringCell(value).trim();
  return (
    questionImportColumns.find(
      (column) => column.toLowerCase() === header.toLowerCase(),
    ) ?? header
  );
}

function rowToRecord(
  headers: string[],
  row: unknown[],
): Partial<Record<QuestionImportColumn, string>> {
  const record: Partial<Record<QuestionImportColumn, string>> = {};
  headers.forEach((header, index) => {
    if (questionImportColumns.includes(header as QuestionImportColumn)) {
      record[header as QuestionImportColumn] = stringCell(row[index]).trim();
    }
  });
  return record;
}

function validateRecord(
  record: Partial<Record<QuestionImportColumn, string>>,
  row: number,
  subjectId: string,
): QuestionImportValidationError[] {
  const errors: QuestionImportValidationError[] = [];
  if (!subjectId) {
    errors.push({ row, field: "subject", message: "Select a subject before importing." });
  }
  for (const column of ["topic", "title", "questionText"] as const) {
    if (!record[column]) {
      errors.push({ row, field: column, message: `${column} is required.` });
    }
  }
  const questionType = normalizeQuestionType(record.questionType);
  if (questionType !== "SINGLE_CHOICE") {
    errors.push({
      row,
      field: "questionType",
      message: "Only SINGLE_CHOICE rows are supported by this simple importer.",
    });
  }
  const options = ["optionA", "optionB", "optionC", "optionD"] as const;
  if (options.some((option) => !record[option])) {
    errors.push({
      row,
      field: "options",
      message: "SINGLE_CHOICE questions require optionA, optionB, optionC, and optionD.",
    });
  }
  const correctOption = (record.correctOption ?? "").toUpperCase();
  if (!allowedCorrectOptions.has(correctOption)) {
    errors.push({
      row,
      field: "correctOption",
      message: "correctOption must be A, B, C, or D.",
    });
  }
  const difficulty = (record.difficulty ?? "").toUpperCase();
  if (!allowedDifficulty.has(difficulty)) {
    errors.push({
      row,
      field: "difficulty",
      message: "difficulty must be EASY, MEDIUM, or HARD.",
    });
  }
  for (const field of ["defaultMarks", "defaultNegativeMarks"] as const) {
    if (!isValidNumber(record[field])) {
      errors.push({ row, field, message: `${field} must be a valid number.` });
    }
  }
  return errors;
}

function toQuestionPayload(
  record: Partial<Record<QuestionImportColumn, string>>,
  subjectId: string,
): QuestionImportRowPayload {
  const correctOption = (record.correctOption ?? "").toUpperCase();
  const explanation = record.explanation?.trim() || undefined;
  return {
    subjectId,
    topic: record.topic ?? "",
    title: record.title ?? "",
    questionText: record.questionText ?? "",
    questionType: "SINGLE_CHOICE",
    difficulty: (record.difficulty ?? "MEDIUM").toUpperCase(),
    defaultMarks: Number(record.defaultMarks),
    defaultNegativeMarks: Number(record.defaultNegativeMarks),
    explanation,
    status: "ACTIVE",
    options: ["A", "B", "C", "D"].map((optionKey, index) => ({
      optionKey,
      optionText: record[`option${optionKey}` as QuestionImportColumn] ?? "",
      displayOrder: index + 1,
      isCorrect: optionKey === correctOption,
    })),
    tags: splitTags(record.tags),
    metadata: { explanation, importedFrom: "question-import" },
  };
}

function normalizeQuestionType(value: string | undefined): string {
  const normalized = (value ?? "SINGLE_CHOICE").trim().toUpperCase();
  if (normalized === "MCQ" || normalized === "SINGLE CHOICE") {
    return "SINGLE_CHOICE";
  }
  return normalized;
}

function normalizeQuestionText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isValidNumber(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "" && Number.isFinite(Number(value));
}

function isEmptyRecord(record: Partial<Record<QuestionImportColumn, string>>) {
  return questionImportColumns.every((column) => !record[column]);
}

function splitTags(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function stringCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "";
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
