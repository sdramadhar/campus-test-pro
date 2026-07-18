import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditEvent,
  BackgroundJobStatus,
  ManualReviewStatus,
  ModerationStatus,
  NotificationStatus,
  NotificationType,
  PassStatus,
  Prisma,
  QuestionType,
  Role,
  SecurityReviewStatus,
  TestAttemptStatus,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  CompleteReviewDto,
  ModerateResultDto,
  OperationsQueryDto,
  ReviewListQueryDto,
  SecurityReviewDto,
} from "./dto/exam-operations.dto";
import { ExamQueueService } from "./exam-queue.service";

type Tx = Prisma.TransactionClient;

const objectiveTypes = new Set<QuestionType>([
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_IN_THE_BLANK,
  QuestionType.NUMERICAL,
]);

@Injectable()
export class ExamOperationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ExamQueueService) private readonly queues: ExamQueueService,
  ) {}

  async scheduleExpiryForAttempt(
    attemptId: string,
    expiresAt: Date,
  ): Promise<string> {
    const jobId = await this.queues.scheduleAttemptExpiry(attemptId, expiresAt);
    await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: { expiryJobId: jobId },
    });
    return jobId;
  }

  async sweepExpiredAttempts(limit = 50) {
    const expired = await this.prisma.testAttempt.findMany({
      where: {
        status: TestAttemptStatus.IN_PROGRESS,
        expiresAt: { lte: new Date() },
      },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });
    const processed = [];
    for (const attempt of expired) {
      processed.push(await this.autoSubmitAttempt(attempt.id, "sweep"));
    }
    return {
      success: true,
      data: {
        scanned: expired.length,
        processed: processed.filter(Boolean).length,
      },
    };
  }

  async autoSubmitAttempt(attemptId: string, claimedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.testAttempt.updateMany({
        where: {
          id: attemptId,
          status: TestAttemptStatus.IN_PROGRESS,
          expiresAt: { lte: new Date() },
          autoSubmitClaimedAt: null,
        },
        data: {
          autoSubmitClaimedAt: new Date(),
          autoSubmitClaimedBy: claimedBy,
        },
      });
      if (claimed.count === 0) {
        return null;
      }
      const attempt = await tx.testAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: {
          questions: { include: { answer: true, section: true } },
          assessment: true,
        },
      });
      const answerCount = attempt.questions.filter(
        (question) => question.answer && this.isAnswered(question.answer),
      ).length;
      const unansweredCount = attempt.questions.length - answerCount;
      const submittedAt = new Date();
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          status: TestAttemptStatus.AUTO_SUBMITTED,
          autoSubmittedAt: submittedAt,
          lastActivityAt: submittedAt,
        },
      });
      await tx.submissionReceipt.upsert({
        where: { attemptId },
        update: {},
        create: {
          attemptId,
          receiptNumber: `AUTO-${attemptId.slice(-8).toUpperCase()}-${String(submittedAt.getTime())}`,
          submittedAt,
          answerCount,
          unansweredCount,
          status: TestAttemptStatus.AUTO_SUBMITTED,
        },
      });
      await this.calculateResult(tx, attemptId);
      await tx.attemptEvent.create({
        data: { attemptId, eventType: "AUTO_SUBMIT", metadata: { claimedBy } },
      });
      await tx.auditLog.create({
        data: {
          event: AuditEvent.ATTEMPT_AUTO_SUBMIT,
          userId: attempt.studentId,
          collegeId: attempt.collegeId,
          actorRole: Role.STUDENT,
        },
      });
      await this.queues.addJob(
        "result-calculation",
        "calculate-result",
        { attemptId },
        `result-calculation-${attemptId}`,
      );
      return attemptId;
    });
  }

  async operationsDashboard(
    user: AuthenticatedUser,
    query: OperationsQueryDto,
  ) {
    this.requireOperator(user);
    const scope = this.collegeScope(user, query.collegeId);
    const assessmentWhere = {
      ...scope,
      ...(query.assessmentId ? { id: query.assessmentId } : {}),
    };
    const attemptWhere = {
      ...scope,
      ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
      ...(query.status ? { status: query.status as TestAttemptStatus } : {}),
    };
    const [
      scheduledAssessments,
      activeAssessments,
      activeAttempts,
      submittedAttempts,
      autoSubmittedAttempts,
      expiredAttempts,
      pendingReviews,
      failedJobs,
      resultBacklog,
      flaggedAttempts,
    ] = await Promise.all([
      this.prisma.assessment.count({
        where: { ...assessmentWhere, status: "SCHEDULED" },
      }),
      this.prisma.assessment.count({
        where: {
          ...assessmentWhere,
          status: "PUBLISHED",
          startAt: { lte: new Date() },
          endAt: { gte: new Date() },
        },
      }),
      this.prisma.testAttempt.count({
        where: { ...attemptWhere, status: TestAttemptStatus.IN_PROGRESS },
      }),
      this.prisma.testAttempt.count({
        where: { ...attemptWhere, status: TestAttemptStatus.SUBMITTED },
      }),
      this.prisma.testAttempt.count({
        where: { ...attemptWhere, status: TestAttemptStatus.AUTO_SUBMITTED },
      }),
      this.prisma.testAttempt.count({
        where: { ...attemptWhere, status: TestAttemptStatus.EXPIRED },
      }),
      this.prisma.manualReviewTask.count({
        where: {
          attempt: attemptWhere,
          status: { not: ManualReviewStatus.COMPLETED },
        },
      }),
      this.prisma.backgroundJobRecord.count({
        where: { status: BackgroundJobStatus.FAILED },
      }),
      this.prisma.backgroundJobRecord.count({
        where: {
          queueName: "result-calculation",
          status: {
            in: [BackgroundJobStatus.WAITING, BackgroundJobStatus.DELAYED],
          },
        },
      }),
      this.prisma.attemptSecurityReview.count({
        where: { attempt: attemptWhere, status: SecurityReviewStatus.FLAGGED },
      }),
    ]);
    return {
      success: true,
      data: {
        scheduledAssessments,
        activeAssessments,
        activeAttempts,
        submittedAttempts,
        autoSubmittedAttempts,
        expiredAttempts,
        pendingReviews,
        failedJobs,
        resultBacklog,
        disconnectedStudents: 0,
        flaggedAttempts,
      },
    };
  }

  async listReviews(user: AuthenticatedUser, query: ReviewListQueryDto) {
    this.ensureReviewer(user);
    const where: Prisma.ManualReviewTaskWhereInput = {
      ...(query.status ? { status: query.status as ManualReviewStatus } : {}),
      attempt: {
        ...this.collegeScope(user, query.collegeId),
        ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
        ...(query.subjectId
          ? { assessment: { subjectId: query.subjectId } }
          : {}),
        ...(query.studentSearch
          ? {
              student: {
                OR: [
                  {
                    name: {
                      contains: query.studentSearch,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: query.studentSearch,
                      mode: "insensitive",
                    },
                  },
                  {
                    studentId: {
                      contains: query.studentSearch,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            }
          : {}),
      },
      ...(query.reviewerId ? { assignedReviewerId: query.reviewerId } : {}),
    };
    const reviews = await this.prisma.manualReviewTask.findMany({
      where,
      include: this.reviewInclude(),
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 100,
    });
    return {
      success: true,
      data: reviews.map((review) => this.reviewPayload(review)),
    };
  }

  async completeReview(
    user: AuthenticatedUser,
    id: string,
    dto: CompleteReviewDto,
  ) {
    this.ensureReviewer(user);
    const review = await this.prisma.manualReviewTask.findFirst({
      where: { id, attempt: this.collegeScope(user) },
      include: { attempt: true },
    });
    if (!review) {
      throw new NotFoundException("Review task not found.");
    }
    if (
      dto.expectedUpdatedAt &&
      new Date(dto.expectedUpdatedAt).getTime() !== review.updatedAt.getTime()
    ) {
      throw new ConflictException("Review changed since it was loaded.");
    }
    if (dto.awardedMarks > review.maxMarks) {
      throw new BadRequestException(
        "Awarded marks cannot exceed maximum marks.",
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.manualReviewTask.update({
        where: { id },
        data: {
          awardedMarks: dto.awardedMarks,
          feedback: dto.feedback,
          status: ManualReviewStatus.COMPLETED,
          reviewedAt: new Date(),
          assignedReviewerId: review.assignedReviewerId ?? user.id,
        },
      });
      await this.calculateResult(tx, review.attemptId);
      await tx.auditLog.create({
        data: {
          event: AuditEvent.REVIEW_UPDATE,
          userId: user.id,
          collegeId: review.attempt.collegeId,
          actorRole: user.role,
        },
      });
      await tx.notification.create({
        data: {
          collegeId: review.attempt.collegeId,
          userId: review.attempt.studentId,
          type: NotificationType.REVIEW_COMPLETED,
          status: NotificationStatus.UNREAD,
          title: "Review completed",
          message: "A manually reviewed answer has been completed.",
        },
      });
      return saved;
    });
    return { success: true, data: updated };
  }

  async moderateResult(
    user: AuthenticatedUser,
    resultId: string,
    dto: ModerateResultDto,
  ) {
    this.requireOperator(user);
    const result = await this.prisma.result.findFirst({
      where: { id: resultId, ...this.collegeScope(user) },
    });
    if (!result) {
      throw new NotFoundException("Result not found.");
    }
    if (
      dto.action === ModerationStatus.ADJUSTED &&
      dto.newScore === undefined
    ) {
      throw new BadRequestException("Adjusted results require a new score.");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const totalScore =
        dto.action === ModerationStatus.ADJUSTED
          ? (dto.newScore ?? result.totalScore)
          : result.totalScore;
      const saved = await tx.result.update({
        where: { id: resultId },
        data: {
          moderationStatus: dto.action,
          moderationNote: dto.reason,
          totalScore,
          percentage: this.percentage(
            totalScore,
            await this.assessmentTotalMarks(tx, result.assessmentId),
          ),
          isPublished:
            dto.action === ModerationStatus.HELD ? false : result.isPublished,
          heldAt:
            dto.action === ModerationStatus.HELD ? new Date() : result.heldAt,
          heldById:
            dto.action === ModerationStatus.HELD ? user.id : result.heldById,
        },
      });
      await tx.resultModeration.create({
        data: {
          resultId,
          moderatorId: user.id,
          action: dto.action,
          reason: dto.reason,
          oldScore: result.totalScore,
          newScore: totalScore,
          oldStatus: result.moderationStatus,
          newStatus: dto.action,
        },
      });
      return saved;
    });
    return { success: true, data: updated };
  }

  async publishEligible(
    user: AuthenticatedUser,
    assessmentId: string,
    selectedResultIds?: string[],
  ) {
    this.requireOperator(user);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        ...this.collegeScope(user),
        status: { not: "CANCELLED" },
      },
    });
    if (!assessment) {
      throw new NotFoundException("Assessment not found.");
    }
    const where: Prisma.ResultWhereInput = {
      assessmentId,
      ...(selectedResultIds ? { id: { in: selectedResultIds } } : {}),
      moderationStatus: { not: ModerationStatus.HELD },
      evaluationStatus: { in: ["READY", "PUBLISHED"] },
    };
    const pending = await this.prisma.manualReviewTask.count({
      where: {
        attempt: { assessmentId },
        status: { not: ManualReviewStatus.COMPLETED },
      },
    });
    if (pending > 0) {
      throw new ConflictException(
        "Manual reviews must be completed before publication.",
      );
    }
    const now = new Date();
    const result = await this.prisma.result.updateMany({
      where,
      data: {
        isPublished: true,
        publishedAt: now,
        evaluationStatus: "PUBLISHED",
      },
    });
    await this.prisma.auditLog.create({
      data: {
        event: AuditEvent.RESULT_PUBLISH,
        userId: user.id,
        collegeId: assessment.collegeId,
        actorRole: user.role,
      },
    });
    return { success: true, data: { publishedCount: result.count } };
  }

  async securitySummary(user: AuthenticatedUser, attemptId?: string) {
    this.requireOperator(user);
    const where = {
      ...(attemptId ? { attemptId } : {}),
      attempt: this.collegeScope(user),
    };
    const flags = await this.prisma.attemptSecurityFlag.findMany({
      where,
      include: {
        attempt: {
          include: {
            student: {
              select: { id: true, name: true, email: true, studentId: true },
            },
            assessment: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const counts = flags.reduce<Record<string, number>>((acc, flag) => {
      acc[flag.eventType] = (acc[flag.eventType] ?? 0) + 1;
      return acc;
    }, {});
    return {
      success: true,
      data: {
        counts,
        events: flags.map((flag) => ({
          id: flag.id,
          attemptId: flag.attemptId,
          eventType: flag.eventType,
          reviewStatus: flag.reviewStatus,
          createdAt: flag.createdAt,
          student: flag.attempt.student,
          assessment: {
            id: flag.attempt.assessment.id,
            title: flag.attempt.assessment.title,
          },
        })),
      },
    };
  }

  async updateSecurityReview(
    user: AuthenticatedUser,
    attemptId: string,
    dto: SecurityReviewDto,
  ) {
    this.requireOperator(user);
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id: attemptId, ...this.collegeScope(user) },
    });
    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }
    const review = await this.prisma.attemptSecurityReview.upsert({
      where: { attemptId },
      update: {
        status: dto.status,
        notes: dto.notes,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      create: {
        attemptId,
        status: dto.status,
        notes: dto.notes,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
    await this.prisma.attemptSecurityFlag.updateMany({
      where: { attemptId },
      data: { reviewStatus: dto.status },
    });
    return { success: true, data: review };
  }

  async analytics(user: AuthenticatedUser, assessmentId?: string) {
    this.requireOperator(user);
    const scope = this.collegeScope(user);
    const attemptWhere = {
      ...scope,
      ...(assessmentId ? { assessmentId } : {}),
    };
    const [
      registered,
      started,
      submitted,
      autoSubmitted,
      results,
      avg,
      high,
      low,
      pass,
    ] = await Promise.all([
      this.prisma.studentProfile.count({ where: scope }),
      this.prisma.testAttempt.count({ where: attemptWhere }),
      this.prisma.testAttempt.count({
        where: {
          ...attemptWhere,
          status: {
            in: [TestAttemptStatus.SUBMITTED, TestAttemptStatus.EVALUATED],
          },
        },
      }),
      this.prisma.testAttempt.count({
        where: { ...attemptWhere, status: TestAttemptStatus.AUTO_SUBMITTED },
      }),
      this.prisma.result.count({
        where: { ...scope, ...(assessmentId ? { assessmentId } : {}) },
      }),
      this.prisma.result.aggregate({
        where: { ...scope, ...(assessmentId ? { assessmentId } : {}) },
        _avg: { percentage: true },
      }),
      this.prisma.result.aggregate({
        where: { ...scope, ...(assessmentId ? { assessmentId } : {}) },
        _max: { percentage: true },
      }),
      this.prisma.result.aggregate({
        where: { ...scope, ...(assessmentId ? { assessmentId } : {}) },
        _min: { percentage: true },
      }),
      this.prisma.result.count({
        where: {
          ...scope,
          ...(assessmentId ? { assessmentId } : {}),
          passStatus: PassStatus.PASS,
        },
      }),
    ]);
    return {
      success: true,
      data: {
        registeredStudents: registered,
        startedAttempts: started,
        submittedAttempts: submitted,
        autoSubmittedAttempts: autoSubmitted,
        absentStudents: Math.max(0, registered - started),
        completionRate: started
          ? Number((((submitted + autoSubmitted) / started) * 100).toFixed(2))
          : 0,
        averageScore: avg._avg.percentage ?? 0,
        highestScore: high._max.percentage ?? 0,
        lowestScore: low._min.percentage ?? 0,
        passPercentage: results
          ? Number(((pass / results) * 100).toFixed(2))
          : 0,
      },
    };
  }

  async exportResultsCsv(user: AuthenticatedUser, assessmentId: string) {
    this.requireOperator(user);
    const results = await this.prisma.result.findMany({
      where: { assessmentId, ...this.collegeScope(user) },
      include: { attempt: { include: { student: true } }, assessment: true },
      orderBy: { percentage: "desc" },
    });
    const rows = [
      [
        "Assessment",
        "Student",
        "Student ID",
        "Score",
        "Percentage",
        "Pass Status",
        "Evaluation Status",
        "Published",
      ],
      ...results.map((result) => [
        result.assessment.title,
        result.attempt.student.name,
        result.attempt.student.studentId ?? "",
        String(result.totalScore),
        String(result.percentage),
        result.passStatus,
        result.evaluationStatus,
        result.isPublished ? "yes" : "no",
      ]),
    ];
    return rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
  }

  private async calculateResult(tx: Tx, attemptId: string) {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        questions: { include: { answer: true, section: true } },
        assessment: true,
        manualReviewTasks: true,
      },
    });
    let objectiveScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let attemptedCount = 0;
    for (const question of attempt.questions) {
      const answer = question.answer;
      const answered = answer ? this.isAnswered(answer) : false;
      if (!answered) {
        unansweredCount += 1;
      } else {
        attemptedCount += 1;
      }
      if (objectiveTypes.has(question.questionType)) {
        const evaluation = this.evaluateObjective(question, answer);
        objectiveScore += evaluation.awardedMarks;
        if (evaluation.isCorrect === true) {
          correctCount += 1;
        } else if (evaluation.isCorrect === false && answered) {
          incorrectCount += 1;
        }
        await tx.objectiveAnswerEvaluation.upsert({
          where: { attemptQuestionId: question.id },
          update: evaluation,
          create: {
            attemptQuestionId: question.id,
            studentAnswerId: answer?.id,
            ...evaluation,
          },
        });
      } else if (
        question.questionType === QuestionType.SHORT_ANSWER ||
        question.questionType === QuestionType.DESCRIPTIVE
      ) {
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
    const reviews = await tx.manualReviewTask.findMany({
      where: { attemptId },
    });
    const descriptiveScore = reviews.reduce(
      (sum, review) => sum + (review.awardedMarks ?? 0),
      0,
    );
    const pendingReview = reviews.some(
      (review) => review.status !== ManualReviewStatus.COMPLETED,
    );
    const totalScore = Math.min(
      attempt.assessment.totalMarks,
      objectiveScore + descriptiveScore,
    );
    const result = await tx.result.upsert({
      where: { attemptId },
      update: {
        objectiveScore,
        descriptiveScore,
        totalScore,
        percentage: this.percentage(totalScore, attempt.assessment.totalMarks),
        passStatus: this.passStatus(
          totalScore,
          attempt.assessment.passingMarks,
        ),
        correctCount,
        incorrectCount,
        unansweredCount,
        attemptedCount,
        evaluationStatus: pendingReview ? "PENDING_REVIEW" : "READY",
      },
      create: {
        collegeId: attempt.collegeId,
        assessmentId: attempt.assessmentId,
        attemptId,
        studentId: attempt.studentId,
        objectiveScore,
        descriptiveScore,
        totalScore,
        percentage: this.percentage(totalScore, attempt.assessment.totalMarks),
        passStatus: this.passStatus(
          totalScore,
          attempt.assessment.passingMarks,
        ),
        correctCount,
        incorrectCount,
        unansweredCount,
        attemptedCount,
        evaluationStatus: pendingReview ? "PENDING_REVIEW" : "READY",
      },
    });
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        objectiveScore,
        descriptiveScore,
        finalScore: totalScore,
        percentage: result.percentage,
        passStatus: result.passStatus,
        status: pendingReview
          ? TestAttemptStatus.UNDER_REVIEW
          : TestAttemptStatus.EVALUATED,
      },
    });
    return result;
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
    const correct = this.stringArray(metadata.correctOptionKeys).sort();
    const selected = [...(answer?.selectedOptionKeys ?? [])].sort();
    let answered =
      selected.length > 0 ||
      Boolean(answer?.textAnswer) ||
      answer?.numericalAnswer !== null;
    let isCorrect = false;
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
      const normalized = (answer?.textAnswer ?? "").trim().toLocaleLowerCase();
      answered = normalized.length > 0;
      isCorrect = this.stringArray(metadata.acceptedAnswers).some(
        (item) => item.trim().toLocaleLowerCase() === normalized,
      );
    } else if (question.questionType === QuestionType.NUMERICAL) {
      const expected = Number(metadata.numericalAnswer);
      const actual =
        answer?.numericalAnswer === null ||
        answer?.numericalAnswer === undefined
          ? Number.NaN
          : Number(answer.numericalAnswer);
      const tolerance = Number(metadata.tolerance ?? 0);
      answered = Number.isFinite(actual);
      isCorrect =
        Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance;
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
      evaluationDetails: { policy: "phase8-idempotent-exact-match" },
    };
  }

  private ensureReviewer(user: AuthenticatedUser) {
    this.requireOperator(user);
  }

  private requireOperator(user: AuthenticatedUser) {
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.COLLEGE_ADMIN &&
      user.role !== Role.FACULTY
    ) {
      throw new ForbiddenException("Exam operations access is required.");
    }
  }

  private collegeScope(
    user: AuthenticatedUser,
    requestedCollegeId?: string,
  ): { collegeId?: string } {
    if (user.role === Role.SUPER_ADMIN) {
      return requestedCollegeId ? { collegeId: requestedCollegeId } : {};
    }
    if (!user.collegeId) {
      throw new ForbiddenException("College scope is required.");
    }
    return { collegeId: user.collegeId };
  }

  private reviewInclude() {
    return {
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
    };
  }

  private reviewPayload(
    review: Prisma.ManualReviewTaskGetPayload<{
      include: ReturnType<ExamOperationsService["reviewInclude"]>;
    }>,
  ) {
    return {
      id: review.id,
      status: review.status,
      maxMarks: review.maxMarks,
      awardedMarks: review.awardedMarks,
      feedback: review.feedback,
      reviewedAt: review.reviewedAt,
      updatedAt: review.updatedAt,
      attempt: {
        id: review.attempt.id,
        assessment: review.attempt.assessment,
        student: review.attempt.student,
      },
      question: {
        id: review.attemptQuestion.id,
        questionType: review.attemptQuestion.questionType,
        questionText: review.attemptQuestion.questionTextSnapshot,
        rubric:
          this.objectRecord(review.attemptQuestion.evaluatorMetadata).rubric ??
          null,
        modelAnswer:
          this.objectRecord(review.attemptQuestion.evaluatorMetadata)
            .modelAnswer ?? null,
      },
      assignedReviewer: review.assignedReviewer,
    };
  }

  private isAnswered(answer: {
    selectedOptionKeys: string[];
    textAnswer: string | null;
    numericalAnswer: Prisma.Decimal | null;
  }) {
    return (
      answer.selectedOptionKeys.length > 0 ||
      Boolean(answer.textAnswer) ||
      answer.numericalAnswer !== null
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

  private async assessmentTotalMarks(tx: Tx, assessmentId: string) {
    return (
      (
        await tx.assessment.findUnique({
          where: { id: assessmentId },
          select: { totalMarks: true },
        })
      )?.totalMarks ?? 0
    );
  }

  private objectRecord(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  private stringArray(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  }
}
