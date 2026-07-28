import * as argon2 from "argon2";
import { config } from "dotenv";
import { join } from "node:path";
import { CollegeStatus, PrismaClient, Role } from "../generated/phase5-client";

for (const envPath of [
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", "..", ".env"),
]) {
  config({ path: envPath, override: false });
}

const prisma = new PrismaClient();

const demoUsers = [
  {
    email: "superadmin@campustest.local",
    name: "Sasha Super Admin",
    role: Role.SUPER_ADMIN,
    password: "Admin@12345",
    studentId: null,
  },
  {
    email: "admin@demo-college.local",
    name: "Avery College Admin",
    role: Role.COLLEGE_ADMIN,
    password: "Admin@12345",
    studentId: null,
  },
  {
    email: "faculty@demo-college.local",
    name: "Dr. Elena Rivera",
    role: Role.FACULTY,
    password: "Faculty@12345",
    studentId: null,
  },
  {
    email: "student@demo-college.local",
    name: "Maya Student",
    role: Role.STUDENT,
    password: "Student@12345",
    studentId: "STU-1001",
  },
] as const;

async function ensureDemoUser(input: (typeof demoUsers)[number], collegeId?: string) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    return existing;
  }

  const passwordHash = await argon2.hash(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
      studentId: input.studentId,
      collegeId,
      isActive: true,
      mustChangePassword: false,
    },
  });
}

async function main(): Promise<void> {
  const superAdmin = await ensureDemoUser(demoUsers[0]);

  const existingCollege = await prisma.college.findUnique({
    where: { collegeCode: "DEMO" },
  });
  const demoCollege =
    existingCollege ??
    (await prisma.college.create({
      data: {
        slug: "demo-college",
        collegeCode: "DEMO",
        name: "Demo College",
        email: "info@demo-college.local",
        phone: "+1 555 0101",
        website: "https://demo-college.local",
        addressLine1: "1 Campus Green",
        addressLine2: "Administration Block",
        city: "Springfield",
        state: "Illinois",
        postalCode: "62701",
        country: "United States",
        status: CollegeStatus.ACTIVE,
        isActive: true,
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
    }));

  await Promise.all(
    demoUsers.slice(1).map((user) => ensureDemoUser(user, demoCollege.id)),
  );

  console.log("Seeded production-safe demo college and login users.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
