import { Queue, Worker } from "bullmq";
import { config } from "dotenv";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  AuditEvent,
  BackgroundJobStatus,
  ManualReviewStatus,
  PassStatus,
  Prisma,
  PrismaClient,
  QuestionType,
  Role,
  TestAttemptStatus,
} from "../../api/generated/phase5-client";

for (const envPath of [
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", "..", ".env"),
]) {
  config({ path: envPath, override: false });
}

const queueNames = [
  "attempt-expiry",
  "attempt-auto-submit",
  "result-calculation",
  "result-publication",
  "notification",
  "analytics",
  "cleanup",
] as const;

const prisma = new PrismaClient();
const instanceId =
  process.env.WORKER_INSTANCE_ID ??
  `worker-${String(process.pid)}-${randomUUID()}`;
const connection = new Redis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
);

const queues = queueNames.map(
  (name) => new Queue(name, { connection, prefix: "campustest" }),
);
const workers = queueNames.map(
  (queueName) =>
    new Worker(
      queueName,
      async (job) => {
        const startedAt = new Date();
        await recordJob(
          queueName,
          job.id ?? `${queueName}:${job.name}`,
          job.name,
          BackgroundJobStatus.ACTIVE,
          startedAt,
        );
        try {
          const payload = jobData(job.data);
          if (
            queueName === "attempt-expiry" ||
            queueName === "attempt-auto-submit"
          ) {
            await autoSubmitAttempt(
              payload.attemptId,
              `worker:${String(process.pid)}`,
            );
          } else if (queueName === "result-calculation") {
            await calculateResult(payload.attemptId);
          }
          await recordJob(
            queueName,
            job.id ?? `${queueName}:${job.name}`,
            job.name,
            BackgroundJobStatus.COMPLETED,
            startedAt,
            new Date(),
          );
        } catch (error) {
          await recordJob(
            queueName,
            job.id ?? `${queueName}:${job.name}`,
            job.name,
            BackgroundJobStatus.FAILED,
            startedAt,
            new Date(),
            error instanceof Error ? error.message : "Worker job failed",
          );
          throw error;
        }
      },
      {
        connection,
        prefix: "campustest",
        concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
      },
    ),
);

const sweepInterval = setInterval(() => {
  void sweepExpiredAttempts().catch((error: unknown) => {
    log("error", "expiry sweep failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  });
}, 30000);

void sweepExpiredAttempts();
void writeHeartbeat();
const heartbeatInterval = setInterval(
  () => {
    void writeHeartbeat().catch((error: unknown) => {
      log("error", "worker heartbeat failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    });
  },
  Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? 15000),
);
log("info", "CampusTest worker started", { queues: queueNames.join(",") });

async function writeHeartbeat(): Promise<void> {
  const ttlMs = Number(process.env.WORKER_HEARTBEAT_TTL_MS ?? 60000);
  await prisma.workerHeartbeat.upsert({
    where: { instanceId },
    update: {
      service: "worker",
      queues: [...queueNames],
      version: process.env.RELEASE_VERSION ?? "0.1.0",
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
      metadata: { pid: process.pid },
    },
    create: {
      instanceId,
      service: "worker",
      queues: [...queueNames],
      version: process.env.RELEASE_VERSION ?? "0.1.0",
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
      metadata: { pid: process.pid },
    },
  });
}

async function sweepExpiredAttempts(): Promise<void> {
  const attempts = await prisma.testAttempt.findMany({
    where: {
      status: TestAttemptStatus.IN_PROGRESS,
      expiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
    orderBy: { expiresAt: "asc" },
  });
  for (const attempt of attempts) {
    await autoSubmitAttempt(attempt.id, `sweep:${String(process.pid)}`);
  }
}

async function autoSubmitAttempt(
  attemptId: string,
  claimedBy: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.testAttempt.updateMany({
      where: {
        id: attemptId,
        status: TestAttemptStatus.IN_PROGRESS,
        expiresAt: { lte: new Date() },
        autoSubmitClaimedAt: null,
      },
      data: { autoSubmitClaimedAt: new Date(), autoSubmitClaimedBy: claimedBy },
    });
    if (claimed.count === 0) {
      return;
    }
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { questions: { include: { answer: true } }, assessment: true },
    });
    const answerCount = attempt.questions.filter(
      (question) => question.answer && isAnswered(question.answer),
    ).length;
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
        unansweredCount: attempt.questions.length - answerCount,
        status: TestAttemptStatus.AUTO_SUBMITTED,
      },
    });
    await calculateResultTx(tx, attemptId);
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
  });
}

async function calculateResult(attemptId: string): Promise<void> {
  await prisma.$transaction((tx) => calculateResultTx(tx, attemptId));
}

async function calculateResultTx(
  tx: Prisma.TransactionClient,
  attemptId: string,
): Promise<void> {
  const attempt = await tx.testAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { questions: { include: { answer: true } }, assessment: true },
  });
  let objectiveScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let attemptedCount = 0;
  for (const question of attempt.questions) {
    const answer = question.answer;
    const answered = answer ? isAnswered(answer) : false;
    if (!answered) {
      unansweredCount += 1;
    } else {
      attemptedCount += 1;
    }
    if (objectiveTypes.has(question.questionType)) {
      const evaluation = evaluateObjective(question, answer);
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
  const reviews = await tx.manualReviewTask.findMany({ where: { attemptId } });
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
  const percentage =
    attempt.assessment.totalMarks > 0
      ? Number(((totalScore / attempt.assessment.totalMarks) * 100).toFixed(2))
      : 0;
  const passStatus =
    attempt.assessment.passingMarks === null
      ? PassStatus.PENDING
      : totalScore >= attempt.assessment.passingMarks
        ? PassStatus.PASS
        : PassStatus.FAIL;
  await tx.result.upsert({
    where: { attemptId },
    update: {
      objectiveScore,
      descriptiveScore,
      totalScore,
      percentage,
      passStatus,
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
      percentage,
      passStatus,
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
      percentage,
      passStatus,
      status: pendingReview
        ? TestAttemptStatus.UNDER_REVIEW
        : TestAttemptStatus.EVALUATED,
    },
  });
}

const objectiveTypes = new Set<QuestionType>([
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.FILL_IN_THE_BLANK,
  QuestionType.NUMERICAL,
]);

function evaluateObjective(
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
  const metadata = objectRecord(question.evaluatorMetadata);
  const correct = stringArray(metadata.correctOptionKeys).sort();
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
    isCorrect = stringArray(metadata.acceptedAnswers).some(
      (item) => item.trim().toLocaleLowerCase() === normalized,
    );
  } else if (question.questionType === QuestionType.NUMERICAL) {
    const expected = Number(metadata.numericalAnswer);
    const actual =
      answer?.numericalAnswer === null || answer?.numericalAnswer === undefined
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
    evaluationDetails: { policy: "worker-idempotent-exact-match" },
  };
}

function isAnswered(answer: {
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

function objectRecord(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function jobData(data: unknown): { attemptId: string } {
  if (
    data &&
    typeof data === "object" &&
    "attemptId" in data &&
    typeof data.attemptId === "string"
  ) {
    return { attemptId: data.attemptId };
  }
  throw new Error("Worker job payload is missing attemptId.");
}

async function recordJob(
  queueName: string,
  jobId: string,
  jobName: string,
  status: BackgroundJobStatus,
  startedAt?: Date,
  finishedAt?: Date,
  error?: string,
): Promise<void> {
  await prisma.backgroundJobRecord.upsert({
    where: { queueName_jobId: { queueName, jobId } },
    update: { status, startedAt, finishedAt, error },
    create: { queueName, jobId, jobName, status, startedAt, finishedAt, error },
  });
}

function log(
  level: "info" | "error",
  message: string,
  metadata: Record<string, string> = {},
): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "worker",
      message,
      ...metadata,
    }),
  );
}

async function shutdown(): Promise<void> {
  clearInterval(sweepInterval);
  clearInterval(heartbeatInterval);
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(queues.map((queue) => queue.close()));
  await connection.quit();
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});
