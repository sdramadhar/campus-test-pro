import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditEvent,
  AssessmentStatus,
  NotificationStatus,
  Prisma,
  QuestionStatus,
  Role,
  ThemePreference,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminPanelQueryDto,
  UpdateCollegeSettingsDto,
  UpdateProfileDto,
  UpsertPermissionOverrideDto,
} from "./dto/admin-panel.dto";

const adminModules = [
  "dashboard",
  "students",
  "faculty",
  "departments",
  "subjects",
  "semesters",
  "batches",
  "college-settings",
  "permissions",
  "notifications",
  "audit-logs",
  "activity-history",
];

type CollegeSettingsWritable = Pick<
  Prisma.CollegeSettingsUncheckedCreateInput,
  | "timezone"
  | "academicYearStartMonth"
  | "brandingColor"
  | "notificationsEnabled"
  | "examGraceMinutes"
>;

@Injectable()
export class AdminPanelService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dashboard(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    this.ensureAdmin(user);
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const where = this.collegeWhere(collegeId);
    const [
      students,
      faculty,
      colleges,
      departments,
      subjects,
      exams,
      questions,
      results,
      batches,
      semesters,
      recentActivity,
      unreadNotifications,
    ] = await this.prisma.$transaction([
      this.prisma.studentProfile.count({ where }),
      this.prisma.facultyProfile.count({ where }),
      this.prisma.college.count({
        where: user.role === Role.SUPER_ADMIN ? { deletedAt: null } : { id: user.collegeId ?? "" },
      }),
      this.prisma.department.count({ where }),
      this.prisma.subject.count({ where }),
      this.prisma.assessment.count({ where }),
      this.prisma.question.count({ where }),
      this.prisma.result.count({ where }),
      this.prisma.batch.count({ where }),
      this.prisma.semester.count({ where }),
      this.prisma.activityHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.notification.count({
        where: {
          ...where,
          status: NotificationStatus.UNREAD,
          OR: [{ userId: user.id }, { userId: null }],
        },
      }),
    ]);

    const [examStatus, questionStatus, publishedResults, draftResults] =
      await Promise.all([
        this.countByAssessmentStatus(where),
        this.countByQuestionStatus(where),
        this.prisma.result.count({ where: { ...where, isPublished: true } }),
        this.prisma.result.count({ where: { ...where, isPublished: false } }),
      ]);

    return {
      success: true,
      data: {
        totals: {
          students,
          faculty,
          colleges,
          departments,
          subjects,
          exams,
          questions,
          results,
          batches,
          semesters,
          unreadNotifications,
        },
        charts: {
          examsByStatus: examStatus.map((item) => ({
            label: item.status,
            value: item.value,
          })),
          questionsByStatus: questionStatus.map((item) => ({
            label: item.status,
            value: item.value,
          })),
          resultsByPublication: [
            { label: "Published", value: publishedResults },
            { label: "Draft", value: draftResults },
          ],
        },
        recentActivity,
      },
    };
  }

  async collegeSettings(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    this.ensureAdmin(user);
    const collegeId = await this.settingsCollegeId(user, query.collegeId);
    if (!collegeId) {
      return { success: true, data: null };
    }
    const settings = await this.prisma.collegeSettings.upsert({
      where: { collegeId },
      update: {},
      create: { collegeId, updatedById: user.id },
    });
    return { success: true, data: settings };
  }

  async updateCollegeSettings(
    user: AuthenticatedUser,
    query: AdminPanelQueryDto,
    dto: UpdateCollegeSettingsDto,
  ) {
    this.ensureAdmin(user);
    const collegeId = await this.settingsCollegeId(user, query.collegeId);
    if (!collegeId) {
      throw new NotFoundException("College settings are unavailable.");
    }
    const settingsData = this.settingsData(dto);
    const settings = await this.prisma.collegeSettings.upsert({
      where: { collegeId },
      update: { ...settingsData, updatedById: user.id },
      create: { collegeId, ...settingsData, updatedById: user.id },
    });
    await this.record(
      user,
      collegeId,
      AuditEvent.ADMIN_SETTINGS_UPDATE,
      "College settings updated.",
      { fields: Object.keys(dto) },
    );
    return { success: true, data: settings };
  }

  async profile(user: AuthenticatedUser) {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        studentId: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        collegeId: true,
        themePreference: true,
        createdAt: true,
        updatedAt: true,
        college: { select: { id: true, name: true, collegeCode: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException("Profile not found.");
    }
    return { success: true, data: profile };
  }

  async updateProfile(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const profile = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        themePreference: dto.themePreference ?? ThemePreference.SYSTEM,
      },
      select: {
        id: true,
        email: true,
        studentId: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        collegeId: true,
        themePreference: true,
        updatedAt: true,
      },
    });
    await this.record(user, user.collegeId, AuditEvent.PROFILE_UPDATE, "Profile updated.", {
      fields: Object.keys(dto),
    });
    return { success: true, data: profile };
  }

  async notifications(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const { page, pageSize, skip } = this.pagination(query);
    const where: Prisma.NotificationWhereInput = {
      ...(collegeId ? { collegeId } : {}),
      OR: [{ userId: user.id }, { userId: null }],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return this.paginated(data, total, page, pageSize);
  }

  async markNotificationRead(user: AuthenticatedUser, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...(user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId }),
        OR: [{ userId: user.id }, { userId: null }],
      },
    });
    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    await this.record(
      user,
      updated.collegeId,
      AuditEvent.NOTIFICATION_READ,
      "Notification marked as read.",
      { notificationId: id },
    );
    return { success: true, data: updated };
  }

  async auditLogs(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    this.ensureAdmin(user);
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const { page, pageSize, skip } = this.pagination(query);
    const where = this.collegeWhere(collegeId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return this.paginated(data, total, page, pageSize);
  }

  async activityHistory(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    this.ensureAdmin(user);
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const { page, pageSize, skip } = this.pagination(query);
    const where = this.collegeWhere(collegeId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.activityHistory.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.activityHistory.count({ where }),
    ]);
    return this.paginated(data, total, page, pageSize);
  }

  async permissions(user: AuthenticatedUser, query: AdminPanelQueryDto) {
    this.ensureAdmin(user);
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT] },
        ...(collegeId ? { OR: [{ collegeId }, { role: Role.SUPER_ADMIN }] } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        collegeId: true,
        permissionOverrides: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 100,
    });
    return {
      success: true,
      data: {
        modules: adminModules,
        roleMatrix: this.roleMatrix(),
        users,
      },
    };
  }

  async upsertPermission(
    user: AuthenticatedUser,
    dto: UpsertPermissionOverrideDto,
  ) {
    this.ensureAdmin(user);
    const targetUserId = dto.userId ?? user.id;
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, collegeId: true, role: true },
    });
    if (!targetUser) {
      throw new NotFoundException("User not found.");
    }
    if (user.role !== Role.SUPER_ADMIN && targetUser.collegeId !== user.collegeId) {
      throw new ForbiddenException("You cannot update another college's permissions.");
    }
    const override = await this.prisma.userPermissionOverride.upsert({
      where: { userId_module: { userId: targetUser.id, module: dto.module } },
      update: {
        canView: dto.canView ?? true,
        canCreate: dto.canCreate ?? false,
        canUpdate: dto.canUpdate ?? false,
        canDelete: dto.canDelete ?? false,
      },
      create: {
        userId: targetUser.id,
        collegeId: targetUser.collegeId,
        module: dto.module,
        canView: dto.canView ?? true,
        canCreate: dto.canCreate ?? false,
        canUpdate: dto.canUpdate ?? false,
        canDelete: dto.canDelete ?? false,
      },
    });
    await this.record(
      user,
      targetUser.collegeId,
      AuditEvent.PERMISSION_OVERRIDE_UPDATE,
      "Permission override updated.",
      { targetUserId: targetUser.id, module: dto.module },
    );
    return { success: true, data: override };
  }

  private ensureAdmin(user: AuthenticatedUser): void {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.COLLEGE_ADMIN) {
      throw new ForbiddenException("Admin panel access is restricted.");
    }
  }

  private scopeCollege(
    user: AuthenticatedUser,
    requestedCollegeId: string | undefined,
    required: boolean,
  ): string | null {
    if (user.role === Role.SUPER_ADMIN) {
      if (required && !requestedCollegeId) {
        throw new ForbiddenException("A college scope is required.");
      }
      return requestedCollegeId ?? null;
    }
    if (!user.collegeId) {
      throw new ForbiddenException("A college scope is required.");
    }
    if (requestedCollegeId && requestedCollegeId !== user.collegeId) {
      throw new ForbiddenException("You cannot access another college.");
    }
    return user.collegeId;
  }

  private async settingsCollegeId(
    user: AuthenticatedUser,
    requestedCollegeId: string | undefined,
  ): Promise<string | null> {
    const scoped = this.scopeCollege(user, requestedCollegeId, false);
    if (scoped) {
      return scoped;
    }
    const college = await this.prisma.college.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return college?.id ?? null;
  }

  private collegeWhere(collegeId: string | null): { collegeId?: string } {
    return collegeId ? { collegeId } : {};
  }

  private pagination(query: AdminPanelQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
    return { page, pageSize, skip: (page - 1) * pageSize };
  }

  private paginated<T>(data: T[], total: number, page: number, pageSize: number) {
    return {
      success: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private roleMatrix() {
    return adminModules.map((module) => ({
      module,
      SUPER_ADMIN: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
      COLLEGE_ADMIN: {
        canView: module !== "colleges",
        canCreate: !["audit-logs", "activity-history"].includes(module),
        canUpdate: !["audit-logs", "activity-history"].includes(module),
        canDelete: ["students", "faculty", "departments", "subjects", "batches"].includes(module),
      },
      FACULTY: { canView: ["notifications"].includes(module), canCreate: false, canUpdate: false, canDelete: false },
      STUDENT: { canView: ["notifications"].includes(module), canCreate: false, canUpdate: false, canDelete: false },
    }));
  }

  private async countByAssessmentStatus(
    where: Prisma.AssessmentWhereInput,
  ): Promise<Array<{ status: AssessmentStatus; value: number }>> {
    return Promise.all(
      Object.values(AssessmentStatus).map(async (status) => ({
        status,
        value: await this.prisma.assessment.count({
          where: { ...where, status },
        }),
      })),
    );
  }

  private async countByQuestionStatus(
    where: Prisma.QuestionWhereInput,
  ): Promise<Array<{ status: QuestionStatus; value: number }>> {
    return Promise.all(
      Object.values(QuestionStatus).map(async (status) => ({
        status,
        value: await this.prisma.question.count({
          where: { ...where, status },
        }),
      })),
    );
  }

  private settingsData(
    dto: UpdateCollegeSettingsDto,
  ): Partial<CollegeSettingsWritable> {
    return {
      ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      ...(dto.academicYearStartMonth !== undefined
        ? { academicYearStartMonth: dto.academicYearStartMonth }
        : {}),
      ...(dto.brandingColor !== undefined
        ? { brandingColor: dto.brandingColor }
        : {}),
      ...(dto.notificationsEnabled !== undefined
        ? { notificationsEnabled: dto.notificationsEnabled }
        : {}),
      ...(dto.examGraceMinutes !== undefined
        ? { examGraceMinutes: dto.examGraceMinutes }
        : {}),
    };
  }

  private async record(
    user: AuthenticatedUser,
    collegeId: string | null,
    event: AuditEvent,
    summary: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.auditLog.create({
        data: {
          event,
          userId: user.id,
          collegeId,
          actorRole: user.role,
          metadata,
        },
      }),
      this.prisma.activityHistory.create({
        data: {
          userId: user.id,
          collegeId,
          action: event,
          summary,
          metadata,
        },
      }),
    ]);
  }
}
