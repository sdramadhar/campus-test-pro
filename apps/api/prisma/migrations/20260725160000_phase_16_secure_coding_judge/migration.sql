-- CreateEnum
CREATE TYPE "RunnerMode" AS ENUM ('DISABLED', 'MOCK', 'DOCKER_ISOLATED', 'REMOTE_RUNNER');

-- CreateEnum
CREATE TYPE "CodingSubmissionStatus" AS ENUM ('DRAFT', 'QUEUED', 'COMPILING', 'RUNNING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'INTERNAL_ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CheckerType" AS ENUM ('EXACT', 'TRIMMED', 'TOKEN', 'FLOAT_TOLERANCE', 'SPECIAL_JUDGE');

-- CreateEnum
CREATE TYPE "PartialScoringPolicy" AS ENUM ('EQUAL_PER_TEST', 'WEIGHTED_PER_TEST', 'ALL_OR_NOTHING', 'GROUP_BASED');

-- CreateEnum
CREATE TYPE "CodingReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_REVIEW', 'HELD', 'RELEASED', 'OVERRIDDEN', 'INVALIDATED', 'RESTORED');

-- CreateEnum
CREATE TYPE "RunnerJobStatus" AS ENUM ('QUEUED', 'DISPATCHED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'STALE');

-- CreateEnum
CREATE TYPE "PlagiarismJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlagiarismReviewStatus" AS ENUM ('UNREVIEWED', 'CLEARED', 'SUSPICIOUS', 'CONFIRMED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CodeExecutionStatus" ADD VALUE 'QUEUED';
ALTER TYPE "CodeExecutionStatus" ADD VALUE 'PARTIALLY_ACCEPTED';
ALTER TYPE "CodeExecutionStatus" ADD VALUE 'OUTPUT_LIMIT_EXCEEDED';
ALTER TYPE "CodeExecutionStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "CodingQuestion" ADD COLUMN     "checkerType" "CheckerType" NOT NULL DEFAULT 'TRIMMED',
ADD COLUMN     "compilationProfile" JSONB,
ADD COLUMN     "evaluationNotes" TEXT,
ADD COLUMN     "expectedComplexity" TEXT,
ADD COLUMN     "floatTolerance" DOUBLE PRECISION,
ADD COLUMN     "outputLimitBytes" INTEGER NOT NULL DEFAULT 65536,
ADD COLUMN     "processLimit" INTEGER NOT NULL DEFAULT 64,
ADD COLUMN     "referenceSolutionMetadata" JSONB,
ADD COLUMN     "scoringPolicy" "PartialScoringPolicy" NOT NULL DEFAULT 'WEIGHTED_PER_TEST',
ADD COLUMN     "specialJudgeKey" TEXT,
ADD COLUMN     "starterCodeByLanguage" JSONB;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "sampleExplanation" TEXT,
ADD COLUMN     "scorePoints" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProgrammingLanguage" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sourceExtension" TEXT NOT NULL,
    "compilerCommandTemplate" TEXT,
    "runCommandTemplate" TEXT NOT NULL,
    "imageIdentifier" TEXT NOT NULL,
    "defaultTimeLimitMs" INTEGER NOT NULL,
    "defaultMemoryLimitMb" INTEGER NOT NULL,
    "defaultProcessLimit" INTEGER NOT NULL DEFAULT 64,
    "defaultOutputLimitBytes" INTEGER NOT NULL DEFAULT 65536,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "compileRequired" BOOLEAN NOT NULL DEFAULT false,
    "starterCode" TEXT,
    "forbiddenConfigurationPatterns" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammingLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSubmission" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "status" "CodingSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "evaluatedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "publicTestsPassed" INTEGER NOT NULL DEFAULT 0,
    "hiddenTestsPassed" INTEGER NOT NULL DEFAULT 0,
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "executionTimeMs" INTEGER,
    "peakMemoryKb" INTEGER,
    "compilerOutputSanitized" TEXT,
    "latestExecutionId" TEXT,
    "reviewStatus" "CodingReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "heldAt" TIMESTAMP(3),
    "heldById" TEXT,
    "holdReason" TEXT,
    "scoreOverrideReason" TEXT,
    "invalidatedAt" TIMESTAMP(3),
    "invalidatedById" TEXT,
    "invalidationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingExecution" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "runnerJobId" TEXT,
    "mode" "RunnerMode" NOT NULL,
    "status" "CodingSubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "phase" TEXT NOT NULL DEFAULT 'queued',
    "languageId" TEXT NOT NULL,
    "imageIdentifier" TEXT,
    "imageDigest" TEXT,
    "compileStartedAt" TIMESTAMP(3),
    "compileFinishedAt" TIMESTAMP(3),
    "runStartedAt" TIMESTAMP(3),
    "runFinishedAt" TIMESTAMP(3),
    "executionTimeMs" INTEGER,
    "peakMemoryKb" INTEGER,
    "exitCode" INTEGER,
    "stdoutSanitized" TEXT,
    "stderrSanitized" TEXT,
    "compilerOutputSanitized" TEXT,
    "mockResult" BOOLEAN NOT NULL DEFAULT false,
    "auditMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingExecutionTestResult" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "testCaseId" TEXT,
    "visibility" "TestCaseVisibility" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "status" "CodingSubmissionStatus" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "executionTimeMs" INTEGER,
    "peakMemoryKb" INTEGER,
    "outputSanitized" TEXT,
    "errorSanitized" TEXT,
    "checkerType" "CheckerType" NOT NULL,
    "hiddenDetailsRedacted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingExecutionTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSubmissionRevision" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingSubmissionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingEvaluation" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "executionId" TEXT,
    "version" INTEGER NOT NULL,
    "status" "CodingSubmissionStatus" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "policy" "PartialScoringPolicy" NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingReviewTask" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "CodingReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "submissionId" TEXT,
    "executionId" TEXT,
    "queueName" TEXT NOT NULL,
    "mode" "RunnerMode" NOT NULL,
    "status" "RunnerJobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "timeoutMs" INTEGER NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "RunnerJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerFailure" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "runnerJobId" TEXT,
    "mode" "RunnerMode" NOT NULL,
    "failureType" TEXT NOT NULL,
    "messageSanitized" TEXT NOT NULL,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerImageVersion" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "imageIdentifier" TEXT NOT NULL,
    "imageDigest" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "deprecated" BOOLEAN NOT NULL DEFAULT false,
    "immutableTag" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunnerImageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingPlagiarismJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" "PlagiarismJobStatus" NOT NULL DEFAULT 'QUEUED',
    "minSourceBytes" INTEGER NOT NULL DEFAULT 120,
    "comparedCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingPlagiarismJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSimilarityMatch" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "submissionAId" TEXT NOT NULL,
    "submissionBId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "exactHashMatch" BOOLEAN NOT NULL DEFAULT false,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "tokenSimilarity" DOUBLE PRECISION NOT NULL,
    "normalizedSimilarity" DOUBLE PRECISION NOT NULL,
    "matchedRegions" JSONB,
    "starterIgnored" BOOLEAN NOT NULL DEFAULT true,
    "reviewStatus" "PlagiarismReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "reviewerId" TEXT,
    "reviewerReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingSimilarityMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingAuditEvent" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submissionId" TEXT,
    "runnerJobId" TEXT,
    "actorId" TEXT,
    "actorRole" "Role",
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgrammingLanguage_enabled_idx" ON "ProgrammingLanguage"("enabled");

-- CreateIndex
CREATE INDEX "CodingSubmission_collegeId_idx" ON "CodingSubmission"("collegeId");

-- CreateIndex
CREATE INDEX "CodingSubmission_assessmentId_idx" ON "CodingSubmission"("assessmentId");

-- CreateIndex
CREATE INDEX "CodingSubmission_attemptId_idx" ON "CodingSubmission"("attemptId");

-- CreateIndex
CREATE INDEX "CodingSubmission_studentId_idx" ON "CodingSubmission"("studentId");

-- CreateIndex
CREATE INDEX "CodingSubmission_languageId_idx" ON "CodingSubmission"("languageId");

-- CreateIndex
CREATE INDEX "CodingSubmission_status_idx" ON "CodingSubmission"("status");

-- CreateIndex
CREATE INDEX "CodingSubmission_sourceHash_idx" ON "CodingSubmission"("sourceHash");

-- CreateIndex
CREATE INDEX "CodingExecution_collegeId_idx" ON "CodingExecution"("collegeId");

-- CreateIndex
CREATE INDEX "CodingExecution_submissionId_idx" ON "CodingExecution"("submissionId");

-- CreateIndex
CREATE INDEX "CodingExecution_runnerJobId_idx" ON "CodingExecution"("runnerJobId");

-- CreateIndex
CREATE INDEX "CodingExecution_status_idx" ON "CodingExecution"("status");

-- CreateIndex
CREATE INDEX "CodingExecutionTestResult_collegeId_idx" ON "CodingExecutionTestResult"("collegeId");

-- CreateIndex
CREATE INDEX "CodingExecutionTestResult_executionId_idx" ON "CodingExecutionTestResult"("executionId");

-- CreateIndex
CREATE INDEX "CodingExecutionTestResult_submissionId_idx" ON "CodingExecutionTestResult"("submissionId");

-- CreateIndex
CREATE INDEX "CodingExecutionTestResult_visibility_idx" ON "CodingExecutionTestResult"("visibility");

-- CreateIndex
CREATE INDEX "CodingSubmissionRevision_collegeId_idx" ON "CodingSubmissionRevision"("collegeId");

-- CreateIndex
CREATE INDEX "CodingSubmissionRevision_submissionId_idx" ON "CodingSubmissionRevision"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingSubmissionRevision_submissionId_revisionNumber_key" ON "CodingSubmissionRevision"("submissionId", "revisionNumber");

-- CreateIndex
CREATE INDEX "CodingEvaluation_collegeId_idx" ON "CodingEvaluation"("collegeId");

-- CreateIndex
CREATE INDEX "CodingEvaluation_submissionId_idx" ON "CodingEvaluation"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodingEvaluation_submissionId_version_key" ON "CodingEvaluation"("submissionId", "version");

-- CreateIndex
CREATE INDEX "CodingReviewTask_collegeId_idx" ON "CodingReviewTask"("collegeId");

-- CreateIndex
CREATE INDEX "CodingReviewTask_submissionId_idx" ON "CodingReviewTask"("submissionId");

-- CreateIndex
CREATE INDEX "CodingReviewTask_assessmentId_idx" ON "CodingReviewTask"("assessmentId");

-- CreateIndex
CREATE INDEX "CodingReviewTask_status_idx" ON "CodingReviewTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerJob_idempotencyKey_key" ON "RunnerJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RunnerJob_collegeId_idx" ON "RunnerJob"("collegeId");

-- CreateIndex
CREATE INDEX "RunnerJob_submissionId_idx" ON "RunnerJob"("submissionId");

-- CreateIndex
CREATE INDEX "RunnerJob_status_idx" ON "RunnerJob"("status");

-- CreateIndex
CREATE INDEX "RunnerJob_queueName_idx" ON "RunnerJob"("queueName");

-- CreateIndex
CREATE INDEX "RunnerFailure_collegeId_idx" ON "RunnerFailure"("collegeId");

-- CreateIndex
CREATE INDEX "RunnerFailure_runnerJobId_idx" ON "RunnerFailure"("runnerJobId");

-- CreateIndex
CREATE INDEX "RunnerFailure_failureType_idx" ON "RunnerFailure"("failureType");

-- CreateIndex
CREATE INDEX "RunnerImageVersion_languageId_idx" ON "RunnerImageVersion"("languageId");

-- CreateIndex
CREATE INDEX "RunnerImageVersion_active_idx" ON "RunnerImageVersion"("active");

-- CreateIndex
CREATE INDEX "CodingPlagiarismJob_collegeId_idx" ON "CodingPlagiarismJob"("collegeId");

-- CreateIndex
CREATE INDEX "CodingPlagiarismJob_assessmentId_idx" ON "CodingPlagiarismJob"("assessmentId");

-- CreateIndex
CREATE INDEX "CodingPlagiarismJob_status_idx" ON "CodingPlagiarismJob"("status");

-- CreateIndex
CREATE INDEX "CodingSimilarityMatch_collegeId_idx" ON "CodingSimilarityMatch"("collegeId");

-- CreateIndex
CREATE INDEX "CodingSimilarityMatch_jobId_idx" ON "CodingSimilarityMatch"("jobId");

-- CreateIndex
CREATE INDEX "CodingSimilarityMatch_assessmentId_idx" ON "CodingSimilarityMatch"("assessmentId");

-- CreateIndex
CREATE INDEX "CodingSimilarityMatch_reviewStatus_idx" ON "CodingSimilarityMatch"("reviewStatus");

-- CreateIndex
CREATE INDEX "CodingAuditEvent_collegeId_idx" ON "CodingAuditEvent"("collegeId");

-- CreateIndex
CREATE INDEX "CodingAuditEvent_submissionId_idx" ON "CodingAuditEvent"("submissionId");

-- CreateIndex
CREATE INDEX "CodingAuditEvent_runnerJobId_idx" ON "CodingAuditEvent"("runnerJobId");

-- CreateIndex
CREATE INDEX "CodingAuditEvent_eventType_idx" ON "CodingAuditEvent"("eventType");
