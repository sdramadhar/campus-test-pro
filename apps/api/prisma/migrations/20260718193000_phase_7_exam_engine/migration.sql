-- CreateEnum
CREATE TYPE "TestAttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'CANCELLED', 'UNDER_REVIEW', 'EVALUATED');

-- CreateEnum
CREATE TYPE "PassStatus" AS ENUM ('PENDING', 'PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "ManualReviewStatus" AS ENUM ('PENDING', 'ASSIGNED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptSecurityEventType" AS ENUM ('TAB_HIDDEN', 'FULLSCREEN_EXIT', 'RECONNECT', 'DISCONNECT', 'COPY', 'PASTE', 'TEST_START', 'ANSWER_SAVE_FAILURE', 'LATE_SUBMISSION', 'DUPLICATE_SESSION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'ATTEMPT_START';
ALTER TYPE "AuditEvent" ADD VALUE 'ANSWER_SAVE';
ALTER TYPE "AuditEvent" ADD VALUE 'ATTEMPT_SUBMIT';
ALTER TYPE "AuditEvent" ADD VALUE 'ATTEMPT_AUTO_SUBMIT';
ALTER TYPE "AuditEvent" ADD VALUE 'RESULT_PUBLISH';
ALTER TYPE "AuditEvent" ADD VALUE 'RESULT_UNPUBLISH';
ALTER TYPE "AuditEvent" ADD VALUE 'REVIEW_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'ATTEMPT_SECURITY_EVENT';

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "TestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "autoSubmittedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDurationSeconds" INTEGER,
    "clientStartMetadata" JSONB,
    "finalScore" DOUBLE PRECISION,
    "objectiveScore" DOUBLE PRECISION,
    "descriptiveScore" DOUBLE PRECISION,
    "codingScore" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "passStatus" "PassStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "sessionKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSection" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "originalSectionId" TEXT,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "durationLimitMinutes" INTEGER,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assessmentQuestionId" TEXT,
    "originalQuestionId" TEXT,
    "sectionId" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "questionTextSnapshot" TEXT NOT NULL,
    "optionsSnapshot" JSONB,
    "assignedMarks" DOUBLE PRECISION NOT NULL,
    "assignedNegativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "randomizedOptionOrder" JSONB,
    "safeMetadataSnapshot" JSONB,
    "evaluatorMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "answerPayload" JSONB,
    "selectedOptionKeys" TEXT[],
    "textAnswer" TEXT,
    "numericalAnswer" DECIMAL(65,30),
    "codingSubmissionRef" TEXT,
    "markedForReview" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "saveStatusMetadata" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerRevision" (
    "id" TEXT NOT NULL,
    "studentAnswerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "answerPayload" JSONB,
    "selectedOptionKeys" TEXT[],
    "textAnswer" TEXT,
    "numericalAnswer" DECIMAL(65,30),
    "markedForReview" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionReceipt" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "answerCount" INTEGER NOT NULL,
    "unansweredCount" INTEGER NOT NULL,
    "status" "TestAttemptStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "objectiveScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descriptiveScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "passStatus" "PassStatus" NOT NULL DEFAULT 'PENDING',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "unansweredCount" INTEGER NOT NULL DEFAULT 0,
    "attemptedCount" INTEGER NOT NULL DEFAULT 0,
    "timeTakenSeconds" INTEGER,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionResult" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "attemptSectionId" TEXT,
    "sectionName" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awardedMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "unansweredCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveAnswerEvaluation" (
    "id" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "studentAnswerId" TEXT,
    "isCorrect" BOOLEAN,
    "awardedMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "negativeMarksApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evaluationDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectiveAnswerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualReviewTask" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "assignedReviewerId" TEXT,
    "status" "ManualReviewStatus" NOT NULL DEFAULT 'PENDING',
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "awardedMarks" DOUBLE PRECISION,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSecurityFlag" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "eventType" "AttemptSecurityEventType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptSecurityFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestAttempt_collegeId_status_idx" ON "TestAttempt"("collegeId", "status");

-- CreateIndex
CREATE INDEX "TestAttempt_studentId_assessmentId_idx" ON "TestAttempt"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "TestAttempt_assessmentId_status_idx" ON "TestAttempt"("assessmentId", "status");

-- CreateIndex
CREATE INDEX "TestAttempt_expiresAt_idx" ON "TestAttempt"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestAttempt_assessmentId_studentId_attemptNumber_key" ON "TestAttempt"("assessmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TestAttempt_idempotencyKey_key" ON "TestAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AttemptSection_attemptId_idx" ON "AttemptSection"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSection_attemptId_displayOrder_key" ON "AttemptSection"("attemptId", "displayOrder");

-- CreateIndex
CREATE INDEX "AttemptQuestion_attemptId_idx" ON "AttemptQuestion"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptQuestion_sectionId_idx" ON "AttemptQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "AttemptQuestion_originalQuestionId_idx" ON "AttemptQuestion"("originalQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_displayOrder_key" ON "AttemptQuestion"("attemptId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptQuestionId_key" ON "StudentAnswer"("attemptQuestionId");

-- CreateIndex
CREATE INDEX "StudentAnswer_attemptId_idx" ON "StudentAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "StudentAnswer_idempotencyKey_idx" ON "StudentAnswer"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAnswer_attemptId_attemptQuestionId_key" ON "StudentAnswer"("attemptId", "attemptQuestionId");

-- CreateIndex
CREATE INDEX "AnswerRevision_studentAnswerId_idx" ON "AnswerRevision"("studentAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerRevision_studentAnswerId_version_key" ON "AnswerRevision"("studentAnswerId", "version");

-- CreateIndex
CREATE INDEX "AttemptEvent_attemptId_idx" ON "AttemptEvent"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptEvent_eventType_idx" ON "AttemptEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionReceipt_attemptId_key" ON "SubmissionReceipt"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionReceipt_receiptNumber_key" ON "SubmissionReceipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Result_attemptId_key" ON "Result"("attemptId");

-- CreateIndex
CREATE INDEX "Result_collegeId_idx" ON "Result"("collegeId");

-- CreateIndex
CREATE INDEX "Result_assessmentId_idx" ON "Result"("assessmentId");

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Result_isPublished_idx" ON "Result"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Result_assessmentId_studentId_attemptId_key" ON "Result"("assessmentId", "studentId", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionResult_attemptSectionId_key" ON "SectionResult"("attemptSectionId");

-- CreateIndex
CREATE INDEX "SectionResult_resultId_idx" ON "SectionResult"("resultId");

-- CreateIndex
CREATE INDEX "ObjectiveAnswerEvaluation_studentAnswerId_idx" ON "ObjectiveAnswerEvaluation"("studentAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveAnswerEvaluation_attemptQuestionId_key" ON "ObjectiveAnswerEvaluation"("attemptQuestionId");

-- CreateIndex
CREATE INDEX "ManualReviewTask_attemptId_idx" ON "ManualReviewTask"("attemptId");

-- CreateIndex
CREATE INDEX "ManualReviewTask_assignedReviewerId_idx" ON "ManualReviewTask"("assignedReviewerId");

-- CreateIndex
CREATE INDEX "ManualReviewTask_status_idx" ON "ManualReviewTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ManualReviewTask_attemptId_attemptQuestionId_key" ON "ManualReviewTask"("attemptId", "attemptQuestionId");

-- CreateIndex
CREATE INDEX "AttemptSecurityFlag_attemptId_idx" ON "AttemptSecurityFlag"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptSecurityFlag_eventType_idx" ON "AttemptSecurityFlag"("eventType");

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSection" ADD CONSTRAINT "AttemptSection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSection" ADD CONSTRAINT "AttemptSection_originalSectionId_fkey" FOREIGN KEY ("originalSectionId") REFERENCES "AssessmentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AttemptSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerRevision" ADD CONSTRAINT "AnswerRevision_studentAnswerId_fkey" FOREIGN KEY ("studentAnswerId") REFERENCES "StudentAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptEvent" ADD CONSTRAINT "AttemptEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReceipt" ADD CONSTRAINT "SubmissionReceipt_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResult" ADD CONSTRAINT "SectionResult_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResult" ADD CONSTRAINT "SectionResult_attemptSectionId_fkey" FOREIGN KEY ("attemptSectionId") REFERENCES "AttemptSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveAnswerEvaluation" ADD CONSTRAINT "ObjectiveAnswerEvaluation_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveAnswerEvaluation" ADD CONSTRAINT "ObjectiveAnswerEvaluation_studentAnswerId_fkey" FOREIGN KEY ("studentAnswerId") REFERENCES "StudentAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewTask" ADD CONSTRAINT "ManualReviewTask_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewTask" ADD CONSTRAINT "ManualReviewTask_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReviewTask" ADD CONSTRAINT "ManualReviewTask_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSecurityFlag" ADD CONSTRAINT "AttemptSecurityFlag_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
