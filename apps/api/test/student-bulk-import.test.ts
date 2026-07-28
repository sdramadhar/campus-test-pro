import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { EntityStatus, Gender, Role } from "../generated/phase5-client";
import { AcademicService } from "../src/modules/academic/academic.service";

const collegeId = "college-1";
const validStudent = {
  rollNumber: "1RM25CD035",
  studentId: "188",
  name: "RAMA",
  email: "ramadhar.tech@gmail.com",
  phone: "9202998627",
  gender: Gender.MALE,
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
  status: EntityStatus.ACTIVE,
};

const user = {
  id: "admin-1",
  email: "admin@demo-college.local",
  studentId: null,
  name: "Admin",
  role: Role.COLLEGE_ADMIN,
  collegeId,
  collegeName: "Demo College",
};

function prisma(overrides: Record<string, unknown> = {}) {
  const calls = { users: 0, profiles: 0, transactions: 0 };
  const client = {
    user: {
      findMany: async () => [],
      create: async () => {
        calls.users += 1;
        return { id: `user-${String(calls.users)}` };
      },
    },
    studentProfile: {
      findMany: async () => [],
      create: async () => {
        calls.profiles += 1;
        return { id: `profile-${String(calls.profiles)}` };
      },
    },
    department: { findMany: async () => [{ id: "department-1" }] },
    course: { findMany: async () => [{ id: "course-1" }] },
    semester: {
      findMany: async () => [{ id: "semester-1", courseId: "course-1" }],
    },
    batch: {
      findMany: async () => [
        { id: "batch-1", courseId: "course-1", semesterId: "semester-1" },
      ],
    },
    $transaction: async (input: unknown) => {
      calls.transactions += 1;
      if (Array.isArray(input)) return Promise.all(input);
      if (typeof input === "function") {
        return (input as (tx: unknown) => Promise<unknown>)(client);
      }
      return undefined;
    },
    ...overrides,
  };
  return { client, calls };
}

async function expectThrows(
  service: AcademicService,
  payload: unknown,
  errorType: typeof BadRequestException | typeof ConflictException,
) {
  await assert.rejects(
    service.bulkCreateStudents(
      user,
      payload as { students: typeof validStudent[] },
    ),
    errorType,
  );
}

async function main(): Promise<void> {
  let mock = prisma();
  let service = new AcademicService(mock.client as never);
  const result = await service.bulkCreateStudents(user, {
    students: [validStudent],
  });
  assert.equal(result.success, true);
  assert.equal(result.imported, 1);
  assert.equal(mock.calls.users, 1);
  assert.equal(mock.calls.profiles, 1);

  mock = prisma();
  service = new AcademicService(mock.client as never);
  await expectThrows(
    service,
    { students: [{ rollNumber: "ONLY" }] },
    BadRequestException,
  );

  mock = prisma({ department: { findMany: async () => [] } });
  service = new AcademicService(mock.client as never);
  await expectThrows(service, { students: [validStudent] }, BadRequestException);

  mock = prisma({
    user: {
      findMany: async () => [{ email: validStudent.email, studentId: null }],
      create: async () => ({ id: "unused" }),
    },
  });
  service = new AcademicService(mock.client as never);
  await expectThrows(service, { students: [validStudent] }, ConflictException);

  mock = prisma();
  service = new AcademicService(mock.client as never);
  await expectThrows(
    service,
    { students: [{ ...validStudent, batchId: null }] },
    BadRequestException,
  );

  mock = prisma({ batch: { findMany: async () => [] } });
  service = new AcademicService(mock.client as never);
  await expectThrows(service, { students: [validStudent] }, BadRequestException);

  mock = prisma({
    studentProfile: {
      findMany: async () => [],
      create: async () => {
        throw new Error("rollback");
      },
    },
  });
  service = new AcademicService(mock.client as never);
  await assert.rejects(
    service.bulkCreateStudents(user, { students: [validStudent] }),
    Error,
  );
  assert.equal(mock.calls.profiles, 0);

  console.log("Student bulk import tests passed.");
}

void main();
