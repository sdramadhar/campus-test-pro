import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import {
  EntityStatus,
  Gender,
  Prisma,
  Role,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  AssignmentDto,
  BatchDto,
  BulkStudentsDto,
  CourseDto,
  DepartmentDto,
  FacultyDto,
  ListQueryDto,
  ResetPasswordDto,
  SemesterDto,
  StudentDto,
  SubjectDto,
} from "./dto/academic.dto";

type TenantUser = AuthenticatedUser;
type PublicUserSelect = {
  id: true;
  email: true;
  studentId: true;
  phone: true;
  name: true;
  role: true;
  isActive: true;
  collegeId: true;
  createdAt: true;
  updatedAt: true;
};

const publicUserSelect: PublicUserSelect = {
  id: true,
  email: true,
  studentId: true,
  phone: true,
  name: true,
  role: true,
  isActive: true,
  collegeId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class AcademicService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dashboard(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const where = collegeId ? { collegeId } : {};
    const [
      departments,
      courses,
      semesters,
      subjects,
      faculty,
      students,
      batches,
    ] = await this.prisma.$transaction([
      this.prisma.department.count({ where }),
      this.prisma.course.count({ where }),
      this.prisma.semester.count({ where }),
      this.prisma.subject.count({ where }),
      this.prisma.facultyProfile.count({ where }),
      this.prisma.studentProfile.count({ where }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      success: true,
      data: {
        departments,
        courses,
        semesters,
        subjects,
        faculty,
        students,
        batches,
      },
    };
  }

  async listDepartments(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate("department", query, {
      ...(collegeId ? { collegeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                departmentName: { contains: query.search, mode: "insensitive" },
              },
              {
                departmentCode: { contains: query.search, mode: "insensitive" },
              },
            ],
          }
        : {}),
    });
  }

  async createDepartment(user: TenantUser, dto: DepartmentDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureCollege(collegeId);
    try {
      const department = await this.prisma.department.create({
        data: {
          collegeId,
          departmentName: dto.departmentName.trim(),
          departmentCode: dto.departmentCode.trim().toUpperCase(),
          description: this.optional(dto.description),
          status: dto.status ?? EntityStatus.ACTIVE,
        },
      });
      return { success: true, data: department };
    } catch (error) {
      this.throwConflict(error, "Department code already exists.");
    }
  }

  async getDepartment(user: TenantUser, id: string) {
    return { success: true, data: await this.findDepartment(user, id) };
  }

  async updateDepartment(
    user: TenantUser,
    id: string,
    dto: Partial<DepartmentDto>,
  ) {
    const existing = await this.findDepartment(user, id);
    const department = await this.prisma.department.update({
      where: { id: existing.id },
      data: {
        ...(dto.departmentName
          ? { departmentName: dto.departmentName.trim() }
          : {}),
        ...(dto.departmentCode
          ? { departmentCode: dto.departmentCode.trim().toUpperCase() }
          : {}),
        ...(dto.description !== undefined
          ? { description: this.optional(dto.description) }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
    return { success: true, data: department };
  }

  async deleteDepartment(user: TenantUser, id: string) {
    const existing = await this.findDepartment(user, id);
    const department = await this.prisma.department.update({
      where: { id: existing.id },
      data: { status: EntityStatus.INACTIVE },
    });
    return { success: true, data: department };
  }

  async listCourses(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate("course", query, {
      ...(collegeId ? { collegeId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { courseName: { contains: query.search, mode: "insensitive" } },
              { shortName: { contains: query.search, mode: "insensitive" } },
              { title: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    });
  }

  async createCourse(user: TenantUser, dto: CourseDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureDepartmentInCollege(dto.departmentId, collegeId);
    const totalSemesters = dto.durationYears * 2;
    const instructorId = await this.defaultInstructorId(collegeId);
    try {
      const course = await this.prisma.course.create({
        data: {
          code: `${collegeId}-${dto.shortName.trim().toUpperCase()}`,
          title: dto.courseName.trim(),
          term: "Academic",
          instructorId,
          collegeId,
          departmentId: dto.departmentId,
          courseName: dto.courseName.trim(),
          shortName: dto.shortName.trim().toUpperCase(),
          durationYears: dto.durationYears,
          totalSemesters,
          status: dto.status ?? EntityStatus.ACTIVE,
          semesters: {
            create: Array.from({ length: totalSemesters }, (_value, index) => ({
              collegeId,
              semesterNumber: index + 1,
              semesterName: `Semester ${String(index + 1)}`,
              status: EntityStatus.ACTIVE,
            })),
          },
        },
        include: { semesters: true },
      });
      return { success: true, data: course };
    } catch (error) {
      this.throwConflict(
        error,
        "Course short name already exists for this college.",
      );
    }
  }

  async getCourse(user: TenantUser, id: string) {
    const course = await this.findCourse(user, id);
    return { success: true, data: course };
  }

  async updateCourse(user: TenantUser, id: string, dto: Partial<CourseDto>) {
    const existing = await this.findCourse(user, id);
    const course = await this.prisma.course.update({
      where: { id: existing.id },
      data: {
        ...(dto.courseName
          ? { courseName: dto.courseName.trim(), title: dto.courseName.trim() }
          : {}),
        ...(dto.shortName
          ? { shortName: dto.shortName.trim().toUpperCase() }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
    return { success: true, data: course };
  }

  async deleteCourse(user: TenantUser, id: string) {
    const existing = await this.findCourse(user, id);
    const course = await this.prisma.course.update({
      where: { id: existing.id },
      data: { status: EntityStatus.INACTIVE },
    });
    return { success: true, data: course };
  }

  async listSemesters(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate("semester", query, {
      ...(collegeId ? { collegeId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { semesterName: { contains: query.search, mode: "insensitive" } }
        : {}),
    });
  }

  async updateSemester(user: TenantUser, id: string, dto: SemesterDto) {
    const semester = await this.findSemester(user, id);
    return {
      success: true,
      data: await this.prisma.semester.update({
        where: { id: semester.id },
        data: {
          semesterName: dto.semesterName,
          status: dto.status ?? semester.status,
        },
      }),
    };
  }

  async listSubjects(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate("subject", query, {
      ...(collegeId ? { collegeId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { subjectName: { contains: query.search, mode: "insensitive" } },
              { subjectCode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    });
  }

  async createSubject(user: TenantUser, dto: SubjectDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureAcademicLinks(
      collegeId,
      dto.departmentId,
      dto.courseId,
      dto.semesterId,
    );
    try {
      const subject = await this.prisma.subject.create({
        data: {
          collegeId,
          departmentId: dto.departmentId,
          courseId: dto.courseId,
          semesterId: dto.semesterId,
          subjectName: dto.subjectName.trim(),
          subjectCode: dto.subjectCode.trim().toUpperCase(),
          credits: dto.credits,
          status: dto.status ?? EntityStatus.ACTIVE,
        },
      });
      return { success: true, data: subject };
    } catch (error) {
      this.throwConflict(error, "Subject code already exists.");
    }
  }

  async updateSubject(user: TenantUser, id: string, dto: Partial<SubjectDto>) {
    const subject = await this.findSubject(user, id);
    return {
      success: true,
      data: await this.prisma.subject.update({
        where: { id: subject.id },
        data: {
          ...(dto.subjectName ? { subjectName: dto.subjectName.trim() } : {}),
          ...(dto.subjectCode
            ? { subjectCode: dto.subjectCode.trim().toUpperCase() }
            : {}),
          ...(dto.credits ? { credits: dto.credits } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
      }),
    };
  }

  async deleteSubject(user: TenantUser, id: string) {
    const subject = await this.findSubject(user, id);
    return {
      success: true,
      data: await this.prisma.subject.update({
        where: { id: subject.id },
        data: { status: EntityStatus.INACTIVE },
      }),
    };
  }

  async listBatches(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate("batch", query, {
      ...(collegeId ? { collegeId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { batchName: { contains: query.search, mode: "insensitive" } }
        : {}),
    });
  }

  async createBatch(user: TenantUser, dto: BatchDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    const course = await this.ensureCourseInCollege(dto.courseId, collegeId);
    await this.ensureSemesterInCollege(dto.semesterId, collegeId);
    const batchName = `${String(dto.academicYear)} ${course.shortName ?? course.code} ${dto.section.trim().toUpperCase()}`;
    try {
      return {
        success: true,
        data: await this.prisma.batch.create({
          data: {
            collegeId,
            courseId: dto.courseId,
            semesterId: dto.semesterId,
            academicYear: dto.academicYear,
            section: dto.section.trim().toUpperCase(),
            batchName,
            status: dto.status ?? EntityStatus.ACTIVE,
          },
        }),
      };
    } catch (error) {
      this.throwConflict(error, "Batch already exists.");
    }
  }

  async updateBatch(user: TenantUser, id: string, dto: Partial<BatchDto>) {
    const batch = await this.findBatch(user, id);
    return {
      success: true,
      data: await this.prisma.batch.update({
        where: { id: batch.id },
        data: {
          ...(dto.section ? { section: dto.section.trim().toUpperCase() } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
      }),
    };
  }

  async deleteBatch(user: TenantUser, id: string) {
    const batch = await this.findBatch(user, id);
    return {
      success: true,
      data: await this.prisma.batch.update({
        where: { id: batch.id },
        data: { status: EntityStatus.INACTIVE },
      }),
    };
  }

  async listFaculty(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate(
      "facultyProfile",
      query,
      {
        ...(collegeId ? { collegeId } : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { employeeId: { contains: query.search, mode: "insensitive" } },
                {
                  user: {
                    name: { contains: query.search, mode: "insensitive" },
                  },
                },
                {
                  user: {
                    email: { contains: query.search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      { user: { select: publicUserSelect }, department: true },
    );
  }

  async createFaculty(user: TenantUser, dto: FacultyDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureDepartmentInCollege(dto.departmentId, collegeId);
    await this.ensureUserEmail(dto.email);
    const passwordHash = await argon2.hash(
      dto.temporaryPassword ?? "Faculty@12345",
    );
    try {
      const faculty = await this.prisma.$transaction(async (tx) => {
        const profileUser = await tx.user.create({
          data: {
            email: dto.email.trim().toLowerCase(),
            name: dto.name.trim(),
            phone: this.optional(dto.phone),
            role: Role.FACULTY,
            passwordHash,
            collegeId,
            isActive:
              (dto.status ?? EntityStatus.ACTIVE) === EntityStatus.ACTIVE,
            mustChangePassword: true,
          },
        });

        return tx.facultyProfile.create({
          data: {
            collegeId,
            employeeId: dto.employeeId.trim().toUpperCase(),
            departmentId: dto.departmentId,
            designation: dto.designation,
            qualification: dto.qualification,
            experienceYears: dto.experienceYears,
            joiningDate: new Date(dto.joiningDate),
            status: dto.status ?? EntityStatus.ACTIVE,
            userId: profileUser.id,
          },
          include: { user: { select: publicUserSelect }, department: true },
        });
      });
      return { success: true, data: faculty };
    } catch (error) {
      this.throwConflict(error, "Employee ID already exists.");
    }
  }

  async updateFaculty(user: TenantUser, id: string, dto: Partial<FacultyDto>) {
    const faculty = await this.findFaculty(user, id);
    const updated = await this.prisma.facultyProfile.update({
      where: { id: faculty.id },
      data: {
        ...(dto.designation ? { designation: dto.designation } : {}),
        ...(dto.qualification ? { qualification: dto.qualification } : {}),
        ...(dto.experienceYears !== undefined
          ? { experienceYears: dto.experienceYears }
          : {}),
        ...(dto.joiningDate ? { joiningDate: new Date(dto.joiningDate) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        user: {
          update: {
            ...(dto.name ? { name: dto.name.trim() } : {}),
            ...(dto.phone !== undefined
              ? { phone: this.optional(dto.phone) }
              : {}),
            ...(dto.status
              ? { isActive: dto.status === EntityStatus.ACTIVE }
              : {}),
          },
        },
      },
      include: { user: { select: publicUserSelect }, department: true },
    });
    return { success: true, data: updated };
  }

  async resetFacultyPassword(
    user: TenantUser,
    id: string,
    dto: ResetPasswordDto,
  ) {
    const faculty = await this.findFaculty(user, id);
    await this.prisma.user.update({
      where: { id: faculty.userId },
      data: {
        passwordHash: await argon2.hash(dto.temporaryPassword),
        mustChangePassword: true,
      },
    });
    return { success: true };
  }

  async setFacultyStatus(user: TenantUser, id: string, status: EntityStatus) {
    return this.updateFaculty(user, id, { status });
  }

  async listStudents(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate(
      "studentProfile",
      query,
      {
        ...(collegeId ? { collegeId } : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.semesterId ? { semesterId: query.semesterId } : {}),
        ...(query.batchId ? { batchId: query.batchId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { rollNumber: { contains: query.search, mode: "insensitive" } },
                {
                  user: {
                    studentId: { contains: query.search, mode: "insensitive" },
                  },
                },
                {
                  user: {
                    name: { contains: query.search, mode: "insensitive" },
                  },
                },
                {
                  user: {
                    email: { contains: query.search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      {
        user: { select: publicUserSelect },
        department: true,
        course: true,
        semester: true,
        batch: true,
      },
    );
  }

  async createStudent(user: TenantUser, dto: StudentDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureStudentLinks(collegeId, dto);
    await this.ensureUserEmail(dto.email);
    const student = await this.prisma.$transaction(async (tx) => {
      const profileUser = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          studentId: dto.studentId.trim().toUpperCase(),
          name: dto.name.trim(),
          phone: this.optional(dto.phone),
          role: Role.STUDENT,
          passwordHash: await argon2.hash(
            dto.temporaryPassword ?? "Student@12345",
          ),
          collegeId,
          isActive: (dto.status ?? EntityStatus.ACTIVE) === EntityStatus.ACTIVE,
          mustChangePassword: true,
        },
      });

      return tx.studentProfile.create({
        data: {
          collegeId,
          rollNumber: dto.rollNumber.trim().toUpperCase(),
          departmentId: dto.departmentId,
          courseId: dto.courseId,
          semesterId: dto.semesterId,
          batchId: dto.batchId,
          section: dto.section.trim().toUpperCase(),
          gender: dto.gender ?? Gender.NOT_SPECIFIED,
          dob: dto.dob ? new Date(dto.dob) : null,
          address: this.optional(dto.address),
          guardianName: this.optional(dto.guardianName),
          guardianPhone: this.optional(dto.guardianPhone),
          admissionYear: dto.admissionYear,
          status: dto.status ?? EntityStatus.ACTIVE,
          userId: profileUser.id,
        },
        include: {
          user: { select: publicUserSelect },
          department: true,
          course: true,
          semester: true,
          batch: true,
        },
      });
    });
    return { success: true, data: student };
  }

  async updateStudent(user: TenantUser, id: string, dto: Partial<StudentDto>) {
    const student = await this.findStudent(user, id);
    const updated = await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        ...(dto.section ? { section: dto.section.trim().toUpperCase() } : {}),
        ...(dto.address !== undefined
          ? { address: this.optional(dto.address) }
          : {}),
        ...(dto.guardianName !== undefined
          ? { guardianName: this.optional(dto.guardianName) }
          : {}),
        ...(dto.guardianPhone !== undefined
          ? { guardianPhone: this.optional(dto.guardianPhone) }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        user: {
          update: {
            ...(dto.name ? { name: dto.name.trim() } : {}),
            ...(dto.phone !== undefined
              ? { phone: this.optional(dto.phone) }
              : {}),
            ...(dto.status
              ? { isActive: dto.status === EntityStatus.ACTIVE }
              : {}),
          },
        },
      },
      include: {
        user: { select: publicUserSelect },
        department: true,
        course: true,
        semester: true,
        batch: true,
      },
    });
    return { success: true, data: updated };
  }

  async resetStudentPassword(
    user: TenantUser,
    id: string,
    dto: ResetPasswordDto,
  ) {
    const student = await this.findStudent(user, id);
    await this.prisma.user.update({
      where: { id: student.userId },
      data: {
        passwordHash: await argon2.hash(dto.temporaryPassword),
        mustChangePassword: true,
      },
    });
    return { success: true };
  }

  async setStudentStatus(user: TenantUser, id: string, status: EntityStatus) {
    return this.updateStudent(user, id, { status });
  }

  async bulkCreateStudents(user: TenantUser, dto: BulkStudentsDto) {
    const created = [];
    for (const student of dto.students) {
      created.push((await this.createStudent(user, student)).data);
    }
    return { success: true, data: created };
  }

  async bulkUpdateStudents(user: TenantUser, dto: BulkStudentsDto) {
    const updated = [];
    for (const student of dto.students) {
      const existing = await this.prisma.studentProfile.findFirst({
        where: {
          user: { studentId: student.studentId },
          collegeId: this.scopeCollege(user, student.collegeId, true),
        },
      });
      if (existing) {
        updated.push(
          (await this.updateStudent(user, existing.id, student)).data,
        );
      }
    }
    return { success: true, data: updated };
  }

  studentTemplate() {
    return {
      success: true,
      data: [
        "rollNumber,studentId,name,email,phone,gender,dob,address,departmentId,courseId,semesterId,batchId,section,guardianName,guardianPhone,admissionYear",
      ],
    };
  }

  async exportStudents(user: TenantUser, query: ListQueryDto) {
    const exportQuery = Object.assign(new ListQueryDto(), query, {
      page: 1,
      pageSize: 100,
    });
    const list = await this.listStudents(user, exportQuery);
    return { success: true, data: list.data };
  }

  async assignSubject(user: TenantUser, dto: AssignmentDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    const faculty = await this.ensureFacultyInCollege(dto.facultyId, collegeId);
    await this.ensureAcademicLinks(
      collegeId,
      dto.departmentId,
      "",
      dto.semesterId,
      dto.subjectId,
      dto.batchId,
    );
    const assignment = await this.prisma.subjectAssignment.upsert({
      where: {
        facultyId_subjectId_semesterId_batchId: {
          facultyId: dto.facultyId,
          subjectId: dto.subjectId,
          semesterId: dto.semesterId,
          batchId: dto.batchId,
        },
      },
      update: { status: EntityStatus.ACTIVE },
      create: {
        collegeId,
        facultyId: dto.facultyId,
        userId: faculty.userId,
        departmentId: dto.departmentId,
        subjectId: dto.subjectId,
        semesterId: dto.semesterId,
        batchId: dto.batchId,
      },
    });
    return { success: true, data: assignment };
  }

  async listAssignments(user: TenantUser, query: ListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    return this.paginate(
      "subjectAssignment",
      query,
      {
        ...(collegeId ? { collegeId } : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.semesterId ? { semesterId: query.semesterId } : {}),
        ...(query.batchId ? { batchId: query.batchId } : {}),
      },
      {
        faculty: {
          include: { user: { select: publicUserSelect }, department: true },
        },
        subject: true,
        semester: true,
        batch: true,
      },
    );
  }

  async deleteAssignment(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const assignment = await this.prisma.subjectAssignment.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!assignment) throw new NotFoundException("Assignment not found.");

    return {
      success: true,
      data: await this.prisma.subjectAssignment.update({
        where: { id: assignment.id },
        data: { status: EntityStatus.INACTIVE },
      }),
    };
  }

  private async paginate(
    model: keyof PrismaService,
    query: ListQueryDto,
    where: Record<string, unknown>,
    include?: Record<string, unknown>,
  ) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    const orderBy = {
      [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc",
    };
    const delegate = this.prisma[model] as unknown as {
      count(args: unknown): Promise<number>;
      findMany(args: unknown): Promise<unknown[]>;
    };
    const [total, data] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        include,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      success: true,
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  private scopeCollege(
    user: TenantUser,
    requested: string | undefined,
    required: boolean,
  ): string {
    if (user.role === Role.SUPER_ADMIN) {
      if (requested) return requested;
      if (required) throw new BadRequestException("collegeId is required.");
      return "";
    }
    if (user.role === Role.COLLEGE_ADMIN && user.collegeId)
      return user.collegeId;
    throw new ForbiddenException(
      "Only Super Admin and College Admin can manage academic data.",
    );
  }

  private async ensureCollege(collegeId: string) {
    const college = await this.prisma.college.findFirst({
      where: { id: collegeId, deletedAt: null },
    });
    if (!college) throw new NotFoundException("College not found.");
  }

  private async ensureDepartmentInCollege(id: string, collegeId: string) {
    const item = await this.prisma.department.findFirst({
      where: { id, collegeId },
    });
    if (!item) throw new NotFoundException("Department not found.");
  }

  private async ensureCourseInCollege(id: string, collegeId: string) {
    const item = await this.prisma.course.findFirst({
      where: { id, collegeId },
    });
    if (!item) throw new NotFoundException("Course not found.");
    return item;
  }

  private async ensureSemesterInCollege(id: string, collegeId: string) {
    const item = await this.prisma.semester.findFirst({
      where: { id, collegeId },
    });
    if (!item) throw new NotFoundException("Semester not found.");
  }

  private async ensureFacultyInCollege(id: string, collegeId: string) {
    const item = await this.prisma.facultyProfile.findFirst({
      where: { id, collegeId },
    });
    if (!item) throw new NotFoundException("Faculty not found.");
    return item;
  }

  private async ensureAcademicLinks(
    collegeId: string,
    departmentId: string,
    courseId: string,
    semesterId: string,
    subjectId?: string,
    batchId?: string,
  ) {
    await this.ensureDepartmentInCollege(departmentId, collegeId);
    if (courseId) await this.ensureCourseInCollege(courseId, collegeId);
    await this.ensureSemesterInCollege(semesterId, collegeId);
    if (
      subjectId &&
      !(await this.prisma.subject.findFirst({
        where: { id: subjectId, collegeId },
      }))
    )
      throw new NotFoundException("Subject not found.");
    if (
      batchId &&
      !(await this.prisma.batch.findFirst({
        where: { id: batchId, collegeId },
      }))
    )
      throw new NotFoundException("Batch not found.");
  }

  private async ensureStudentLinks(collegeId: string, dto: StudentDto) {
    await this.ensureAcademicLinks(
      collegeId,
      dto.departmentId,
      dto.courseId,
      dto.semesterId,
      undefined,
      dto.batchId,
    );
  }

  private async ensureUserEmail(email: string) {
    if (
      await this.prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
    ) {
      throw new ConflictException("Email already exists.");
    }
  }

  private async defaultInstructorId(collegeId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { collegeId, role: { in: [Role.FACULTY, Role.COLLEGE_ADMIN] } },
      orderBy: { createdAt: "asc" },
    });
    if (!user)
      throw new BadRequestException(
        "Create a college admin or faculty user first.",
      );
    return user.id;
  }

  private async findDepartment(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.department.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Department not found.");
    return item;
  }

  private async findCourse(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.course.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
      include: { semesters: true },
    });
    if (!item) throw new NotFoundException("Course not found.");
    return item;
  }

  private async findSemester(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.semester.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Semester not found.");
    return item;
  }

  private async findSubject(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.subject.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Subject not found.");
    return item;
  }

  private async findBatch(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.batch.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Batch not found.");
    return item;
  }

  private async findFaculty(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.facultyProfile.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Faculty not found.");
    return item;
  }

  private async findStudent(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const item = await this.prisma.studentProfile.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
    });
    if (!item) throw new NotFoundException("Student not found.");
    return item;
  }

  private throwConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }

  private optional(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
