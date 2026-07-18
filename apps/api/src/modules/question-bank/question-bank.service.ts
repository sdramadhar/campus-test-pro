import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssessmentStatus,
  AuditEvent,
  Prisma,
  QuestionStatus,
  QuestionType,
  Role,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  AssessmentAssignmentDto,
  AssessmentQuestionDto,
  AssessmentSectionDto,
  BankListQueryDto,
  CreateAssessmentDto,
  CreateQuestionDto,
  ImportQuestionsDto,
  ScheduleAssessmentDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
} from "./dto/question-bank.dto";

type TenantUser = AuthenticatedUser;
type ModelDelegate = {
  count(args: unknown): Promise<number>;
  findMany(args: unknown): Promise<unknown[]>;
};

const questionInclude = {
  subject: true,
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  options: { orderBy: { displayOrder: "asc" as const } },
  tags: { include: { tag: true } },
  codingQuestion: {
    include: { testCases: { orderBy: { displayOrder: "asc" as const } } },
  },
  attachments: true,
};

const assessmentInclude = {
  subject: true,
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  sections: { orderBy: { displayOrder: "asc" as const } },
  assessmentQuestions: {
    orderBy: { displayOrder: "asc" as const },
    include: { question: { include: { subject: true } }, section: true },
  },
  batchAssignments: { include: { batch: true } },
  studentAssignments: {
    include: { studentProfile: { include: { user: true } } },
  },
  assignments: true,
};

@Injectable()
export class QuestionBankService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async questionStats(user: TenantUser, query: BankListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const where = this.questionScopeWhere(user, collegeId);
    const [
      totalQuestions,
      activeQuestions,
      draftQuestions,
      totalAssessments,
      draftAssessments,
      scheduledAssessments,
      activeAssessments,
      publishedAssessments,
      byType,
      byDifficulty,
    ] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.count({
        where: { ...where, status: QuestionStatus.ACTIVE },
      }),
      this.prisma.question.count({
        where: { ...where, status: QuestionStatus.DRAFT },
      }),
      this.prisma.assessment.count({
        where: this.assessmentScopeWhere(user, collegeId),
      }),
      this.prisma.assessment.count({
        where: {
          ...this.assessmentScopeWhere(user, collegeId),
          status: AssessmentStatus.DRAFT,
        },
      }),
      this.prisma.assessment.count({
        where: {
          ...this.assessmentScopeWhere(user, collegeId),
          status: AssessmentStatus.SCHEDULED,
        },
      }),
      this.prisma.assessment.count({
        where: {
          ...this.assessmentScopeWhere(user, collegeId),
          status: AssessmentStatus.ACTIVE,
        },
      }),
      this.prisma.assessment.count({
        where: {
          ...this.assessmentScopeWhere(user, collegeId),
          status: AssessmentStatus.PUBLISHED,
        },
      }),
      this.prisma.question.groupBy({
        by: ["questionType"],
        where,
        _count: { _all: true },
      }),
      this.prisma.question.groupBy({
        by: ["difficulty"],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      success: true,
      data: {
        totalQuestions,
        activeQuestions,
        draftQuestions,
        totalAssessments,
        draftAssessments,
        scheduledAssessments,
        activeAssessments,
        publishedAssessments,
        questionsByType: Object.fromEntries(
          byType.map((row) => [
            row.questionType ?? "UNSPECIFIED",
            row._count._all,
          ]),
        ),
        questionsByDifficulty: Object.fromEntries(
          byDifficulty.map((row) => [row.difficulty, row._count._all]),
        ),
      },
    };
  }

  async listQuestions(user: TenantUser, query: BankListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const where: Prisma.QuestionWhereInput = {
      ...this.questionScopeWhere(user, collegeId),
      deletedAt: null,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.topic
        ? { topic: { contains: query.topic, mode: "insensitive" } }
        : {}),
      ...(query.creatorId && this.canFilterCreator(user)
        ? { createdById: query.creatorId }
        : {}),
      ...(query.questionType ? { questionType: query.questionType } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tag
        ? { tags: { some: { tag: { slug: this.slug(query.tag) } } } }
        : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom
                ? { gte: new Date(query.createdFrom) }
                : {}),
              ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { questionText: { contains: query.search, mode: "insensitive" } },
              { topic: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.paginate("question", query, where, questionInclude);
  }

  async getQuestion(user: TenantUser, id: string) {
    const question = await this.findQuestion(user, id);
    return { success: true, data: question };
  }

  async createQuestion(user: TenantUser, dto: CreateQuestionDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    await this.ensureSubjectAccess(user, collegeId, dto.subjectId);
    this.validateQuestion(dto, dto.status);

    const question = await this.prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          collegeId,
          subjectId: dto.subjectId,
          topic: dto.topic.trim(),
          title: dto.title.trim(),
          questionText: dto.questionText.trim(),
          prompt: dto.questionText.trim(),
          questionType: dto.questionType,
          difficulty: dto.difficulty,
          defaultMarks: dto.defaultMarks,
          defaultNegativeMarks: dto.defaultNegativeMarks ?? 0,
          points: Math.round(dto.defaultMarks),
          explanation: this.optional(dto.explanation),
          status: dto.status ?? QuestionStatus.DRAFT,
          createdById: user.id,
          updatedById: user.id,
          language: dto.coding?.allowedLanguages[0],
          metadata: this.metadata(dto),
          options: { create: this.optionCreates(dto) },
          codingQuestion: dto.coding
            ? { create: this.codingCreate(dto) }
            : undefined,
        },
        include: questionInclude,
      });
      await this.syncTags(tx, created.id, collegeId, dto.tags ?? []);
      await tx.auditLog.create({
        data: {
          event: AuditEvent.QUESTION_CREATE,
          userId: user.id,
          collegeId,
          actorRole: user.role,
        },
      });
      return tx.question.findUniqueOrThrow({
        where: { id: created.id },
        include: questionInclude,
      });
    });

    return { success: true, data: question };
  }

  async updateQuestion(user: TenantUser, id: string, dto: UpdateQuestionDto) {
    const existing = await this.findQuestion(user, id);
    await this.ensureSubjectAccess(
      user,
      existing.collegeId ?? "",
      dto.subjectId,
    );
    this.validateQuestion(dto, dto.status ?? existing.status);

    const question = await this.prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({
        where: { questionId: existing.id },
      });
      await tx.codingQuestion.deleteMany({
        where: { questionId: existing.id },
      });
      const updated = await tx.question.update({
        where: { id: existing.id },
        data: {
          subjectId: dto.subjectId,
          topic: dto.topic.trim(),
          title: dto.title.trim(),
          questionText: dto.questionText.trim(),
          prompt: dto.questionText.trim(),
          questionType: dto.questionType,
          difficulty: dto.difficulty,
          defaultMarks: dto.defaultMarks,
          defaultNegativeMarks: dto.defaultNegativeMarks ?? 0,
          points: Math.round(dto.defaultMarks),
          explanation: this.optional(dto.explanation),
          status: dto.status ?? existing.status,
          updatedById: user.id,
          version: { increment: 1 },
          language: dto.coding?.allowedLanguages[0] ?? null,
          metadata: this.metadata(dto),
          options: { create: this.optionCreates(dto) },
          codingQuestion: dto.coding
            ? { create: this.codingCreate(dto) }
            : undefined,
        },
        include: questionInclude,
      });
      await this.syncTags(
        tx,
        updated.id,
        existing.collegeId ?? "",
        dto.tags ?? [],
      );
      await tx.auditLog.create({
        data: {
          event: AuditEvent.QUESTION_UPDATE,
          userId: user.id,
          collegeId: existing.collegeId,
          actorRole: user.role,
        },
      });
      return tx.question.findUniqueOrThrow({
        where: { id: updated.id },
        include: questionInclude,
      });
    });
    return { success: true, data: question };
  }

  async updateQuestionStatus(
    user: TenantUser,
    id: string,
    status: QuestionStatus,
  ) {
    const question = await this.findQuestion(user, id);
    if (status === QuestionStatus.ACTIVE) {
      this.validateQuestionFromRecord(question);
    }
    const updated = await this.prisma.question.update({
      where: { id: question.id },
      data: {
        status,
        updatedById: user.id,
        deletedAt:
          status === QuestionStatus.ARCHIVED ? new Date() : question.deletedAt,
      },
      include: questionInclude,
    });
    await this.audit(
      user,
      question.collegeId,
      status === QuestionStatus.ACTIVE
        ? AuditEvent.QUESTION_ACTIVATE
        : status === QuestionStatus.INACTIVE
          ? AuditEvent.QUESTION_DEACTIVATE
          : AuditEvent.QUESTION_ARCHIVE,
    );
    return { success: true, data: updated };
  }

  async duplicateQuestion(user: TenantUser, id: string) {
    const question = await this.findQuestion(user, id);
    const duplicated = await this.prisma.$transaction(async (tx) => {
      const copy = await tx.question.create({
        data: {
          collegeId: question.collegeId,
          subjectId: question.subjectId,
          topic: question.topic,
          title: `${question.title ?? "Question"} Copy`,
          questionText: question.questionText,
          prompt: question.prompt,
          questionType: question.questionType,
          difficulty: question.difficulty,
          defaultMarks: question.defaultMarks,
          defaultNegativeMarks: question.defaultNegativeMarks,
          points: question.points,
          explanation: question.explanation,
          status: QuestionStatus.DRAFT,
          createdById: user.id,
          updatedById: user.id,
          language: question.language,
          metadata: question.metadata ?? undefined,
          options: {
            create: question.options.map((option) => ({
              optionText: option.optionText,
              optionKey: option.optionKey,
              displayOrder: option.displayOrder,
              isCorrect: option.isCorrect,
              explanation: option.explanation,
            })),
          },
          codingQuestion: question.codingQuestion
            ? {
                create: {
                  problemStatement: question.codingQuestion.problemStatement,
                  inputFormat: question.codingQuestion.inputFormat,
                  outputFormat: question.codingQuestion.outputFormat,
                  constraints: question.codingQuestion.constraints,
                  examples: question.codingQuestion.examples ?? undefined,
                  timeLimitMs: question.codingQuestion.timeLimitMs,
                  memoryLimitMb: question.codingQuestion.memoryLimitMb,
                  allowedLanguages: question.codingQuestion.allowedLanguages,
                  starterCode: question.codingQuestion.starterCode ?? undefined,
                  testCases: {
                    create: question.codingQuestion.testCases.map(
                      (testCase) => ({
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        visibility: testCase.visibility,
                        scoreWeight: testCase.scoreWeight,
                        displayOrder: testCase.displayOrder,
                        isActive: testCase.isActive,
                      }),
                    ),
                  },
                },
              }
            : undefined,
        },
        include: questionInclude,
      });
      await this.syncTags(
        tx,
        copy.id,
        question.collegeId ?? "",
        question.tags.map((item) => item.tag.name),
      );
      await tx.auditLog.create({
        data: {
          event: AuditEvent.QUESTION_DUPLICATE,
          userId: user.id,
          collegeId: question.collegeId,
          actorRole: user.role,
        },
      });
      return tx.question.findUniqueOrThrow({
        where: { id: copy.id },
        include: questionInclude,
      });
    });
    return { success: true, data: duplicated };
  }

  async deleteQuestion(user: TenantUser, id: string) {
    const question = await this.findQuestion(user, id);
    const updated = await this.prisma.question.update({
      where: { id: question.id },
      data: {
        status: QuestionStatus.ARCHIVED,
        deletedAt: new Date(),
        updatedById: user.id,
      },
    });
    await this.audit(user, question.collegeId, AuditEvent.QUESTION_DELETE);
    return { success: true, data: updated };
  }

  async importQuestions(user: TenantUser, dto: ImportQuestionsDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    const errors: Array<{
      rowNumber: number;
      message: string;
      rowData: Prisma.InputJsonValue;
    }> = [];
    let successCount = 0;
    for (const [index, row] of dto.rows.entries()) {
      try {
        await this.ensureSubjectAccess(user, collegeId, row.subjectId);
        this.validateQuestion(row, row.status);
        const importRow = Object.assign(new CreateQuestionDto(), row, {
          collegeId,
          status: row.status ?? QuestionStatus.DRAFT,
        });
        await this.createQuestion(user, importRow);
        successCount += 1;
      } catch (error) {
        errors.push({
          rowNumber: index + 1,
          message: error instanceof Error ? error.message : "Invalid row.",
          rowData: row as unknown as Prisma.InputJsonValue,
        });
      }
    }
    const job = await this.prisma.questionImportJob.create({
      data: {
        collegeId,
        createdById: user.id,
        totalRows: dto.rows.length,
        successCount,
        failureCount: errors.length,
        preview: dto.rows.slice(0, 5) as unknown as Prisma.InputJsonValue,
        errors: { create: errors },
      },
      include: { errors: true },
    });
    await this.audit(user, collegeId, AuditEvent.QUESTION_IMPORT);
    return { success: true, data: job };
  }

  importTemplate() {
    return {
      success: true,
      data: {
        format: "CSV/XLSX compatible columns",
        columns: [
          "subjectId",
          "topic",
          "title",
          "questionText",
          "questionType",
          "difficulty",
          "defaultMarks",
          "defaultNegativeMarks",
          "optionsJson",
          "metadataJson",
          "tags",
        ],
        instructions:
          "Use rows payload for API imports. XLSX parsing is represented by this strict row schema; no untrusted files are executed.",
      },
    };
  }

  async getImportJob(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const job = await this.prisma.questionImportJob.findFirst({
      where: { id, ...(collegeId ? { collegeId } : {}) },
      include: { errors: true },
    });
    if (!job) throw new NotFoundException("Import job not found.");
    return { success: true, data: job };
  }

  async exportQuestions(user: TenantUser, query: BankListQueryDto) {
    const list = await this.listQuestions(
      user,
      Object.assign(new BankListQueryDto(), query, { page: 1, pageSize: 100 }),
    );
    await this.audit(
      user,
      this.scopeCollege(user, query.collegeId, false) || null,
      AuditEvent.QUESTION_EXPORT,
    );
    return { success: true, data: list.data };
  }

  async listAssessments(user: TenantUser, query: BankListQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId, false);
    const where: Prisma.AssessmentWhereInput = {
      ...this.assessmentScopeWhere(user, collegeId),
      deletedAt: null,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.creatorId && this.canFilterCreator(user)
        ? { createdById: query.creatorId }
        : {}),
      ...(query.assessmentStatus ? { status: query.assessmentStatus } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    return this.paginate("assessment", query, where, assessmentInclude);
  }

  async getAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    return { success: true, data: assessment };
  }

  async createAssessment(user: TenantUser, dto: CreateAssessmentDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId, true);
    if (dto.subjectId)
      await this.ensureSubjectAccess(user, collegeId, dto.subjectId);
    if (dto.passingMarks !== undefined && dto.passingMarks < 0)
      throw new BadRequestException("Passing marks must be valid.");
    const assessment = await this.prisma.assessment.create({
      data: {
        collegeId,
        title: dto.title.trim(),
        description: this.optional(dto.description),
        instructions: this.optional(dto.instructions),
        subjectId: dto.subjectId,
        durationMinutes: dto.durationMinutes,
        durationMin: dto.durationMinutes,
        passingMarks: dto.passingMarks,
        maxAttempts: dto.maxAttempts ?? 1,
        resultVisibility: dto.resultVisibility,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleOptions: dto.shuffleOptions ?? false,
        createdById: user.id,
        updatedById: user.id,
      },
      include: assessmentInclude,
    });
    await this.audit(user, collegeId, AuditEvent.ASSESSMENT_CREATE);
    return { success: true, data: assessment };
  }

  async updateAssessment(
    user: TenantUser,
    id: string,
    dto: UpdateAssessmentDto,
  ) {
    const assessment = await this.findAssessment(user, id);
    if (dto.subjectId)
      await this.ensureSubjectAccess(
        user,
        assessment.collegeId ?? "",
        dto.subjectId,
      );
    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        title: dto.title.trim(),
        description:
          dto.description !== undefined
            ? this.optional(dto.description)
            : assessment.description,
        instructions:
          dto.instructions !== undefined
            ? this.optional(dto.instructions)
            : assessment.instructions,
        subjectId: dto.subjectId ?? assessment.subjectId,
        durationMinutes: dto.durationMinutes,
        durationMin: dto.durationMinutes,
        passingMarks: dto.passingMarks ?? assessment.passingMarks,
        maxAttempts: dto.maxAttempts ?? assessment.maxAttempts,
        resultVisibility: dto.resultVisibility ?? assessment.resultVisibility,
        shuffleQuestions: dto.shuffleQuestions ?? assessment.shuffleQuestions,
        shuffleOptions: dto.shuffleOptions ?? assessment.shuffleOptions,
        status: dto.status ?? assessment.status,
        updatedById: user.id,
      },
      include: assessmentInclude,
    });
    await this.audit(user, assessment.collegeId, AuditEvent.ASSESSMENT_UPDATE);
    return { success: true, data: updated };
  }

  async deleteAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        deletedAt: new Date(),
        status: AssessmentStatus.CANCELLED,
        updatedById: user.id,
      },
    });
    return { success: true, data: updated };
  }

  async addSection(
    user: TenantUser,
    assessmentId: string,
    dto: AssessmentSectionDto,
  ) {
    const assessment = await this.findAssessment(user, assessmentId);
    const section = await this.prisma.assessmentSection.create({
      data: {
        assessmentId: assessment.id,
        name: dto.name.trim(),
        description: this.optional(dto.description),
        instructions: this.optional(dto.instructions),
        displayOrder: dto.displayOrder,
      },
    });
    return { success: true, data: section };
  }

  async updateSection(
    user: TenantUser,
    assessmentId: string,
    sectionId: string,
    dto: AssessmentSectionDto,
  ) {
    await this.findAssessment(user, assessmentId);
    const section = await this.prisma.assessmentSection.update({
      where: { id: sectionId },
      data: {
        name: dto.name.trim(),
        description: this.optional(dto.description),
        instructions: this.optional(dto.instructions),
        displayOrder: dto.displayOrder,
      },
    });
    return { success: true, data: section };
  }

  async deleteSection(
    user: TenantUser,
    assessmentId: string,
    sectionId: string,
  ) {
    await this.findAssessment(user, assessmentId);
    await this.prisma.assessmentQuestion.updateMany({
      where: { sectionId },
      data: { sectionId: null },
    });
    return {
      success: true,
      data: await this.prisma.assessmentSection.delete({
        where: { id: sectionId },
      }),
    };
  }

  async addAssessmentQuestion(
    user: TenantUser,
    assessmentId: string,
    dto: AssessmentQuestionDto,
  ) {
    const assessment = await this.findAssessment(user, assessmentId);
    const question = await this.findQuestion(user, dto.questionId);
    if (assessment.collegeId !== question.collegeId)
      throw new ForbiddenException(
        "Cross-tenant question assignment is not allowed.",
      );
    let created;
    try {
      created = await this.prisma.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          sectionId: dto.sectionId,
          questionId: question.id,
          displayOrder: dto.displayOrder,
          assignedMarks: dto.assignedMarks,
          assignedNegativeMarks: dto.assignedNegativeMarks ?? 0,
          mandatory: dto.mandatory ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Question is already assigned to this assessment.",
        );
      }
      throw error;
    }
    await this.recalculateAssessmentMarks(assessment.id);
    return { success: true, data: created };
  }

  async deleteAssessmentQuestion(
    user: TenantUser,
    assessmentId: string,
    questionId: string,
  ) {
    await this.findAssessment(user, assessmentId);
    const deleted = await this.prisma.assessmentQuestion.delete({
      where: { assessmentId_questionId: { assessmentId, questionId } },
    });
    await this.recalculateAssessmentMarks(assessmentId);
    return { success: true, data: deleted };
  }

  async addAssessmentAssignments(
    user: TenantUser,
    assessmentId: string,
    dto: AssessmentAssignmentDto,
  ) {
    const assessment = await this.findAssessment(user, assessmentId);
    const batchCreates = await Promise.all(
      (dto.batchIds ?? []).map(async (batchId) => {
        await this.ensureBatchInCollege(batchId, assessment.collegeId ?? "");
        return this.prisma.assessmentBatchAssignment.upsert({
          where: { assessmentId_batchId: { assessmentId, batchId } },
          update: {},
          create: { assessmentId, batchId },
        });
      }),
    );
    const studentCreates = await Promise.all(
      (dto.studentProfileIds ?? []).map(async (studentProfileId) => {
        await this.ensureStudentInCollege(
          studentProfileId,
          assessment.collegeId ?? "",
        );
        return this.prisma.assessmentStudentAssignment.upsert({
          where: {
            assessmentId_studentProfileId: { assessmentId, studentProfileId },
          },
          update: {},
          create: { assessmentId, studentProfileId },
        });
      }),
    );
    let scopeAssignment = null;
    if (dto.departmentId || dto.courseId || dto.semesterId) {
      scopeAssignment = await this.prisma.assessmentAssignment.upsert({
        where: {
          assessmentId_departmentId_courseId_semesterId: {
            assessmentId,
            departmentId: dto.departmentId ?? "",
            courseId: dto.courseId ?? "",
            semesterId: dto.semesterId ?? "",
          },
        },
        update: {},
        create: {
          assessmentId,
          departmentId: dto.departmentId,
          courseId: dto.courseId,
          semesterId: dto.semesterId,
        },
      });
    }
    return {
      success: true,
      data: {
        batches: batchCreates,
        students: studentCreates,
        scope: scopeAssignment,
      },
    };
  }

  async deleteAssignment(
    user: TenantUser,
    assessmentId: string,
    assignmentId: string,
  ) {
    await this.findAssessment(user, assessmentId);
    await this.prisma.assessmentBatchAssignment.deleteMany({
      where: { id: assignmentId, assessmentId },
    });
    await this.prisma.assessmentStudentAssignment.deleteMany({
      where: { id: assignmentId, assessmentId },
    });
    await this.prisma.assessmentAssignment.deleteMany({
      where: { id: assignmentId, assessmentId },
    });
    return { success: true };
  }

  async previewAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    return {
      success: true,
      data: { assessment, blockers: await this.publishBlockers(assessment.id) },
    };
  }

  async scheduleAssessment(
    user: TenantUser,
    id: string,
    dto: ScheduleAssessmentDto,
  ) {
    const assessment = await this.findAssessment(user, id);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt)
      throw new BadRequestException(
        "Assessment end time must be after start time.",
      );
    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        startAt,
        endAt,
        opensAt: startAt,
        closesAt: endAt,
        status: AssessmentStatus.SCHEDULED,
        updatedById: user.id,
      },
      include: assessmentInclude,
    });
    await this.audit(
      user,
      assessment.collegeId,
      AuditEvent.ASSESSMENT_SCHEDULE,
    );
    return { success: true, data: updated };
  }

  async publishAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    const blockers = await this.publishBlockers(assessment.id);
    if (blockers.length > 0)
      throw new BadRequestException({
        message: "Assessment cannot be published.",
        blockers,
      });
    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: AssessmentStatus.PUBLISHED, updatedById: user.id },
      include: assessmentInclude,
    });
    await this.audit(user, assessment.collegeId, AuditEvent.ASSESSMENT_PUBLISH);
    return { success: true, data: updated };
  }

  async cancelAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    const updated = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: AssessmentStatus.CANCELLED, updatedById: user.id },
      include: assessmentInclude,
    });
    await this.audit(user, assessment.collegeId, AuditEvent.ASSESSMENT_CANCEL);
    return { success: true, data: updated };
  }

  async duplicateAssessment(user: TenantUser, id: string) {
    const assessment = await this.findAssessment(user, id);
    const duplicated = await this.prisma.assessment.create({
      data: {
        collegeId: assessment.collegeId,
        title: `${assessment.title} Copy`,
        description: assessment.description,
        instructions: assessment.instructions,
        subjectId: assessment.subjectId,
        status: AssessmentStatus.DRAFT,
        durationMinutes: assessment.durationMinutes,
        durationMin: assessment.durationMin,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        maxAttempts: assessment.maxAttempts,
        resultVisibility: assessment.resultVisibility,
        shuffleQuestions: assessment.shuffleQuestions,
        shuffleOptions: assessment.shuffleOptions,
        createdById: user.id,
        updatedById: user.id,
        sections: {
          create: assessment.sections.map((section) => ({
            name: section.name,
            description: section.description,
            instructions: section.instructions,
            displayOrder: section.displayOrder,
          })),
        },
      },
      include: assessmentInclude,
    });
    await this.audit(
      user,
      assessment.collegeId,
      AuditEvent.ASSESSMENT_DUPLICATE,
    );
    return { success: true, data: duplicated };
  }

  private validateQuestion(
    dto: CreateQuestionDto,
    requestedStatus?: QuestionStatus,
  ): void {
    const options = dto.options ?? [];
    if (
      dto.questionType === QuestionType.SINGLE_CHOICE &&
      options.filter((option) => option.isCorrect).length !== 1
    ) {
      throw new BadRequestException(
        "Single-choice questions must have exactly one correct option.",
      );
    }
    if (
      dto.questionType === QuestionType.MULTIPLE_CHOICE &&
      options.filter((option) => option.isCorrect).length < 1
    ) {
      throw new BadRequestException(
        "Multiple-choice questions must have at least one correct option.",
      );
    }
    if (
      dto.questionType === QuestionType.TRUE_FALSE &&
      typeof dto.metadata?.correctBoolean !== "boolean"
    ) {
      throw new BadRequestException(
        "True/false questions require correctBoolean metadata.",
      );
    }
    if (
      dto.questionType === QuestionType.NUMERICAL &&
      typeof dto.metadata?.acceptedNumber !== "number"
    ) {
      throw new BadRequestException(
        "Numerical questions require acceptedNumber metadata.",
      );
    }
    if (
      dto.questionType === QuestionType.FILL_IN_THE_BLANK &&
      !Array.isArray(dto.metadata?.acceptedAnswers)
    ) {
      throw new BadRequestException(
        "Fill-in-the-blank questions require acceptedAnswers metadata.",
      );
    }
    if (
      dto.questionType === QuestionType.CODING &&
      requestedStatus === QuestionStatus.ACTIVE &&
      !dto.coding
    ) {
      throw new BadRequestException(
        "Coding questions require coding configuration before activation.",
      );
    }
    if (dto.coding && dto.coding.testCases.length < 1) {
      throw new BadRequestException(
        "Coding questions require at least one test case.",
      );
    }
  }

  private validateQuestionFromRecord(
    question: Prisma.QuestionGetPayload<{ include: typeof questionInclude }>,
  ): void {
    this.validateQuestion(
      {
        subjectId: question.subjectId ?? "",
        topic: question.topic ?? "",
        title: question.title ?? "",
        questionText: question.questionText ?? "",
        questionType: question.questionType ?? QuestionType.SHORT_ANSWER,
        difficulty: question.difficulty,
        defaultMarks: question.defaultMarks,
        defaultNegativeMarks: question.defaultNegativeMarks,
        explanation: question.explanation ?? undefined,
        status: QuestionStatus.ACTIVE,
        options: question.options.map((option) => ({
          optionText: option.optionText,
          optionKey: option.optionKey,
          displayOrder: option.displayOrder,
          isCorrect: option.isCorrect,
        })),
        metadata: question.metadata as Record<string, unknown> | undefined,
        coding: question.codingQuestion
          ? {
              problemStatement: question.codingQuestion.problemStatement,
              inputFormat: question.codingQuestion.inputFormat ?? undefined,
              outputFormat: question.codingQuestion.outputFormat ?? undefined,
              constraints: question.codingQuestion.constraints ?? undefined,
              timeLimitMs: question.codingQuestion.timeLimitMs,
              memoryLimitMb: question.codingQuestion.memoryLimitMb,
              allowedLanguages: question.codingQuestion.allowedLanguages,
              testCases: question.codingQuestion.testCases.map((testCase) => ({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                visibility: testCase.visibility,
                scoreWeight: testCase.scoreWeight,
                displayOrder: testCase.displayOrder,
              })),
            }
          : undefined,
      },
      QuestionStatus.ACTIVE,
    );
  }

  private optionCreates(dto: CreateQuestionDto) {
    return (dto.options ?? []).map((option) => ({
      optionText: option.optionText.trim(),
      optionKey: option.optionKey.trim().toUpperCase(),
      displayOrder: option.displayOrder,
      isCorrect: option.isCorrect ?? false,
      explanation: this.optional(option.explanation),
    }));
  }

  private codingCreate(dto: CreateQuestionDto) {
    if (!dto.coding) return undefined;
    return {
      problemStatement: dto.coding.problemStatement,
      inputFormat: this.optional(dto.coding.inputFormat),
      outputFormat: this.optional(dto.coding.outputFormat),
      constraints: this.optional(dto.coding.constraints),
      timeLimitMs: dto.coding.timeLimitMs,
      memoryLimitMb: dto.coding.memoryLimitMb,
      allowedLanguages: dto.coding.allowedLanguages,
      testCases: {
        create: dto.coding.testCases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          visibility: testCase.visibility,
          scoreWeight: testCase.scoreWeight,
          displayOrder: testCase.displayOrder,
        })),
      },
    };
  }

  private metadata(dto: CreateQuestionDto): Prisma.InputJsonValue | undefined {
    return dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined;
  }

  private async syncTags(
    tx: Prisma.TransactionClient,
    questionId: string,
    collegeId: string,
    tags: string[],
  ) {
    await tx.questionTag.deleteMany({ where: { questionId } });
    for (const name of tags) {
      const slug = this.slug(name);
      const tag = await tx.tag.upsert({
        where: { collegeId_slug: { collegeId, slug } },
        update: { name: name.trim() },
        create: { collegeId, slug, name: name.trim() },
      });
      await tx.questionTag.create({ data: { questionId, tagId: tag.id } });
    }
  }

  private async findQuestion(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const question = await this.prisma.question.findFirst({
      where: { id, ...this.questionScopeWhere(user, collegeId) },
      include: questionInclude,
    });
    if (!question) throw new NotFoundException("Question not found.");
    return question;
  }

  private async findAssessment(user: TenantUser, id: string) {
    const collegeId = this.scopeCollege(user, undefined, false);
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, ...this.assessmentScopeWhere(user, collegeId) },
      include: assessmentInclude,
    });
    if (!assessment) throw new NotFoundException("Assessment not found.");
    return assessment;
  }

  private async ensureSubjectAccess(
    user: TenantUser,
    collegeId: string,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, collegeId },
    });
    if (!subject) throw new NotFoundException("Subject not found.");
    if (user.role !== Role.FACULTY) return;
    const assignment = await this.prisma.subjectAssignment.findFirst({
      where: { userId: user.id, subjectId, collegeId, status: "ACTIVE" },
    });
    if (!assignment)
      throw new ForbiddenException(
        "Faculty can manage only assigned subjects.",
      );
  }

  private async ensureBatchInCollege(batchId: string, collegeId: string) {
    const item = await this.prisma.batch.findFirst({
      where: { id: batchId, collegeId },
    });
    if (!item) throw new NotFoundException("Batch not found.");
  }

  private async ensureStudentInCollege(
    studentProfileId: string,
    collegeId: string,
  ) {
    const item = await this.prisma.studentProfile.findFirst({
      where: { id: studentProfileId, collegeId },
    });
    if (!item) throw new NotFoundException("Student not found.");
  }

  private async recalculateAssessmentMarks(assessmentId: string) {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId },
    });
    const totalMarks = questions.reduce(
      (sum, question) => sum + question.assignedMarks,
      0,
    );
    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { totalMarks },
    });
  }

  private async publishBlockers(assessmentId: string): Promise<string[]> {
    const assessment = await this.prisma.assessment.findUniqueOrThrow({
      where: { id: assessmentId },
      include: {
        assessmentQuestions: {
          include: { question: { include: questionInclude } },
        },
        sections: true,
        batchAssignments: true,
        studentAssignments: true,
        assignments: true,
      },
    });
    const blockers: string[] = [];
    if (assessment.assessmentQuestions.length === 0)
      blockers.push("Add at least one question.");
    if (
      assessment.batchAssignments.length +
        assessment.studentAssignments.length +
        assessment.assignments.length ===
      0
    )
      blockers.push("Add at least one assignment.");
    if (assessment.totalMarks <= 0)
      blockers.push("Total marks must be greater than zero.");
    if (
      assessment.passingMarks !== null &&
      assessment.passingMarks > assessment.totalMarks
    )
      blockers.push("Passing marks cannot exceed total marks.");
    if (
      assessment.startAt &&
      assessment.endAt &&
      assessment.startAt >= assessment.endAt
    )
      blockers.push("Schedule end time must be after start time.");
    for (const item of assessment.assessmentQuestions) {
      if (item.question.status !== QuestionStatus.ACTIVE)
        blockers.push(
          `Question ${item.question.title ?? item.question.id} must be active.`,
        );
      if (item.question.questionType === QuestionType.CODING) {
        const coding = item.question.codingQuestion;
        if (!coding || coding.testCases.length === 0)
          blockers.push(
            `Coding question ${item.question.title ?? item.question.id} is incomplete.`,
          );
      }
    }
    return blockers;
  }

  private questionScopeWhere(
    user: TenantUser,
    collegeId: string,
  ): Prisma.QuestionWhereInput {
    if (user.role === Role.SUPER_ADMIN) return collegeId ? { collegeId } : {};
    if (!user.collegeId)
      throw new ForbiddenException("Tenant scope is required.");
    if (user.role === Role.FACULTY) {
      return {
        collegeId: user.collegeId,
        OR: [
          { createdById: user.id },
          {
            subject: {
              assignments: { some: { userId: user.id, status: "ACTIVE" } },
            },
          },
        ],
      };
    }
    return { collegeId: user.collegeId };
  }

  private assessmentScopeWhere(
    user: TenantUser,
    collegeId: string,
  ): Prisma.AssessmentWhereInput {
    if (user.role === Role.SUPER_ADMIN) return collegeId ? { collegeId } : {};
    if (!user.collegeId)
      throw new ForbiddenException("Tenant scope is required.");
    if (user.role === Role.FACULTY)
      return { collegeId: user.collegeId, createdById: user.id };
    return { collegeId: user.collegeId };
  }

  private scopeCollege(
    user: TenantUser,
    requested: string | undefined,
    required: boolean,
  ): string {
    if (user.role === Role.SUPER_ADMIN) {
      if (requested) return requested;
      if (required)
        throw new BadRequestException(
          "collegeId is required for platform-scoped writes.",
        );
      return "";
    }
    if (user.role === Role.COLLEGE_ADMIN || user.role === Role.FACULTY) {
      if (!user.collegeId)
        throw new ForbiddenException("Tenant scope is required.");
      return user.collegeId;
    }
    throw new ForbiddenException(
      "Question-bank management is not available for this role.",
    );
  }

  private async paginate(
    model: "question" | "assessment",
    query: BankListQueryDto,
    where: Record<string, unknown>,
    include: Record<string, unknown>,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const safeSort = new Set(["createdAt", "updatedAt", "title", "difficulty"]);
    const sortBy = safeSort.has(query.sortBy ?? "")
      ? query.sortBy
      : "createdAt";
    const orderBy = { [sortBy ?? "createdAt"]: query.sortOrder ?? "desc" };
    const delegate = this.prisma[model] as unknown as ModelDelegate;
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

  private canFilterCreator(user: TenantUser): boolean {
    return user.role === Role.SUPER_ADMIN || user.role === Role.COLLEGE_ADMIN;
  }

  private async audit(
    user: TenantUser,
    collegeId: string | null | undefined,
    event: AuditEvent,
  ) {
    await this.prisma.auditLog.create({
      data: { event, userId: user.id, collegeId, actorRole: user.role },
    });
  }

  private optional(value: string | undefined | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private slug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
