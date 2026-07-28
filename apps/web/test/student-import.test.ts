import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import {
  parseStudentImportCsv,
  parseStudentImportTable,
  parseStudentImportWorkbook,
  runStudentImportTask,
  studentImportColumns,
  StudentImportState,
} from "../app/lib/student-import";

const validRow = {
  rollNumber: "1RM25CD035",
  studentId: "188",
  name: "RAMA",
  email: "ramadhar.tech@gmail.com",
  phone: "9202998627",
  gender: "MALE",
  dob: "2006-12-10",
  address: "ksr saptgiri boys pg",
  departmentId: "department-1",
  courseId: "course-1",
  semesterId: "semester-1",
  batchId: "batch-1",
  section: "A",
  guardianName: "Bheekham sahu",
  guardianPhone: "9610176260",
  admissionYear: 2024,
  temporaryPassword: "1RM25CD035",
  status: "ACTIVE",
} satisfies Record<(typeof studentImportColumns)[number], string | number>;

async function main(): Promise<void> {
  await loadingStateResetsAfterSuccess();
  await loadingStateResetsAfterError();
  filePickerIsConfigured();
  csvParsing();
  xlsxParsing();
  dobFormatParsing();
  excelDateCellParsing();
  excelSerialDateParsing();
  missingColumnValidation();
  successfulSingleStudentUploadPayload();
  console.log("Student import parser tests passed.");
}

async function loadingStateResetsAfterSuccess(): Promise<void> {
  const states: StudentImportState[] = [];
  await runStudentImportTask("json", (state) => states.push(state), async () => {
    await Promise.resolve();
  });
  assert.deepEqual(states, ["json", "idle"]);
}

async function loadingStateResetsAfterError(): Promise<void> {
  const states: StudentImportState[] = [];
  await assert.rejects(
    runStudentImportTask("file", (state) => states.push(state), async () => {
      await Promise.resolve();
      throw new Error("upload failed");
    }),
    /upload failed/,
  );
  assert.deepEqual(states, ["file", "idle"]);
}

function filePickerIsConfigured(): void {
  const source = readFileSync(
    resolve("app/components/academic-manager.tsx"),
    "utf8",
  );
  assert(source.includes('accept=".xlsx,.xls,.csv"'));
  assert(source.includes("Upload Excel/CSV"));
  assert(source.includes("fileInputRef.current?.click()"));
}

function csvParsing(): void {
  const csv = [
    studentImportColumns.join(","),
    studentImportColumns.map((column) => String(validRow[column])).join(","),
  ].join("\n");
  const result = parseStudentImportCsv(csv);
  assert.equal(result.errors.length, 0);
  assert.equal(result.payload.students[0]?.email, validRow.email);
}

function xlsxParsing(): void {
  const worksheet = XLSX.utils.json_to_sheet([validRow], {
    header: [...studentImportColumns],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as
    | ArrayBuffer
    | Uint8Array;
  const data = toArrayBuffer(bytes);
  const result = parseStudentImportWorkbook(data);
  assert.equal(result.errors.length, 0);
  assert.equal(result.payload.students[0]?.rollNumber, validRow.rollNumber);
}

function dobFormatParsing(): void {
  for (const dob of ["10-12-2006", "10/12/2006", "10.12.2006", "2006-12-10"]) {
    const result = parseStudentImportCsv(csvWithDob(dob));
    assert.equal(result.errors.length, 0);
    assert.equal(result.payload.students[0]?.dob, "2006-12-10");
  }

  const invalid = parseStudentImportCsv(csvWithDob("31-02-2006"));
  assert.equal(invalid.payload.students.length, 0);
  assert(
    invalid.errors.some(
      (error) => error.field === "dob" && error.message === "Invalid date.",
    ),
  );
}

function excelDateCellParsing(): void {
  const result = parseStudentImportTableWithDob(new Date(2006, 11, 10));
  assert.equal(result.errors.length, 0);
  assert.equal(result.payload.students[0]?.dob, "2006-12-10");
}

function excelSerialDateParsing(): void {
  const result = parseStudentImportTableWithDob(39061);
  assert.equal(result.errors.length, 0);
  assert.equal(result.payload.students[0]?.dob, "2006-12-10");
}

function missingColumnValidation(): void {
  const result = parseStudentImportCsv("rollNumber,studentId\nA,1");
  assert(result.missingColumns.includes("email"));
  assert(result.errors.some((error) => error.message.includes("Missing column")));
}

function successfulSingleStudentUploadPayload(): void {
  const csv = [
    studentImportColumns.join(","),
    studentImportColumns.map((column) => String(validRow[column])).join(","),
  ].join("\n");
  const result = parseStudentImportCsv(csv);
  assert.deepEqual(result.payload, { students: [validRow] });
}

function csvWithDob(dob: string): string {
  return [
    studentImportColumns.join(","),
    studentImportColumns
      .map((column) => String(column === "dob" ? dob : validRow[column]))
      .join(","),
  ].join("\n");
}

function parseStudentImportTableWithDob(dob: Date | number) {
  const row = studentImportColumns.map((column) =>
    column === "dob" ? dob : validRow[column],
  );
  return parseStudentImportTable([[...studentImportColumns], row]);
}

function toArrayBuffer(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) {
    return bytes;
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

void main();
