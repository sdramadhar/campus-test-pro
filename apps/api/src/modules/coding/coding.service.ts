import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  CheckerType,
  CodingReviewStatus,
  CodingSubmissionStatus,
  PartialScoringPolicy,
  PlagiarismJobStatus,
  PlagiarismReviewStatus,
  Prisma,
  Role,
  RunnerJobStatus,
  RunnerMode,
  TestAttemptStatus,
  TestCaseVisibility,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { env } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  CodingActionDto,
  CodingRunDto,
  CodingScoreDto,
  PlagiarismDecisionDto,
  PlagiarismJobDto,
} from "./dto/coding.dto";

const terminalAttempts = new Set<TestAttemptStatus>([
  TestAttemptStatus.SUBMITTED,
  TestAttemptStatus.AUTO_SUBMITTED,
  TestAttemptStatus.EVALUATED,
  TestAttemptStatus.EXPIRED,
  TestAttemptStatus.CANCELLED,
]);

interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  visibility: TestCaseVisibility;
  scoreWeight: number;
  displayOrder: number;
}

interface CodingContext {
  attempt: {
    id?: string;
    collegeId: string;
    assessmentId: string;
    studentId: string;
  };
  attemptQuestion: {
    id: string;
    assignedMarks: number;
  };
  coding: {
    checkerType: CheckerType;
    scoringPolicy: PartialScoringPolicy;
    testCases: CodingTestCase[];
    allowedLanguages?: string[];
  };
}

@Injectable()
export class CodingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async run(user: AuthenticatedUser, attemptId: string, attemptQuestionId: string, dto: CodingRunDto) {
    const context = await this.studentCodingContext(user, attemptId, attemptQuestionId);
    this.validateSource(dto);
    const language = await this.language(dto.languageId, context.coding.allowedLanguages);
    await this.rateLimit(user, "run");
    const submission = await this.saveSubmission(user, context, language.id, dto.sourceCode, CodingSubmissionStatus.QUEUED, false);
    const result = await this.evaluate(submission.id, context, language.id, dto.sourceCode, false, dto.stdin);
    await this.audit(user, "CODING_RUN", submission.id, { attemptId, attemptQuestionId, mock: result.execution.mockResult });
    return this.ok({
      jobId: result.runnerJob.id,
      submissionId: submission.id,
      status: result.submission.status,
      mockResult: result.execution.mockResult,
      message: result.execution.mockResult ? "MOCK runner result. No untrusted code was executed." : "Run queued.",
    });
  }

  async submit(user: AuthenticatedUser, attemptId: string, attemptQuestionId: string, dto: CodingRunDto) {
    const context = await this.studentCodingContext(user, attemptId, attemptQuestionId);
    this.validateSource(dto);
    const language = await this.language(dto.languageId, context.coding.allowedLanguages);
    await this.rateLimit(user, "submit");
    const submission = await this.saveSubmission(user, context, language.id, dto.sourceCode, CodingSubmissionStatus.QUEUED, true);
    const result = await this.evaluate(submission.id, context, language.id, dto.sourceCode, true, undefined);
    await this.prisma.studentAnswer.upsert({
      where: { attemptQuestionId },
      update: {
        codingSubmissionRef: submission.id,
        answeredAt: new Date(),
        saveStatusMetadata: { status: "CODING_SUBMITTED", submissionId: submission.id },
      },
      create: {
        attemptId,
        attemptQuestionId,
        codingSubmissionRef: submission.id,
        answeredAt: new Date(),
        saveStatusMetadata: { status: "CODING_SUBMITTED", submissionId: submission.id },
      },
    });
    await this.audit(user, "CODING_SUBMIT", submission.id, { attemptId, attemptQuestionId, jobId: result.runnerJob.id });
    return this.ok({
      submissionId: submission.id,
      jobId: result.runnerJob.id,
      receipt: `coding-${submission.id}`,
      status: result.submission.status,
      scoringPolicy: "latest submission counts",
    });
  }

  async studentSubmissions(user: AuthenticatedUser) {
    return this.ok({
      data: (await this.prisma.codingSubmission.findMany({
        where: { studentId: user.id, collegeId: user.collegeId ?? "" },
        orderBy: { updatedAt: "desc" },
        take: 100,
      })).map((item) => this.studentSafeSubmission(item)),
    });
  }

  async studentSubmission(user: AuthenticatedUser, submissionId: string) {
    const submission = await this.prisma.codingSubmission.findFirst({
      where: { id: submissionId, studentId: user.id, collegeId: user.collegeId ?? "" },
    });
    if (!submission) throw new NotFoundException("Coding submission not found.");
    const executions = await this.prisma.codingExecution.findMany({ where: { submissionId }, orderBy: { createdAt: "desc" }, take: 5 });
    const revisions = await this.prisma.codingSubmissionRevision.findMany({ where: { submissionId }, orderBy: { revisionNumber: "desc" } });
    return this.ok({ submission: this.studentSafeSubmission(submission), executions: executions.map((item) => this.safeExecution(item)), revisions: revisions.map((item) => ({ id: item.id, revisionNumber: item.revisionNumber, createdAt: item.createdAt })) });
  }

  async job(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.runnerJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Coding job not found.");
    if (user.role !== Role.SUPER_ADMIN && job.collegeId !== user.collegeId) throw new ForbiddenException("Job is outside your tenant.");
    if (user.role === Role.STUDENT) {
      const submission = job.submissionId ? await this.prisma.codingSubmission.findUnique({ where: { id: job.submissionId } }) : null;
      if (!submission || submission.studentId !== user.id) throw new ForbiddenException("Job is not yours.");
    }
    return this.ok({
      id: job.id,
      status: job.status,
      mode: job.mode,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      error: job.errorMessage,
    });
  }

  async cancelJob(user: AuthenticatedUser, jobId: string) {
    await this.job(user, jobId);
    const updated = await this.prisma.runnerJob.update({ where: { id: jobId }, data: { status: RunnerJobStatus.CANCELLED, finishedAt: new Date() } });
    return this.ok({ id: updated.id, status: updated.status });
  }

  async submissions(user: AuthenticatedUser, query: Record<string, string>) {
    return this.ok({
      data: await this.prisma.codingSubmission.findMany({
        where: this.scope(user, { assessmentId: query.assessmentId }),
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    });
  }

  async submission(user: AuthenticatedUser, submissionId: string) {
    const submission = await this.scopedSubmission(user, submissionId);
    return this.ok({
      submission,
      executions: await this.prisma.codingExecution.findMany({ where: { submissionId }, orderBy: { createdAt: "desc" } }),
      testResults: await this.prisma.codingExecutionTestResult.findMany({ where: { submissionId }, orderBy: { displayOrder: "asc" } }),
      revisions: await this.prisma.codingSubmissionRevision.findMany({ where: { submissionId }, orderBy: { revisionNumber: "desc" } }),
      reviewTasks: await this.prisma.codingReviewTask.findMany({ where: { submissionId }, orderBy: { createdAt: "desc" } }),
      audit: await this.prisma.codingAuditEvent.findMany({ where: { submissionId }, orderBy: { createdAt: "desc" }, take: 50 }),
    });
  }

  async rejudge(user: AuthenticatedUser, submissionId: string, dto: CodingActionDto) {
    if (!dto.reason.trim()) throw new BadRequestException("Rejudge reason is required.");
    const submission = await this.scopedSubmission(user, submissionId);
    const attemptQuestion = await this.prisma.attemptQuestion.findUniqueOrThrow({ where: { id: submission.attemptQuestionId } });
    const question = attemptQuestion.originalQuestionId ? await this.prisma.question.findUniqueOrThrow({ where: { id: attemptQuestion.originalQuestionId }, include: { codingQuestion: { include: { testCases: true } } } }) : null;
    if (!question?.codingQuestion) throw new BadRequestException("Coding configuration is unavailable.");
    const context = { attempt: { id: submission.attemptId, collegeId: submission.collegeId, assessmentId: submission.assessmentId, studentId: submission.studentId }, attemptQuestion, question, coding: question.codingQuestion };
    const result = await this.evaluate(submission.id, context, submission.languageId, submission.sourceCode, true, undefined, dto.reason);
    await this.audit(user, "CODING_REJUDGE", submission.id, { reason: dto.reason, jobId: result.runnerJob.id });
    return this.ok({ submission: result.submission, jobId: result.runnerJob.id });
  }

  async setReviewStatus(user: AuthenticatedUser, submissionId: string, status: "HELD" | "RELEASED", reason: string) {
    if (!reason.trim()) throw new BadRequestException("Reason is required.");
    const submission = await this.scopedSubmission(user, submissionId);
    const updated = await this.prisma.codingSubmission.update({
      where: { id: submission.id },
      data: { reviewStatus: status, heldAt: status === "HELD" ? new Date() : null, heldById: status === "HELD" ? user.id : null, holdReason: reason },
    });
    await this.prisma.codingReviewTask.create({ data: { collegeId: submission.collegeId, submissionId, assessmentId: submission.assessmentId, attemptId: submission.attemptId, studentId: submission.studentId, status, reason, createdById: user.id, reviewedById: user.id, reviewedAt: new Date() } });
    await this.audit(user, `CODING_${status}`, submissionId, { reason });
    return this.ok(updated);
  }

  async overrideScore(user: AuthenticatedUser, submissionId: string, dto: CodingScoreDto) {
    const submission = await this.scopedSubmission(user, submissionId);
    const score = Math.min(dto.score, submission.maxScore);
    const updated = await this.prisma.codingSubmission.update({ where: { id: submissionId }, data: { score, reviewStatus: CodingReviewStatus.OVERRIDDEN, scoreOverrideReason: dto.reason } });
    await this.audit(user, "CODING_SCORE_OVERRIDE", submissionId, { requestedScore: dto.score, appliedScore: score, reason: dto.reason });
    return this.ok(updated);
  }

  async rejudgeAssessment(user: AuthenticatedUser, assessmentId: string, dto: CodingActionDto) {
    const where = this.scope(user, { assessmentId });
    const count = await this.prisma.codingSubmission.count({ where });
    const job = await this.prisma.runnerJob.create({
      data: {
        collegeId: user.role === Role.SUPER_ADMIN ? null : user.collegeId,
        queueName: env().CODE_RUNNER_QUEUE,
        mode: this.runnerMode(),
        timeoutMs: env().CODE_RUNNER_TIMEOUT_MS,
        status: RunnerJobStatus.COMPLETED,
        idempotencyKey: `assessment-rejudge-${assessmentId}-${Date.now().toString()}`,
        metadata: { reason: dto.reason, count, phase: 16 },
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    return this.ok({ jobId: job.id, count, message: "Assessment-wide rejudge foundation recorded." });
  }

  async createPlagiarismJob(user: AuthenticatedUser, dto: PlagiarismJobDto) {
    const collegeId = this.userCollege(user);
    const job = await this.prisma.codingPlagiarismJob.create({
      data: { collegeId, assessmentId: dto.assessmentId, requestedById: user.id, status: PlagiarismJobStatus.RUNNING, startedAt: new Date() },
    });
    const submissions = await this.prisma.codingSubmission.findMany({ where: { collegeId, ...(dto.assessmentId ? { assessmentId: dto.assessmentId } : {}) }, take: 50 });
    let matchCount = 0;
    for (let i = 0; i < submissions.length; i += 1) {
      for (let j = i + 1; j < submissions.length; j += 1) {
        const a = submissions[i];
        const b = submissions[j];
        if (!a || !b || a.languageId !== b.languageId) continue;
        const similarity = this.similarity(a.sourceCode, b.sourceCode);
        if (a.sourceHash === b.sourceHash || similarity >= 0.7) {
          matchCount += 1;
          await this.prisma.codingSimilarityMatch.create({
            data: {
              collegeId,
              jobId: job.id,
              assessmentId: dto.assessmentId,
              submissionAId: a.id,
              submissionBId: b.id,
              languageId: a.languageId,
              exactHashMatch: a.sourceHash === b.sourceHash,
              similarityScore: similarity,
              tokenSimilarity: similarity,
              normalizedSimilarity: similarity,
              matchedRegions: { preview: "review-required", automaticPunishment: false },
            },
          });
        }
      }
    }
    const updated = await this.prisma.codingPlagiarismJob.update({ where: { id: job.id }, data: { status: PlagiarismJobStatus.COMPLETED, completedAt: new Date(), comparedCount: submissions.length, matchCount } });
    return this.ok(updated);
  }

  async plagiarismJobs(user: AuthenticatedUser) {
    return this.ok({ data: await this.prisma.codingPlagiarismJob.findMany({ where: { collegeId: this.userCollege(user) }, orderBy: { createdAt: "desc" }, take: 100 }) });
  }

  async plagiarismJob(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.codingPlagiarismJob.findFirst({ where: { id: jobId, collegeId: this.userCollege(user) } });
    if (!job) throw new NotFoundException("Plagiarism job not found.");
    return this.ok({ job, matches: await this.prisma.codingSimilarityMatch.findMany({ where: { jobId }, orderBy: { similarityScore: "desc" } }) });
  }

  async plagiarismMatch(user: AuthenticatedUser, matchId: string) {
    const match = await this.prisma.codingSimilarityMatch.findFirst({ where: { id: matchId, collegeId: this.userCollege(user) } });
    if (!match) throw new NotFoundException("Similarity match not found.");
    return this.ok(match);
  }

  async reviewPlagiarismMatch(user: AuthenticatedUser, matchId: string, dto: PlagiarismDecisionDto) {
    const match = await this.prisma.codingSimilarityMatch.findFirst({ where: { id: matchId, collegeId: this.userCollege(user) } });
    if (!match) throw new NotFoundException("Similarity match not found.");
    const status = dto.status === CodingReviewStatus.RELEASED ? PlagiarismReviewStatus.CLEARED : dto.status === CodingReviewStatus.INVALIDATED ? PlagiarismReviewStatus.CONFIRMED : PlagiarismReviewStatus.SUSPICIOUS;
    return this.ok(await this.prisma.codingSimilarityMatch.update({ where: { id: match.id }, data: { reviewStatus: status, reviewerId: user.id, reviewerReason: dto.reason, reviewedAt: new Date() } }));
  }

  async analytics(user: AuthenticatedUser, filter: { assessmentId?: string; questionId?: string } = {}) {
    const where = this.scope(user, filter.assessmentId ? { assessmentId: filter.assessmentId } : {});
    const [total, accepted, compileErrors, runtimeErrors, timeouts, memoryLimits, plagiarismBacklog, languages] = await Promise.all([
      this.prisma.codingSubmission.count({ where }),
      this.prisma.codingSubmission.count({ where: { ...where, status: CodingSubmissionStatus.ACCEPTED } }),
      this.prisma.codingSubmission.count({ where: { ...where, status: CodingSubmissionStatus.COMPILATION_ERROR } }),
      this.prisma.codingSubmission.count({ where: { ...where, status: CodingSubmissionStatus.RUNTIME_ERROR } }),
      this.prisma.codingSubmission.count({ where: { ...where, status: CodingSubmissionStatus.TIME_LIMIT_EXCEEDED } }),
      this.prisma.codingSubmission.count({ where: { ...where, status: CodingSubmissionStatus.MEMORY_LIMIT_EXCEEDED } }),
      this.prisma.codingSimilarityMatch.count({ where: { collegeId: this.userCollege(user), reviewStatus: PlagiarismReviewStatus.UNREVIEWED } }),
      this.prisma.codingSubmission.groupBy({ by: ["languageId"], where, _count: true }),
    ]);
    return this.ok({
      totals: {
        submissions: total,
        accepted,
        acceptedRate: total ? accepted / total : 0,
        compilationErrorRate: total ? compileErrors / total : 0,
        runtimeErrorRate: total ? runtimeErrors / total : 0,
        timeoutRate: total ? timeouts / total : 0,
        memoryLimitRate: total ? memoryLimits / total : 0,
        plagiarismReviewBacklog: plagiarismBacklog,
      },
      charts: { languageUsage: languages.map((item) => ({ label: item.languageId, value: item._count })) },
    });
  }

  private validateSource(dto: CodingRunDto) {
    const current = env();
    if (Buffer.byteLength(dto.sourceCode, "utf8") > current.CODE_RUNNER_MAX_SOURCE_BYTES) throw new BadRequestException("Source code exceeds configured size limit.");
    if (Buffer.byteLength(dto.stdin ?? "", "utf8") > current.CODE_RUNNER_MAX_STDIN_BYTES) throw new BadRequestException("Stdin exceeds configured size limit.");
    if (/docker\s|child_process|ProcessBuilder|Runtime\.getRuntime|System\.Diagnostics|std::system|popen\s*\(/i.test(dto.sourceCode)) {
      throw new BadRequestException("Source contains forbidden execution configuration patterns.");
    }
  }

  private async studentCodingContext(user: AuthenticatedUser, attemptId: string, attemptQuestionId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id: attemptId, studentId: user.id, collegeId: user.collegeId ?? "" },
      include: { questions: true },
    });
    if (!attempt) throw new NotFoundException("Attempt not found.");
    if (terminalAttempts.has(attempt.status) || attempt.expiresAt < new Date()) throw new ForbiddenException("Coding submissions are closed for this attempt.");
    const attemptQuestion = attempt.questions.find((item) => item.id === attemptQuestionId);
    if (!attemptQuestion?.originalQuestionId) throw new NotFoundException("Coding question not found.");
    const question = await this.prisma.question.findUnique({
      where: { id: attemptQuestion.originalQuestionId },
      include: { codingQuestion: { include: { testCases: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } } } },
    });
    if (!question?.codingQuestion) throw new BadRequestException("Question is not configured for coding.");
    return { attempt, attemptQuestion, question, coding: question.codingQuestion };
  }

  private async language(languageId: string, allowed: string[]) {
    const language = await this.prisma.programmingLanguage.findFirst({ where: { id: languageId, enabled: true } });
    if (!language || !allowed.includes(languageId)) throw new BadRequestException("Unsupported or disabled programming language.");
    return language;
  }

  private async saveSubmission(user: AuthenticatedUser, context: Awaited<ReturnType<CodingService["studentCodingContext"]>>, languageId: string, sourceCode: string, status: CodingSubmissionStatus, final: boolean) {
    const sourceHash = this.hash(this.normalizeSource(sourceCode));
    const maxScore = context.attemptQuestion.assignedMarks;
    const submission = await this.prisma.codingSubmission.create({
      data: {
        collegeId: context.attempt.collegeId,
        assessmentId: context.attempt.assessmentId,
        attemptId: context.attempt.id,
        attemptQuestionId: context.attemptQuestion.id,
        studentId: user.id,
        languageId,
        sourceCode,
        sourceHash,
        status,
        submittedAt: final ? new Date() : null,
        maxScore,
      },
    });
    await this.prisma.codingSubmissionRevision.create({
      data: { collegeId: submission.collegeId, submissionId: submission.id, revisionNumber: 1, sourceCode, sourceHash, languageId, changeType: final ? "SUBMIT" : "RUN", createdById: user.id },
    });
    return submission;
  }

  private async evaluate(
    submissionId: string,
    context: CodingContext,
    languageId: string,
    sourceCode: string,
    final: boolean,
    stdin?: string,
    reason?: string,
  ) {
    const mode = this.runnerMode();
    if (mode === RunnerMode.DISABLED) throw new ServiceUnavailableException("Code runner is disabled.");
    if (mode === RunnerMode.MOCK && env().NODE_ENV === "production") throw new BadRequestException("Mock runner is not allowed in production.");
    const runnerJob = await this.prisma.runnerJob.create({
      data: {
        collegeId: context.attempt.collegeId,
        submissionId,
        queueName: env().CODE_RUNNER_QUEUE,
        mode,
        status: RunnerJobStatus.RUNNING,
        idempotencyKey: `${submissionId}-${Date.now().toString()}`,
        timeoutMs: env().CODE_RUNNER_TIMEOUT_MS,
        startedAt: new Date(),
        metadata: { final, reason, mock: mode === RunnerMode.MOCK },
      },
    });
    const execution = await this.prisma.codingExecution.create({
      data: { collegeId: context.attempt.collegeId, submissionId, runnerJobId: runnerJob.id, mode, languageId, status: CodingSubmissionStatus.RUNNING, phase: "mock-evaluation", mockResult: mode === RunnerMode.MOCK },
    });
    const publicOnly = !final;
    const testCases = context.coding.testCases.filter((testCase: CodingTestCase) => !publicOnly || testCase.visibility === TestCaseVisibility.PUBLIC);
    const mockStatus = this.mockStatus(sourceCode);
    const breakdown = [];
    let score = 0;
    let publicPassed = 0;
    let hiddenPassed = 0;
    const totalWeight = testCases.reduce((total: number, testCase: CodingTestCase) => total + testCase.scoreWeight, 0) || 1;
    for (const testCase of testCases) {
      const passed = mockStatus === CodingSubmissionStatus.ACCEPTED || sourceCode.includes("PASS_PUBLIC");
      const maxScore = context.coding.scoringPolicy === PartialScoringPolicy.WEIGHTED_PER_TEST ? (context.attemptQuestion.assignedMarks * testCase.scoreWeight) / totalWeight : context.attemptQuestion.assignedMarks / testCases.length;
      const earned = passed && mockStatus === CodingSubmissionStatus.ACCEPTED ? maxScore : 0;
      if (passed && testCase.visibility === TestCaseVisibility.PUBLIC) publicPassed += 1;
      if (passed && testCase.visibility === TestCaseVisibility.HIDDEN) hiddenPassed += 1;
      score += earned;
      const output = this.mockOutput(sourceCode, stdin ?? testCase.input);
      await this.prisma.codingExecutionTestResult.create({
        data: {
          collegeId: context.attempt.collegeId,
          executionId: execution.id,
          submissionId,
          testCaseId: testCase.id,
          visibility: testCase.visibility,
          displayOrder: testCase.displayOrder,
          status: passed ? CodingSubmissionStatus.ACCEPTED : mockStatus,
          score: earned,
          maxScore,
          executionTimeMs: 12,
          peakMemoryKb: 1024,
          outputSanitized: testCase.visibility === TestCaseVisibility.PUBLIC ? output : null,
          errorSanitized: mockStatus === CodingSubmissionStatus.COMPILATION_ERROR ? "MOCK compilation error." : null,
          checkerType: context.coding.checkerType,
          hiddenDetailsRedacted: testCase.visibility === TestCaseVisibility.HIDDEN,
        },
      });
      breakdown.push({ visibility: testCase.visibility, status: passed ? CodingSubmissionStatus.ACCEPTED : mockStatus, score: earned, maxScore });
    }
    const finalStatus = mockStatus === CodingSubmissionStatus.ACCEPTED && score < context.attemptQuestion.assignedMarks ? CodingSubmissionStatus.PARTIALLY_ACCEPTED : mockStatus;
    const updatedExecution = await this.prisma.codingExecution.update({
      where: { id: execution.id },
      data: { status: finalStatus, phase: "completed", runFinishedAt: new Date(), executionTimeMs: 12, peakMemoryKb: 1024, stdoutSanitized: "MOCK runner output. No code executed.", compilerOutputSanitized: mockStatus === CodingSubmissionStatus.COMPILATION_ERROR ? "MOCK compilation error." : null },
    });
    const version = (await this.prisma.codingEvaluation.count({ where: { submissionId } })) + 1;
    await this.prisma.codingEvaluation.create({ data: { collegeId: context.attempt.collegeId, submissionId, executionId: execution.id, version, status: finalStatus, score, maxScore: context.attemptQuestion.assignedMarks, policy: context.coding.scoringPolicy, breakdown } });
    const updatedSubmission = await this.prisma.codingSubmission.update({
      where: { id: submissionId },
      data: { status: finalStatus, evaluatedAt: new Date(), score, publicTestsPassed: publicPassed, hiddenTestsPassed: hiddenPassed, totalTests: testCases.length, executionTimeMs: 12, peakMemoryKb: 1024, compilerOutputSanitized: mockStatus === CodingSubmissionStatus.COMPILATION_ERROR ? "MOCK compilation error." : null, latestExecutionId: execution.id },
    });
    await this.prisma.runnerJob.update({ where: { id: runnerJob.id }, data: { status: RunnerJobStatus.COMPLETED, executionId: execution.id, finishedAt: new Date() } });
    return { submission: updatedSubmission, execution: updatedExecution, runnerJob };
  }

  private mockStatus(sourceCode: string): CodingSubmissionStatus {
    if (sourceCode.includes("MOCK_COMPILE_ERROR")) return CodingSubmissionStatus.COMPILATION_ERROR;
    if (sourceCode.includes("MOCK_RUNTIME_ERROR")) return CodingSubmissionStatus.RUNTIME_ERROR;
    if (sourceCode.includes("MOCK_TIMEOUT")) return CodingSubmissionStatus.TIME_LIMIT_EXCEEDED;
    if (sourceCode.includes("MOCK_MEMORY")) return CodingSubmissionStatus.MEMORY_LIMIT_EXCEEDED;
    if (sourceCode.includes("MOCK_OUTPUT_LIMIT")) return CodingSubmissionStatus.OUTPUT_LIMIT_EXCEEDED;
    if (sourceCode.includes("WRONG")) return CodingSubmissionStatus.WRONG_ANSWER;
    return CodingSubmissionStatus.ACCEPTED;
  }

  private mockOutput(sourceCode: string, stdin: string) {
    return `MOCK OUTPUT\nsourceHash=${this.hash(sourceCode).slice(0, 12)}\nstdinBytes=${Buffer.byteLength(stdin, "utf8").toString()}`;
  }

  private safeExecution(execution: { id: string; status: CodingSubmissionStatus; mockResult: boolean; executionTimeMs: number | null; peakMemoryKb: number | null; stdoutSanitized: string | null; compilerOutputSanitized: string | null; createdAt: Date }) {
    return { id: execution.id, status: execution.status, mockResult: execution.mockResult, executionTimeMs: execution.executionTimeMs, peakMemoryKb: execution.peakMemoryKb, stdoutSanitized: execution.stdoutSanitized, compilerOutputSanitized: execution.compilerOutputSanitized, createdAt: execution.createdAt };
  }

  private studentSafeSubmission(submission: { id: string; assessmentId: string; attemptId: string; attemptQuestionId: string; languageId: string; status: CodingSubmissionStatus; submittedAt: Date | null; evaluatedAt: Date | null; score: number; maxScore: number; publicTestsPassed: number; hiddenTestsPassed: number; totalTests: number; executionTimeMs: number | null; peakMemoryKb: number | null; compilerOutputSanitized: string | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: submission.id,
      assessmentId: submission.assessmentId,
      attemptId: submission.attemptId,
      attemptQuestionId: submission.attemptQuestionId,
      languageId: submission.languageId,
      status: submission.status,
      submittedAt: submission.submittedAt,
      evaluatedAt: submission.evaluatedAt,
      score: submission.score,
      maxScore: submission.maxScore,
      publicTestsPassed: submission.publicTestsPassed,
      hiddenTestSummary: `${submission.hiddenTestsPassed.toString()} hidden tests passed`,
      totalTests: submission.totalTests,
      executionTimeMs: submission.executionTimeMs,
      peakMemoryKb: submission.peakMemoryKb,
      compilerOutputSanitized: submission.compilerOutputSanitized,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  private async scopedSubmission(user: AuthenticatedUser, submissionId: string) {
    const submission = await this.prisma.codingSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException("Coding submission not found.");
    if (user.role !== Role.SUPER_ADMIN && submission.collegeId !== user.collegeId) throw new ForbiddenException("Submission is outside your tenant.");
    return submission;
  }

  private scope(user: AuthenticatedUser, filter: { assessmentId?: string } = {}): Prisma.CodingSubmissionWhereInput {
    return {
      ...(user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId ?? "" }),
      ...(filter.assessmentId ? { assessmentId: filter.assessmentId } : {}),
    };
  }

  private userCollege(user: AuthenticatedUser) {
    if (!user.collegeId && user.role !== Role.SUPER_ADMIN) throw new ForbiddenException("College scope is required.");
    return user.collegeId ?? "";
  }

  private runnerMode(): RunnerMode {
    return env().CODE_RUNNER_MODE;
  }

  private async rateLimit(user: AuthenticatedUser, action: string) {
    const key = `coding-rate:${action}:${user.id}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) await this.redis.client.expire(key, 60);
    if (count > 60) throw new BadRequestException("Coding action rate limit exceeded.");
  }

  private normalizeSource(source: string) {
    return source.replace(/\s+/g, " ").trim();
  }

  private similarity(a: string, b: string) {
    const left = new Set(this.normalizeSource(a).split(" ").filter(Boolean));
    const right = new Set(this.normalizeSource(b).split(" ").filter(Boolean));
    const intersection = [...left].filter((item) => right.has(item)).length;
    const union = new Set([...left, ...right]).size || 1;
    return intersection / union;
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private async audit(user: AuthenticatedUser, eventType: string, submissionId: string | null, metadata: Prisma.InputJsonObject) {
    const collegeId = user.collegeId ?? (submissionId ? (await this.prisma.codingSubmission.findUnique({ where: { id: submissionId }, select: { collegeId: true } }))?.collegeId : null);
    if (!collegeId) return;
    await this.prisma.codingAuditEvent.create({ data: { collegeId, submissionId, actorId: user.id, actorRole: user.role, eventType, metadata } });
  }

  private ok<T>(data: T) {
    return { success: true, data };
  }
}
