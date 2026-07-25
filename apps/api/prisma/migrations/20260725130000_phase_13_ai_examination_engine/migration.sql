-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AI_GENERATION_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'AI_GENERATION_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_IMPORT_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'AI_REVIEW_PENDING';

-- CreateTable
CREATE TABLE "AiBatchGeneration" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "subjectId" TEXT,
    "departmentId" TEXT,
    "semesterId" TEXT,
    "topic" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AiGenerationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "options" JSONB,
    "jobIds" TEXT[],
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiBatchGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneratedPaperSet" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "requestedById" TEXT NOT NULL,
    "subjectId" TEXT,
    "setCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionIds" TEXT[],
    "blueprint" JSONB,
    "analytics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneratedPaperSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiBatchGeneration_collegeId_idx" ON "AiBatchGeneration"("collegeId");

-- CreateIndex
CREATE INDEX "AiBatchGeneration_requestedById_idx" ON "AiBatchGeneration"("requestedById");

-- CreateIndex
CREATE INDEX "AiBatchGeneration_subjectId_idx" ON "AiBatchGeneration"("subjectId");

-- CreateIndex
CREATE INDEX "AiBatchGeneration_status_idx" ON "AiBatchGeneration"("status");

-- CreateIndex
CREATE INDEX "AiBatchGeneration_createdAt_idx" ON "AiBatchGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "AiGeneratedPaperSet_collegeId_idx" ON "AiGeneratedPaperSet"("collegeId");

-- CreateIndex
CREATE INDEX "AiGeneratedPaperSet_assessmentId_idx" ON "AiGeneratedPaperSet"("assessmentId");

-- CreateIndex
CREATE INDEX "AiGeneratedPaperSet_requestedById_idx" ON "AiGeneratedPaperSet"("requestedById");

-- CreateIndex
CREATE INDEX "AiGeneratedPaperSet_subjectId_idx" ON "AiGeneratedPaperSet"("subjectId");

