import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { AppModule } from "../src/modules/app.module";
import { createCookieParser } from "../src/modules/http/cookie-parser";
import { validateEnvironment } from "../src/modules/config/environment";
import { securityHeaders } from "../src/modules/http/security-headers";
import { PrismaService } from "../src/modules/prisma/prisma.service";
import { RedisService } from "../src/modules/redis/redis.service";

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    studentId: string | null;
    name: string;
    role: string;
    collegeId: string | null;
    collegeName: string | null;
  };
}

interface TestSession {
  body: LoginResponse;
  cookie: string;
}

interface CollegeListResponse {
  success: true;
  data: Array<{
    id: string;
    collegeCode: string;
    email: string;
    status: string;
  }>;
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const accounts = [
  {
    email: "superadmin@campustest.local",
    password: "Admin@12345",
    role: "SUPER_ADMIN",
  },
  {
    email: "admin@demo-college.local",
    password: "Admin@12345",
    role: "COLLEGE_ADMIN",
  },
  {
    email: "faculty@demo-college.local",
    password: "Faculty@12345",
    role: "FACULTY",
  },
  {
    email: "student@demo-college.local",
    password: "Student@12345",
    role: "STUDENT",
  },
] as const;

async function main(): Promise<void> {
  process.env.CODE_RUNNER_MODE = "MOCK";
  validateEnvironment();
  const app = await NestFactory.create(AppModule, { logger: ["error"] });
  app.use(createCookieParser());
  app.use(securityHeaders());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0);
  await clearLoginRateKeys(app.get(RedisService));
  await app.get(PrismaService).maintenanceState.upsert({
    where: { id: "global" },
    update: { enabled: false, message: null, allowAdmins: true },
    create: { id: "global", enabled: false, allowAdmins: true },
  });

  const server = app.getHttpServer() as Server;
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const sessions = new Map<string, TestSession>();

    for (const account of accounts) {
      const session = await login(baseUrl, account.email, account.password);
      assertEqual(
        session.body.user.role,
        account.role,
        `${account.role} login role`,
      );
      assert(
        Boolean(session.body.accessToken),
        `${account.role} access token returned`,
      );
      assert(
        !session.cookie.includes("password") &&
          !JSON.stringify(session.body).includes("passwordHash"),
        `${account.role} response does not leak password data`,
      );
      sessions.set(account.role, session);
    }

    const studentIdSession = await login(baseUrl, "STU-1001", "Student@12345");
    assertEqual(
      studentIdSession.body.user.email,
      "student@demo-college.local",
      "student ID login",
    );

    await expectStatus(
      postJson(baseUrl, "/api/v1/auth/login", {
        identifier: "student@demo-college.local",
        password: "wrong-password",
      }),
      401,
      "wrong-password rejection",
    );

    await expectStatus(
      postJson(baseUrl, "/api/v1/auth/login", {
        identifier: "disabled.student@demo-college.local",
        password: "Student@12345",
      }),
      403,
      "disabled-user rejection",
    );

    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/me`),
      401,
      "protected route without auth",
    );

    const studentSession = mustGet(sessions, "STUDENT");
    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/college-admin-check`, {
        headers: { Cookie: studentSession.cookie },
      }),
      403,
      "role-based authorization rejection",
    );

    const adminSession = mustGet(sessions, "COLLEGE_ADMIN");
    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/college-admin-check`, {
        headers: { Cookie: adminSession.cookie },
      }),
      200,
      "role-based authorization success",
    );

    const refreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: studentSession.cookie },
    });
    assertEqual(refreshResponse.status, 200, "refresh succeeds");
    const rotatedCookie = cookieHeader(refreshResponse);
    assert(
      rotatedCookie !== studentSession.cookie,
      "refresh-token rotation returns new cookies",
    );
    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: studentSession.cookie },
      }),
      401,
      "old refresh token is revoked after rotation",
    );

    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Cookie: rotatedCookie },
      }),
      200,
      "logout succeeds",
    );
    await expectStatus(
      fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: rotatedCookie },
      }),
      401,
      "logout revokes refresh token",
    );

    const faculty = mustGet(sessions, "FACULTY").body.user;
    const student = mustGet(sessions, "STUDENT").body.user;
    assertEqual(
      faculty.collegeId,
      student.collegeId,
      "tenant foundation shared college",
    );
    assertEqual(
      mustGet(sessions, "SUPER_ADMIN").body.user.collegeId,
      null,
      "super admin is global tenant",
    );

    await runCollegeManagementTests(
      baseUrl,
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
    );
    await runAcademicManagementTests(
      baseUrl,
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
      studentSession,
    );
    await runQuestionBankAssessmentTests(
      baseUrl,
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runStudentExamEngineTests(
      baseUrl,
      app.get(PrismaService),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runExamOperationsTests(
      baseUrl,
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runProductionHardeningTests(
      baseUrl,
      app.get(PrismaService),
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
      studentSession,
    );
    await runAiWorkflowTests(
      baseUrl,
      app.get(PrismaService),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runAnalyticsReportingTests(
      baseUrl,
      app.get(PrismaService),
      mustGet(sessions, "SUPER_ADMIN"),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runProctoringTests(
      baseUrl,
      app.get(PrismaService),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );
    await runCodingJudgeTests(
      baseUrl,
      app.get(PrismaService),
      adminSession,
      mustGet(sessions, "FACULTY"),
      studentSession,
    );

    console.log("Auth integration tests passed.");
  } finally {
    await app.close();
  }
}

async function runQuestionBankAssessmentTests(
  baseUrl: string,
  superAdminSession: TestSession,
  collegeAdminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  await expectStatus(
    fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "student cannot access question-bank management",
  );

  const subjects = await getList(
    baseUrl,
    "/api/v1/subjects?page=1&pageSize=1",
    collegeAdminSession.cookie,
  );
  const batches = await getList(
    baseUrl,
    "/api/v1/batches?page=1&pageSize=1",
    collegeAdminSession.cookie,
  );
  const students = await getList(
    baseUrl,
    "/api/v1/students?page=1&pageSize=1",
    collegeAdminSession.cookie,
  );
  const subjectId = String(subjects[0]?.id);
  const batchId = String(batches[0]?.id);
  const studentProfileId = String(students[0]?.id);
  assert(subjectId !== "undefined", "seed subject exists");
  assert(batchId !== "undefined", "seed batch exists");
  assert(studentProfileId !== "undefined", "seed student profile exists");

  const single = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/questions",
    collegeAdminSession.cookie,
    "POST",
    {
      subjectId,
      topic: "Integration",
      title: "Integration single choice",
      questionText: "Pick the queue insertion operation.",
      questionType: "SINGLE_CHOICE",
      difficulty: "EASY",
      defaultMarks: 2,
      defaultNegativeMarks: 0.5,
      status: "ACTIVE",
      tags: ["integration"],
      options: [
        {
          optionKey: "A",
          optionText: "enqueue",
          displayOrder: 1,
          isCorrect: true,
        },
        {
          optionKey: "B",
          optionText: "pop",
          displayOrder: 2,
          isCorrect: false,
        },
      ],
    },
    201,
    "create valid single-choice question",
  );

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/questions",
      collegeAdminSession.cookie,
      {
        subjectId,
        topic: "Integration",
        title: "Invalid single choice",
        questionText: "No correct option.",
        questionType: "SINGLE_CHOICE",
        difficulty: "EASY",
        defaultMarks: 1,
        options: [
          {
            optionKey: "A",
            optionText: "Wrong",
            displayOrder: 1,
            isCorrect: false,
          },
        ],
      },
    ),
    400,
    "reject invalid single-choice question",
  );

  const multiple = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/questions",
    collegeAdminSession.cookie,
    "POST",
    {
      subjectId,
      topic: "Integration",
      title: "Integration multiple choice",
      questionText: "Pick stable sorts.",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      defaultMarks: 3,
      status: "ACTIVE",
      options: [
        {
          optionKey: "A",
          optionText: "merge sort",
          displayOrder: 1,
          isCorrect: true,
        },
        {
          optionKey: "B",
          optionText: "insertion sort",
          displayOrder: 2,
          isCorrect: true,
        },
      ],
    },
    201,
    "create multiple-choice question",
  );

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/questions",
      collegeAdminSession.cookie,
      {
        subjectId,
        topic: "Integration",
        title: "Invalid multiple choice",
        questionText: "No correct answer.",
        questionType: "MULTIPLE_CHOICE",
        difficulty: "MEDIUM",
        defaultMarks: 3,
        options: [
          {
            optionKey: "A",
            optionText: "none",
            displayOrder: 1,
            isCorrect: false,
          },
        ],
      },
    ),
    400,
    "reject question without required correct answer",
  );

  const coding = await jsonRequest<{
    id: string;
    codingQuestion?: { testCases?: unknown[] };
  }>(
    baseUrl,
    "/api/v1/questions",
    collegeAdminSession.cookie,
    "POST",
    {
      subjectId,
      topic: "Coding",
      title: "Integration coding",
      questionText: "Print hello.",
      questionType: "CODING",
      difficulty: "EASY",
      defaultMarks: 5,
      status: "ACTIVE",
      coding: {
        problemStatement: "Print hello.",
        timeLimitMs: 1000,
        memoryLimitMb: 128,
        allowedLanguages: ["javascript"],
        testCases: [
          {
            input: "",
            expectedOutput: "hello",
            visibility: "PUBLIC",
            scoreWeight: 1,
            displayOrder: 1,
          },
          {
            input: "hidden",
            expectedOutput: "hello",
            visibility: "HIDDEN",
            scoreWeight: 1,
            displayOrder: 2,
          },
        ],
      },
    },
    201,
    "create coding question with hidden tests",
  );
  assert(
    JSON.stringify(coding).includes("HIDDEN"),
    "authorized management can inspect hidden coding tests",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/questions/${single.id}`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "correct answers are not exposed to unauthorized payloads",
  );

  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/questions/${single.id}/status`,
      collegeAdminSession.cookie,
      { status: "INACTIVE" },
    ),
    200,
    "deactivate question",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/questions/${single.id}/status`,
      collegeAdminSession.cookie,
      { status: "ACTIVE" },
    ),
    200,
    "activate question",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/questions/${multiple.id}/duplicate`, {
      method: "POST",
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    201,
    "duplicate question",
  );

  const importJob = await jsonRequest<{
    id: string;
    successCount: number;
    failureCount: number;
  }>(
    baseUrl,
    "/api/v1/questions/import",
    collegeAdminSession.cookie,
    "POST",
    {
      rows: [
        {
          subjectId,
          topic: "Import",
          title: "Imported true false",
          questionText: "A queue is FIFO.",
          questionType: "TRUE_FALSE",
          difficulty: "EASY",
          defaultMarks: 1,
          metadata: { correctBoolean: true },
        },
        {
          subjectId,
          topic: "Import",
          title: "Invalid import",
          questionText: "Missing answer.",
          questionType: "TRUE_FALSE",
          difficulty: "EASY",
          defaultMarks: 1,
        },
      ],
    },
    201,
    "import valid rows and report invalid rows",
  );
  assertEqual(importJob.successCount, 1, "question import success count");
  assertEqual(importJob.failureCount, 1, "question import failure count");
  await expectStatus(
    fetch(`${baseUrl}/api/v1/questions/import/${importJob.id}`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    200,
    "question import job detail",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/questions/export?topic=Integration`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    200,
    "export filtered questions",
  );

  await expectStatus(
    postJsonWithCookie(baseUrl, "/api/v1/questions", facultySession.cookie, {
      subjectId: "not-a-real-subject",
      topic: "Forbidden",
      title: "Faculty forbidden question",
      questionText: "Should fail.",
      questionType: "SHORT_ANSWER",
      difficulty: "EASY",
      defaultMarks: 1,
    }),
    404,
    "faculty cannot create for unassigned subject",
  );

  const assessment = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/assessments",
    collegeAdminSession.cookie,
    "POST",
    {
      title: "Integration Assessment",
      description: "Draft from integration tests.",
      instructions: "Answer carefully.",
      subjectId,
      durationMinutes: 30,
      passingMarks: 2,
      maxAttempts: 1,
    },
    201,
    "create draft assessment",
  );

  const section = await jsonRequest<{ id: string }>(
    baseUrl,
    `/api/v1/assessments/${assessment.id}/sections`,
    collegeAdminSession.cookie,
    "POST",
    { name: "Core", displayOrder: 1 },
    201,
    "add assessment section",
  );

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/assessments/${assessment.id}/questions`,
      collegeAdminSession.cookie,
      {
        questionId: single.id,
        sectionId: section.id,
        displayOrder: 1,
        assignedMarks: 2,
        assignedNegativeMarks: 0.5,
        mandatory: true,
      },
    ),
    201,
    "add assessment question",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/assessments/${assessment.id}/questions`,
      collegeAdminSession.cookie,
      {
        questionId: single.id,
        sectionId: section.id,
        displayOrder: 2,
        assignedMarks: 2,
      },
    ),
    409,
    "prevent duplicate question assignment",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/assessments/${assessment.id}/assignments`,
      collegeAdminSession.cookie,
      {
        batchIds: [batchId],
        studentProfileIds: [studentProfileId],
      },
    ),
    201,
    "assign batch and student",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/assessments/${assessment.id}/schedule`,
      collegeAdminSession.cookie,
      {
        startAt: "2026-09-10T15:00:00.000Z",
        endAt: "2026-09-10T14:00:00.000Z",
      },
    ),
    400,
    "reject invalid schedule",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/assessments/${assessment.id}/schedule`,
      collegeAdminSession.cookie,
      {
        startAt: "2026-09-10T14:00:00.000Z",
        endAt: "2026-09-10T15:00:00.000Z",
      },
    ),
    201,
    "schedule assessment",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/assessments/${assessment.id}/preview`, {
      method: "POST",
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    201,
    "assessment preview",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/assessments/${assessment.id}/publish`, {
      method: "POST",
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    201,
    "publish valid assessment",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/assessments/${assessment.id}/duplicate`, {
      method: "POST",
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    201,
    "duplicate assessment",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/assessments/${assessment.id}/cancel`, {
      method: "POST",
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    201,
    "cancel assessment",
  );

  const isolatedCollege = await createCollege(
    baseUrl,
    superAdminSession.cookie,
    {
      name: `Phase Six Tenant ${String(Date.now()).slice(-7)}`,
      collegeCode: `P6${String(Date.now()).slice(-7)}`,
      email: `phase-six-${String(Date.now()).slice(-7)}@college.local`,
      addressLine1: "6 Isolation Road",
      city: "Tenant City",
      state: "Scope",
      postalCode: "60006",
      country: "United States",
    },
  );
  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/questions?collegeId=${String(isolatedCollege.data.id)}`,
      {
        headers: { Cookie: collegeAdminSession.cookie },
      },
    ),
    200,
    "college admin query remains tenant-scoped",
  );
}

async function runCollegeManagementTests(
  baseUrl: string,
  superAdminSession: TestSession,
  collegeAdminSession: TestSession,
): Promise<void> {
  const suffix = String(Date.now()).slice(-8);
  const created = await createCollege(baseUrl, superAdminSession.cookie, {
    name: `Integration College ${suffix}`,
    collegeCode: `IT${suffix}`,
    email: `integration-${suffix}@college.local`,
    phone: "+1 555 0300",
    website: "https://integration-college.local",
    addressLine1: "400 Test Avenue",
    addressLine2: "Suite 4",
    city: "Testville",
    state: "Validation",
    postalCode: "40004",
    country: "United States",
    status: "ACTIVE",
    firstAdmin: {
      fullName: "Integration Admin",
      email: `integration-admin-${suffix}@college.local`,
      phone: "+1 555 0301",
      temporaryPassword: "Temp@12345",
    },
  });

  const collegeId = created.data.id as string;
  assert(Boolean(collegeId), "super admin can create a college");

  await expectStatus(
    postJsonWithCookie(baseUrl, "/api/v1/colleges", superAdminSession.cookie, {
      name: "Duplicate Code College",
      collegeCode: `IT${suffix}`,
      email: `duplicate-code-${suffix}@college.local`,
      addressLine1: "1 Duplicate Way",
      city: "Testville",
      state: "Validation",
      postalCode: "40004",
      country: "United States",
    }),
    409,
    "duplicate college code rejected",
  );

  await expectStatus(
    postJsonWithCookie(baseUrl, "/api/v1/colleges", superAdminSession.cookie, {
      name: "Duplicate Email College",
      collegeCode: `EM${suffix}`,
      email: `integration-${suffix}@college.local`,
      addressLine1: "1 Duplicate Way",
      city: "Testville",
      state: "Validation",
      postalCode: "40004",
      country: "United States",
    }),
    409,
    "duplicate college email rejected",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/colleges`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    403,
    "non-super-admin cannot access college endpoints",
  );

  const listResponse = await fetch(
    `${baseUrl}/api/v1/colleges?page=1&pageSize=5&search=Integration&status=ACTIVE&sortBy=name&sortOrder=asc`,
    { headers: { Cookie: superAdminSession.cookie } },
  );
  assertEqual(
    listResponse.status,
    200,
    "college list pagination/search/status",
  );
  const list = (await listResponse.json()) as CollegeListResponse;
  assert(
    list.meta.pageSize === 5 && list.meta.total >= 1,
    "college list pagination metadata",
  );
  assert(
    list.data.some((college) => college.id === collegeId),
    "search and status filtering returns created college",
  );

  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/colleges/${collegeId}`,
      superAdminSession.cookie,
      {
        city: "Updated City",
      },
    ),
    200,
    "college update",
  );

  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/colleges/${collegeId}/status`,
      superAdminSession.cookie,
      { status: "INACTIVE" },
    ),
    200,
    "college deactivation",
  );

  await expectStatus(
    postJson(baseUrl, "/api/v1/auth/login", {
      identifier: `integration-admin-${suffix}@college.local`,
      password: "Temp@12345",
    }),
    403,
    "users of inactive college cannot log in",
  );

  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/colleges/${collegeId}/status`,
      superAdminSession.cookie,
      { status: "ACTIVE" },
    ),
    200,
    "college reactivation",
  );

  const firstAdmin = await login(
    baseUrl,
    `integration-admin-${suffix}@college.local`,
    "Temp@12345",
  );
  assertEqual(
    firstAdmin.body.user.role,
    "COLLEGE_ADMIN",
    "optional first admin creation",
  );
  assertEqual(
    firstAdmin.body.user.collegeId,
    collegeId,
    "tenant isolation admin link",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/colleges/${collegeId}`, {
      headers: { Cookie: superAdminSession.cookie },
    }),
    200,
    "college detail",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/colleges/${collegeId}`, {
      method: "DELETE",
      headers: { Cookie: superAdminSession.cookie },
    }),
    200,
    "safe delete/archive behavior",
  );
}

async function runAcademicManagementTests(
  baseUrl: string,
  superAdminSession: TestSession,
  collegeAdminSession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  const suffix = String(Date.now()).slice(-7);

  await expectStatus(
    fetch(`${baseUrl}/api/v1/departments`),
    401,
    "academic route rejects anonymous users",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/departments`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "student cannot access academic management",
  );

  const department = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/departments",
    collegeAdminSession.cookie,
    "POST",
    {
      departmentName: `Integration Department ${suffix}`,
      departmentCode: `ID${suffix}`,
      description: "Created by integration tests.",
    },
    201,
    "department create",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/departments/${department.id}`,
      collegeAdminSession.cookie,
      {
        description: "Updated by integration tests.",
        status: "ACTIVE",
      },
    ),
    200,
    "department update",
  );
  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/departments?search=Integration&page=1&pageSize=5&sortBy=departmentName&sortOrder=asc`,
      {
        headers: { Cookie: collegeAdminSession.cookie },
      },
    ),
    200,
    "department search pagination sorting",
  );

  const isolatedCollege = await createCollege(
    baseUrl,
    superAdminSession.cookie,
    {
      name: `Isolated College ${suffix}`,
      collegeCode: `ISO${suffix}`,
      email: `isolated-${suffix}@college.local`,
      addressLine1: "2 Tenant Lane",
      city: "Scope City",
      state: "Isolation",
      postalCode: "50005",
      country: "United States",
    },
  );
  const isolatedDepartment = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/departments",
    superAdminSession.cookie,
    "POST",
    {
      collegeId: isolatedCollege.data.id,
      departmentName: `Other Tenant Department ${suffix}`,
      departmentCode: `OT${suffix}`,
    },
    201,
    "super admin creates other tenant department",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/departments/${isolatedDepartment.id}`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    404,
    "college admin cannot read another college department",
  );

  const course = await jsonRequest<{
    id: string;
    semesters: Array<{ id: string }>;
  }>(
    baseUrl,
    "/api/v1/courses",
    collegeAdminSession.cookie,
    "POST",
    {
      departmentId: department.id,
      courseName: `Integration Course ${suffix}`,
      shortName: `IC${suffix}`,
      durationYears: 2,
    },
    201,
    "course create",
  );
  assertEqual(course.semesters.length, 4, "course auto-creates semesters");
  const semesterId = course.semesters[0]?.id;
  assert(Boolean(semesterId), "first semester is present");
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/semesters/${String(semesterId)}`,
      collegeAdminSession.cookie,
      {
        semesterName: "Foundation Semester",
        status: "ACTIVE",
      },
    ),
    200,
    "semester edit",
  );

  const subject = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/subjects",
    collegeAdminSession.cookie,
    "POST",
    {
      departmentId: department.id,
      courseId: course.id,
      semesterId,
      subjectName: `Integration Subject ${suffix}`,
      subjectCode: `IS${suffix}`,
      credits: 3,
    },
    201,
    "subject create",
  );

  const batch = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/batches",
    collegeAdminSession.cookie,
    "POST",
    {
      courseId: course.id,
      semesterId,
      academicYear: 2026,
      section: `Z${suffix.slice(-1)}`,
    },
    201,
    "batch create",
  );

  const faculty = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/faculty",
    collegeAdminSession.cookie,
    "POST",
    {
      employeeId: `EMP${suffix}`,
      name: "Integration Faculty",
      email: `faculty-${suffix}@demo-college.local`,
      phone: "+1 555 0401",
      departmentId: department.id,
      designation: "Lecturer",
      qualification: "M.Tech",
      experienceYears: 3,
      joiningDate: "2026-01-15",
      temporaryPassword: "Faculty@12345",
    },
    201,
    "faculty create",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/faculty/${faculty.id}/status`,
      collegeAdminSession.cookie,
      {
        status: "INACTIVE",
      },
    ),
    200,
    "faculty deactivate",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/faculty/${faculty.id}/status`,
      collegeAdminSession.cookie,
      {
        status: "ACTIVE",
      },
    ),
    200,
    "faculty activate",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/faculty/${faculty.id}/reset-password`,
      collegeAdminSession.cookie,
      {
        temporaryPassword: "Faculty@12345",
      },
    ),
    201,
    "faculty reset password",
  );

  const student = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/students",
    collegeAdminSession.cookie,
    "POST",
    {
      rollNumber: `ROLL${suffix}`,
      studentId: `SID${suffix}`,
      name: "Integration Student",
      email: `student-${suffix}@demo-college.local`,
      phone: "+1 555 0402",
      gender: "NOT_SPECIFIED",
      departmentId: department.id,
      courseId: course.id,
      semesterId,
      batchId: batch.id,
      section: "Z",
      guardianName: "Integration Guardian",
      guardianPhone: "+1 555 0403",
      admissionYear: 2026,
      temporaryPassword: "Student@12345",
    },
    201,
    "student create",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/students/${student.id}/status`,
      collegeAdminSession.cookie,
      {
        status: "INACTIVE",
      },
    ),
    200,
    "student deactivate",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/students/${student.id}/status`,
      collegeAdminSession.cookie,
      {
        status: "ACTIVE",
      },
    ),
    200,
    "student activate",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/students/${student.id}/reset-password`,
      collegeAdminSession.cookie,
      {
        temporaryPassword: "Student@12345",
      },
    ),
    201,
    "student reset password",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/students/template`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    200,
    "student template download",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/students/export`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    200,
    "student export",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/students/bulk",
      collegeAdminSession.cookie,
      {
        students: [
          {
            rollNumber: `BROLL${suffix}`,
            studentId: `BSID${suffix}`,
            name: "Bulk Integration Student",
            email: `bulk-student-${suffix}@demo-college.local`,
            departmentId: department.id,
            courseId: course.id,
            semesterId,
            batchId: batch.id,
            section: "Z",
            admissionYear: 2026,
          },
        ],
      },
    ),
    201,
    "student bulk create",
  );

  const assignment = await jsonRequest<{ id: string }>(
    baseUrl,
    "/api/v1/assignments",
    collegeAdminSession.cookie,
    "POST",
    {
      facultyId: faculty.id,
      departmentId: department.id,
      subjectId: subject.id,
      semesterId,
      batchId: batch.id,
    },
    201,
    "faculty subject assignment",
  );
  assert(Boolean(assignment.id), "assignment id returned");
  await expectStatus(
    fetch(`${baseUrl}/api/v1/academic/stats`, {
      headers: { Cookie: collegeAdminSession.cookie },
    }),
    200,
    "academic dashboard statistics",
  );
}

async function login(
  baseUrl: string,
  identifier: string,
  password: string,
): Promise<TestSession> {
  const response = await postJson(baseUrl, "/api/v1/auth/login", {
    identifier,
    password,
  });
  if (response.status !== 200) {
    throw new Error(
      `Assertion failed: login ${identifier}. ${await response.text()}`,
    );
  }
  const body = (await response.json()) as LoginResponse;

  return { body, cookie: cookieHeader(response) };
}

async function runStudentExamEngineTests(
  baseUrl: string,
  prisma: PrismaService,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  await expectStatus(
    fetch(`${baseUrl}/api/v1/student/assessments`, {
      headers: { Cookie: adminSession.cookie },
    }),
    403,
    "student assessment list rejects non-student role",
  );

  const assessmentsResponse = await fetch(
    `${baseUrl}/api/v1/student/assessments`,
    {
      headers: { Cookie: studentSession.cookie },
    },
  );
  assertEqual(assessmentsResponse.status, 200, "student assessment list");
  const assessmentsBody = (await assessmentsResponse.json()) as {
    success: true;
    data: Array<{
      id: string;
      title: string;
      latestAttempt?: { id: string; status: string } | null;
    }>;
  };
  const activeAssessment = assessmentsBody.data.find(
    (item) => item.id === "seed-assessment-active-phase7",
  );
  assert(Boolean(activeAssessment), "active Phase 7 assessment is assigned");
  await prisma.testAttempt.deleteMany({
    where: {
      studentId: studentSession.body.user.id,
      assessmentId: "seed-assessment-active-phase7",
      status: "IN_PROGRESS",
    },
  });

  const detail = await fetch(
    `${baseUrl}/api/v1/student/assessments/seed-assessment-active-phase7`,
    {
      headers: { Cookie: studentSession.cookie },
    },
  );
  assertEqual(detail.status, 200, "student assessment detail");

  const startResponse = await postJsonWithCookie(
    baseUrl,
    "/api/v1/student/assessments/seed-assessment-active-phase7/start",
    studentSession.cookie,
    {
      idempotencyKey: `integration-phase7-${Date.now()}`,
      sessionKey: "integration-test",
    },
  );
  assertEqual(startResponse.status, 201, "student starts assigned assessment");
  const started = (await startResponse.json()) as {
    success: true;
    data: {
      id: string;
      status: string;
      questions: Array<{
        id: string;
        questionType: string;
        options?: Array<Record<string, unknown>>;
        metadata?: Record<string, unknown>;
      }>;
    };
  };
  assertEqual(started.data.status, "IN_PROGRESS", "attempt is in progress");
  const serializedAttempt = JSON.stringify(started.data);
  assert(
    !serializedAttempt.includes("isCorrect"),
    "student attempt excludes correct answers",
  );
  assert(
    !serializedAttempt.includes("HIDDEN"),
    "student attempt excludes hidden coding test cases",
  );

  const attemptResponse = await fetch(
    `${baseUrl}/api/v1/student/attempts/${started.data.id}`,
    {
      headers: { Cookie: studentSession.cookie },
    },
  );
  assertEqual(attemptResponse.status, 200, "student resumes attempt");
  const resumed = (await attemptResponse.json()) as typeof started;
  assertEqual(
    resumed.data.questions.map((question) => question.id).join(","),
    started.data.questions.map((question) => question.id).join(","),
    "attempt question order is stable after refresh",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/student/attempts/${started.data.id}/time`, {
      headers: { Cookie: studentSession.cookie },
    }),
    200,
    "server timer endpoint",
  );

  const answerQuestion = started.data.questions[0];
  assert(Boolean(answerQuestion), "attempt question exists");
  const saveResponse = await fetch(
    `${baseUrl}/api/v1/student/attempts/${started.data.id}/answers/${answerQuestion?.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: studentSession.cookie,
      },
      body: JSON.stringify({
        textAnswer: "Integration answer",
        markedForReview: true,
      }),
    },
  );
  assertEqual(saveResponse.status, 200, "answer auto-save");
  const saved = (await saveResponse.json()) as {
    success: true;
    data: { version: number; markedForReview: boolean };
  };
  assert(saved.data.version >= 1, "answer version returned");
  assertEqual(saved.data.markedForReview, true, "marked-for-review persisted");

  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/student/attempts/${started.data.id}/answers/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: studentSession.cookie,
        },
        body: JSON.stringify({
          answers: started.data.questions.slice(0, 2).map((question) => ({
            attemptQuestionId: question.id,
            textAnswer: "Integration batch answer",
          })),
        }),
      },
    ),
    201,
    "batch answer save",
  );

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/student/attempts/${started.data.id}/events`,
      studentSession.cookie,
      {
        eventType: "TAB_HIDDEN",
        metadata: { test: true },
      },
    ),
    201,
    "attempt security event logged",
  );

  const submitResponse = await postJsonWithCookie(
    baseUrl,
    `/api/v1/student/attempts/${started.data.id}/submit`,
    studentSession.cookie,
    {},
  );
  assertEqual(submitResponse.status, 201, "student submits attempt");
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/student/attempts/${started.data.id}/submit`,
      studentSession.cookie,
      {},
    ),
    201,
    "duplicate submit returns existing receipt",
  );
  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/student/attempts/${started.data.id}/answers/${answerQuestion?.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: studentSession.cookie,
        },
        body: JSON.stringify({ textAnswer: "Late answer" }),
      },
    ),
    403,
    "answer save rejected after submission",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/student/results`, {
      headers: { Cookie: studentSession.cookie },
    }),
    200,
    "student published result list",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/reviews`, {
      headers: { Cookie: facultySession.cookie },
    }),
    200,
    "faculty manual review list",
  );
  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/assessments/seed-assessment-active-phase7/results`,
      {
        headers: { Cookie: adminSession.cookie },
      },
    ),
    200,
    "admin assessment results",
  );
}

async function runExamOperationsTests(
  baseUrl: string,
  superAdminSession: TestSession,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  await expectStatus(
    fetch(`${baseUrl}/api/v1/exam-operations/dashboard`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "exam operations dashboard",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/exam-operations/analytics`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "exam analytics",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/exam-operations/sweep-expired`, {
      method: "POST",
      headers: { Cookie: adminSession.cookie },
    }),
    201,
    "expired attempt sweep",
  );

  const reviewsResponse = await fetch(`${baseUrl}/api/v1/review-workflow`, {
    headers: { Cookie: facultySession.cookie },
  });
  assertEqual(reviewsResponse.status, 200, "review workflow list");
  const reviews = (await reviewsResponse.json()) as {
    success: true;
    data: Array<{
      id: string;
      maxMarks: number;
      updatedAt: string;
      status: string;
    }>;
  };
  const pendingReview = reviews.data.find(
    (review) => review.status !== "COMPLETED",
  );
  if (pendingReview) {
    await expectStatus(
      postJsonWithCookie(
        baseUrl,
        `/api/v1/review-workflow/${pendingReview.id}/complete`,
        facultySession.cookie,
        {
          awardedMarks: Math.min(1, pendingReview.maxMarks),
          feedback: "Integration review complete.",
          expectedUpdatedAt: pendingReview.updatedAt,
        },
      ),
      201,
      "complete manual review",
    );
  }

  const resultsResponse = await fetch(
    `${baseUrl}/api/v1/assessments/seed-assessment-active-phase7/results`,
    {
      headers: { Cookie: adminSession.cookie },
    },
  );
  assertEqual(resultsResponse.status, 200, "assessment results for moderation");
  const results = (await resultsResponse.json()) as {
    success: true;
    data: Array<{ id: string }>;
  };
  const resultId = results.data[0]?.id;
  assert(Boolean(resultId), "result available for moderation");
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/result-moderation/${String(resultId)}`,
      adminSession.cookie,
      {
        action: "HELD",
        reason: "Integration moderation hold.",
      },
    ),
    201,
    "moderation hold requires reason",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/result-moderation/${String(resultId)}`,
      adminSession.cookie,
      {
        action: "RELEASED",
        reason: "Integration moderation release.",
      },
    ),
    201,
    "moderation release",
  );
  await expectStatus(
    fetch(
      `${baseUrl}/api/v1/result-moderation/assessments/seed-assessment-active-phase7/export.csv`,
      {
        headers: { Cookie: adminSession.cookie },
      },
    ),
    200,
    "assessment result CSV export",
  );
  const publishEligibleResponse = await postJsonWithCookie(
    baseUrl,
    "/api/v1/result-moderation/assessments/seed-assessment-active-phase7/publish-eligible",
    adminSession.cookie,
    {},
  );
  assert(
    publishEligibleResponse.status === 409 || publishEligibleResponse.status === 201,
    "publication blocked by pending manual reviews or idempotently publishes after prior review completion",
  );

  const securityResponse = await fetch(`${baseUrl}/api/v1/security-events`, {
    headers: { Cookie: adminSession.cookie },
  });
  assertEqual(securityResponse.status, 200, "security event summary");
  const security = (await securityResponse.json()) as {
    success: true;
    data: { events: Array<{ attemptId: string }> };
  };
  const attemptId = security.data.events[0]?.attemptId;
  if (attemptId) {
    await expectStatus(
      postJsonWithCookie(
        baseUrl,
        `/api/v1/security-events/attempts/${attemptId}/review`,
        adminSession.cookie,
        {
          status: "REVIEWED",
          notes: "Integration security review.",
        },
      ),
      201,
      "security event review status",
    );
  }

  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/queues`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "queue monitor rejects student",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/queues`, {
      headers: { Cookie: superAdminSession.cookie },
    }),
    200,
    "queue monitor super admin",
  );
}

async function runProductionHardeningTests(
  baseUrl: string,
  prisma: PrismaService,
  superAdminSession: TestSession,
  adminSession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  assertEqual(health.status, 200, "health endpoint still works");
  assertEqual(
    health.headers.get("x-content-type-options"),
    "nosniff",
    "security headers are present",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/version`),
    200,
    "release version endpoint",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/workers`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "worker status rejects student",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/workers`, {
      headers: { Cookie: superAdminSession.cookie },
    }),
    200,
    "worker status allows super admin",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/maintenance`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "maintenance status visible to admins",
  );
  for (const endpoint of [
    "infrastructure",
    "capacity",
    "deployment-safety",
    "backups",
    "alerts",
    "metrics-summary",
  ]) {
    await expectStatus(
      fetch(`${baseUrl}/api/v1/system/${endpoint}`, {
        headers: { Cookie: superAdminSession.cookie },
      }),
      200,
      `system ${endpoint} allows super admin`,
    );
    await expectStatus(
      fetch(`${baseUrl}/api/v1/system/${endpoint}`, {
        headers: { Cookie: studentSession.cookie },
      }),
      403,
      `system ${endpoint} rejects student`,
    );
  }
  await expectStatus(
    fetch(`${baseUrl}/api/v1/system/metrics`),
    200,
    "sanitized metrics endpoint",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/system/maintenance/enable",
      superAdminSession.cookie,
      { message: "Integration test maintenance", blockNewExamStarts: true },
    ),
    201,
    "maintenance enable endpoint",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/system/maintenance/disable",
      superAdminSession.cookie,
      {},
    ),
    201,
    "maintenance disable endpoint",
  );

  await expectStatus(
    postJson(baseUrl, "/api/v1/auth/forgot-password", {
      identifier: "missing-account@campustest.local",
    }),
    200,
    "forgot password generic missing account response",
  );
  await expectStatus(
    postJson(baseUrl, "/api/v1/auth/forgot-password", {
      identifier: "student@demo-college.local",
    }),
    200,
    "forgot password generic existing account response",
  );

  const reset = await prisma.passwordResetToken.findFirst({
    where: { user: { email: "student@demo-college.local" }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(reset), "password reset token stored as hash");
  const email = await prisma.emailDelivery.findFirst({
    where: {
      toEmail: "student@demo-college.local",
      template: "password-reset",
    },
    orderBy: { queuedAt: "desc" },
  });
  assert(Boolean(email), "password reset email delivery record stored");
  const token = String(
    (email?.metadata as { resetUrl?: string } | null)?.resetUrl?.split(
      "token=",
    )[1] ?? "",
  );
  assert(Boolean(token), "development reset URL contains one-time token");
  await expectStatus(
    postJson(baseUrl, "/api/v1/auth/reset-password", {
      token: decodeURIComponent(token),
      password: "Student@12345",
    }),
    200,
    "password reset completes",
  );

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/storage/signed-upload",
      adminSession.cookie,
      {
        fileName: "questions.csv",
        mimeType: "text/csv",
        sizeBytes: 128,
        purpose: "question-import",
      },
    ),
    201,
    "object storage signed upload foundation",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/storage/signed-upload",
      studentSession.cookie,
      {
        fileName: "student.csv",
        mimeType: "text/csv",
        sizeBytes: 128,
        purpose: "student-upload",
      },
    ),
    403,
    "student cannot create storage upload",
  );
  validateEnvironment({ ...process.env, CODE_RUNNER_MODE: "DISABLED" });
  try {
    await expectStatus(
      postJsonWithCookie(
        baseUrl,
        "/api/v1/code-runner/jobs",
        studentSession.cookie,
        {
          language: "javascript",
          sourceCode: "console.log(1)",
        },
      ),
      503,
      "API refuses direct code execution when runner disabled",
    );
  } finally {
    validateEnvironment({ ...process.env, CODE_RUNNER_MODE: "MOCK" });
  }
}

async function runAiWorkflowTests(
  baseUrl: string,
  prisma: PrismaService,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  const subject = await prisma.subject.findFirstOrThrow({
    where: { collegeId: adminSession.body.user.collegeId ?? "" },
  });

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      "/api/v1/ai/questions/generate",
      studentSession.cookie,
      {
        subjectId: subject.id,
        topic: "Queues",
        questionType: "SINGLE_CHOICE",
        requestedCount: 1,
      },
    ),
    403,
    "student rejected from AI generation",
  );

  const generated = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/ai/questions/generate",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      topic: "Queues",
      questionType: "SINGLE_CHOICE",
      requestedCount: 1,
      difficulty: "MEDIUM",
      bloomLevel: "UNDERSTAND",
      marks: 2,
      negativeMarks: 0,
      language: "English",
      avoidDuplicate: true,
      model: "campustest-mock-v1",
      temperature: 0.3,
      maxTokens: 900,
    },
    201,
    "faculty creates mock AI generation job",
  );
  const jobId = String(generated.id);
  const completedJob = await pollJob(baseUrl, jobId, facultySession.cookie);
  const results = completedJob.results as Array<Record<string, unknown>>;
  const generationRequest = completedJob.request as Record<string, unknown>;
  assertEqual(
    Number(generationRequest.temperature),
    0.3,
    "AI generation stores runtime temperature",
  );
  assertEqual(
    Number(generationRequest.maxTokens),
    900,
    "AI generation stores runtime max tokens",
  );
  assert(results.length >= 1, "mock provider generated review results");
  assertEqual(
    String(results[0]?.reviewStatus),
    "PENDING",
    "AI result starts in human review state",
  );

  const resultId = String(results[0]?.id);
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/ai/jobs/${jobId}/results/${resultId}`,
      facultySession.cookie,
      {
        questionText: `${String(results[0]?.questionText)} Edited by reviewer.`,
        approvedDifficulty: "MEDIUM",
        approvedBloomLevel: "UNDERSTAND",
        marks: 2,
      },
    ),
    200,
    "reviewer can edit generated AI output",
  );
  const versionsResponse = await fetch(
    `${baseUrl}/api/v1/ai/jobs/${jobId}/results/${resultId}/versions`,
    { headers: { Cookie: facultySession.cookie } },
  );
  assertEqual(versionsResponse.status, 200, "AI result versions endpoint works");
  const versionsBody = (await versionsResponse.json()) as {
    data: Array<Record<string, unknown>>;
  };
  assert(
    versionsBody.data.length >= 1,
    "AI edit creates version history for comparison",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/ai/jobs/${jobId}/approve`,
      facultySession.cookie,
      { resultIds: [resultId] },
    ),
    201,
    "approve generated question",
  );
  const saved = await jsonRequest<Array<Record<string, unknown>>>(
    baseUrl,
    `/api/v1/ai/jobs/${jobId}/save-approved`,
    facultySession.cookie,
    "POST",
    {},
    201,
    "approved generated question saved",
  );
  assertEqual(
    String(saved[0]?.status),
    "DRAFT",
    "approved AI question is saved to Question Bank as DRAFT",
  );

  const duplicateResponse = await postJsonWithCookie(
    baseUrl,
    "/api/v1/questions/check-duplicate",
    facultySession.cookie,
    {
      questionText: String(saved[0]?.questionText),
      subjectId: subject.id,
    },
  );
  assertEqual(duplicateResponse.status, 201, "duplicate check endpoint works");
  const duplicateBody = (await duplicateResponse.json()) as {
    data: Array<Record<string, unknown>>;
  };
  assert(
    duplicateBody.data.length >= 1,
    "duplicate detection returns an advisory candidate",
  );
  assert(
    "semanticScore" in (duplicateBody.data[0] ?? {}) ||
      "fuzzyScore" in (duplicateBody.data[0] ?? {}),
    "duplicate detection returns semantic or fuzzy score metadata",
  );

  const importJob = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/question-imports/documents",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      fileName: "integration-questions.txt",
      mimeType: "text/plain",
      sizeBytes: 64,
      content: "Question 1: What is FIFO?\nQuestion 2: What is enqueue?",
    },
    201,
    "document import creates candidates",
  );
  assertEqual(
    String(importJob.status),
    "EXTRACTED",
    "TXT import extracts text without OCR",
  );
  assertEqual(
    String(importJob.parserProvider),
    "campustest-structured-parser",
    "document import records parser provider",
  );
  const importCandidates = importJob.candidates as Array<Record<string, unknown>>;
  assert(
    importCandidates.some((candidate) => String(candidate.suggestedBloomLevel)),
    "document import classifies Bloom level",
  );

  const markdownImport = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/question-imports/documents",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      fileName: "coding.md",
      mimeType: "text/markdown",
      sizeBytes: 96,
      content: "## Chapter 1\nQuestion 1: Write code to implement enqueue. 5 marks",
    },
    201,
    "Markdown document import creates candidates",
  );
  const markdownCandidates =
    markdownImport.candidates as Array<Record<string, unknown>>;
  assert(
    markdownCandidates.some(
      (candidate) => String(candidate.questionType) === "CODING",
    ),
    "document import detects coding questions",
  );

  const imageJob = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/question-imports/documents",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      fileName: "scan.png",
      mimeType: "image/png",
      sizeBytes: 64,
      content: "fake-image",
    },
    201,
    "image import is accepted as OCR-required job",
  );
  assertEqual(
    String(imageJob.status),
    "OCR_REQUIRED",
    "image import records OCR-required status when OCR is not configured",
  );

  const syllabi = await getList(baseUrl, "/api/v1/syllabi", facultySession.cookie);
  assert(syllabi.length >= 1, "syllabus list is tenant scoped");
  const syllabusId = String(syllabi[0]?.id);
  const coverageResponse = await fetch(
    `${baseUrl}/api/v1/syllabi/${syllabusId}/coverage`,
    { headers: { Cookie: facultySession.cookie } },
  );
  assertEqual(coverageResponse.status, 200, "syllabus coverage endpoint works");

  const usageResponse = await fetch(`${baseUrl}/api/v1/ai/usage`, {
    headers: { Cookie: adminSession.cookie },
  });
  assertEqual(usageResponse.status, 200, "admin can view AI usage");
  const usageBody = (await usageResponse.json()) as {
    data: Record<string, unknown>;
  };
  assert(
    Boolean(usageBody.data.generationStatistics),
    "AI usage returns generation statistics",
  );
  const settingsResponse = await fetch(`${baseUrl}/api/v1/ai/settings`, {
    headers: { Cookie: adminSession.cookie },
  });
  assertEqual(settingsResponse.status, 200, "admin can view AI settings");
  const settingsBody = (await settingsResponse.json()) as {
    data: Record<string, unknown>;
  };
  assertEqual(
    String(settingsBody.data.ocrProvider),
    "none",
    "OCR defaults to disabled unless configured",
  );

  const batch = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/ai/questions/batch-generate",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      topic: "Phase 13 batch queues",
      questionType: "TRUE_FALSE",
      requestedCount: 10,
      marks: 1,
      language: "English",
      outputStyle: "review-json",
    },
    201,
    "AI batch generation queues background jobs",
  );
  const batchId = String(batch.id);
  await expectStatus(
    fetch(`${baseUrl}/api/v1/ai/batch-generations/${batchId}`, {
      headers: { Cookie: facultySession.cookie },
    }),
    200,
    "AI batch progress endpoint works",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/ai/batch-generations/${batchId}/retry`, {
      method: "POST",
      headers: { Cookie: facultySession.cookie },
    }),
    201,
    "AI batch retry endpoint works",
  );

  const paper = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/ai/exam-engine/paper",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      title: "Phase 13 AI Paper",
      durationMinutes: 45,
      totalMarks: 2,
      blueprint: { balanced: true },
      chapterWeightage: { "Unit 1": 100 },
      difficultyDistribution: { MEDIUM: 100 },
      bloomDistribution: { UNDERSTAND: 100 },
      marksDistribution: { "1": 100 },
    },
    201,
    "AI exam paper generator creates draft assessment",
  );
  const paperAssessment = paper.assessment as Record<string, unknown>;
  assertEqual(
    String(paperAssessment.status),
    "DRAFT",
    "AI generated paper starts as draft assessment",
  );

  const randomSets = await jsonRequest<Array<Record<string, unknown>>>(
    baseUrl,
    "/api/v1/ai/exam-engine/random-sets",
    facultySession.cookie,
    "POST",
    {
      subjectId: subject.id,
      title: "Phase 13 Random",
      durationMinutes: 30,
      totalMarks: 1,
      setCodes: ["A", "B", "C", "D"],
      blueprint: { noDuplicates: true },
    },
    201,
    "random paper generator creates sets",
  );
  assertEqual(randomSets.length, 4, "random paper generator creates four sets");

  const answer = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/ai/answers/generate",
    facultySession.cookie,
    "POST",
    { questionId: String(saved[0]?.id), language: "English" },
    201,
    "AI answer generator works",
  );
  assert(Boolean(answer.answer), "AI answer generator returns model answer");

  await expectStatus(
    fetch(`${baseUrl}/api/v1/ai/exam-engine/questions/${String(saved[0]?.id)}/analytics`, {
      headers: { Cookie: facultySession.cookie },
    }),
    200,
    "question analytics endpoint works",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/question-imports/jobs/${String(importJob.id)}/validation-report`, {
      headers: { Cookie: facultySession.cookie },
    }),
    200,
    "document validation report endpoint works",
  );

  const promptName = `Phase 13 rollback prompt ${Date.now()}`;
  const prompt = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/ai/prompts",
    adminSession.cookie,
    "POST",
    {
      name: promptName,
      featureType: "QUESTION_GENERATION",
      systemInstruction: "Initial system prompt",
      userPromptTemplate: "Initial {{topic}} prompt",
      variables: ["topic"],
      providerCompatibility: ["mock"],
      temperature: 0.2,
      maxTokens: 500,
      active: true,
    },
    201,
    "admin creates rollback prompt",
  );
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/ai/prompts/${String(prompt.id)}`,
      adminSession.cookie,
      { systemInstruction: "Updated system prompt" },
    ),
    200,
    "admin versions prompt",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/ai/prompts/${String(prompt.id)}/rollback`,
      adminSession.cookie,
      { version: Number(prompt.version) },
    ),
    201,
    "admin rolls back prompt version",
  );
}

async function runAnalyticsReportingTests(
  baseUrl: string,
  prisma: PrismaService,
  superAdminSession: TestSession,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  const adminCollegeId = adminSession.body.user.collegeId;
  assert(Boolean(adminCollegeId), "admin session has college scope");
  const assessment = await prisma.assessment.findFirstOrThrow({
    where: { id: "seed-assessment-active-phase7" },
  });
  const question = await prisma.question.findFirstOrThrow({
    where: { collegeId: adminCollegeId ?? "" },
  });
  const studentProfile = await prisma.studentProfile.findFirstOrThrow({
    where: { collegeId: adminCollegeId ?? "" },
  });

  const platform = await getObject(
    baseUrl,
    "/api/v1/analytics/platform",
    superAdminSession.cookie,
  );
  assert(
    Number((platform.totals as Record<string, unknown>).totalColleges) >= 1,
    "platform analytics returns real college count",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/analytics/platform`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "student cannot access platform analytics",
  );

  const college = await getObject(
    baseUrl,
    "/api/v1/analytics/college",
    adminSession.cookie,
  );
  const rates = college.rates as Record<string, unknown>;
  assert(
    typeof rates.participationRate === "number" &&
      typeof rates.completionRate === "number" &&
      typeof rates.averageScore === "number" &&
      typeof rates.passPercentage === "number",
    "college analytics returns participation, completion, average, and pass rates",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/analytics/faculty`, {
      headers: { Cookie: facultySession.cookie },
    }),
    200,
    "faculty analytics is available",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/analytics/student`, {
      headers: { Cookie: studentSession.cookie },
    }),
    200,
    "student analytics is available",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/students/${studentProfile.id}/analytics`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "authorized student report analytics works",
  );

  const assessmentAnalytics = await getObject(
    baseUrl,
    `/api/v1/assessments/${assessment.id}/analytics`,
    facultySession.cookie,
  );
  assert(
    Boolean(assessmentAnalytics.scores) &&
      Boolean(assessmentAnalytics.formulae),
    "assessment analytics returns score statistics and documented formulae",
  );

  const questionAnalytics = await getObject(
    baseUrl,
    `/api/v1/questions/${question.id}/analytics`,
    facultySession.cookie,
  );
  assert(
    "measuredDifficulty" in questionAnalytics &&
      "lowSampleWarning" in questionAnalytics,
    "question analytics returns measured difficulty and low-sample warning",
  );

  await expectStatus(
    fetch(`${baseUrl}/api/v1/analytics/subjects`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "subject analytics endpoint works",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/analytics/topics`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "topic analytics endpoint works",
  );

  const comparison = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/analytics/compare",
    adminSession.cookie,
    "POST",
    { dimension: "subject", metric: "averageScore" },
    201,
    "comparison analytics works",
  );
  assert(Array.isArray(comparison.rows), "comparison analytics returns rows");

  const leaderboard = await getObject(
    baseUrl,
    `/api/v1/assessments/${assessment.id}/leaderboard`,
    adminSession.cookie,
  );
  assert(
    Array.isArray(leaderboard.entries),
    "leaderboard returns published rank entries",
  );

  const report = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/reports",
    adminSession.cookie,
    "POST",
    {
      name: "Integration Formula Report",
      reportType: "assessment-results",
      columns: ["=unsafe", "percentage", "passStatus"],
      outputFormat: "CSV",
    },
    201,
    "saved report is created",
  );
  const run = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/reports/${String(report.id)}/run`,
    adminSession.cookie,
    "POST",
    { outputFormat: "CSV" },
    201,
    "report generation job completes",
  );
  const file = run.file as Record<string, unknown>;
  const download = await fetch(
    `${baseUrl}/api/v1/report-files/${String(file.id)}/download`,
    { headers: { Cookie: adminSession.cookie } },
  );
  assertEqual(download.status, 200, "report download works");
  const csv = await download.text();
  assert(!csv.includes("passwordHash"), "report export excludes password hashes");
  const audit = await prisma.exportAudit.findFirst({
    where: { reportFileId: String(file.id), userId: adminSession.body.user.id },
  });
  assert(Boolean(audit), "report download creates export audit");

  const insightResponse = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/analytics/insights/generate",
    adminSession.cookie,
    "POST",
    {},
    201,
    "analytics insight generation works",
  );
  const insight = insightResponse.insight as Record<string, unknown>;
  await expectStatus(
    patchJsonWithCookie(
      baseUrl,
      `/api/v1/analytics/insights/${String(insight.id)}/review`,
      adminSession.cookie,
      { status: "USEFUL", reviewNote: "Reviewed in integration test." },
    ),
    200,
    "analytics insight review works",
  );
}

async function runProctoringTests(
  baseUrl: string,
  prisma: PrismaService,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: "seed-assessment-active-phase7" },
  });
  const collegeId = assessment.collegeId ?? studentSession.body.user.collegeId;
  if (!collegeId) {
    throw new Error("Assertion failed: proctoring test college scope exists");
  }
  const attemptNumber = 900 + Math.floor(Math.random() * 1000);
  const attempt = await prisma.testAttempt.create({
    data: {
      collegeId,
      assessmentId: assessment.id,
      studentId: studentSession.body.user.id,
      attemptNumber,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      idempotencyKey: `phase15-${attemptNumber.toString()}`,
      clientStartMetadata: { phase: 15 },
    },
  });

  await getObject(
    baseUrl,
    `/api/v1/student/assessments/${assessment.id}/proctoring-policy`,
    studentSession.cookie,
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/assessments/${assessment.id}/proctoring-consent`,
    studentSession.cookie,
    "POST",
    { accepted: true, consentVersion: "integration-v1" },
    201,
    "proctoring consent",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/assessments/${assessment.id}/system-check`,
    studentSession.cookie,
    "POST",
    { browser: "integration-test", fullscreenSupported: true, deviceHash: "phase15-device" },
    201,
    "proctoring system check",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/proctoring/start`,
    studentSession.cookie,
    "POST",
    { deviceHash: "phase15-device" },
    201,
    "proctoring start",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/proctoring/events/batch`,
    studentSession.cookie,
    "POST",
    {
      events: [
        {
          eventType: "FULLSCREEN_EXIT",
          sequenceNumber: 1,
          idempotencyKey: "phase15-fullscreen",
          clientTimestamp: new Date().toISOString(),
        },
        {
          eventType: "TAB_HIDDEN",
          sequenceNumber: 2,
          idempotencyKey: "phase15-tab",
          clientTimestamp: new Date().toISOString(),
        },
      ],
    },
    201,
    "proctoring event batch",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/proctoring/events/batch`,
    studentSession.cookie,
    "POST",
    {
      events: [
        {
          eventType: "TAB_HIDDEN",
          sequenceNumber: 2,
          idempotencyKey: "phase15-tab",
          clientTimestamp: new Date().toISOString(),
        },
      ],
    },
    201,
    "proctoring duplicate event is idempotent",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/proctoring/heartbeat`,
    studentSession.cookie,
    "POST",
    { sequenceNumber: 1, connectivityState: "online", fullscreenState: "active" },
    201,
    "proctoring heartbeat",
  );
  const evidenceResponse = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/proctoring/evidence`,
    studentSession.cookie,
    "POST",
    {
      evidenceType: "CAMERA_SNAPSHOT",
      fileName: "integration-metadata.png",
      mimeType: "image/png",
      sizeBytes: 512,
      checksum: "integration-checksum",
    },
    201,
    "proctoring evidence metadata",
  );
  const evidence = evidenceResponse.evidence as Record<string, unknown>;
  assert(!JSON.stringify(evidenceResponse).includes("storageKey"), "student evidence response keeps storage key private");

  const session = await prisma.proctoringSession.findUniqueOrThrow({
    where: { attemptId: attempt.id },
  });
  await expectStatus(
    fetch(`${baseUrl}/api/v1/proctoring/sessions`, {
      headers: { Cookie: studentSession.cookie },
    }),
    403,
    "student cannot open proctor console",
  );
  await getObject(baseUrl, `/api/v1/proctoring/sessions/${session.id}`, facultySession.cookie);
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/proctoring/sessions/${session.id}/warn`,
    facultySession.cookie,
    "POST",
    { message: "Please return to the expected exam state." },
    201,
    "proctor warning",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/proctoring/sessions/${session.id}/flag`,
    adminSession.cookie,
    "POST",
    { reason: "Integration review flag." },
    201,
    "manual proctor flag",
  );
  await getObject(baseUrl, `/api/v1/proctoring/reviews/${session.id}`, adminSession.cookie);
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/proctoring/reviews/${session.id}`,
    adminSession.cookie,
    "PATCH",
    { decision: "NEEDS_FOLLOW_UP", reason: "Integration review decision." },
    200,
    "proctoring review decision",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/proctoring/evidence/${String(evidence.id)}/access-link`,
    adminSession.cookie,
    "POST",
    {},
    201,
    "private evidence access audit",
  );
  const audit = await prisma.evidenceAccessAudit.findFirst({
    where: { evidenceId: String(evidence.id), userId: adminSession.body.user.id },
  });
  assert(Boolean(audit), "evidence access is audited");
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/proctoring/retention/run",
    adminSession.cookie,
    "POST",
    {},
    201,
    "proctoring retention job",
  );
}

async function runCodingJudgeTests(
  baseUrl: string,
  prisma: PrismaService,
  adminSession: TestSession,
  facultySession: TestSession,
  studentSession: TestSession,
): Promise<void> {
  await expectStatus(
    fetch(`${baseUrl}/api/v1/code-runner/health`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "code runner health",
  );
  await expectStatus(
    fetch(`${baseUrl}/api/v1/code-runner/languages`, {
      headers: { Cookie: adminSession.cookie },
    }),
    200,
    "code runner language registry",
  );
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: "seed-assessment-active-phase7" } });
  const question = await prisma.question.findUniqueOrThrow({ where: { id: "seed-q-coding" } });
  const attempt = await prisma.testAttempt.create({
    data: {
      collegeId: assessment.collegeId ?? studentSession.body.user.collegeId ?? "",
      assessmentId: assessment.id,
      studentId: studentSession.body.user.id,
      attemptNumber: 7000 + Math.floor(Math.random() * 1000),
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      idempotencyKey: `phase16-${Date.now().toString()}`,
    },
  });
  const attemptQuestion = await prisma.attemptQuestion.create({
    data: {
      attemptId: attempt.id,
      originalQuestionId: question.id,
      displayOrder: 1,
      questionType: "CODING",
      questionTextSnapshot: question.questionText ?? question.prompt ?? "Coding question",
      assignedMarks: question.defaultMarks,
    },
  });

  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/student/attempts/${attempt.id}/coding/${attemptQuestion.id}/run`,
      studentSession.cookie,
      { languageId: "brainfuck", sourceCode: "print('x')" },
    ),
    400,
    "unsupported language rejected",
  );
  await expectStatus(
    postJsonWithCookie(
      baseUrl,
      `/api/v1/student/attempts/${attempt.id}/coding/${attemptQuestion.id}/run`,
      studentSession.cookie,
      { languageId: "python", sourceCode: "x".repeat(70000) },
    ),
    400,
    "source size limit enforced",
  );
  const runResponse = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/coding/${attemptQuestion.id}/run`,
    studentSession.cookie,
    "POST",
    { languageId: "python", sourceCode: "print('MOCK_ACCEPTED')" },
    201,
    "run public coding sample",
  );
  assertEqual(runResponse.mockResult, true, "run uses labelled mock mode");
  await getObject(baseUrl, `/api/v1/coding/jobs/${String(runResponse.jobId)}`, studentSession.cookie);
  const submitResponse = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/student/attempts/${attempt.id}/coding/${attemptQuestion.id}/submit`,
    studentSession.cookie,
    "POST",
    { languageId: "python", sourceCode: "print('MOCK_ACCEPTED')" },
    201,
    "submit coding solution",
  );
  const history = await getObject(baseUrl, `/api/v1/student/coding-submissions/${String(submitResponse.submissionId)}`, studentSession.cookie);
  const serialized = JSON.stringify(history);
  assert(!serialized.includes("-2 8"), "hidden test input is not returned to student");
  assert(!serialized.includes("expectedOutput"), "hidden expected output is not returned to student");
  await getObject(baseUrl, `/api/v1/coding/submissions/${String(submitResponse.submissionId)}`, facultySession.cookie);
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/coding/submissions/${String(submitResponse.submissionId)}/rejudge`,
    facultySession.cookie,
    "POST",
    { reason: "Integration rejudge." },
    201,
    "coding rejudge",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/coding/submissions/${String(submitResponse.submissionId)}/hold`,
    adminSession.cookie,
    "POST",
    { reason: "Integration hold." },
    201,
    "coding hold",
  );
  await jsonRequest<Record<string, unknown>>(
    baseUrl,
    `/api/v1/coding/submissions/${String(submitResponse.submissionId)}/score`,
    adminSession.cookie,
    "PATCH",
    { score: 8, reason: "Integration score override." },
    200,
    "coding score override audit",
  );
  const plagiarismJob = await jsonRequest<Record<string, unknown>>(
    baseUrl,
    "/api/v1/coding/plagiarism/jobs",
    facultySession.cookie,
    "POST",
    { assessmentId: assessment.id },
    201,
    "plagiarism job",
  );
  await getObject(baseUrl, `/api/v1/coding/plagiarism/jobs/${String(plagiarismJob.id)}`, facultySession.cookie);
  await getObject(baseUrl, "/api/v1/analytics/coding", adminSession.cookie);
}

async function pollJob(
  baseUrl: string,
  jobId: string,
  cookie: string,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/v1/ai/jobs/${jobId}`, {
      headers: { Cookie: cookie },
    });
    if (!response.ok) {
      throw new Error(`Assertion failed: poll AI job. ${await response.text()}`);
    }
    const body = (await response.json()) as { data: Record<string, unknown> };
    if (String(body.data.status) === "COMPLETED") {
      return body.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Assertion failed: AI job did not complete.");
}

async function postJson(
  baseUrl: string,
  path: string,
  body: Record<string, string>,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postJsonWithCookie(
  baseUrl: string,
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

async function patchJsonWithCookie(
  baseUrl: string,
  path: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

async function jsonRequest<T>(
  baseUrl: string,
  path: string,
  cookie: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  expected: number,
  label: string,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  if (response.status !== expected) {
    throw new Error(`Assertion failed: ${label}. ${await response.text()}`);
  }
  const parsed = (await response.json()) as { success: true; data: T };
  assert(Boolean(parsed.data), `${label} returned data`);
  assert(
    !JSON.stringify(parsed.data).includes("passwordHash"),
    `${label} does not leak password hashes`,
  );
  return parsed.data;
}

async function createCollege(
  baseUrl: string,
  cookie: string,
  body: Record<string, unknown>,
): Promise<{ success: true; data: Record<string, unknown> }> {
  const response = await postJsonWithCookie(
    baseUrl,
    "/api/v1/colleges",
    cookie,
    body,
  );
  if (response.status !== 201) {
    throw new Error(
      `Assertion failed: super admin can create college. ${await response.text()}`,
    );
  }

  return (await response.json()) as {
    success: true;
    data: Record<string, unknown>;
  };
}

async function getList(
  baseUrl: string,
  path: string,
  cookie: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  });
  if (!response.ok) {
    throw new Error(`Assertion failed: list ${path}. ${await response.text()}`);
  }
  const body = (await response.json()) as {
    data: Array<Record<string, unknown>>;
  };
  return body.data;
}

async function getObject(
  baseUrl: string,
  path: string,
  cookie: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  });
  if (!response.ok) {
    throw new Error(`Assertion failed: get ${path}. ${await response.text()}`);
  }
  const body = (await response.json()) as {
    data: Record<string, unknown>;
  };
  assert(Boolean(body.data), `get ${path} returned data`);
  return body.data;
}

async function expectStatus(
  responsePromise: Promise<Response>,
  expected: number,
  label: string,
): Promise<void> {
  const response = await responsePromise;
  assertEqual(response.status, expected, label);
}

function cookieHeader(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  return setCookie
    .split(/,(?=\s?\w+=)/)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
}

function mustGet(map: Map<string, TestSession>, role: string): TestSession {
  const session = map.get(role);
  if (!session) {
    throw new Error(`Missing session for ${role}.`);
  }

  return session;
}

function assert(value: boolean, label: string): void {
  if (!value) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${label}. Expected ${String(expected)}, got ${String(actual)}.`,
    );
  }
}

void main();

async function clearLoginRateKeys(redis: RedisService): Promise<void> {
  const keys = [
    ...(await redis.client.keys("login-rate:*")),
    ...(await redis.client.keys("password-reset-rate:*")),
  ];
  if (keys.length > 0) {
    await redis.client.del(...keys);
  }
}
