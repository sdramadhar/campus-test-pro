import { z } from "zod";
import { apiUrl } from "./auth";

export type EntityKey =
  | "departments"
  | "courses"
  | "semesters"
  | "subjects"
  | "batches"
  | "faculty"
  | "students"
  | "assignments";

export interface EntityRecord {
  id: string;
  [key: string]: unknown;
}

export interface ListResponse {
  success: true;
  data: EntityRecord[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface SingleResponse {
  success: true;
  data: EntityRecord;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required?: boolean;
  source?: EntityKey;
  optionLabel?: string;
}

export interface EntityConfig {
  key: EntityKey;
  title: string;
  eyebrow: string;
  endpoint: string;
  columns: Array<{ key: string; label: string }>;
  fields: FieldConfig[];
  editable: boolean;
  creatable: boolean;
  supportsStatus?: boolean;
  supportsReset?: boolean;
  supportsStudentBulk?: boolean;
}

const requiredString = z.string().trim().min(1, "Required");
const optionalString = z.string().trim().optional();

export const entityConfigs: Record<EntityKey, EntityConfig> = {
  departments: {
    key: "departments",
    title: "Departments",
    eyebrow: "Academic structure",
    endpoint: "/api/v1/departments",
    columns: [
      { key: "departmentName", label: "Department" },
      { key: "departmentCode", label: "Code" },
      { key: "description", label: "Description" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "departmentName",
        label: "Department Name",
        type: "text",
        required: true,
      },
      {
        name: "departmentCode",
        label: "Department Code",
        type: "text",
        required: true,
      },
      { name: "description", label: "Description", type: "text" },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsStatus: true,
  },
  courses: {
    key: "courses",
    title: "Courses",
    eyebrow: "Programs and semesters",
    endpoint: "/api/v1/courses",
    columns: [
      { key: "courseName", label: "Course" },
      { key: "shortName", label: "Short Name" },
      { key: "durationYears", label: "Years" },
      { key: "totalSemesters", label: "Semesters" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "courseName",
        label: "Course Name",
        type: "text",
        required: true,
      },
      { name: "shortName", label: "Short Name", type: "text", required: true },
      {
        name: "durationYears",
        label: "Duration Years",
        type: "number",
        required: true,
      },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        source: "departments",
        required: true,
      },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsStatus: true,
  },
  semesters: {
    key: "semesters",
    title: "Semesters",
    eyebrow: "Course calendar",
    endpoint: "/api/v1/semesters",
    columns: [
      { key: "semesterName", label: "Semester" },
      { key: "semesterNumber", label: "Number" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "semesterName",
        label: "Semester Name",
        type: "text",
        required: true,
      },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: false,
    supportsStatus: true,
  },
  subjects: {
    key: "subjects",
    title: "Subjects",
    eyebrow: "Curriculum catalog",
    endpoint: "/api/v1/subjects",
    columns: [
      { key: "subjectName", label: "Subject" },
      { key: "subjectCode", label: "Code" },
      { key: "credits", label: "Credits" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "subjectName",
        label: "Subject Name",
        type: "text",
        required: true,
      },
      {
        name: "subjectCode",
        label: "Subject Code",
        type: "text",
        required: true,
      },
      { name: "credits", label: "Credits", type: "number", required: true },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        source: "departments",
        required: true,
      },
      {
        name: "courseId",
        label: "Course",
        type: "select",
        source: "courses",
        required: true,
      },
      {
        name: "semesterId",
        label: "Semester",
        type: "select",
        source: "semesters",
        required: true,
      },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsStatus: true,
  },
  batches: {
    key: "batches",
    title: "Batches",
    eyebrow: "Student cohorts",
    endpoint: "/api/v1/batches",
    columns: [
      { key: "batchName", label: "Batch" },
      { key: "academicYear", label: "Year" },
      { key: "section", label: "Section" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "academicYear",
        label: "Academic Year",
        type: "number",
        required: true,
      },
      { name: "section", label: "Section", type: "text", required: true },
      {
        name: "courseId",
        label: "Course",
        type: "select",
        source: "courses",
        required: true,
      },
      {
        name: "semesterId",
        label: "Semester",
        type: "select",
        source: "semesters",
        required: true,
      },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsStatus: true,
  },
  faculty: {
    key: "faculty",
    title: "Faculty",
    eyebrow: "Teaching staff",
    endpoint: "/api/v1/faculty",
    columns: [
      { key: "employeeId", label: "Employee ID" },
      { key: "user.name", label: "Name" },
      { key: "user.email", label: "Email" },
      { key: "designation", label: "Designation" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "employeeId",
        label: "Employee ID",
        type: "text",
        required: true,
      },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        source: "departments",
        required: true,
      },
      {
        name: "designation",
        label: "Designation",
        type: "text",
        required: true,
      },
      {
        name: "qualification",
        label: "Qualification",
        type: "text",
        required: true,
      },
      {
        name: "experienceYears",
        label: "Experience",
        type: "number",
        required: true,
      },
      {
        name: "joiningDate",
        label: "Joining Date",
        type: "date",
        required: true,
      },
      { name: "temporaryPassword", label: "Temporary Password", type: "text" },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsReset: true,
    supportsStatus: true,
  },
  students: {
    key: "students",
    title: "Students",
    eyebrow: "Learner records",
    endpoint: "/api/v1/students",
    columns: [
      { key: "rollNumber", label: "Roll Number" },
      { key: "user.studentId", label: "Student ID" },
      { key: "user.name", label: "Name" },
      { key: "batch.batchName", label: "Batch" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "rollNumber",
        label: "Roll Number",
        type: "text",
        required: true,
      },
      { name: "studentId", label: "Student ID", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "gender", label: "Gender", type: "select" },
      { name: "dob", label: "DOB", type: "date" },
      { name: "address", label: "Address", type: "text" },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        source: "departments",
        required: true,
      },
      {
        name: "courseId",
        label: "Course",
        type: "select",
        source: "courses",
        required: true,
      },
      {
        name: "semesterId",
        label: "Semester",
        type: "select",
        source: "semesters",
        required: true,
      },
      {
        name: "batchId",
        label: "Batch",
        type: "select",
        source: "batches",
        required: true,
      },
      { name: "section", label: "Section", type: "text", required: true },
      { name: "guardianName", label: "Guardian", type: "text" },
      { name: "guardianPhone", label: "Guardian Phone", type: "text" },
      {
        name: "admissionYear",
        label: "Admission Year",
        type: "number",
        required: true,
      },
      { name: "temporaryPassword", label: "Temporary Password", type: "text" },
      { name: "status", label: "Status", type: "select" },
    ],
    editable: true,
    creatable: true,
    supportsReset: true,
    supportsStatus: true,
    supportsStudentBulk: true,
  },
  assignments: {
    key: "assignments",
    title: "Assignments",
    eyebrow: "Faculty workload",
    endpoint: "/api/v1/assignments",
    columns: [
      { key: "faculty.user.name", label: "Faculty" },
      { key: "subject.subjectName", label: "Subject" },
      { key: "semester.semesterName", label: "Semester" },
      { key: "batch.batchName", label: "Batch" },
      { key: "status", label: "Status" },
    ],
    fields: [
      {
        name: "facultyId",
        label: "Faculty",
        type: "select",
        source: "faculty",
        required: true,
      },
      {
        name: "departmentId",
        label: "Department",
        type: "select",
        source: "departments",
        required: true,
      },
      {
        name: "subjectId",
        label: "Subject",
        type: "select",
        source: "subjects",
        required: true,
      },
      {
        name: "semesterId",
        label: "Semester",
        type: "select",
        source: "semesters",
        required: true,
      },
      {
        name: "batchId",
        label: "Batch",
        type: "select",
        source: "batches",
        required: true,
      },
    ],
    editable: false,
    creatable: true,
    supportsStatus: true,
  },
};

export function schemaFor(config: EntityConfig) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) {
    if (field.type === "number") {
      shape[field.name] = field.required
        ? z.coerce.number().int().min(0)
        : z.union([z.coerce.number().int().min(0), z.literal("")]).optional();
    } else {
      shape[field.name] = field.required ? requiredString : optionalString;
    }
  }
  return z.object(shape);
}

export async function academicRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed.");
  }
  return (await response.json()) as T;
}

export function readValue(row: EntityRecord, key: string): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, row);
  if (value === null || value === undefined) {
    return "-";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "-";
}
