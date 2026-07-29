import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AssessmentStatus,
  AuditEvent,
  EntityStatus,
  Prisma,
  QuestionDifficulty,
  ReportJobStatus,
  ReportOutputFormat,
  Role,
  TestAttemptStatus,
} from "../../../generated/phase5-client";
import { AuthenticatedUser, CookieRequest } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  AnalyticsQueryDto,
  CompareAnalyticsDto,
  CreateReportDefinitionDto,
  ReviewInsightDto,
  RunReportDto,
  ScheduleReportDto,
  UpdateReportDefinitionDto,
} from "./dto/analytics.dto";

const submittedStatuses: TestAttemptStatus[] = [
  TestAttemptStatus.SUBMITTED,
  TestAttemptStatus.AUTO_SUBMITTED,
  TestAttemptStatus.EVALUATED,
  TestAttemptStatus.UNDER_REVIEW,
];
const maxReportRows = 5000;
const minStatsSample = 5;

type DateRange = { from?: Date; to?: Date; label: string };
type NumericResult = {
  percentage: number;
  totalScore: number;
  timeTakenSeconds: number | null;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async platform(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.ensureRole(user, [Role.SUPER_ADMIN]);
    return this.cached(user, "platform", query, async () => {
      const range = this.dateRange(query);
      const dateWhere = this.createdRange(range);
      const [
        totalColleges,
        activeColleges,
        totalUsers,
        totalStudents,
        totalFaculty,
        totalCollegeAdmins,
        totalAssessments,
        activeAssessments,
        completedAssessments,
        totalAttempts,
        submittedAttempts,
        autoSubmittedAttempts,
        totalQuestions,
        aiGeneratedQuestions,
        documentImportedQuestions,
        queueHealth,
        workerHealth,
      ] = await Promise.all([
        this.prisma.college.count({ where: { deletedAt: null } }),
        this.prisma.college.count({
          where: { deletedAt: null, isActive: true },
        }),
        this.prisma.user.count({ where: dateWhere }),
        this.prisma.user.count({ where: { role: Role.STUDENT, ...dateWhere } }),
        this.prisma.user.count({ where: { role: Role.FACULTY, ...dateWhere } }),
        this.prisma.user.count({
          where: { role: Role.COLLEGE_ADMIN, ...dateWhere },
        }),
        this.prisma.assessment.count({
          where: { deletedAt: null, ...dateWhere },
        }),
        this.prisma.assessment.count({
          where: {
            deletedAt: null,
            status: AssessmentStatus.ACTIVE,
            ...dateWhere,
          },
        }),
        this.prisma.assessment.count({
          where: {
            deletedAt: null,
            status: {
              in: [
                AssessmentStatus.COMPLETED,
                AssessmentStatus.PUBLISHED,
                AssessmentStatus.CLOSED,
              ],
            },
            ...dateWhere,
          },
        }),
        this.prisma.testAttempt.count({ where: this.startedRange(range) }),
        this.prisma.testAttempt.count({
          where: {
            status: { in: submittedStatuses },
            ...this.startedRange(range),
          },
        }),
        this.prisma.testAttempt.count({
          where: {
            status: TestAttemptStatus.AUTO_SUBMITTED,
            ...this.startedRange(range),
          },
        }),
        this.prisma.question.count({
          where: { deletedAt: null, ...dateWhere },
        }),
        this.prisma.aiGenerationResult.count({ where: dateWhere }),
        this.prisma.extractedQuestionCandidate.count({ where: dateWhere }),
        this.queueHealth(),
        this.prisma.workerHeartbeat
          .findMany({ orderBy: { lastSeenAt: "desc" }, take: 5 })
          .catch(() => []),
      ]);
      return this.ok({
        range: this.rangeMeta(range),
        totals: {
          totalColleges,
          activeColleges,
          inactiveColleges: Math.max(totalColleges - activeColleges, 0),
          totalUsers,
          totalStudents,
          totalFaculty,
          totalCollegeAdmins,
          totalAssessments,
          activeAssessments,
          completedAssessments,
          totalAttempts,
          submittedAttempts,
          autoSubmittedAttempts,
          totalQuestions,
          aiGeneratedQuestions,
          manuallyCreatedQuestions: Math.max(
            totalQuestions - aiGeneratedQuestions - documentImportedQuestions,
            0,
          ),
          documentImportedQuestions,
        },
        health: {
          queueHealth,
          workerHealth,
          api: "UP",
          database: "UP",
          redis: queueHealth.redis,
        },
        privacy:
          "Platform analytics intentionally omits student-level details.",
      });
    });
  }

  async colleges(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.ensureRole(user, [Role.SUPER_ADMIN]);
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const data = await this.prisma.college.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      select: {
        id: true,
        name: true,
        collegeCode: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
    });
    return this.ok({ data, meta: { pageSize } });
  }

  async college(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.ensureRole(user, [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
    const collegeId = this.scopeCollege(user, query.collegeId);
    return this.cached(user, "college", query, async () => {
      const range = this.dateRange(query);
      const where = this.tenantWhere(collegeId);
      const attemptWhere = { ...where, ...this.startedRange(range) };
      const [
        students,
        faculty,
        departments,
        courses,
        subjects,
        batches,
        activeAssessments,
        upcomingAssessments,
        completedAssessments,
        pendingReviews,
        publishedResults,
        flaggedAttempts,
        questionBankSize,
        aiUsage,
        documentImports,
        attempts,
        results,
      ] = await Promise.all([
        this.prisma.studentProfile.count({ where }),
        this.prisma.facultyProfile.count({ where }),
        this.prisma.department.count({ where }),
        this.prisma.course.count({ where }),
        this.prisma.subject.count({ where }),
        this.prisma.batch.count({ where }),
        this.prisma.assessment.count({
          where: { ...where, status: AssessmentStatus.ACTIVE },
        }),
        this.prisma.assessment.count({
          where: { ...where, status: AssessmentStatus.SCHEDULED },
        }),
        this.prisma.assessment.count({
          where: {
            ...where,
            status: {
              in: [
                AssessmentStatus.COMPLETED,
                AssessmentStatus.PUBLISHED,
                AssessmentStatus.CLOSED,
              ],
            },
          },
        }),
        this.prisma.manualReviewTask.count({
          where: { attempt: { collegeId }, status: { not: "COMPLETED" } },
        }),
        this.prisma.result.count({ where: { ...where, isPublished: true } }),
        this.prisma.attemptSecurityFlag.count({
          where: { attempt: { collegeId } },
        }),
        this.prisma.question.count({ where: { ...where, deletedAt: null } }),
        this.prisma.aiUsageRecord.aggregate({
          where,
          _sum: { inputTokens: true, outputTokens: true, actualCost: true },
          _count: true,
        }),
        this.prisma.documentImportJob.count({ where }),
        this.prisma.testAttempt.findMany({
          where: attemptWhere,
          select: { status: true },
        }),
        this.resultValues(where, range),
      ]);
      const totalAssigned = await this.assignedStudentCount(collegeId);
      const submitted = attempts.filter((item) =>
        submittedStatuses.includes(item.status),
      ).length;
      const stats = this.scoreStats(results);
      return this.ok({
        range: this.rangeMeta(range),
        totals: {
          students,
          faculty,
          departments,
          courses,
          subjects,
          batches,
          activeAssessments,
          upcomingAssessments,
          completedAssessments,
          pendingReviews,
          publishedResults,
          flaggedAttempts,
          absenteeCount: Math.max(totalAssigned - submitted, 0),
          questionBankSize,
          documentImports,
        },
        rates: {
          participationRate: this.percent(attempts.length, totalAssigned),
          completionRate: this.percent(submitted, attempts.length),
          averageScore: stats.average,
          passPercentage: stats.passPercentage,
        },
        aiUsage: {
          requests: aiUsage._count,
          inputTokens: aiUsage._sum.inputTokens ?? 0,
          outputTokens: aiUsage._sum.outputTokens ?? 0,
          cost: aiUsage._sum.actualCost ?? 0,
        },
        charts: this.standardCharts(results, attempts),
      });
    });
  }

  async departmentAnalytics(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const departments = await this.prisma.department.findMany({
      where: {
        ...this.tenantWhere(collegeId),
        ...(query.departmentId ? { id: query.departmentId } : {}),
      },
      take: Math.min(query.pageSize ?? 50, 100),
      orderBy: { departmentName: "asc" },
      select: { id: true, departmentName: true, departmentCode: true },
    });
    return this.ok({
      data: await Promise.all(
        departments.map(async (department) => ({
          ...department,
          students: await this.prisma.studentProfile.count({
            where: { collegeId, departmentId: department.id },
          }),
          faculty: await this.prisma.facultyProfile.count({
            where: { collegeId, departmentId: department.id },
          }),
          subjects: await this.prisma.subject.count({
            where: { collegeId, departmentId: department.id },
          }),
        })),
      ),
    });
  }

  async batchAnalytics(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const batches = await this.prisma.batch.findMany({
      where: { collegeId, ...(query.batchId ? { id: query.batchId } : {}) },
      take: Math.min(query.pageSize ?? 50, 100),
      orderBy: [{ academicYear: "desc" }, { section: "asc" }],
      select: { id: true, batchName: true, academicYear: true, section: true },
    });
    return this.ok({
      data: await Promise.all(
        batches.map(async (batch) => ({
          ...batch,
          students: await this.prisma.studentProfile.count({
            where: { collegeId, batchId: batch.id },
          }),
          assessments: await this.prisma.assessmentBatchAssignment.count({
            where: { batchId: batch.id },
          }),
        })),
      ),
    });
  }

  async faculty(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const subjectIds = await this.allowedSubjectIds(user, collegeId);
    const where: Prisma.ResultWhereInput = {
      collegeId,
      ...(subjectIds.length
        ? { assessment: { subjectId: { in: subjectIds } } }
        : {}),
    };
    const results = await this.resultValues(where, this.dateRange(query));
    return this.ok({
      assignedSubjects: subjectIds.length,
      assignedBatches: await this.assignedBatchCount(user, collegeId),
      performance: this.scoreStats(results),
      charts: this.standardCharts(results, []),
      questionWiseAccuracy: await this.questionAccuracy({
        collegeId,
        subjectIds,
      }),
      topicPerformance: await this.topicPerformance(collegeId, subjectIds),
      timeAnalysis: this.timeStats(results),
    });
  }

  async studentSelf(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    return this.studentByUserId(user, user.id, query, true);
  }

  async studentById(
    user: AuthenticatedUser,
    studentId: string,
    query: AnalyticsQueryDto,
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException("Student not found.");
    await this.ensureStudentVisible(user, profile.userId, profile.collegeId);
    return this.studentByUserId(user, profile.userId, query, false);
  }

  async assessment(
    user: AuthenticatedUser,
    assessmentId: string,
    query: AnalyticsQueryDto,
  ) {
    const assessment = await this.scopedAssessment(user, assessmentId);
    const range = this.dateRange(query);
    const results = await this.resultValues({ assessmentId }, range);
    const attempts = await this.prisma.testAttempt.findMany({
      where: { assessmentId, ...this.startedRange(range) },
      select: { status: true, totalDurationSeconds: true },
    });
    const assigned = await this.assessmentAssignedCount(assessmentId);
    const submitted = attempts.filter((item) =>
      submittedStatuses.includes(item.status),
    ).length;
    const stats = this.scoreStats(results);
    return this.ok({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        totalMarks: assessment.totalMarks,
      },
      range: this.rangeMeta(range),
      counts: {
        assignedStudents: assigned,
        eligibleStudents: assigned,
        startedAttempts: attempts.length,
        submittedAttempts: submitted,
        autoSubmittedAttempts: attempts.filter(
          (item) => item.status === TestAttemptStatus.AUTO_SUBMITTED,
        ).length,
        absentStudents: Math.max(assigned - attempts.length, 0),
        pendingManualReviews: await this.prisma.manualReviewTask.count({
          where: { attempt: { assessmentId }, status: { not: "COMPLETED" } },
        }),
        securityEvents: await this.prisma.attemptSecurityFlag.count({
          where: { attempt: { assessmentId } },
        }),
        publishedResults: await this.prisma.result.count({
          where: { assessmentId, isPublished: true },
        }),
      },
      rates: {
        completionRate: this.percent(submitted, assigned),
        passPercentage: stats.passPercentage,
      },
      scores: stats,
      charts: this.standardCharts(results, attempts),
      sections: await this.sectionSummary(assessmentId),
      questions: await this.questionAccuracy({
        collegeId: assessment.collegeId ?? undefined,
        assessmentId,
      }),
      formulae: {
        median:
          "Sort percentages ascending and use the center value; even sample sizes average the two center values.",
        percentile:
          "Percentile rank = count of published scores below or equal to score divided by eligible published scores.",
      },
    });
  }

  async assessmentLeaderboard(user: AuthenticatedUser, assessmentId: string) {
    const assessment = await this.scopedAssessment(user, assessmentId, true);
    const enabled = assessment.resultVisibility !== "NEVER";
    if (!enabled)
      throw new ForbiddenException(
        "Leaderboard is disabled for this assessment.",
      );
    const where: Prisma.ResultWhereInput = {
      assessmentId,
      isPublished: true,
      rankEligible: true,
      ...(user.role === Role.STUDENT ? { studentId: user.id } : {}),
    };
    const results = await this.prisma.result.findMany({
      where,
      orderBy: [
        { percentage: "desc" },
        { timeTakenSeconds: "asc" },
        { createdAt: "asc" },
      ],
      take: 100,
      include: { attempt: { select: { submittedAt: true } } },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: results.map((result) => result.studentId) } },
      select: { id: true, name: true },
    });
    const userNames = new Map(users.map((item) => [item.id, item.name]));
    const entries = results.map((result, index) => ({
      rank: index + 1,
      studentId: user.role === Role.STUDENT ? result.studentId : undefined,
      displayName:
        user.role === Role.STUDENT
          ? (userNames.get(result.studentId) ?? "Student")
          : this.anonymousName(index + 1),
      percentage: result.percentage,
      totalScore: result.totalScore,
      timeTakenSeconds: result.timeTakenSeconds,
      submittedAt: result.attempt.submittedAt,
      percentile: this.percent(results.length - index, results.length),
    }));
    await this.prisma.leaderboardSnapshot.create({
      data: {
        collegeId: assessment.collegeId,
        scope: "ASSESSMENT",
        assessmentId,
        policy: {
          publishedOnly: true,
          tieBreakers: ["score", "timeTaken", "submissionTime"],
          anonymousByDefault: user.role !== Role.STUDENT,
        },
        entries,
        createdById: user.id,
      },
    });
    return this.ok({
      enabled,
      policy: "Rank by score, then faster time, then earlier submission.",
      entries,
    });
  }

  async assessmentReport(
    user: AuthenticatedUser,
    assessmentId: string,
    query: AnalyticsQueryDto,
  ) {
    const analytics = await this.assessment(user, assessmentId, query);
    return this.ok({
      type: "assessment-result-report",
      generatedAt: new Date().toISOString(),
      referenceId: `ASSESSMENT-${assessmentId}`,
      data: analytics.data,
      exports: ["CSV", "XLSX foundation", "PDF foundation"],
    });
  }

  async question(user: AuthenticatedUser, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ...this.questionScope(user) },
      include: { duplicateMatches: true, duplicateNewMatches: true },
    });
    if (!question) throw new NotFoundException("Question not found.");
    const attempts = await this.prisma.attemptQuestion.findMany({
      where: { originalQuestionId: questionId },
      include: { answer: true, evaluations: true },
    });
    const answered = attempts.filter((item) => item.answer?.answeredAt);
    const fullCredit = attempts.filter((item) =>
      item.evaluations.some(
        (evalItem) => evalItem.awardedMarks >= item.assignedMarks,
      ),
    ).length;
    const correct = attempts.filter((item) =>
      item.evaluations.some((evalItem) => evalItem.isCorrect),
    ).length;
    const averageMarks = this.average(
      attempts.flatMap((item) =>
        item.evaluations.map((evalItem) => evalItem.awardedMarks),
      ),
    );
    const correctRate = this.percent(correct, attempts.length);
    const measuredDifficulty = this.measuredDifficulty(
      correctRate,
      attempts.length,
    );
    await this.prisma.questionPerformanceSnapshot.create({
      data: {
        collegeId: question.collegeId,
        questionId,
        approvedDifficulty: question.difficulty,
        measuredDifficulty,
        measuredAt: new Date(),
        sampleSize: attempts.length,
        metrics: { correctRate, averageMarks, fullCredit },
      },
    });
    return this.ok({
      question: {
        id: question.id,
        topic: question.topic,
        bloomLevel:
          (question.metadata as Record<string, unknown> | null)?.bloomLevel ??
          null,
        sourceType: this.questionSource(question.metadata),
      },
      appearances: await this.prisma.assessmentQuestion.count({
        where: { questionId },
      }),
      attempts: {
        totalAttempts: attempts.length,
        correctCount: correct,
        incorrectCount: Math.max(answered.length - correct, 0),
        unansweredCount: Math.max(attempts.length - answered.length, 0),
        fullCreditCount: fullCredit,
        partialCreditCount: Math.max(answered.length - fullCredit - correct, 0),
        averageMarks,
      },
      measuredDifficulty,
      approvedDifficulty: question.difficulty,
      measuredAt: new Date().toISOString(),
      sampleSize: attempts.length,
      lowSampleWarning: attempts.length < minStatsSample,
      duplicateReferences: [
        ...question.duplicateMatches,
        ...question.duplicateNewMatches,
      ].length,
      trend: this.trendFromDates(attempts.map((item) => item.createdAt)),
      note: "Measured difficulty is advisory and never overwrites approved difficulty automatically.",
    });
  }

  async subjects(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const subjectIds = await this.allowedSubjectIds(user, collegeId);
    const subjects = await this.prisma.subject.findMany({
      where: {
        collegeId,
        ...(subjectIds.length ? { id: { in: subjectIds } } : {}),
        ...(query.subjectId ? { id: query.subjectId } : {}),
      },
      take: Math.min(query.pageSize ?? 50, 100),
      orderBy: { subjectName: "asc" },
    });
    return this.ok({
      data: await Promise.all(
        subjects.map(async (subject) => ({
          id: subject.id,
          subjectName: subject.subjectName,
          questionCoverage: await this.prisma.question.count({
            where: { collegeId, subjectId: subject.id, deletedAt: null },
          }),
          assessmentCoverage: await this.prisma.assessment.count({
            where: { collegeId, subjectId: subject.id, deletedAt: null },
          }),
          performance: this.scoreStats(
            await this.resultValues(
              { collegeId, assessment: { subjectId: subject.id } },
              this.dateRange(query),
            ),
          ),
          distributions: await this.questionDistributions(
            collegeId,
            subject.id,
          ),
        })),
      ),
    });
  }

  async topics(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    return this.ok({
      data: await this.topicPerformance(
        collegeId,
        await this.allowedSubjectIds(user, collegeId),
      ),
      note: "Untested topics are derived from syllabus topics with no matching question topic.",
    });
  }

  async syllabus(user: AuthenticatedUser, id: string) {
    const collegeId = this.scopeCollege(user);
    const syllabus = await this.prisma.syllabus.findFirst({
      where: { id, ...(user.role === Role.SUPER_ADMIN ? {} : { collegeId }) },
      include: { units: { include: { topics: true } }, subject: true },
    });
    if (!syllabus) throw new NotFoundException("Syllabus not found.");
    const questions = await this.prisma.question.findMany({
      where: {
        collegeId: syllabus.collegeId,
        subjectId: syllabus.subjectId,
        deletedAt: null,
      },
      select: {
        topic: true,
        difficulty: true,
        questionType: true,
        metadata: true,
      },
    });
    const topicNames = syllabus.units.flatMap((unit) =>
      unit.topics.map((topic) => topic.topicName),
    );
    const tested = new Set(
      questions.map((question) => question.topic).filter(Boolean),
    );
    return this.ok({
      syllabus: {
        id: syllabus.id,
        title: syllabus.title,
        subject: syllabus.subject.subjectName,
      },
      questionCoverage: questions.length,
      untestedTopics: topicNames.filter((topic) => !tested.has(topic)),
      bloomDistribution: this.countLabels(
        questions.map((question) =>
          this.metadataLabel(question.metadata, "bloomLevel", "UNCLASSIFIED"),
        ),
      ),
      difficultyDistribution: this.countLabels(
        questions.map((question) => question.difficulty),
      ),
      questionTypeDistribution: this.countLabels(
        questions.map((question) => question.questionType ?? "UNKNOWN"),
      ),
    });
  }

  async compare(user: AuthenticatedUser, dto: CompareAnalyticsDto) {
    const collegeId = this.scopeCollege(user, dto.collegeId);
    const groups = await this.comparisonGroups(collegeId, dto);
    if (groups.length > 8)
      throw new BadRequestException("Compare up to 8 groups at a time.");
    const rows = await Promise.all(
      groups.map(async (group) => {
        const where = this.groupResultWhere(collegeId, dto.dimension, group.id);
        const stats = this.scoreStats(
          await this.resultValues(where, this.dateRange(dto)),
        );
        return {
          group,
          metric: dto.metric ?? "averageScore",
          value: stats.average,
          normalized: stats.average / 100,
          stats,
        };
      }),
    );
    return this.ok({ dimension: dto.dimension, rows, csv: this.csv(rows) });
  }

  async reports(user: AuthenticatedUser) {
    return this.ok({
      data: await this.prisma.reportDefinition.findMany({
        where: this.reportScope(user),
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }

  async resultReports(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.ensureRole(user, [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY]);
    const rows = await this.resultReportRows(user, query);
    const stats = this.scoreStats(
      rows.map((row) => ({
        percentage: row.percentage,
        totalScore: row.marks,
        timeTakenSeconds: row.timeTakenSeconds,
      })),
    );
    return this.ok({
      data: rows,
      totals: {
        attempts: rows.length,
        averageScore: stats.average,
        highestScore: stats.highest,
        lowestScore: stats.lowest,
        passPercentage: stats.passPercentage,
        failPercentage: Number((100 - stats.passPercentage).toFixed(2)),
        averageTimeSeconds: this.average(
          rows
            .map((row) => row.timeTakenSeconds)
            .filter((value): value is number => typeof value === "number"),
        ),
      },
      charts: {
        scoreDistribution: this.histogram(rows.map((row) => row.percentage)),
        passFail: [
          {
            label: "Pass",
            value: rows.filter((row) => row.passFail === "PASS").length,
          },
          {
            label: "Fail",
            value: rows.filter((row) => row.passFail === "FAIL").length,
          },
          {
            label: "Pending",
            value: rows.filter((row) => row.passFail === "PENDING").length,
          },
        ],
        violations: [
          {
            label: "No violations",
            value: rows.filter((row) => row.violations === 0).length,
          },
          {
            label: "With violations",
            value: rows.filter((row) => row.violations > 0).length,
          },
        ],
      },
    });
  }

  async resultReportsCsv(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    this.ensureRole(user, [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY]);
    const rows = await this.resultReportRows(user, query);
    await this.audit(
      user,
      AuditEvent.REPORT_DOWNLOAD,
      this.reportCollegeId(user),
      "Assessment result CSV exported.",
      {
        reportType: "assessment-results",
        rowCount: rows.length,
      },
    );
    return this.csv(rows);
  }

  async createReport(user: AuthenticatedUser, dto: CreateReportDefinitionDto) {
    const report = await this.prisma.reportDefinition.create({
      data: {
        collegeId: this.reportCollegeId(user),
        ownerId: user.id,
        name: dto.name.trim(),
        reportType: dto.reportType,
        description: dto.description,
        columns: dto.columns?.length
          ? dto.columns
          : ["name", "score", "status"],
        outputFormat: dto.outputFormat ?? ReportOutputFormat.CSV,
        filters: {},
        createdById: user.id,
      },
    });
    await this.audit(
      user,
      AuditEvent.REPORT_CREATE,
      report.collegeId,
      "Report definition created.",
      { reportId: report.id },
    );
    return this.ok(report);
  }

  async report(user: AuthenticatedUser, id: string) {
    return this.ok(await this.scopedReport(user, id));
  }

  async updateReport(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateReportDefinitionDto,
  ) {
    await this.scopedReport(user, id);
    const report = await this.prisma.reportDefinition.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.reportType ? { reportType: dto.reportType } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.columns?.length ? { columns: dto.columns } : {}),
        ...(dto.outputFormat ? { outputFormat: dto.outputFormat } : {}),
        updatedById: user.id,
      },
    });
    return this.ok(report);
  }

  async deleteReport(user: AuthenticatedUser, id: string) {
    await this.scopedReport(user, id);
    await this.prisma.reportDefinition.delete({ where: { id } });
    return this.ok({ deleted: true });
  }

  async runReport(user: AuthenticatedUser, id: string, dto: RunReportDto) {
    const report = await this.scopedReport(user, id);
    const rows = await this.reportRows(user, report.reportType, dto);
    const csv = this.csv(rows.slice(0, maxReportRows));
    const job = await this.prisma.reportGenerationJob.create({
      data: {
        collegeId: report.collegeId,
        reportId: report.id,
        requestedById: user.id,
        status: ReportJobStatus.COMPLETED,
        reportType: report.reportType,
        filters: dto as Prisma.InputJsonObject,
        outputFormat: dto.outputFormat ?? report.outputFormat,
        progress: 100,
        rowCount: rows.length,
        startedAt: new Date(),
        completedAt: new Date(),
        expiresAt: this.daysFromNow(7),
        metadata: { truncated: rows.length > maxReportRows },
      },
    });
    const file = await this.prisma.reportFile.create({
      data: {
        collegeId: report.collegeId,
        jobId: job.id,
        requestedById: user.id,
        fileName: `${report.reportType}-${job.id}.csv`,
        mimeType: "text/csv; charset=utf-8",
        outputFormat: ReportOutputFormat.CSV,
        sizeBytes: Buffer.byteLength(csv),
        storageKey: `reports/${job.id}.csv`,
        expiresAt: this.daysFromNow(7),
        metadata: {
          content: csv,
          generatedAt: new Date().toISOString(),
          reportReferenceId: job.id,
        },
      },
    });
    await this.audit(
      user,
      AuditEvent.REPORT_RUN,
      report.collegeId,
      "Report generated.",
      { reportId: report.id, jobId: job.id, fileId: file.id },
    );
    return this.ok({ job, file });
  }

  async scheduleReport(
    user: AuthenticatedUser,
    id: string,
    dto: ScheduleReportDto,
  ) {
    const report = await this.scopedReport(user, id);
    if (dto.frequency === "CRON" && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Custom cron schedules require platform administration.",
      );
    }
    return this.ok(
      await this.prisma.reportSchedule.create({
        data: {
          collegeId: report.collegeId,
          reportId: report.id,
          ownerId: user.id,
          frequency: dto.frequency,
          cronExpression: dto.cronExpression,
          nextRunAt: this.daysFromNow(1),
          delivery: { inApp: true, email: false },
          createdById: user.id,
        },
      }),
    );
  }

  async reportJobs(user: AuthenticatedUser) {
    return this.ok({
      data: await this.prisma.reportGenerationJob.findMany({
        where: this.jobScope(user),
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }

  async reportJob(user: AuthenticatedUser, jobId: string) {
    return this.ok(await this.scopedJob(user, jobId));
  }

  async cancelReportJob(user: AuthenticatedUser, jobId: string) {
    await this.scopedJob(user, jobId);
    return this.ok(
      await this.prisma.reportGenerationJob.update({
        where: { id: jobId },
        data: { status: ReportJobStatus.CANCELLED },
      }),
    );
  }

  async downloadReport(
    user: AuthenticatedUser,
    fileId: string,
    request: CookieRequest,
  ) {
    const file = await this.prisma.reportFile.findFirst({
      where: { id: fileId, ...this.fileScope(user) },
    });
    if (!file) throw new NotFoundException("Report file not found.");
    if (file.expiresAt.getTime() < Date.now())
      throw new ForbiddenException("Report file has expired.");
    await this.prisma.exportAudit.create({
      data: {
        collegeId: file.collegeId,
        userId: user.id,
        reportFileId: file.id,
        reportJobId: file.jobId,
        reportType: this.metadataLabel(file.metadata, "reportType", "report"),
        format: file.outputFormat,
        ipAddress: request.ip,
        userAgent: Array.isArray(request.headers["user-agent"])
          ? request.headers["user-agent"][0]
          : request.headers["user-agent"],
        metadata: { fileName: file.fileName },
      },
    });
    await this.audit(
      user,
      AuditEvent.REPORT_DOWNLOAD,
      file.collegeId,
      "Report downloaded.",
      { fileId },
    );
    const metadata = file.metadata as Record<string, unknown> | null;
    return typeof metadata?.content === "string"
      ? metadata.content
      : "Report content unavailable.";
  }

  async insights(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    return this.ok({
      data: await this.prisma.analyticsInsight.findMany({
        where: {
          ...this.insightScope(user),
          ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      disclaimer:
        "AI-assisted insights are suggestions for human review, not guaranteed facts.",
    });
  }

  async generateInsights(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const insightQuery = Object.assign(new AnalyticsQueryDto(), query, {
      collegeId,
    });
    const college = await this.college(user, insightQuery);
    const data = college.data as {
      rates?: { passPercentage?: number };
      totals?: { pendingReviews?: number };
    };
    const weak = (data.rates?.passPercentage ?? 0) < 60;
    const title = weak
      ? "Review weak assessment outcomes"
      : "Maintain current performance trend";
    const insight = await this.prisma.analyticsInsight.create({
      data: {
        collegeId,
        scope: "COLLEGE",
        assessmentId: query.assessmentId,
        subjectId: query.subjectId,
        title,
        summary: weak
          ? "Aggregate pass percentage is below the configured advisory threshold."
          : "Aggregate pass percentage is within the expected advisory range.",
        recommendation: weak
          ? "Review weak topics, rebalance blueprint coverage, and schedule faculty review before high-stakes decisions."
          : "Continue monitoring topic-level distribution and pending reviews.",
        confidence: 0.55,
        source:
          process.env.NODE_ENV === "production"
            ? "rule-based"
            : "mock-ai-advisory",
        aggregatePayload: {
          passPercentage: data.rates?.passPercentage,
          pendingReviews: data.totals?.pendingReviews,
        },
        createdById: user.id,
      },
    });
    return this.ok({
      insight,
      providerState:
        "No live provider call is made without configured server-side keys.",
      predictiveAnalytics: this.predictiveLimitations(),
    });
  }

  async reviewInsight(
    user: AuthenticatedUser,
    id: string,
    dto: ReviewInsightDto,
  ) {
    const insight = await this.prisma.analyticsInsight.findFirst({
      where: { id, ...this.insightScope(user) },
    });
    if (!insight) throw new NotFoundException("Insight not found.");
    const updated = await this.prisma.analyticsInsight.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote,
        reviewedById: user.id,
        reviewedAt: new Date(),
        updatedById: user.id,
      },
    });
    await this.audit(
      user,
      AuditEvent.ANALYTICS_INSIGHT_REVIEW,
      updated.collegeId,
      "Analytics insight reviewed.",
      { insightId: id, status: dto.status },
    );
    return this.ok(updated);
  }

  private async studentByUserId(
    user: AuthenticatedUser,
    studentUserId: string,
    query: AnalyticsQueryDto,
    self: boolean,
  ) {
    if (!self) await this.ensureStudentVisible(user, studentUserId);
    const results = await this.resultValues(
      { studentId: studentUserId, isPublished: true },
      this.dateRange(query),
    );
    const stats = this.scoreStats(results);
    const recent = results[0];
    return this.ok({
      studentId: self ? user.id : studentUserId,
      completedAssessments: results.length,
      averageScore: stats.average,
      bestScore: stats.highest,
      recentScore: recent?.percentage ?? 0,
      passRate: stats.passPercentage,
      subjectWiseScore: await this.studentSubjectScores(studentUserId),
      topicWiseScore: await this.studentTopicScores(studentUserId),
      strongestTopics: [],
      weakestTopics: [],
      difficultyWisePerformance: [],
      bloomLevelPerformance: [],
      timeManagement: this.timeStats(results),
      attemptHistory: results.slice(0, 20),
      progressTrend: this.trendFromDates(results.map((item) => item.createdAt)),
      rankVisibility: "Only published, rank-eligible results are considered.",
      predictiveAnalytics: this.predictiveLimitations(),
    });
  }

  private async scopedAssessment(
    user: AuthenticatedUser,
    assessmentId: string,
    allowStudent = false,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
    });
    if (!assessment) throw new NotFoundException("Assessment not found.");
    if (
      user.role !== Role.SUPER_ADMIN &&
      assessment.collegeId !== user.collegeId
    ) {
      throw new ForbiddenException("Assessment is outside your tenant.");
    }
    if (user.role === Role.STUDENT && !allowStudent)
      throw new ForbiddenException(
        "Students cannot access this assessment analytics.",
      );
    if (user.role === Role.FACULTY) {
      const allowed = await this.allowedSubjectIds(
        user,
        assessment.collegeId ?? "",
      );
      if (
        assessment.subjectId &&
        allowed.length &&
        !allowed.includes(assessment.subjectId)
      ) {
        throw new ForbiddenException(
          "Assessment is outside assigned subjects.",
        );
      }
    }
    return assessment;
  }

  private async scopedReport(user: AuthenticatedUser, id: string) {
    const report = await this.prisma.reportDefinition.findFirst({
      where: { id, ...this.reportScope(user) },
    });
    if (!report) throw new NotFoundException("Report not found.");
    return report;
  }

  private async scopedJob(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.reportGenerationJob.findFirst({
      where: { id: jobId, ...this.jobScope(user) },
    });
    if (!job) throw new NotFoundException("Report job not found.");
    return job;
  }

  private async resultValues(
    where: Prisma.ResultWhereInput,
    range: DateRange,
  ): Promise<Array<NumericResult & { createdAt: Date }>> {
    return this.prisma.result.findMany({
      where: { ...where, ...this.resultRange(range) },
      orderBy: { createdAt: "desc" },
      select: {
        percentage: true,
        totalScore: true,
        timeTakenSeconds: true,
        createdAt: true,
      },
    });
  }

  private scoreStats(results: NumericResult[]) {
    const values = results.map((item) => item.percentage);
    const average = this.average(values);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length
      ? sorted.length % 2
        ? sorted[Math.floor(sorted.length / 2)]
        : ((sorted[sorted.length / 2 - 1] ?? 0) +
            (sorted[sorted.length / 2] ?? 0)) /
          2
      : 0;
    const variance = values.length
      ? this.average(values.map((value) => (value - average) ** 2))
      : 0;
    return {
      sampleSize: values.length,
      average,
      median,
      highest: sorted.at(-1) ?? 0,
      lowest: sorted[0] ?? 0,
      passPercentage: this.percent(
        values.filter((value) => value >= 40).length,
        values.length,
      ),
      failPercentage: this.percent(
        values.filter((value) => value < 40).length,
        values.length,
      ),
      averageTimeSeconds: this.average(
        results
          .map((item) => item.timeTakenSeconds)
          .filter((value): value is number => typeof value === "number"),
      ),
      variance,
      standardDeviation: Math.sqrt(variance),
      lowSampleWarning: values.length > 0 && values.length < minStatsSample,
    };
  }

  private standardCharts(
    results: NumericResult[],
    attempts: Array<{
      status: TestAttemptStatus;
      totalDurationSeconds?: number | null;
    }>,
  ) {
    const scores = results.map((item) => item.percentage);
    return {
      scoreDistribution: this.histogram(scores),
      passFail: [
        { label: "Pass", value: scores.filter((score) => score >= 40).length },
        { label: "Fail", value: scores.filter((score) => score < 40).length },
      ],
      attemptStatus: this.countLabels(attempts.map((item) => item.status)),
      percentileBands: [
        {
          label: "Top 10%",
          value: scores.filter((score) => score >= 90).length,
        },
        {
          label: "Bottom 10%",
          value: scores.filter((score) => score <= 10).length,
        },
      ],
      averageTime: [
        {
          label: "Average Time",
          value: Math.round(
            this.average(
              results
                .map((item) => item.timeTakenSeconds)
                .filter((value): value is number => typeof value === "number"),
            ),
          ),
        },
      ],
    };
  }

  private histogram(values: number[]) {
    const buckets: Array<[number, number]> = [
      [0, 20],
      [21, 40],
      [41, 60],
      [61, 80],
      [81, 100],
    ];
    return buckets.map((bucket) => ({
      label: `${String(bucket[0])}-${String(bucket[1])}`,
      value: values.filter((value) => value >= bucket[0] && value <= bucket[1])
        .length,
    }));
  }

  private async questionAccuracy(input: {
    collegeId?: string;
    assessmentId?: string;
    subjectIds?: string[];
  }) {
    const questions = await this.prisma.attemptQuestion.findMany({
      where: {
        ...(input.assessmentId
          ? { attempt: { assessmentId: input.assessmentId } }
          : {}),
        ...(input.collegeId ? { attempt: { collegeId: input.collegeId } } : {}),
        ...(input.subjectIds?.length
          ? {
              assessmentQuestion: {
                question: { subjectId: { in: input.subjectIds } },
              },
            }
          : {}),
      },
      take: 1000,
      include: {
        evaluations: true,
        assessmentQuestion: { include: { question: true } },
      },
    });
    return questions.slice(0, 100).map((item) => ({
      questionId: item.originalQuestionId,
      topic: item.assessmentQuestion?.question.topic,
      accuracy: this.percent(
        item.evaluations.filter((evaluation) => evaluation.isCorrect).length,
        item.evaluations.length,
      ),
      sampleSize: item.evaluations.length,
      lowSampleWarning: item.evaluations.length < minStatsSample,
    }));
  }

  private async topicPerformance(collegeId: string, subjectIds: string[]) {
    const questions = await this.prisma.question.findMany({
      where: {
        collegeId,
        deletedAt: null,
        ...(subjectIds.length ? { subjectId: { in: subjectIds } } : {}),
      },
      select: { topic: true, difficulty: true, questionType: true },
      take: 500,
    });
    return Object.entries(
      this.countLabels(questions.map((item) => item.topic ?? "Unclassified")),
    ).map(([topic, count]) => ({
      topic,
      questionCount: count,
      status: count >= 3 ? "covered" : "coverage-gap",
    }));
  }

  private async sectionSummary(assessmentId: string) {
    const sections = await this.prisma.sectionResult.groupBy({
      by: ["sectionName"],
      where: { result: { assessmentId } },
      _avg: { awardedMarks: true, totalMarks: true },
      _sum: { correctCount: true, incorrectCount: true, unansweredCount: true },
      _count: true,
    });
    return sections.map((section) => ({
      sectionName: section.sectionName,
      averageMarks: section._avg.awardedMarks ?? 0,
      averageTotalMarks: section._avg.totalMarks ?? 0,
      correctCount: section._sum.correctCount ?? 0,
      incorrectCount: section._sum.incorrectCount ?? 0,
      unansweredCount: section._sum.unansweredCount ?? 0,
      sampleSize: section._count,
    }));
  }

  private async reportRows(
    user: AuthenticatedUser,
    reportType: string,
    query: AnalyticsQueryDto,
  ) {
    if (reportType === "ai-usage") {
      return this.prisma.aiUsageRecord.findMany({
        where: this.tenantWhere(this.scopeCollege(user, query.collegeId)),
        take: 1000,
      });
    }
    return this.resultReportRows(user, query);
  }

  private async resultReportRows(
    user: AuthenticatedUser,
    query: AnalyticsQueryDto,
  ) {
    const collegeId = this.scopeCollege(user, query.collegeId);
    const range = this.dateRange(query);
    const resultWhere: Prisma.ResultWhereInput = {
      ...this.tenantWhere(collegeId),
      ...this.resultRange(range),
      ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
      ...(query.subjectId
        ? { assessment: { subjectId: query.subjectId } }
        : {}),
    };
    const results = await this.prisma.result.findMany({
      where: resultWhere,
      orderBy: [{ createdAt: "desc" }],
      take: maxReportRows,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            passingMarks: true,
          },
        },
        attempt: {
          select: {
            id: true,
            startedAt: true,
            submittedAt: true,
            autoSubmittedAt: true,
            status: true,
            securityFlags: { select: { id: true } },
            student: {
              select: {
                name: true,
                email: true,
                studentId: true,
                studentProfile: { select: { rollNumber: true } },
              },
            },
          },
        },
      },
    });
    const proctoringCounts = await this.proctoringViolationCounts(
      results.map((result) => result.attemptId),
    );
    return results.map((result) => {
      const submittedAt =
        result.attempt.submittedAt ?? result.attempt.autoSubmittedAt;
      return {
        studentName: result.attempt.student.name,
        rollNumber: result.attempt.student.studentProfile?.rollNumber ?? "",
        studentId: result.attempt.student.studentId ?? "",
        studentEmail: result.attempt.student.email,
        assessment: result.assessment.title,
        assessmentId: result.assessmentId,
        attemptId: result.attemptId,
        marks: result.totalScore,
        totalMarks: result.assessment.totalMarks,
        percentage: result.percentage,
        passFail: result.passStatus,
        submittedTime: submittedAt?.toISOString() ?? "",
        timeTakenSeconds: result.timeTakenSeconds,
        timeTaken: this.formatDuration(result.timeTakenSeconds),
        violations:
          result.attempt.securityFlags.length +
          (proctoringCounts.get(result.attemptId) ?? 0),
        resultStatus: result.evaluationStatus,
        attemptStatus: result.attempt.status,
        published: result.isPublished,
      };
    });
  }

  private csv(rows: unknown[]) {
    const safeRows = rows.map((row) =>
      row && typeof row === "object"
        ? (row as Record<string, unknown>)
        : { value: row },
    );
    const headers = Array.from(
      new Set(safeRows.flatMap((row) => Object.keys(row))),
    );
    const lines = [
      headers.join(","),
      ...safeRows.map((row) =>
        headers.map((header) => this.csvCell(row[header])).join(","),
      ),
    ];
    return `Generated At,${new Date().toISOString()}\n${lines.join("\n")}`;
  }

  private csvCell(value: unknown) {
    const text =
      typeof value === "string"
        ? value
        : value instanceof Date
          ? value.toISOString()
          : JSON.stringify(value ?? "");
    const escaped = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${escaped.replaceAll('"', '""')}"`;
  }

  private async proctoringViolationCounts(attemptIds: string[]) {
    if (!attemptIds.length) return new Map<string, number>();
    const rows = await this.prisma.proctoringEvent.groupBy({
      by: ["attemptId"],
      where: { attemptId: { in: attemptIds }, riskDelta: { gt: 0 } },
      _count: true,
    });
    return new Map(rows.map((row) => [row.attemptId, row._count]));
  }

  private formatDuration(seconds: number | null) {
    if (seconds === null) return "";
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  private async comparisonGroups(collegeId: string, dto: CompareAnalyticsDto) {
    const take = Math.min(dto.groupIds?.length ?? 6, 8);
    if (dto.dimension === "department") {
      return this.prisma.department
        .findMany({
          where: {
            collegeId,
            ...(dto.groupIds?.length ? { id: { in: dto.groupIds } } : {}),
          },
          take,
          select: { id: true, departmentName: true },
        })
        .then((rows) =>
          rows.map((row) => ({ id: row.id, label: row.departmentName })),
        );
    }
    if (dto.dimension === "batch") {
      return this.prisma.batch
        .findMany({
          where: {
            collegeId,
            ...(dto.groupIds?.length ? { id: { in: dto.groupIds } } : {}),
          },
          take,
          select: { id: true, batchName: true },
        })
        .then((rows) =>
          rows.map((row) => ({ id: row.id, label: row.batchName })),
        );
    }
    return this.prisma.subject
      .findMany({
        where: {
          collegeId,
          ...(dto.groupIds?.length ? { id: { in: dto.groupIds } } : {}),
        },
        take,
        select: { id: true, subjectName: true },
      })
      .then((rows) =>
        rows.map((row) => ({ id: row.id, label: row.subjectName })),
      );
  }

  private groupResultWhere(
    collegeId: string,
    dimension: string,
    id: string,
  ): Prisma.ResultWhereInput {
    if (dimension === "department")
      return {
        collegeId,
        attempt: { student: { studentProfile: { departmentId: id } } },
      };
    if (dimension === "batch")
      return {
        collegeId,
        attempt: { student: { studentProfile: { batchId: id } } },
      };
    return { collegeId, assessment: { subjectId: id } };
  }

  private dateRange(query: AnalyticsQueryDto): DateRange {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && Number.isNaN(from.getTime()))
      throw new BadRequestException("Invalid from date.");
    if (to && Number.isNaN(to.getTime()))
      throw new BadRequestException("Invalid to date.");
    if (from && to && to.getTime() < from.getTime())
      throw new BadRequestException("Date range is invalid.");
    const maxMs = 366 * 24 * 60 * 60 * 1000;
    if (from && to && to.getTime() - from.getTime() > maxMs)
      throw new BadRequestException("Date range cannot exceed one year.");
    return { from, to, label: from || to ? "custom" : "all-time" };
  }

  private createdRange(range: DateRange) {
    return range.from || range.to
      ? {
          createdAt: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};
  }

  private startedRange(range: DateRange) {
    return range.from || range.to
      ? {
          startedAt: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};
  }

  private resultRange(range: DateRange) {
    return range.from || range.to
      ? {
          createdAt: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};
  }

  private rangeMeta(range: DateRange) {
    return {
      from: range.from?.toISOString() ?? null,
      to: range.to?.toISOString() ?? null,
      timezone: "Asia/Kolkata",
      label: range.label,
    };
  }

  private scopeCollege(user: AuthenticatedUser, requested?: string) {
    if (user.role === Role.SUPER_ADMIN) {
      if (requested) return requested;
      return user.collegeId ?? "";
    }
    if (!user.collegeId)
      throw new ForbiddenException("College scope is required.");
    if (requested && requested !== user.collegeId)
      throw new ForbiddenException("Cross-tenant analytics are not allowed.");
    return user.collegeId;
  }

  private tenantWhere(collegeId?: string): { collegeId?: string } {
    return collegeId ? { collegeId } : {};
  }

  private questionScope(user: AuthenticatedUser): Prisma.QuestionWhereInput {
    return user.role === Role.SUPER_ADMIN
      ? { deletedAt: null }
      : { collegeId: user.collegeId, deletedAt: null };
  }

  private reportCollegeId(user: AuthenticatedUser) {
    return user.role === Role.SUPER_ADMIN ? null : user.collegeId;
  }

  private reportScope(
    user: AuthenticatedUser,
  ): Prisma.ReportDefinitionWhereInput {
    return user.role === Role.SUPER_ADMIN
      ? {}
      : {
          collegeId: user.collegeId,
          OR: [{ ownerId: user.id }, { isShared: true }],
        };
  }

  private jobScope(
    user: AuthenticatedUser,
  ): Prisma.ReportGenerationJobWhereInput {
    return user.role === Role.SUPER_ADMIN
      ? {}
      : { collegeId: user.collegeId, requestedById: user.id };
  }

  private fileScope(user: AuthenticatedUser): Prisma.ReportFileWhereInput {
    return user.role === Role.SUPER_ADMIN
      ? {}
      : { collegeId: user.collegeId, requestedById: user.id };
  }

  private insightScope(
    user: AuthenticatedUser,
  ): Prisma.AnalyticsInsightWhereInput {
    return user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId };
  }

  private ensureRole(user: AuthenticatedUser, roles: Role[]) {
    if (!roles.includes(user.role))
      throw new ForbiddenException("Not allowed.");
  }

  private async ensureStudentVisible(
    user: AuthenticatedUser,
    studentUserId: string,
    knownCollegeId?: string,
  ) {
    if (user.role === Role.SUPER_ADMIN) return;
    if (user.role === Role.STUDENT && user.id === studentUserId) return;
    const profile = knownCollegeId
      ? { collegeId: knownCollegeId }
      : await this.prisma.studentProfile.findUnique({
          where: { userId: studentUserId },
          select: { collegeId: true },
        });
    if (!profile || profile.collegeId !== user.collegeId)
      throw new ForbiddenException("Student is outside your tenant.");
    if (user.role === Role.FACULTY) {
      const batches = await this.assignedBatchIds(user, profile.collegeId);
      const student = await this.prisma.studentProfile.findUnique({
        where: { userId: studentUserId },
        select: { batchId: true },
      });
      if (student && batches.length && !batches.includes(student.batchId))
        throw new ForbiddenException("Student is outside assigned batches.");
    }
  }

  private async allowedSubjectIds(user: AuthenticatedUser, collegeId: string) {
    if (user.role !== Role.FACULTY) return [];
    const assignments = await this.prisma.subjectAssignment.findMany({
      where: { collegeId, userId: user.id, status: EntityStatus.ACTIVE },
      select: { subjectId: true },
    });
    return assignments.map((item) => item.subjectId);
  }

  private async assignedBatchIds(user: AuthenticatedUser, collegeId: string) {
    if (user.role !== Role.FACULTY) return [];
    const assignments = await this.prisma.subjectAssignment.findMany({
      where: { collegeId, userId: user.id, status: EntityStatus.ACTIVE },
      select: { batchId: true },
    });
    return Array.from(new Set(assignments.map((item) => item.batchId)));
  }

  private async assignedBatchCount(user: AuthenticatedUser, collegeId: string) {
    return (await this.assignedBatchIds(user, collegeId)).length;
  }

  private async assignedStudentCount(collegeId: string) {
    return this.prisma.studentProfile.count({
      where: { collegeId, status: EntityStatus.ACTIVE },
    });
  }

  private async assessmentAssignedCount(assessmentId: string) {
    const [direct, batches] = await Promise.all([
      this.prisma.assessmentStudentAssignment.count({
        where: { assessmentId },
      }),
      this.prisma.assessmentBatchAssignment.findMany({
        where: { assessmentId },
        select: { batchId: true },
      }),
    ]);
    const batchStudents = batches.length
      ? await this.prisma.studentProfile.count({
          where: { batchId: { in: batches.map((item) => item.batchId) } },
        })
      : 0;
    return direct + batchStudents;
  }

  private async studentSubjectScores(studentId: string) {
    const rows = await this.prisma.result.findMany({
      where: { studentId, isPublished: true },
      include: { assessment: { include: { subject: true } } },
      take: 100,
    });
    return rows.map((row) => ({
      subject: row.assessment.subject?.subjectName ?? "Unassigned",
      percentage: row.percentage,
    }));
  }

  private async studentTopicScores(studentId: string) {
    const answers = await this.prisma.attemptQuestion.findMany({
      where: { attempt: { studentId, result: { isPublished: true } } },
      include: {
        assessmentQuestion: { include: { question: true } },
        evaluations: true,
      },
      take: 200,
    });
    const grouped = new Map<string, number[]>();
    for (const item of answers) {
      const topic = item.assessmentQuestion?.question.topic ?? "Unclassified";
      const percent = this.percent(
        this.sum(item.evaluations.map((evaluation) => evaluation.awardedMarks)),
        item.assignedMarks,
      );
      grouped.set(topic, [...(grouped.get(topic) ?? []), percent]);
    }
    return Array.from(grouped.entries()).map(([topic, values]) => ({
      topic,
      average: this.average(values),
    }));
  }

  private async questionDistributions(collegeId: string, subjectId: string) {
    const questions = await this.prisma.question.findMany({
      where: { collegeId, subjectId, deletedAt: null },
      select: { difficulty: true, questionType: true, metadata: true },
    });
    return {
      bloom: this.countLabels(
        questions.map((item) =>
          this.metadataLabel(item.metadata, "bloomLevel", "UNCLASSIFIED"),
        ),
      ),
      difficulty: this.countLabels(questions.map((item) => item.difficulty)),
      questionType: this.countLabels(
        questions.map((item) => item.questionType ?? "UNKNOWN"),
      ),
    };
  }

  private measuredDifficulty(
    correctRate: number,
    sampleSize: number,
  ): QuestionDifficulty | null {
    if (sampleSize < minStatsSample) return null;
    if (correctRate >= 75) return QuestionDifficulty.EASY;
    if (correctRate >= 40) return QuestionDifficulty.MEDIUM;
    return QuestionDifficulty.HARD;
  }

  private questionSource(metadata: Prisma.JsonValue | null) {
    if (
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      "source" in metadata
    )
      return metadata.source;
    return "manual";
  }

  private metadataLabel(
    metadata: Prisma.JsonValue | null,
    key: string,
    fallback: string,
  ) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return fallback;
    }
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
      ? String(value)
      : fallback;
  }

  private countLabels(values: Array<string | null | undefined>) {
    return values.reduce<Record<string, number>>((acc, value) => {
      const key = value ?? "UNKNOWN";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }

  private percent(value: number, total: number) {
    return total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0;
  }

  private average(values: number[]) {
    return values.length
      ? Number((this.sum(values) / values.length).toFixed(2))
      : 0;
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }

  private timeStats(results: NumericResult[]) {
    const values = results
      .map((item) => item.timeTakenSeconds ?? 0)
      .filter((value) => value > 0);
    return {
      averageSeconds: this.average(values),
      fastestSeconds: Math.min(...values, 0),
      slowestSeconds: Math.max(...values, 0),
    };
  }

  private trendFromDates(dates: Date[]) {
    return Object.entries(
      this.countLabels(dates.map((date) => date.toISOString().slice(0, 10))),
    ).map(([date, value]) => ({ date, value }));
  }

  private anonymousName(rank: number) {
    return `Learner ${String(rank).padStart(2, "0")}`;
  }

  private daysFromNow(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private predictiveLimitations() {
    return {
      enabled: false,
      method: "Transparent rule-based baseline only.",
      warning:
        "No punitive or high-stakes action may be taken solely from a prediction.",
      minimumDataThreshold: minStatsSample,
      fairness:
        "Requires bias, calibration, and validity review before production use.",
    };
  }

  private async queueHealth() {
    try {
      await this.redis.client.ping();
      return { redis: "UP", queues: "AVAILABLE" };
    } catch {
      return { redis: "DOWN", queues: "UNAVAILABLE" };
    }
  }

  private async cached<T>(
    user: AuthenticatedUser,
    key: string,
    query: AnalyticsQueryDto,
    factory: () => Promise<T>,
  ) {
    const cacheKey = `analytics:${user.role}:${user.collegeId ?? "platform"}:${key}:${JSON.stringify(query)}`;
    if (process.env.ANALYTICS_CACHE_BYPASS === "true") return factory();
    try {
      const cached = await this.redis.client.get(cacheKey);
      if (cached) return JSON.parse(cached) as T;
      const value = await factory();
      await this.redis.client.set(cacheKey, JSON.stringify(value), "EX", 60);
      return value;
    } catch {
      return factory();
    }
  }

  private async audit(
    user: AuthenticatedUser,
    event: AuditEvent,
    collegeId: string | null,
    message: string,
    metadata: Prisma.InputJsonObject,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          userId: user.id,
          collegeId,
          event,
          actorRole: user.role,
          metadata: { ...metadata, message },
        },
      })
      .catch(() => undefined);
  }

  private ok<T>(data: T) {
    return { success: true, data };
  }
}
