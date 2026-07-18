import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditEvent,
  CollegeStatus,
  Prisma,
  Role,
} from "../../../generated/phase5-client";
import * as argon2 from "argon2";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCollegeDto,
  ListCollegesQueryDto,
  UpdateCollegeDto,
  UpdateCollegeStatusDto,
} from "./dto/college.dto";

type CollegeWithCounts = Prisma.CollegeGetPayload<{
  include: {
    _count: { select: { users: true } };
    users: { select: { id: true; email: true; name: true; phone: true } };
  };
}>;

@Injectable()
export class CollegesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ListCollegesQueryDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 10);
    const where: Prisma.CollegeWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { collegeCode: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { city: { contains: query.search, mode: "insensitive" } },
              { state: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.CollegeOrderByWithRelationInput = {
      [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc",
    };
    const [total, colleges] = await this.prisma.$transaction([
      this.prisma.college.count({ where }),
      this.prisma.college.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { users: true } } },
      }),
    ]);

    return {
      success: true,
      data: colleges.map((college) => this.toListItem(college)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async get(id: string) {
    const college = await this.findVisibleCollege(id);
    const [students, faculty, tests, activeTests, recentActivity] =
      await this.prisma.$transaction([
        this.prisma.user.count({
          where: { collegeId: id, role: Role.STUDENT, isActive: true },
        }),
        this.prisma.user.count({
          where: { collegeId: id, role: Role.FACULTY, isActive: true },
        }),
        this.prisma.assessment.count({
          where: { course: { instructor: { collegeId: id } } },
        }),
        this.prisma.assessment.count({
          where: {
            status: "PUBLISHED",
            course: { instructor: { collegeId: id } },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { collegeId: id },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

    return {
      success: true,
      data: {
        ...this.toDetail(college),
        statistics: {
          totalStudents: students,
          totalFaculty: faculty,
          totalTests: tests,
          activeTests,
        },
        recentActivity,
      },
    };
  }

  async create(dto: CreateCollegeDto, actor: AuthenticatedUser) {
    await this.ensureUnique(dto.collegeCode, dto.email);
    if (dto.firstAdmin) {
      await this.ensureUserEmailAvailable(dto.firstAdmin.email);
    }

    const college = await this.prisma.$transaction(async (tx) => {
      const created = await tx.college.create({
        data: {
          slug: this.slugify(dto.collegeCode),
          collegeCode: dto.collegeCode.trim().toUpperCase(),
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: this.optional(dto.phone),
          website: this.optional(dto.website),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: this.optional(dto.addressLine2),
          city: dto.city.trim(),
          state: dto.state.trim(),
          postalCode: dto.postalCode.trim(),
          country: dto.country.trim(),
          logoUrl: this.optional(dto.logoUrl),
          status: dto.status ?? CollegeStatus.ACTIVE,
          isActive:
            (dto.status ?? CollegeStatus.ACTIVE) === CollegeStatus.ACTIVE,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });

      if (dto.firstAdmin) {
        await tx.user.create({
          data: {
            email: dto.firstAdmin.email.trim().toLowerCase(),
            name: dto.firstAdmin.fullName.trim(),
            phone: this.optional(dto.firstAdmin.phone),
            role: Role.COLLEGE_ADMIN,
            passwordHash: await argon2.hash(dto.firstAdmin.temporaryPassword),
            mustChangePassword: true,
            collegeId: created.id,
            isActive: true,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          event: AuditEvent.COLLEGE_CREATE,
          userId: actor.id,
          actorRole: actor.role,
          collegeId: created.id,
          metadata: { collegeCode: created.collegeCode },
        },
      });

      return created;
    });

    return { success: true, data: this.toListItem(college) };
  }

  async update(id: string, dto: UpdateCollegeDto, actor: AuthenticatedUser) {
    await this.findVisibleCollege(id);
    if (dto.email) {
      await this.ensureUniqueEmail(dto.email, id);
    }

    const college = await this.prisma.college.update({
      where: { id },
      data: {
        ...this.cleanUpdate(dto),
        updatedById: actor.id,
        auditLogs: {
          create: {
            event: AuditEvent.COLLEGE_UPDATE,
            userId: actor.id,
            actorRole: actor.role,
            metadata: { fields: Object.keys(dto) },
          },
        },
      },
    });

    return { success: true, data: this.toListItem(college) };
  }

  async updateStatus(
    id: string,
    dto: UpdateCollegeStatusDto,
    actor: AuthenticatedUser,
  ) {
    await this.findVisibleCollege(id);
    const event =
      dto.status === CollegeStatus.ACTIVE
        ? AuditEvent.COLLEGE_ACTIVATE
        : AuditEvent.COLLEGE_DEACTIVATE;
    const college = await this.prisma.college.update({
      where: { id },
      data: {
        status: dto.status,
        isActive: dto.status === CollegeStatus.ACTIVE,
        updatedById: actor.id,
        auditLogs: {
          create: {
            event,
            userId: actor.id,
            actorRole: actor.role,
            metadata: {},
          },
        },
      },
    });

    return { success: true, data: this.toListItem(college) };
  }

  async archive(id: string, actor: AuthenticatedUser) {
    const college = await this.findVisibleCollege(id);
    const dependencyCount =
      college._count.users +
      (await this.prisma.assessment.count({
        where: { course: { instructor: { collegeId: id } } },
      }));

    const archived = await this.prisma.college.update({
      where: { id },
      data: {
        status: CollegeStatus.INACTIVE,
        isActive: false,
        deletedAt: new Date(),
        updatedById: actor.id,
        auditLogs: {
          create: {
            event: AuditEvent.COLLEGE_DELETE,
            userId: actor.id,
            actorRole: actor.role,
            metadata: { mode: "soft_delete", dependencyCount },
          },
        },
      },
    });

    return { success: true, data: this.toListItem(archived) };
  }

  private async findVisibleCollege(id: string): Promise<CollegeWithCounts> {
    const college = await this.prisma.college.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { users: true } },
        users: {
          where: { role: Role.COLLEGE_ADMIN },
          select: { id: true, email: true, name: true, phone: true },
        },
      },
    });
    if (!college) {
      throw new NotFoundException("College not found.");
    }

    return college;
  }

  private async ensureUnique(
    collegeCode: string,
    email: string,
  ): Promise<void> {
    const existing = await this.prisma.college.findFirst({
      where: {
        OR: [
          { collegeCode: collegeCode.trim().toUpperCase() },
          { email: email.trim().toLowerCase() },
        ],
        deletedAt: null,
      },
    });
    if (existing?.collegeCode === collegeCode.trim().toUpperCase()) {
      throw new ConflictException("College code already exists.");
    }
    if (existing?.email === email.trim().toLowerCase()) {
      throw new ConflictException("College email already exists.");
    }
  }

  private async ensureUniqueEmail(
    email: string,
    collegeId: string,
  ): Promise<void> {
    const existing = await this.prisma.college.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        id: { not: collegeId },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException("College email already exists.");
    }
  }

  private async ensureUserEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("Admin email already exists.");
    }
  }

  private cleanUpdate(
    dto: UpdateCollegeDto,
  ): Prisma.CollegeUncheckedUpdateInput {
    return {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.phone !== undefined ? { phone: this.optional(dto.phone) } : {}),
      ...(dto.website !== undefined
        ? { website: this.optional(dto.website) }
        : {}),
      ...(dto.addressLine1 ? { addressLine1: dto.addressLine1.trim() } : {}),
      ...(dto.addressLine2 !== undefined
        ? { addressLine2: this.optional(dto.addressLine2) }
        : {}),
      ...(dto.city ? { city: dto.city.trim() } : {}),
      ...(dto.state ? { state: dto.state.trim() } : {}),
      ...(dto.postalCode ? { postalCode: dto.postalCode.trim() } : {}),
      ...(dto.country ? { country: dto.country.trim() } : {}),
      ...(dto.logoUrl !== undefined
        ? { logoUrl: this.optional(dto.logoUrl) }
        : {}),
    };
  }

  private toListItem(college: {
    id: string;
    name: string;
    collegeCode: string;
    email: string;
    city: string;
    state: string;
    country: string;
    status: CollegeStatus;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    return {
      id: college.id,
      name: college.name,
      collegeCode: college.collegeCode,
      email: college.email,
      location: `${college.city}, ${college.state}`,
      city: college.city,
      state: college.state,
      country: college.country,
      status: college.status,
      createdAt: college.createdAt,
      updatedAt: college.updatedAt,
      deletedAt: college.deletedAt,
    };
  }

  private toDetail(college: CollegeWithCounts) {
    return {
      ...this.toListItem(college),
      phone: college.phone,
      website: college.website,
      addressLine1: college.addressLine1,
      addressLine2: college.addressLine2,
      postalCode: college.postalCode,
      logoUrl: college.logoUrl,
      collegeAdmins: college.users,
      userCount: college._count.users,
    };
  }

  private optional(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private slugify(code: string): string {
    return code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  }
}
