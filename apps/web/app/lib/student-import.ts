import * as XLSX from "xlsx";

export interface StudentImportRow {
  rollNumber: string;
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  departmentId: string;
  courseId: string;
  semesterId: string;
  batchId: string;
  section: string;
  guardianName?: string;
  guardianPhone?: string;
  admissionYear: number;
  temporaryPassword?: string;
  status?: string;
}

export interface StudentImportPayload {
  students: StudentImportRow[];
}

export interface StudentImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface StudentImportParseResult {
  payload: StudentImportPayload;
  missingColumns: string[];
  errors: StudentImportValidationError[];
}

export type StudentImportState = "idle" | "json" | "file";

export const studentImportColumns = [
  "rollNumber",
  "studentId",
  "name",
  "email",
  "phone",
  "gender",
  "dob",
  "address",
  "departmentId",
  "courseId",
  "semesterId",
  "batchId",
  "section",
  "guardianName",
  "guardianPhone",
  "admissionYear",
  "temporaryPassword",
  "status",
] as const;

const requiredColumns = new Set([
  "rollNumber",
  "studentId",
  "name",
  "email",
  "departmentId",
  "courseId",
  "semesterId",
  "batchId",
  "section",
  "admissionYear",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type StudentImportColumn = (typeof studentImportColumns)[number];

export function parseStudentImportCsv(csv: string): StudentImportParseResult {
  return parseStudentImportTable(parseCsv(csv));
}

export function parseStudentImportWorkbook(
  data: ArrayBuffer,
): StudentImportParseResult {
  const workbook = XLSX.read(data, { cellDates: true, type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      payload: { students: [] },
      missingColumns: [...studentImportColumns],
      errors: [{ row: 1, field: "file", message: "Workbook has no sheets." }],
    };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return {
      payload: { students: [] },
      missingColumns: [...studentImportColumns],
      errors: [{ row: 1, field: "file", message: "Workbook has no sheets." }],
    };
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: "",
    header: 1,
    raw: true,
  });
  return parseStudentImportTable(rows);
}

export function parseStudentImportTable(
  rows: unknown[][],
): StudentImportParseResult {
  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((value) => normalizeHeader(value));
  const missingColumns = studentImportColumns.filter(
    (column) => !headers.includes(column),
  );
  const errors: StudentImportValidationError[] = missingColumns.map((column) => ({
    row: 1,
    field: column,
    message: `Missing column ${column}.`,
  }));

  const students: StudentImportRow[] = [];
  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const record = rowToRecord(headers, row);
    if (isEmptyRecord(record)) {
      errors.push({
        row: rowNumber,
        field: "row",
        message: "Empty rows are not allowed.",
      });
      return;
    }
    const rowErrors = validateRecord(record, rowNumber);
    errors.push(...rowErrors);
    if (rowErrors.length === 0 && missingColumns.length === 0) {
      students.push(toStudent(record));
    }
  });

  return { payload: { students }, missingColumns, errors };
}

export async function runStudentImportTask(
  activeState: Exclude<StudentImportState, "idle">,
  setState: (state: StudentImportState) => void,
  task: () => Promise<void>,
): Promise<void> {
  setState(activeState);
  try {
    await task();
  } finally {
    setState("idle");
  }
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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
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
  return studentImportColumns.find(
    (column) => column.toLowerCase() === header.toLowerCase(),
  ) ?? header;
}

function rowToRecord(
  headers: string[],
  row: unknown[],
): Partial<Record<StudentImportColumn, string>> {
  const record: Partial<Record<StudentImportColumn, string>> = {};
  headers.forEach((header, index) => {
    if (studentImportColumns.includes(header as StudentImportColumn)) {
      const column = header as StudentImportColumn;
      record[column] =
        column === "dob" ? normalizeDateCell(row[index]) : normalizeCell(row[index]);
    }
  });
  return record;
}

function normalizeCell(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return stringCell(value).trim();
}

function stringCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
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

function isEmptyRecord(record: Partial<Record<StudentImportColumn, string>>) {
  return studentImportColumns.every((column) => !record[column]);
}

function validateRecord(
  record: Partial<Record<StudentImportColumn, string>>,
  row: number,
): StudentImportValidationError[] {
  const errors: StudentImportValidationError[] = [];
  for (const column of requiredColumns) {
    if (!record[column as StudentImportColumn]) {
      errors.push({ row, field: column, message: `${column} is required.` });
    }
  }
  if (record.email && !emailPattern.test(record.email)) {
    errors.push({ row, field: "email", message: "Invalid email address." });
  }
  if (record.dob && !isIsoDate(record.dob)) {
    errors.push({ row, field: "dob", message: "Invalid date." });
  }
  if (
    record.admissionYear &&
    (!/^\d{4}$/.test(record.admissionYear) ||
      Number(record.admissionYear) < 1900 ||
      Number(record.admissionYear) > 2100)
  ) {
    errors.push({
      row,
      field: "admissionYear",
      message: "Admission year must be a valid 4-digit year.",
    });
  }
  return errors;
}

function normalizeDateCell(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (value instanceof Date) {
    return formatIsoDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToIsoDate(value) ?? String(value);
  }
  const text = stringCell(value).trim();
  if (!text) {
    return "";
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    return excelSerialToIsoDate(Number(text)) ?? text;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    return validDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
      ? text
      : text;
  }
  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    const year = Number(dayFirst[3]);
    return validDateParts(year, month, day)
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : text;
  }
  return text;
}

function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }
  const parsed = parseExcelDateCode(serial);
  if (
    !parsed ||
    !validDateParts(parsed.year, parsed.month, parsed.day)
  ) {
    return null;
  }
  return `${String(parsed.year).padStart(4, "0")}-${String(
    parsed.month,
  ).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
}

function parseExcelDateCode(
  serial: number,
): { year: number; month: number; day: number } | null {
  const ssf = XLSX.SSF as unknown as {
    parse_date_code?: (value: number) => unknown;
  };
  const parsed = ssf.parse_date_code?.(serial);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const values = parsed as { y?: unknown; m?: unknown; d?: unknown };
  if (
    typeof values.y !== "number" ||
    typeof values.m !== "number" ||
    typeof values.d !== "number"
  ) {
    return null;
  }
  return { year: values.y, month: values.m, day: values.d };
}

function formatIsoDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  return validDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

function validDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toStudent(
  record: Partial<Record<StudentImportColumn, string>>,
): StudentImportRow {
  const student: StudentImportRow = {
    rollNumber: record.rollNumber ?? "",
    studentId: record.studentId ?? "",
    name: record.name ?? "",
    email: record.email ?? "",
    departmentId: record.departmentId ?? "",
    courseId: record.courseId ?? "",
    semesterId: record.semesterId ?? "",
    batchId: record.batchId ?? "",
    section: record.section ?? "",
    admissionYear: Number(record.admissionYear),
  };
  for (const column of studentImportColumns) {
    const value = record[column];
    if (value && !(column in student)) {
      assignOptionalStudentValue(student, column, value);
    }
  }
  return student;
}

function assignOptionalStudentValue(
  student: StudentImportRow,
  column: StudentImportColumn,
  value: string,
): void {
  switch (column) {
    case "phone":
      student.phone = value;
      break;
    case "gender":
      student.gender = value;
      break;
    case "dob":
      student.dob = value;
      break;
    case "address":
      student.address = value;
      break;
    case "guardianName":
      student.guardianName = value;
      break;
    case "guardianPhone":
      student.guardianPhone = value;
      break;
    case "temporaryPassword":
      student.temporaryPassword = value;
      break;
    case "status":
      student.status = value;
      break;
    default:
      break;
  }
}
