import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AssessmentStatus,
  AuditEvent,
  CollegeStatus,
  EntityStatus,
  ManualReviewStatus,
  PassStatus,
  Prisma,
  QuestionType,
  ResultVisibility,
  Role,
  TestAttemptStatus,
  AttemptScoringPolicy,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { ExamOperationsService } from "../exam-operations/exam-operations.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AttemptEventDto,
  AttemptAdminActionDto,
  BatchSaveAnswersDto,
  SaveAnswerDto,
  StartAttemptDto,
  StudentAssessmentQueryDto,
  SubmitAttemptDto,
  UpdateReviewDto,
} from "./dto/student-exam.dto";

type Tx = Prisma.TransactionClient;

const objectiveTypes = new Set<QuestionType>([
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_IN_THE_BLANK,
  QuestionType.NUMERICAL,
]);

const manualTypes = new Set<QuestionType>([
  QuestionType.SHORT_ANSWER,
  QuestionType.DESCRIPTIVE,
]);
const activeAttemptStatuses = [
  TestAttemptStatus.IN_PROGRESS,
] as TestAttemptStatus[];
const countedAttemptStatuses = [
  TestAttemptStatus.IN_PROGRESS,
  TestAttemptStatus.SUBMITTED,
  TestAttemptStatus.AUTO_SUBMITTED,
  TestAttemptStatus.EXPIRED,
  TestAttemptStatus.UNDER_REVIEW,
  TestAttemptStatus.EVALUATED,
] as TestAttemptStatus[];

@Injectable()
export class StudentExamService {
  private readonly logger = new Logger(StudentExamService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ExamOperationsService)
    private readonly operations: ExamOperationsService,
  ) {}

  async listStudentAssessments(
    user: AuthenticatedUser,
    query: StudentAssessmentQueryDto,
  ) {
    const profile = await this.requireStudent(user);
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const now = new Date();
    const where = this.assignedAssessmentWhere(
      profile.id,
      profile.batchId,
      profile.collegeId,
      query,
      now,
    );
    const [total, assessments] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        include: {
          subject: true,
          assessmentQuestions: true,
          testAttempts: {
            where: { studentId: user.id },
            orderBy: { attemptNumber: "desc" },
          },
          results: {
            where: this.studentVisibleResultWhere(user.id),
            include: {
              attempt: { select: { attemptNumber: true } },
            },
          },
          attemptGrants: {
            where: { studentId: user.id },
            take: 1,
          },
        },
        orderBy: this.assessmentOrder(query),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: assessments.map((assessment) =>
        this.studentAssessmentCard(assessment, now),
      ),
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async getStudentAssessment(user: AuthenticatedUser, assessmentId: string) {
    const profile = await this.requireStudent(user);
    const now = new Date();
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        collegeId: profile.collegeId,
        deletedAt: null,
        ...this.assignmentWhere(profile.id, profile.batchId),
      },
      include: {
        subject: true,
        assessmentQuestions: true,
        sections: { orderBy: { displayOrder: "asc" } },
        testAttempts: {
          where: { studentId: user.id },
          orderBy: { attemptNumber: "desc" },
        },
        results: {
          where: this.studentVisibleResultWhere(user.id),
          include: {
            attempt: { select: { attemptNumber: true } },
          },
        },
        attemptGrants: { where: { studentId: user.id }, take: 1 },
      },
    });
    if (!assessment) {
      throw new NotFoundException("Assessment is not available.");
    }
    return {
      success: true,
      data: {
        ...this.studentAssessmentCard(assessment, now),
        description: assessment.description,
        instructions: assessment.instructions,
        allowSectionNavigation: assessment.allowSectionNavigation,
        allowBackNavigation: assessment.allowBackNavigation,
        fullscreenPreferred: assessment.fullscreenPreferred,
        negativeMarkingEnabled: assessment.negativeMarkingEnabled,
        sections: assessment.sections.map((section) => ({
          id: section.id,
          name: section.name,
          instructions: section.instructions,
          displayOrder: section.displayOrder,
          durationLimitMinutes: section.durationLimitMinutes,
        })),
        eligibility: this.publicEligibility(assessment, now),
      },
    };
  }

  async startAttempt(
    user: AuthenticatedUser,
    assessmentId: string,
    dto: StartAttemptDto,
  ) {
    const profile = await this.requireStudent(user);
    const existingByKey = dto.idempotencyKey
      ? await this.prisma.testAttempt.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        })
      : null;
    if (existingByKey?.studentId === user.id) {
      return this.getStudentAttempt(user, existingByKey.id);
    }

    const attempt = await this.prisma.$transaction(async (tx) => {
      const assessment = await tx.assessment.findFirst({
        where: {
          id: assessmentId,
          collegeId: profile.collegeId,
          deletedAt: null,
          ...this.assignmentWhere(profile.id, profile.batchId),
        },
        include: {
          college: true,
          assessmentQuestions: {
            orderBy: { displayOrder: "asc" },
            include: {
              section: true,
              question: {
                include: {
                  options: { orderBy: { displayOrder: "asc" } },
                  codingQuestion: {
                    include: {
                      testCases: { orderBy: { displayOrder: "asc" } },
                    },
                  },
                },
              },
            },
          },
          sections: { orderBy: { displayOrder: "asc" } },
        },
      });
      this.validateStartEligibility(assessment, profile, user.id);
      if (!assessment) {
        throw new NotFoundException("Assessment is not available.");
      }
      await this.validateStartProctoringReadiness(
        tx,
        profile.collegeId,
        assessmentId,
        dto.clientStartMetadata,
      );

      const activeAttempt = await tx.testAttempt.findFirst({
        where: {
          assessmentId,
          studentId: user.id,
          status: { in: activeAttemptStatuses },
          expiresAt: { gt: new Date() },
        },
      });
      if (activeAttempt) {
        return activeAttempt;
      }

      const grant = await tx.assessmentAttemptGrant.findUnique({
        where: {
          assessmentId_studentId: { assessmentId, studentId: user.id },
        },
      });
      const attemptWhere: Prisma.TestAttemptWhereInput = {
        assessmentId,
        studentId: user.id,
        status: { in: countedAttemptStatuses },
      };
      if (grant?.resetBefore) {
        attemptWhere.createdAt = { gt: grant.resetBefore };
      }
      const attemptLimit =
        assessment.maxAttempts + Math.max(0, grant?.additionalAttempts ?? 0);
      const [attemptCount, latestAttempt] = await Promise.all([
        tx.testAttempt.count({ where: attemptWhere }),
        tx.testAttempt.findFirst({
          where: { assessmentId, studentId: user.id },
          orderBy: { attemptNumber: "desc" },
          select: { attemptNumber: true },
        }),
      ]);
      if (attemptCount >= attemptLimit) {
        throw new ForbiddenException("Maximum attempt limit reached.");
      }

      const now = new Date();
      const durationSeconds = Math.max(
        this.durationMinutes(assessment) * 60,
        60,
      );
      const endBound = assessment.endAt ?? assessment.closesAt;
      const computedExpiry = new Date(now.getTime() + durationSeconds * 1000);
      const expiresAt =
        endBound && endBound < computedExpiry ? endBound : computedExpiry;
      const created = await tx.testAttempt.create({
        data: {
          collegeId: profile.collegeId,
          assessmentId,
          studentId: user.id,
          attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
          startedAt: now,
          expiresAt,
          totalDurationSeconds: Math.floor(
            (expiresAt.getTime() - now.getTime()) / 1000,
          ),
          idempotencyKey: dto.idempotencyKey,
          sessionKey: dto.sessionKey,
          clientStartMetadata: this.json(dto.clientStartMetadata),
        },
      });

      const sectionIdMap = new Map<string, string>();
      for (const section of assessment.sections) {
        const totalMarks = assessment.assessmentQuestions
          .filter((aq) => aq.sectionId === section.id)
          .reduce((sum, aq) => sum + aq.assignedMarks, 0);
        const attemptSection = await tx.attemptSection.create({
          data: {
            attemptId: created.id,
            originalSectionId: section.id,
            name: section.name,
            instructions: section.instructions,
            displayOrder: section.displayOrder,
            durationLimitMinutes: section.durationLimitMinutes,
            totalMarks,
          },
        });
        sectionIdMap.set(section.id, attemptSection.id);
      }

      const orderedQuestions = assessment.shuffleQuestions
        ? this.stableShuffle(
            assessment.assessmentQuestions,
            `${user.id}:${assessment.id}:questions`,
          )
        : assessment.assessmentQuestions;
      let order = 1;
      for (const aq of orderedQuestions) {
        const question = aq.question;
        const options = assessment.shuffleOptions
          ? this.stableShuffle(
              question.options,
              `${user.id}:${assessment.id}:${question.id}:options`,
            )
          : question.options;
        await tx.attemptQuestion.create({
          data: {
            attemptId: created.id,
            assessmentQuestionId: aq.id,
            originalQuestionId: question.id,
            sectionId: aq.sectionId ? sectionIdMap.get(aq.sectionId) : null,
            displayOrder: order,
            questionType: question.questionType ?? QuestionType.SINGLE_CHOICE,
            questionTextSnapshot:
              question.questionText ?? question.prompt ?? "",
            optionsSnapshot: this.safeOptionSnapshot(options),
            assignedMarks: aq.assignedMarks,
            assignedNegativeMarks: aq.assignedNegativeMarks,
            mandatory: aq.mandatory,
            randomizedOptionOrder: options.map((option) => option.optionKey),
            safeMetadataSnapshot: this.safeQuestionMetadata(
              question,
            ) as Prisma.InputJsonValue,
            evaluatorMetadata: this.evaluatorMetadata(
              question,
            ) as Prisma.InputJsonValue,
          },
        });
        order += 1;
      }

      await tx.attemptEvent.create({
        data: { attemptId: created.id, eventType: "TEST_START" },
      });
      await tx.auditLog.create({
        data: {
          event: AuditEvent.ATTEMPT_START,
          userId: user.id,
          collegeId: profile.collegeId,
          actorRole: user.role,
        },
      });
      this.logAttemptLifecycle("attempt_started", {
        assessmentId,
        attemptId: created.id,
        durationMinutes: this.durationMinutes(assessment),
        startTime: now.toISOString(),
        endTime: expiresAt.toISOString(),
        remainingTime: this.remainingSeconds(expiresAt, now),
        questionCount: orderedQuestions.length,
        submitReason: null,
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (attempt.status === TestAttemptStatus.IN_PROGRESS) {
      await this.operations
        .scheduleExpiryForAttempt(attempt.id, attempt.expiresAt)
        .catch(() => undefined);
    }
    return this.getStudentAttempt(user, attempt.id);
  }

  async getStudentAttempt(user: AuthenticatedUser, attemptId: string) {
    await this.requireStudent(user);
    const attempt = await this.findOwnedAttempt(user.id, attemptId);
    await this.expireIfNeeded(attempt.id);
    const refreshed = await this.findOwnedAttempt(user.id, attemptId);
    return { success: true, data: this.studentAttemptPayload(refreshed) };
  }

  async getAttemptTime(user: AuthenticatedUser, attemptId: string) {
    await this.requireStudent(user);
    const attempt = await this.findOwnedAttempt(user.id, attemptId);
    if (
      attempt.status === TestAttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      this.logAttemptLifecycle("attempt_auto_submit_requested", {
        assessmentId: attempt.assessmentId,
        attemptId: attempt.id,
        durationMinutes: this.durationMinutes(attempt.assessment),
        startTime: attempt.startedAt.toISOString(),
        endTime: attempt.expiresAt.toISOString(),
        remainingTime: this.remainingSeconds(attempt.expiresAt),
        questionCount: attempt.questions.length,
        submitReason: "api-time-check",
      });
      await this.operations.autoSubmitAttempt(attempt.id, "api-time-check");
    } else {
      await this.expireIfNeeded(attempt.id);
    }
    const finalAttempt = await this.prisma.testAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        assessment: {
          select: { durationMinutes: true, durationMin: true },
        },
        _count: { select: { questions: true } },
      },
    });
    const now = new Date();
    const remainingSeconds = this.remainingSeconds(finalAttempt.expiresAt, now);
    this.logAttemptLifecycle("attempt_time_checked", {
      assessmentId: finalAttempt.assessmentId,
      attemptId: finalAttempt.id,
      durationMinutes: this.durationMinutes(finalAttempt.assessment),
      startTime: finalAttempt.startedAt.toISOString(),
      endTime: finalAttempt.expiresAt.toISOString(),
      remainingTime: remainingSeconds,
      questionCount: finalAttempt._count.questions,
      submitReason:
        finalAttempt.status === TestAttemptStatus.AUTO_SUBMITTED
          ? "api-time-check"
          : null,
      attemptStatus: finalAttempt.status,
    });
    return {
      success: true,
      data: {
        serverNow: now.toISOString(),
        startedAt: finalAttempt.startedAt,
        expiresAt: finalAttempt.expiresAt,
        remainingSeconds,
        attemptStatus: finalAttempt.status,
      },
    };
  }

  async listAnswers(user: AuthenticatedUser, attemptId: string) {
    await this.requireStudent(user);
    const attempt = await this.findOwnedAttempt(user.id, attemptId);
    return {
      success: true,
      data: attempt.answers.map((answer) => this.answerPayload(answer)),
    };
  }

  async saveAnswer(
    user: AuthenticatedUser,
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAnswerDto,
  ) {
    await this.requireStudent(user);
    return this.prisma.$transaction(async (tx) => {
      const attempt = await this.findAttemptForWrite(tx, user.id, attemptId);
      const question = attempt.questions.find(
        (item) => item.id === attemptQuestionId,
      );
      if (!question) {
        throw new NotFoundException(
          "Question does not belong to this attempt.",
        );
      }
      const existing = question.answer;
      if (
        dto.expectedVersion &&
        existing &&
        existing.version !== dto.expectedVersion
      ) {
        throw new ConflictException(
          "Answer version conflict. Refresh the saved answer and retry.",
        );
      }
      const selectedOptionKeys = dto.clearAnswer
        ? []
        : (dto.selectedOptionKeys ?? []);
      const textAnswer = dto.clearAnswer ? null : this.optional(dto.textAnswer);
      const numericalAnswer =
        dto.clearAnswer || dto.numericalAnswer === undefined
          ? null
          : new Prisma.Decimal(dto.numericalAnswer);
      const answerPayload = dto.clearAnswer
        ? Prisma.JsonNull
        : this.json(dto.answerPayload);
      const answeredAt = this.isAnswered(
        selectedOptionKeys,
        textAnswer,
        numericalAnswer,
      )
        ? new Date()
        : null;
      const answer = existing
        ? await tx.studentAnswer.update({
            where: { id: existing.id },
            data: {
              selectedOptionKeys,
              textAnswer,
              numericalAnswer,
              answerPayload,
              markedForReview: dto.markedForReview ?? existing.markedForReview,
              answeredAt,
              version: { increment: 1 },
              idempotencyKey: dto.idempotencyKey,
              saveStatusMetadata: { status: "SAVED" },
            },
          })
        : await tx.studentAnswer.create({
            data: {
              attemptId,
              attemptQuestionId,
              selectedOptionKeys,
              textAnswer,
              numericalAnswer,
              answerPayload,
              markedForReview: dto.markedForReview ?? false,
              answeredAt,
              idempotencyKey: dto.idempotencyKey,
              saveStatusMetadata: { status: "SAVED" },
            },
          });
      await tx.answerRevision.create({
        data: {
          studentAnswerId: answer.id,
          version: answer.version,
          answerPayload: answer.answerPayload ?? Prisma.JsonNull,
          selectedOptionKeys: answer.selectedOptionKeys,
          textAnswer: answer.textAnswer,
          numericalAnswer: answer.numericalAnswer,
          markedForReview: answer.markedForReview,
        },
      });
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: { lastActivityAt: new Date() },
      });
      await tx.attemptEvent.create({
        data: {
          attemptId,
          eventType: "ANSWER_SAVE",
          metadata: { attemptQuestionId },
        },
      });
      return {
        success: true,
        data: { ...this.answerPayload(answer), savedAt: answer.updatedAt },
      };
    });
  }

  async batchSaveAnswers(
    user: AuthenticatedUser,
    attemptId: string,
    dto: BatchSaveAnswersDto,
  ) {
    const results = [];
    for (const item of dto.answers) {
      results.push(
        await this.saveAnswer(user, attemptId, item.attemptQuestionId, item),
      );
    }
    return { success: true, data: results.map((result) => result.data) };
  }

  async submitAttempt(
    user: AuthenticatedUser,
    attemptId: string,
    dto: SubmitAttemptDto = {},
  ) {
    await this.requireStudent(user);
    const receipt = await this.prisma.$transaction(async (tx) => {
      const attempt = await this.findAttemptForSubmit(tx, user.id, attemptId);
      const existing = await tx.submissionReceipt.findUnique({
        where: { attemptId },
      });
      if (existing) {
        return existing;
      }
      const isExpired = attempt.expiresAt.getTime() <= Date.now();
      const submittedAt = new Date();
      const status = isExpired
        ? TestAttemptStatus.AUTO_SUBMITTED
        : TestAttemptStatus.SUBMITTED;
      this.logAttemptLifecycle("attempt_submit_requested", {
        assessmentId: attempt.assessmentId,
        attemptId: attempt.id,
        durationMinutes: this.durationMinutes(attempt.assessment),
        startTime: attempt.startedAt.toISOString(),
        endTime: attempt.expiresAt.toISOString(),
        remainingTime: this.remainingSeconds(attempt.expiresAt, submittedAt),
        questionCount: attempt.questions.length,
        submitReason:
          dto.reason ?? (isExpired ? "duration-expired" : "student-submit"),
      });
      const answerCount = attempt.answers.filter((answer) =>
        this.studentAnswerAnswered(answer),
      ).length;
      const unansweredCount = attempt.questions.length - answerCount;
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          submittedAt:
            status === TestAttemptStatus.SUBMITTED ? submittedAt : undefined,
          autoSubmittedAt:
            status === TestAttemptStatus.AUTO_SUBMITTED
              ? submittedAt
              : undefined,
          lastActivityAt: submittedAt,
        },
      });
      await this.evaluateAttempt(tx, attemptId);
      const created = await tx.submissionReceipt.create({
        data: {
          attemptId,
          receiptNumber: `RCT-${attemptId.slice(-8).toUpperCase()}-${String(submittedAt.getTime())}`,
          submittedAt,
          answerCount,
          unansweredCount,
          status,
        },
      });
      await tx.attemptEvent.create({
        data: { attemptId, eventType: status, metadata: this.json(dto) },
      });
      await tx.auditLog.create({
        data: {
          event:
            status === TestAttemptStatus.AUTO_SUBMITTED
              ? AuditEvent.ATTEMPT_AUTO_SUBMIT
              : AuditEvent.ATTEMPT_SUBMIT,
          userId: user.id,
          collegeId: attempt.collegeId,
          actorRole: user.role,
        },
      });
      return created;
    });
    return { success: true, data: receipt };
  }

  async logSecurityEvent(
    user: AuthenticatedUser,
    attemptId: string,
    dto: AttemptEventDto,
  ) {
    await this.requireStudent(user);
    const attempt = await this.findOwnedAttempt(user.id, attemptId);
    await this.prisma.$transaction([
      this.prisma.attemptSecurityFlag.create({
        data: {
          attemptId,
          eventType: dto.eventType,
          metadata: this.json(dto.metadata),
        },
      }),
      this.prisma.attemptEvent.create({
        data: {
          attemptId,
          eventType: dto.eventType,
          metadata: this.json(dto.metadata),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          event: AuditEvent.ATTEMPT_SECURITY_EVENT,
          userId: user.id,
          collegeId: attempt.collegeId,
          actorRole: user.role,
        },
      }),
    ]);
    return { success: true, data: { logged: true } };
  }

  async listStudentResults(user: AuthenticatedUser) {
    await this.requireStudent(user);
    await this.publishEligibleStudentResults(user.id);
    const results = await this.prisma.result.findMany({
      where: this.studentVisibleResultWhere(user.id),
      include: {
        assessment: { include: { subject: true } },
        attempt: { include: { securityFlags: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: results.map((result) => this.resultPayload(result)),
    };
  }

  async getStudentResult(user: AuthenticatedUser, resultId: string) {
    await this.requireStudent(user);
    await this.publishEligibleStudentResults(user.id);
    const result = await this.prisma.result.findFirst({
      where: { id: resultId, ...this.studentVisibleResultWhere(user.id) },
      include: {
        sectionResults: true,
        attempt: {
          include: {
            securityFlags: true,
            questions: {
              orderBy: { displayOrder: "asc" },
              include: { answer: true, evaluations: true },
            },
          },
        },
        assessment: { include: { subject: true } },
      },
    });
    if (!result) {
      throw new NotFoundException("Result is not available.");
    }
    return { success: true, data: this.resultPayload(result) };
  }

  async listReviews(user: AuthenticatedUser) {
    this.requireReviewerRole(user);
    const reviews = await this.prisma.manualReviewTask.findMany({
      where: this.reviewScopeWhere(user),
      include: {
        attempt: {
          include: {
            assessment: true,
            student: {
              select: { id: true, name: true, email: true, studentId: true },
            },
          },
        },
        attemptQuestion: true,
        assignedReviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: reviews.map((review) => this.reviewPayload(review)),
    };
  }

  async getReview(user: AuthenticatedUser, id: string) {
    this.requireReviewerRole(user);
    const review = await this.prisma.manualReviewTask.findFirst({
      where: { id, ...this.reviewScopeWhere(user) },
      include: {
        attempt: {
          include: {
            assessment: true,
            student: {
              select: { id: true, name: true, email: true, studentId: true },
            },
          },
        },
        attemptQuestion: true,
        assignedReviewer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!review) {
      throw new NotFoundException("Review task not found.");
    }
    return { success: true, data: this.reviewPayload(review) };
  }

  async updateReview(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateReviewDto,
  ) {
    this.requireReviewerRole(user);
    const existing = await this.prisma.manualReviewTask.findFirst({
      where: { id, ...this.reviewScopeWhere(user) },
      include: { attempt: true, attemptQuestion: true },
    });
    if (!existing) {
      throw new NotFoundException("Review task not found.");
    }
    if (dto.awardedMarks > existing.maxMarks) {
      throw new BadRequestException(
        "Awarded marks cannot exceed maximum marks.",
      );
    }
    const review = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.manualReviewTask.update({
        where: { id },
        data: {
          awardedMarks: dto.awardedMarks,
          feedback: dto.feedback,
          status: ManualReviewStatus.COMPLETED,
          reviewedAt: new Date(),
          assignedReviewerId: existing.assignedReviewerId ?? user.id,
        },
      });
      await this.recalculateResult(tx, existing.attemptId);
      await tx.auditLog.create({
        data: {
          event: AuditEvent.REVIEW_UPDATE,
          userId: user.id,
          collegeId: existing.attempt.collegeId,
          actorRole: user.role,
        },
      });
      return updated;
    });
    return { success: true, data: review };
  }

  async assessmentResults(user: AuthenticatedUser, assessmentId: string) {
    await this.ensureAssessmentManagementAccess(user, assessmentId);
    const results = await this.prisma.result.findMany({
      where: { assessmentId },
      include: {
        sectionResults: true,
        assessment: { include: { subject: true } },
        attempt: {
          include: {
            student: { include: { studentProfile: true } },
            securityFlags: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: results.map((result) => this.resultPayload(result)),
    };
  }

  async attemptResult(user: AuthenticatedUser, attemptId: string) {
    const result = await this.prisma.result.findUnique({
      where: { attemptId },
      include: {
        sectionResults: true,
        assessment: { include: { subject: true } },
        attempt: {
          include: {
            student: { include: { studentProfile: true } },
            securityFlags: true,
            questions: {
              orderBy: { displayOrder: "asc" },
              include: { answer: true, evaluations: true },
            },
          },
        },
      },
    });
    if (!result) {
      throw new NotFoundException("Result is not available.");
    }
    if (user.role === Role.STUDENT) {
      await this.publishEligibleStudentResults(user.id);
      const visible = await this.prisma.result.count({
        where: { attemptId, ...this.studentVisibleResultWhere(user.id) },
      });
      if (result.studentId !== user.id || !visible) {
        throw new ForbiddenException("Result is not available.");
      }
    } else {
      await this.ensureAssessmentManagementAccess(user, result.assessmentId);
    }
    return { success: true, data: this.resultPayload(result) };
  }

  async publishResults(user: AuthenticatedUser, assessmentId: string) {
    await this.ensureAssessmentManagementAccess(user, assessmentId);
    const pendingReviews = await this.prisma.manualReviewTask.count({
      where: {
        attempt: { assessmentId },
        status: { not: ManualReviewStatus.COMPLETED },
      },
    });
    if (pendingReviews > 0) {
      throw new ConflictException(
        "Manual reviews must be completed before publication.",
      );
    }
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.result.updateMany({
        where: { assessmentId },
        data: {
          isPublished: true,
          publishedAt: now,
          evaluationStatus: "PUBLISHED",
        },
      });
      const updated = await tx.result.findMany({ where: { assessmentId } });
      await tx.auditLog.create({
        data: {
          event: AuditEvent.RESULT_PUBLISH,
          userId: user.id,
          actorRole: user.role,
        },
      });
      return updated;
    });
    return { success: true, data: { publishedCount: result.length } };
  }

  async unpublishResults(user: AuthenticatedUser, assessmentId: string) {
    await this.ensureAssessmentManagementAccess(user, assessmentId);
    await this.prisma.result.updateMany({
      where: { assessmentId },
      data: {
        isPublished: false,
        publishedAt: null,
        evaluationStatus: "READY",
      },
    });
    await this.prisma.auditLog.create({
      data: {
        event: AuditEvent.RESULT_UNPUBLISH,
        userId: user.id,
        actorRole: user.role,
      },
    });
    return { success: true, data: { unpublished: true } };
  }

  async assessmentAttempts(user: AuthenticatedUser, assessmentId: string) {
    await this.ensureAssessmentManagementAccess(user, assessmentId);
    const attempts = await this.prisma.testAttempt.findMany({
      where: { assessmentId },
      include: {
        student: { include: { studentProfile: true } },
        result: true,
        securityFlags: true,
        submissionReceipt: true,
      },
      orderBy: [{ student: { name: "asc" } }, { attemptNumber: "asc" }],
    });
    return {
      success: true,
      data: attempts.map((attempt) => ({
        id: attempt.id,
        studentId: attempt.studentId,
        studentName: attempt.student.name,
        rollNumber: attempt.student.studentProfile?.rollNumber ?? null,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        score: attempt.result?.totalScore ?? attempt.finalScore ?? null,
        percentage: attempt.result?.percentage ?? attempt.percentage ?? null,
        startedAt: attempt.startedAt,
        submittedAt:
          attempt.submittedAt ??
          attempt.autoSubmittedAt ??
          attempt.submissionReceipt?.submittedAt ??
          null,
        durationSeconds: this.durationTakenSeconds(attempt),
        violations: attempt.securityFlags.length,
      })),
    };
  }

  async resetStudentAttempts(
    user: AuthenticatedUser,
    assessmentId: string,
    studentId: string,
    dto: AttemptAdminActionDto,
  ) {
    const assessment = await this.ensureAssessmentManagementAccess(
      user,
      assessmentId,
    );
    this.requireAttemptAdminRole(user);
    if (!assessment.collegeId) {
      throw new BadRequestException("Assessment must belong to a college.");
    }
    await this.ensureStudentInAssessmentCollege(assessment, studentId);
    const now = new Date();
    const grant = await this.prisma.assessmentAttemptGrant.upsert({
      where: { assessmentId_studentId: { assessmentId, studentId } },
      update: {
        resetBefore: now,
        additionalAttempts: 0,
        reason: dto.reason,
        createdById: user.id,
      },
      create: {
        collegeId: assessment.collegeId,
        assessmentId,
        studentId,
        resetBefore: now,
        additionalAttempts: 0,
        reason: dto.reason,
        createdById: user.id,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        event: AuditEvent.ATTEMPT_RESET,
        userId: user.id,
        collegeId: assessment.collegeId,
        actorRole: user.role,
        metadata: { assessmentId, studentId },
      },
    });
    return { success: true, data: grant };
  }

  async grantStudentAttempt(
    user: AuthenticatedUser,
    assessmentId: string,
    studentId: string,
    dto: AttemptAdminActionDto,
  ) {
    const assessment = await this.ensureAssessmentManagementAccess(
      user,
      assessmentId,
    );
    this.requireAttemptAdminRole(user);
    if (!assessment.collegeId) {
      throw new BadRequestException("Assessment must belong to a college.");
    }
    await this.ensureStudentInAssessmentCollege(assessment, studentId);
    const grant = await this.prisma.assessmentAttemptGrant.upsert({
      where: { assessmentId_studentId: { assessmentId, studentId } },
      update: {
        additionalAttempts: { increment: 1 },
        reason: dto.reason,
        createdById: user.id,
      },
      create: {
        collegeId: assessment.collegeId,
        assessmentId,
        studentId,
        additionalAttempts: 1,
        reason: dto.reason,
        createdById: user.id,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        event: AuditEvent.ATTEMPT_GRANT,
        userId: user.id,
        collegeId: assessment.collegeId,
        actorRole: user.role,
        metadata: { assessmentId, studentId },
      },
    });
    return { success: true, data: grant };
  }

  async dashboardStats(user: AuthenticatedUser) {
    if (user.role === Role.STUDENT) {
      const profile = await this.requireStudent(user);
      const now = new Date();
      const base = {
        collegeId: profile.collegeId,
        deletedAt: null,
        ...this.assignmentWhere(profile.id, profile.batchId),
      };
      const [upcoming, active, completed, results, average] = await Promise.all(
        [
          this.prisma.assessment.count({
            where: { ...base, startAt: { gt: now } },
          }),
          this.prisma.assessment.count({
            where: { ...base, startAt: { lte: now }, endAt: { gte: now } },
          }),
          this.prisma.testAttempt.count({
            where: {
              studentId: user.id,
              status: {
                in: [
                  TestAttemptStatus.SUBMITTED,
                  TestAttemptStatus.AUTO_SUBMITTED,
                  TestAttemptStatus.EVALUATED,
                ],
              },
            },
          }),
          this.prisma.result.count({
            where: this.studentVisibleResultWhere(user.id),
          }),
          this.prisma.result.aggregate({
            where: this.studentVisibleResultWhere(user.id),
            _avg: { percentage: true },
          }),
        ],
      );
      return {
        success: true,
        data: {
          upcoming,
          active,
          completed,
          publishedResults: results,
          averageScore: average._avg.percentage ?? 0,
        },
      };
    }
    this.requireReviewerRole(user);
    const scope =
      user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId ?? "" };
    const [
      active,
      submitted,
      autoSubmitted,
      pendingReviews,
      evaluated,
      published,
    ] = await Promise.all([
      this.prisma.testAttempt.count({
        where: { ...scope, status: TestAttemptStatus.IN_PROGRESS },
      }),
      this.prisma.testAttempt.count({
        where: { ...scope, status: TestAttemptStatus.SUBMITTED },
      }),
      this.prisma.testAttempt.count({
        where: { ...scope, status: TestAttemptStatus.AUTO_SUBMITTED },
      }),
      this.prisma.manualReviewTask.count({
        where: {
          attempt: scope,
          status: { not: ManualReviewStatus.COMPLETED },
        },
      }),
      this.prisma.testAttempt.count({
        where: { ...scope, status: TestAttemptStatus.EVALUATED },
      }),
      this.prisma.result.count({ where: { ...scope, isPublished: true } }),
    ]);
    return {
      success: true,
      data: {
        activeAttempts: active,
        submittedAttempts: submitted,
        autoSubmittedAttempts: autoSubmitted,
        pendingManualReviews: pendingReviews,
        evaluatedAttempts: evaluated,
        publishedResults: published,
      },
    };
  }

  private async requireStudent(user: AuthenticatedUser) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException("Student access is required.");
    }
    const profile = await this.prisma.studentProfile.findFirst({
      where: { userId: user.id, status: EntityStatus.ACTIVE },
      include: { user: true, college: true },
    });
    if (
      !profile ||
      !profile.user.isActive ||
      profile.college.status !== CollegeStatus.ACTIVE ||
      !profile.college.isActive
    ) {
      throw new ForbiddenException("Student account is not eligible.");
    }
    return profile;
  }

  private validateStartEligibility(
    assessment: Prisma.AssessmentGetPayload<{
      include: { college: true; assessmentQuestions: true; sections: true };
    }> | null,
    profile: { id: string; collegeId: string },
    studentId: string,
  ) {
    if (!assessment) {
      throw new NotFoundException("Assessment is not available.");
    }
    if (
      !assessment.college ||
      assessment.college.status !== CollegeStatus.ACTIVE ||
      !assessment.college.isActive
    ) {
      throw new ForbiddenException("College is not active.");
    }
    if (assessment.collegeId !== profile.collegeId) {
      throw new ForbiddenException("Assessment is not available.");
    }
    if (
      assessment.status === AssessmentStatus.CANCELLED ||
      assessment.status === AssessmentStatus.DRAFT
    ) {
      throw new ForbiddenException("Assessment is not open.");
    }
    const now = new Date();
    const startsAt = assessment.startAt ?? assessment.opensAt;
    const endsAt = assessment.endAt ?? assessment.closesAt;
    if (startsAt && startsAt > now) {
      throw new ForbiddenException("Assessment has not started.");
    }
    if (endsAt && endsAt < now) {
      throw new ForbiddenException("Assessment window has closed.");
    }
    if (!assessment.assessmentQuestions.length) {
      throw new ConflictException("Assessment has no valid questions.");
    }
    void studentId;
  }

  private async findOwnedAttempt(studentId: string, attemptId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: {
        assessment: { include: { subject: true } },
        sections: { orderBy: { displayOrder: "asc" } },
        questions: {
          orderBy: { displayOrder: "asc" },
          include: { answer: true, section: true },
        },
        answers: true,
        submissionReceipt: true,
        result: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }
    return attempt;
  }

  private async findAttemptForWrite(
    tx: Tx,
    studentId: string,
    attemptId: string,
  ) {
    const attempt = await tx.testAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: { questions: { include: { answer: true } }, answers: true },
    });
    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }
    if (attempt.status !== TestAttemptStatus.IN_PROGRESS) {
      throw new ForbiddenException("Attempt is no longer accepting answers.");
    }
    if (attempt.expiresAt.getTime() <= Date.now()) {
      this.logAttemptLifecycle("attempt_write_rejected_expired", {
        assessmentId: attempt.assessmentId,
        attemptId,
        durationMinutes: null,
        startTime: attempt.startedAt.toISOString(),
        endTime: attempt.expiresAt.toISOString(),
        remainingTime: this.remainingSeconds(attempt.expiresAt),
        questionCount: attempt.questions.length,
        submitReason: "answer-write-expired",
      });
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: { status: TestAttemptStatus.EXPIRED },
      });
      throw new ForbiddenException("Attempt has expired.");
    }
    return attempt;
  }

  private async findAttemptForSubmit(
    tx: Tx,
    studentId: string,
    attemptId: string,
  ) {
    const attempt = await tx.testAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: {
        questions: { include: { answer: true, section: true } },
        answers: true,
        assessment: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }
    if (
      attempt.status !== TestAttemptStatus.IN_PROGRESS &&
      attempt.status !== TestAttemptStatus.EXPIRED
    ) {
      return attempt;
    }
    return attempt;
  }

  private async expireIfNeeded(attemptId: string) {
    const attempt = await this.prisma.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    if (
      attempt.status === TestAttemptStatus.IN_PROGRESS &&
      attempt.expiresAt.getTime() <= Date.now()
    ) {
      this.logAttemptLifecycle("attempt_marked_expired", {
        assessmentId: attempt.assessmentId,
        attemptId,
        durationMinutes: null,
        startTime: attempt.startedAt.toISOString(),
        endTime: attempt.expiresAt.toISOString(),
        remainingTime: this.remainingSeconds(attempt.expiresAt),
        questionCount: null,
        submitReason: "duration-expired",
      });
      return this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: { status: TestAttemptStatus.EXPIRED },
      });
    }
    return attempt;
  }

  private async evaluateAttempt(tx: Tx, attemptId: string) {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        questions: { include: { answer: true, section: true } },
        assessment: true,
      },
    });
    let objectiveScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let attemptedCount = 0;
    const sectionTotals = new Map<
      string,
      {
        name: string;
        total: number;
        awarded: number;
        correct: number;
        incorrect: number;
        unanswered: number;
      }
    >();

    for (const question of attempt.questions) {
      const sectionKey = question.sectionId ?? "unsectioned";
      if (!sectionTotals.has(sectionKey)) {
        sectionTotals.set(sectionKey, {
          name: question.section?.name ?? "Default",
          total: 0,
          awarded: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
        });
      }
      const section = sectionTotals.get(sectionKey);
      if (!section) {
        continue;
      }
      section.total += question.assignedMarks;
      const answer = question.answer;
      const isAnswered = answer ? this.studentAnswerAnswered(answer) : false;
      if (!isAnswered) {
        unansweredCount += 1;
        section.unanswered += 1;
      } else {
        attemptedCount += 1;
      }

      if (objectiveTypes.has(question.questionType)) {
        const evaluation = this.evaluateObjective(question, answer ?? null);
        objectiveScore += evaluation.awardedMarks;
        if (evaluation.isCorrect === true) {
          correctCount += 1;
          section.correct += 1;
        } else if (evaluation.isCorrect === false && isAnswered) {
          incorrectCount += 1;
          section.incorrect += 1;
        }
        section.awarded += evaluation.awardedMarks;
        await tx.objectiveAnswerEvaluation.upsert({
          where: { attemptQuestionId: question.id },
          update: evaluation,
          create: {
            attemptQuestionId: question.id,
            studentAnswerId: answer?.id,
            ...evaluation,
          },
        });
      } else if (manualTypes.has(question.questionType)) {
        await tx.manualReviewTask.upsert({
          where: {
            attemptId_attemptQuestionId: {
              attemptId,
              attemptQuestionId: question.id,
            },
          },
          update: {},
          create: {
            attemptId,
            attemptQuestionId: question.id,
            maxMarks: question.assignedMarks,
          },
        });
      }
    }

    const manualPending = await tx.manualReviewTask.count({
      where: { attemptId, status: { not: ManualReviewStatus.COMPLETED } },
    });
    const resultVisibility = this.resultVisibilityState(attempt.assessment);
    const autoPublish = manualPending === 0 && resultVisibility.visible;
    const resultData = {
      collegeId: attempt.collegeId,
      assessmentId: attempt.assessmentId,
      attemptId,
      studentId: attempt.studentId,
      objectiveScore,
      totalScore: objectiveScore,
      percentage: this.percentage(
        objectiveScore,
        attempt.assessment.totalMarks,
      ),
      passStatus: this.passStatus(
        objectiveScore,
        attempt.assessment.passingMarks,
      ),
      correctCount,
      incorrectCount,
      unansweredCount,
      attemptedCount,
      timeTakenSeconds: Math.max(
        0,
        Math.floor(
          ((
            attempt.submittedAt ??
            attempt.autoSubmittedAt ??
            new Date()
          ).getTime() -
            attempt.startedAt.getTime()) /
            1000,
        ),
      ),
      evaluationStatus: manualPending > 0 ? "PENDING_REVIEW" : "READY",
      isPublished: autoPublish,
      publishedAt: autoPublish ? new Date() : null,
    };
    const result = await tx.result.upsert({
      where: { attemptId },
      update: resultData,
      create: resultData,
    });
    await tx.sectionResult.deleteMany({ where: { resultId: result.id } });
    for (const [sectionId, section] of sectionTotals.entries()) {
      await tx.sectionResult.create({
        data: {
          resultId: result.id,
          attemptSectionId: sectionId === "unsectioned" ? null : sectionId,
          sectionName: section.name,
          totalMarks: section.total,
          awardedMarks: section.awarded,
          correctCount: section.correct,
          incorrectCount: section.incorrect,
          unansweredCount: section.unanswered,
        },
      });
    }
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        objectiveScore,
        finalScore: objectiveScore,
        percentage: this.percentage(
          objectiveScore,
          attempt.assessment.totalMarks,
        ),
        passStatus: this.passStatus(
          objectiveScore,
          attempt.assessment.passingMarks,
        ),
        status:
          manualPending > 0
            ? TestAttemptStatus.UNDER_REVIEW
            : TestAttemptStatus.EVALUATED,
      },
    });
  }

  private async recalculateResult(tx: Tx, attemptId: string) {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { assessment: true, manualReviewTasks: true, result: true },
    });
    const descriptiveScore = attempt.manualReviewTasks.reduce(
      (sum, task) => sum + (task.awardedMarks ?? 0),
      0,
    );
    const totalScore =
      (attempt.objectiveScore ?? 0) +
      descriptiveScore +
      (attempt.codingScore ?? 0);
    const pending = attempt.manualReviewTasks.some(
      (task) => task.status !== ManualReviewStatus.COMPLETED,
    );
    await tx.result.update({
      where: { attemptId },
      data: {
        descriptiveScore,
        totalScore,
        percentage: this.percentage(totalScore, attempt.assessment.totalMarks),
        passStatus: this.passStatus(
          totalScore,
          attempt.assessment.passingMarks,
        ),
        evaluationStatus: pending ? "PENDING_REVIEW" : "READY",
      },
    });
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        descriptiveScore,
        finalScore: totalScore,
        percentage: this.percentage(totalScore, attempt.assessment.totalMarks),
        passStatus: this.passStatus(
          totalScore,
          attempt.assessment.passingMarks,
        ),
        status: pending
          ? TestAttemptStatus.UNDER_REVIEW
          : TestAttemptStatus.EVALUATED,
      },
    });
  }

  private evaluateObjective(
    question: {
      questionType: QuestionType;
      assignedMarks: number;
      assignedNegativeMarks: number;
      evaluatorMetadata: Prisma.JsonValue | null;
    },
    answer: {
      selectedOptionKeys: string[];
      textAnswer: string | null;
      numericalAnswer: Prisma.Decimal | null;
    } | null,
  ) {
    const metadata = this.objectRecord(question.evaluatorMetadata);
    const correctKeys = this.stringArray(metadata.correctOptionKeys);
    const selected = [...(answer?.selectedOptionKeys ?? [])].sort();
    const correct = [...correctKeys].sort();
    let isCorrect = false;
    let answered =
      selected.length > 0 ||
      !!answer?.textAnswer ||
      answer?.numericalAnswer !== null;
    if (
      question.questionType === QuestionType.SINGLE_CHOICE ||
      question.questionType === QuestionType.TRUE_FALSE
    ) {
      isCorrect = selected.length === 1 && selected[0] === correct[0];
    } else if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
      isCorrect =
        selected.length === correct.length &&
        selected.every((key, index) => key === correct[index]);
    } else if (question.questionType === QuestionType.FILL_IN_THE_BLANK) {
      const acceptedAnswers = this.stringArray(metadata.acceptedAnswers);
      const caseSensitive = metadata.caseSensitive === true;
      const normalized = this.normalizeBlank(
        answer?.textAnswer ?? "",
        caseSensitive,
      );
      answered = normalized.length > 0;
      isCorrect = acceptedAnswers.some(
        (item) => this.normalizeBlank(item, caseSensitive) === normalized,
      );
    } else if (question.questionType === QuestionType.NUMERICAL) {
      const expected = Number(metadata.numericalAnswer);
      const tolerance = Number(metadata.tolerance ?? 0);
      const actual =
        answer?.numericalAnswer === null ||
        answer?.numericalAnswer === undefined
          ? Number.NaN
          : Number(answer.numericalAnswer);
      answered = Number.isFinite(actual);
      isCorrect =
        Number.isFinite(expected) &&
        Number.isFinite(actual) &&
        Math.abs(actual - expected) <= tolerance;
    }
    const awardedMarks = !answered
      ? 0
      : isCorrect
        ? question.assignedMarks
        : -Math.abs(question.assignedNegativeMarks);
    return {
      isCorrect: answered ? isCorrect : null,
      awardedMarks,
      maxMarks: question.assignedMarks,
      negativeMarksApplied: awardedMarks < 0 ? Math.abs(awardedMarks) : 0,
      evaluationDetails: {
        policy: "exact-match",
        normalization: "trim; case-insensitive for blanks unless configured",
      },
    };
  }

  private requireReviewerRole(user: AuthenticatedUser) {
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.COLLEGE_ADMIN &&
      user.role !== Role.FACULTY
    ) {
      throw new ForbiddenException("Reviewer access is required.");
    }
  }

  private requireAttemptAdminRole(user: AuthenticatedUser) {
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.COLLEGE_ADMIN) {
      throw new ForbiddenException("Attempt administration is required.");
    }
  }

  private reviewScopeWhere(
    user: AuthenticatedUser,
  ): Prisma.ManualReviewTaskWhereInput {
    if (user.role === Role.SUPER_ADMIN) {
      return {};
    }
    if (!user.collegeId) {
      throw new ForbiddenException("College scope is required.");
    }
    return { attempt: { collegeId: user.collegeId } };
  }

  private async ensureAssessmentManagementAccess(
    user: AuthenticatedUser,
    assessmentId: string,
  ) {
    this.requireReviewerRole(user);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException("Assessment not found.");
    }
    if (
      user.role !== Role.SUPER_ADMIN &&
      assessment.collegeId !== user.collegeId
    ) {
      throw new ForbiddenException("Assessment is outside your college.");
    }
    if (user.role === Role.FACULTY && assessment.subjectId) {
      const assigned = await this.prisma.subjectAssignment.count({
        where: {
          userId: user.id,
          subjectId: assessment.subjectId,
          collegeId: user.collegeId ?? "",
          status: EntityStatus.ACTIVE,
        },
      });
      if (!assigned) {
        throw new ForbiddenException(
          "Assessment is outside your assigned subjects.",
        );
      }
    }
    return assessment;
  }

  private async ensureStudentInAssessmentCollege(
    assessment: { collegeId: string | null },
    studentId: string,
  ) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: Role.STUDENT,
        collegeId: assessment.collegeId ?? undefined,
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(
        "Student is not available for this assessment.",
      );
    }
  }

  private assignedAssessmentWhere(
    studentProfileId: string,
    batchId: string,
    collegeId: string,
    query: StudentAssessmentQueryDto,
    now: Date,
  ): Prisma.AssessmentWhereInput {
    return {
      collegeId,
      deletedAt: null,
      ...this.assignmentWhere(studentProfileId, batchId),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
      ...(query.status === "upcoming" ? { startAt: { gt: now } } : {}),
      ...(query.status === "active"
        ? { startAt: { lte: now }, endAt: { gte: now } }
        : {}),
      ...(query.status === "completed"
        ? {
            testAttempts: {
              some: {
                status: {
                  in: [
                    TestAttemptStatus.SUBMITTED,
                    TestAttemptStatus.AUTO_SUBMITTED,
                    TestAttemptStatus.EVALUATED,
                  ],
                },
              },
            },
          }
        : {}),
    };
  }

  private assignmentWhere(
    studentProfileId: string,
    batchId: string,
  ): Prisma.AssessmentWhereInput {
    return {
      OR: [
        { studentAssignments: { some: { studentProfileId } } },
        { batchAssignments: { some: { batchId } } },
        { assignments: { some: {} } },
      ],
    };
  }

  private assessmentOrder(
    query: StudentAssessmentQueryDto,
  ): Prisma.AssessmentOrderByWithRelationInput {
    const direction = query.sortOrder ?? "asc";
    if (query.sortBy === "title") {
      return { title: direction };
    }
    if (query.sortBy === "endAt") {
      return { endAt: direction };
    }
    return { startAt: direction };
  }

  private studentAssessmentCard(
    assessment: {
      id: string;
      title: string;
      description?: string | null;
      durationMinutes?: number | null;
      durationMin?: number | null;
      totalMarks: number;
      passingMarks?: number | null;
      maxAttempts: number;
      attemptScoringPolicy: AttemptScoringPolicy;
      startAt?: Date | null;
      endAt?: Date | null;
      opensAt?: Date | null;
      closesAt?: Date | null;
      status: AssessmentStatus;
      resultVisibility: ResultVisibility;
      negativeMarkingEnabled: boolean;
      subject?: { id: string; subjectName: string; subjectCode: string } | null;
      assessmentQuestions?: unknown[];
      testAttempts?: Array<{
        id: string;
        status: TestAttemptStatus;
        attemptNumber: number;
        createdAt?: Date;
      }>;
      results?: Array<{
        id: string;
        isPublished: boolean;
        totalScore?: number;
        createdAt?: Date;
        attempt?: { attemptNumber: number } | null;
      }>;
      attemptGrants?: Array<{
        additionalAttempts: number;
        resetBefore?: Date | null;
      }>;
    },
    now: Date,
  ) {
    const startsAt = assessment.startAt ?? assessment.opensAt ?? null;
    const endsAt = assessment.endAt ?? assessment.closesAt ?? null;
    const grant = assessment.attemptGrants?.[0] ?? null;
    const usedAttempts = (assessment.testAttempts ?? []).filter((attempt) => {
      if (!countedAttemptStatuses.includes(attempt.status)) return false;
      if (!grant?.resetBefore || !attempt.createdAt) return true;
      return attempt.createdAt > grant.resetBefore;
    }).length;
    const allowedAttempts =
      assessment.maxAttempts + Math.max(0, grant?.additionalAttempts ?? 0);
    const latestAttempt = assessment.testAttempts?.[0] ?? null;
    const finalResult = this.selectFinalResult(
      assessment.results ?? [],
      assessment.attemptScoringPolicy,
    );
    return {
      id: assessment.id,
      title: assessment.title,
      subject: assessment.subject,
      durationMinutes: this.durationMinutes(assessment),
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      maxAttempts: assessment.maxAttempts,
      attemptScoringPolicy: assessment.attemptScoringPolicy,
      startAt: startsAt,
      endAt: endsAt,
      status: assessment.status,
      windowState:
        startsAt && startsAt > now
          ? "UPCOMING"
          : endsAt && endsAt < now
            ? "CLOSED"
            : "OPEN",
      questionCount: assessment.assessmentQuestions?.length ?? 0,
      latestAttempt,
      attemptsUsed: usedAttempts,
      attemptsRemaining: Math.max(0, allowedAttempts - usedAttempts),
      nextAttemptNumber: usedAttempts + 1,
      publishedResultId: finalResult?.id ?? null,
      negativeMarkingEnabled: assessment.negativeMarkingEnabled,
    };
  }

  private selectFinalResult(
    results: Array<{
      id: string;
      totalScore?: number;
      createdAt?: Date;
      attempt?: { attemptNumber: number } | null;
    }>,
    policy: AttemptScoringPolicy,
  ) {
    if (!results.length) return null;
    const ordered = [...results];
    if (policy === AttemptScoringPolicy.FIRST) {
      ordered.sort(
        (left, right) =>
          (left.attempt?.attemptNumber ?? 0) - (right.attempt?.attemptNumber ?? 0),
      );
      return ordered[0];
    }
    if (policy === AttemptScoringPolicy.LATEST) {
      ordered.sort(
        (left, right) =>
          (right.attempt?.attemptNumber ?? 0) - (left.attempt?.attemptNumber ?? 0),
      );
      return ordered[0];
    }
    ordered.sort((left, right) => {
      const scoreDelta = (right.totalScore ?? 0) - (left.totalScore ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return (
        (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
      );
    });
    return ordered[0];
  }

  private publicEligibility(
    assessment: {
      status: AssessmentStatus;
      startAt?: Date | null;
      opensAt?: Date | null;
      endAt?: Date | null;
      closesAt?: Date | null;
      assessmentQuestions?: unknown[];
    },
    now: Date,
  ) {
    const startsAt = assessment.startAt ?? assessment.opensAt;
    const endsAt = assessment.endAt ?? assessment.closesAt;
    const errors: string[] = [];
    if (
      assessment.status === AssessmentStatus.CANCELLED ||
      assessment.status === AssessmentStatus.DRAFT
    ) {
      errors.push("Assessment is not open.");
    }
    if (startsAt && startsAt > now) {
      errors.push("Assessment has not started.");
    }
    if (endsAt && endsAt < now) {
      errors.push("Assessment window has closed.");
    }
    if (!assessment.assessmentQuestions?.length) {
      errors.push("Assessment has no questions.");
    }
    return { eligible: errors.length === 0, errors };
  }

  private async validateStartProctoringReadiness(
    tx: Tx,
    collegeId: string,
    assessmentId: string,
    metadata?: Record<string, unknown>,
  ) {
    const policy = await tx.proctoringPolicy.findFirst({
      where: {
        active: true,
        OR: [
          { assessmentId },
          { collegeId, isDefault: true },
          { collegeId: null, isDefault: true },
        ],
      },
      orderBy: [
        { assessmentId: "desc" },
        { isDefault: "desc" },
        { updatedAt: "desc" },
      ],
    });
    const proctoringEnabled = policy?.proctoringEnabled ?? true;
    const cameraRequired = proctoringEnabled && (policy?.webcamRequired ?? true);
    const fullscreenRequired = policy?.fullscreenRequired ?? true;
    if (cameraRequired && metadata?.cameraReady !== true) {
      throw new ForbiddenException(
        "Camera permission is required before starting.",
      );
    }
    if (fullscreenRequired && metadata?.fullscreenReady !== true) {
      throw new ForbiddenException("Fullscreen mode is required before starting.");
    }
  }

  private resultVisibilityState(assessment: {
    resultVisibility: ResultVisibility;
    resultPublishAt?: Date | null;
    endAt?: Date | null;
    closesAt?: Date | null;
  }) {
    const now = new Date();
    if (assessment.resultVisibility === ResultVisibility.NEVER) {
      return { visible: false, reason: "hidden" };
    }
    if (assessment.resultVisibility === ResultVisibility.AFTER_SUBMISSION) {
      return { visible: true, reason: "after-submission" };
    }
    if (assessment.resultVisibility === ResultVisibility.SCHEDULED) {
      return {
        visible:
          !assessment.resultPublishAt ||
          assessment.resultPublishAt.getTime() <= now.getTime(),
        reason: "scheduled",
      };
    }
    const endsAt = assessment.endAt ?? assessment.closesAt;
    return {
      visible: !endsAt || endsAt.getTime() <= now.getTime(),
      reason: "after-end",
    };
  }

  private studentVisibleResultWhere(
    studentId: string,
  ): Prisma.ResultWhereInput {
    const now = new Date();
    return {
      studentId,
      evaluationStatus: { in: ["READY", "PUBLISHED"] },
      OR: [
        { isPublished: true },
        {
          assessment: {
            resultVisibility: ResultVisibility.AFTER_SUBMISSION,
          },
        },
        {
          assessment: {
            resultVisibility: ResultVisibility.AFTER_END,
            OR: [
              { endAt: null, closesAt: null },
              { endAt: { lte: now } },
              { closesAt: { lte: now } },
            ],
          },
        },
        {
          assessment: {
            resultVisibility: ResultVisibility.SCHEDULED,
            OR: [{ resultPublishAt: null }, { resultPublishAt: { lte: now } }],
          },
        },
      ],
    };
  }

  private async publishEligibleStudentResults(studentId: string) {
    const eligible = await this.prisma.result.findMany({
      where: {
        ...this.studentVisibleResultWhere(studentId),
        isPublished: false,
      },
      select: { id: true },
    });
    if (!eligible.length) {
      return;
    }
    await this.prisma.result.updateMany({
      where: { id: { in: eligible.map((result) => result.id) } },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  private studentAttemptPayload(
    attempt: Awaited<ReturnType<StudentExamService["findOwnedAttempt"]>>,
  ) {
    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      autoSubmittedAt: attempt.autoSubmittedAt,
      assessment: {
        id: attempt.assessment.id,
        title: attempt.assessment.title,
        instructions: attempt.assessment.instructions,
        allowSectionNavigation: attempt.assessment.allowSectionNavigation,
        allowBackNavigation: attempt.assessment.allowBackNavigation,
        fullscreenPreferred: attempt.assessment.fullscreenPreferred,
        subject: attempt.assessment.subject,
      },
      sections: attempt.sections,
      questions: attempt.questions.map((question) => ({
        id: question.id,
        sectionId: question.sectionId,
        displayOrder: question.displayOrder,
        questionType: question.questionType,
        questionText: question.questionTextSnapshot,
        options: question.optionsSnapshot,
        assignedMarks: question.assignedMarks,
        mandatory: question.mandatory,
        metadata: question.safeMetadataSnapshot,
        answer: question.answer ? this.answerPayload(question.answer) : null,
      })),
      receipt: attempt.submissionReceipt,
    };
  }

  private answerPayload(answer: {
    id: string;
    attemptQuestionId: string;
    selectedOptionKeys: string[];
    textAnswer: string | null;
    numericalAnswer: Prisma.Decimal | null;
    markedForReview: boolean;
    answeredAt: Date | null;
    updatedAt: Date;
    version: number;
  }) {
    return {
      id: answer.id,
      attemptQuestionId: answer.attemptQuestionId,
      selectedOptionKeys: answer.selectedOptionKeys,
      textAnswer: answer.textAnswer,
      numericalAnswer:
        answer.numericalAnswer === null ? null : Number(answer.numericalAnswer),
      markedForReview: answer.markedForReview,
      answeredAt: answer.answeredAt,
      updatedAt: answer.updatedAt,
      version: answer.version,
    };
  }

  private resultPayload(result: {
    id: string;
    assessmentId: string;
    attemptId: string;
    objectiveScore: number;
    descriptiveScore: number;
    codingScore: number;
    totalScore: number;
    percentage: number;
    passStatus: PassStatus;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    attemptedCount: number;
    timeTakenSeconds: number | null;
    evaluationStatus: string;
    isPublished: boolean;
    publishedAt: Date | null;
    assessment?: {
      title: string;
      subject?: unknown;
      resultVisibility?: ResultVisibility;
    };
    sectionResults?: unknown[];
    attempt?: {
      startedAt?: Date;
      submittedAt?: Date | null;
      autoSubmittedAt?: Date | null;
      status?: TestAttemptStatus;
      securityFlags?: unknown[];
      student?: {
        name: string;
        email: string;
        studentId: string | null;
        studentProfile?: { rollNumber: string } | null;
      };
      questions?: Array<{
        id: string;
        displayOrder: number;
        questionType: QuestionType;
        questionTextSnapshot: string;
        assignedMarks: number;
        answer?: {
          selectedOptionKeys: string[];
          textAnswer: string | null;
          numericalAnswer: Prisma.Decimal | null;
          markedForReview: boolean;
        } | null;
        evaluations?: Array<{
          isCorrect: boolean | null;
          awardedMarks: number;
          maxMarks: number;
          negativeMarksApplied: number;
        }>;
      }>;
    };
  }) {
    const submittedAt =
      result.attempt?.submittedAt ?? result.attempt?.autoSubmittedAt ?? null;
    return {
      id: result.id,
      assessmentId: result.assessmentId,
      attemptId: result.attemptId,
      assessment: result.assessment,
      student: result.attempt?.student
        ? {
            name: result.attempt.student.name,
            email: result.attempt.student.email,
            studentId: result.attempt.student.studentId,
            rollNumber:
              result.attempt.student.studentProfile?.rollNumber ?? null,
          }
        : undefined,
      objectiveScore: result.objectiveScore,
      descriptiveScore: result.descriptiveScore,
      codingScore: result.codingScore,
      totalScore: result.totalScore,
      percentage: result.percentage,
      passStatus: result.passStatus,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      attemptedCount: result.attemptedCount,
      timeTakenSeconds: result.timeTakenSeconds,
      submittedAt,
      durationSeconds: result.timeTakenSeconds,
      violations: result.attempt?.securityFlags?.length ?? 0,
      attemptStatus: result.attempt?.status,
      evaluationStatus: result.evaluationStatus,
      isPublished: result.isPublished,
      publishedAt: result.publishedAt,
      sectionResults: result.sectionResults ?? [],
      questionReview:
        result.isPublished &&
        result.assessment?.resultVisibility !== ResultVisibility.NEVER
          ? (result.attempt?.questions ?? []).map((question) => ({
              id: question.id,
              displayOrder: question.displayOrder,
              questionType: question.questionType,
              questionText: question.questionTextSnapshot,
              assignedMarks: question.assignedMarks,
              selectedOptionKeys: question.answer?.selectedOptionKeys ?? [],
              textAnswer: question.answer?.textAnswer ?? null,
              numericalAnswer:
                question.answer?.numericalAnswer === null ||
                question.answer?.numericalAnswer === undefined
                  ? null
                  : Number(question.answer.numericalAnswer),
              markedForReview: question.answer?.markedForReview ?? false,
              isCorrect: question.evaluations?.[0]?.isCorrect ?? null,
              awardedMarks: question.evaluations?.[0]?.awardedMarks ?? null,
              maxMarks:
                question.evaluations?.[0]?.maxMarks ?? question.assignedMarks,
              negativeMarksApplied:
                question.evaluations?.[0]?.negativeMarksApplied ?? 0,
            }))
          : [],
    };
  }

  private reviewPayload(review: {
    id: string;
    status: ManualReviewStatus;
    maxMarks: number;
    awardedMarks: number | null;
    feedback: string | null;
    reviewedAt: Date | null;
    attemptQuestion: {
      id: string;
      questionTextSnapshot: string;
      questionType: QuestionType;
    };
    attempt: {
      id: string;
      assessment: { id: string; title: string };
      student: {
        id: string;
        name: string;
        email: string;
        studentId: string | null;
      };
    };
    assignedReviewer?: { id: string; name: string; email: string } | null;
  }) {
    return {
      id: review.id,
      status: review.status,
      maxMarks: review.maxMarks,
      awardedMarks: review.awardedMarks,
      feedback: review.feedback,
      reviewedAt: review.reviewedAt,
      question: review.attemptQuestion,
      attempt: {
        id: review.attempt.id,
        assessment: review.attempt.assessment,
        student: review.attempt.student,
      },
      assignedReviewer: review.assignedReviewer ?? null,
    };
  }

  private durationMinutes(assessment: {
    durationMinutes?: number | null;
    durationMin?: number | null;
  }) {
    return assessment.durationMinutes ?? assessment.durationMin ?? 30;
  }

  private remainingSeconds(expiresAt: Date, from = new Date()) {
    return Math.max(
      0,
      Math.floor((expiresAt.getTime() - from.getTime()) / 1000),
    );
  }

  private durationTakenSeconds(attempt: {
    startedAt: Date;
    submittedAt?: Date | null;
    autoSubmittedAt?: Date | null;
  }) {
    const submittedAt = attempt.submittedAt ?? attempt.autoSubmittedAt ?? null;
    if (!submittedAt) return null;
    return Math.max(
      0,
      Math.floor((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000),
    );
  }

  private logAttemptLifecycle(
    event: string,
    payload: Record<string, unknown>,
  ) {
    this.logger.log(JSON.stringify({ event, ...payload }));
  }

  private safeOptionSnapshot(
    options: Array<{
      optionKey: string;
      optionText: string;
      displayOrder: number;
    }>,
  ) {
    return options.map((option) => ({
      optionKey: option.optionKey,
      optionText: option.optionText,
      displayOrder: option.displayOrder,
    }));
  }

  private safeQuestionMetadata(question: {
    questionType: QuestionType | null;
    codingQuestion?: {
      problemStatement: string;
      inputFormat: string | null;
      outputFormat: string | null;
      constraints: string | null;
      examples: Prisma.JsonValue;
      allowedLanguages: string[];
      testCases: Array<{
        input: string;
        expectedOutput: string;
        visibility: string;
        displayOrder: number;
      }>;
    } | null;
    metadata: Prisma.JsonValue | null;
  }) {
    if (
      question.questionType === QuestionType.CODING &&
      question.codingQuestion
    ) {
      return {
        problemStatement: question.codingQuestion.problemStatement,
        inputFormat: question.codingQuestion.inputFormat,
        outputFormat: question.codingQuestion.outputFormat,
        constraints: question.codingQuestion.constraints,
        examples: question.codingQuestion.examples,
        allowedLanguages: question.codingQuestion.allowedLanguages,
        publicTestCases: question.codingQuestion.testCases
          .filter((testCase) => testCase.visibility === "PUBLIC")
          .map((testCase) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            displayOrder: testCase.displayOrder,
          })),
        executionAvailable: false,
      };
    }
    return this.objectRecord(question.metadata);
  }

  private evaluatorMetadata(question: {
    options: Array<{ optionKey: string; isCorrect: boolean }>;
    metadata: Prisma.JsonValue | null;
    codingQuestion?: { testCases: unknown[] } | null;
  }) {
    const metadata = this.objectRecord(question.metadata);
    return {
      ...metadata,
      correctOptionKeys: question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.optionKey),
      hiddenTestCases: question.codingQuestion?.testCases ?? [],
    };
  }

  private stableShuffle<T>(items: T[], seed: string): T[] {
    return [...items].sort(
      (a, b) =>
        this.hash(`${seed}:${JSON.stringify(a)}`) -
        this.hash(`${seed}:${JSON.stringify(b)}`),
    );
  }

  private hash(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  private isAnswered(
    selected: string[],
    text: string | null,
    numerical: Prisma.Decimal | null,
  ) {
    return selected.length > 0 || !!text || numerical !== null;
  }

  private studentAnswerAnswered(answer: {
    selectedOptionKeys: string[];
    textAnswer: string | null;
    numericalAnswer: Prisma.Decimal | null;
  }) {
    return this.isAnswered(
      answer.selectedOptionKeys,
      answer.textAnswer,
      answer.numericalAnswer,
    );
  }

  private percentage(score: number, total: number) {
    return total > 0 ? Number(((score / total) * 100).toFixed(2)) : 0;
  }

  private passStatus(score: number, passingMarks: number | null) {
    if (passingMarks === null) {
      return PassStatus.PENDING;
    }
    return score >= passingMarks ? PassStatus.PASS : PassStatus.FAIL;
  }

  private normalizeBlank(value: string, caseSensitive: boolean) {
    const trimmed = value.trim();
    return caseSensitive ? trimmed : trimmed.toLocaleLowerCase();
  }

  private optional(value: string | undefined) {
    return value?.trim() ? value.trim() : null;
  }

  private json(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private objectRecord(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    return {};
  }

  private stringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }
}
