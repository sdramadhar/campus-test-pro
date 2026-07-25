-- CreateEnum
CREATE TYPE "BloomLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "AiGenerationJobStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SAVED');

-- CreateEnum
CREATE TYPE "AiDecisionType" AS ENUM ('APPROVE', 'REJECT', 'REGENERATE', 'EDIT', 'SAVE_TO_BANK');

-- CreateEnum
CREATE TYPE "AiPromptFeatureType" AS ENUM ('QUESTION_GENERATION', 'QUESTION_EXTRACTION', 'ANSWER_EXPLANATION', 'DUPLICATE_REVIEW', 'DIFFICULTY_CLASSIFICATION', 'BLOOM_CLASSIFICATION', 'SYLLABUS_MAPPING');

-- CreateEnum
CREATE TYPE "DocumentImportStatus" AS ENUM ('UPLOADED', 'EXTRACTING', 'EXTRACTED', 'OCR_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DuplicateReviewStatus" AS ENUM ('PENDING', 'KEEP_BOTH', 'MERGED', 'REJECT_NEW', 'NOT_DUPLICATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'AI_GENERATION_REQUEST';
ALTER TYPE "AuditEvent" ADD VALUE 'AI_GENERATION_COMPLETE';
ALTER TYPE "AuditEvent" ADD VALUE 'AI_GENERATION_FAILURE';
ALTER TYPE "AuditEvent" ADD VALUE 'AI_REVIEW_DECISION';
ALTER TYPE "AuditEvent" ADD VALUE 'AI_PROMPT_TEMPLATE_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'DOCUMENT_IMPORT_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'DOCUMENT_IMPORT_PROCESS';
ALTER TYPE "AuditEvent" ADD VALUE 'DOCUMENT_IMPORT_APPROVE';
ALTER TYPE "AuditEvent" ADD VALUE 'DUPLICATE_REVIEW';
ALTER TYPE "AuditEvent" ADD VALUE 'SYLLABUS_UPDATE';

-- CreateTable
CREATE TABLE "AiGenerationJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "subjectId" TEXT,
    "topic" TEXT NOT NULL,
    "unit" TEXT,
    "questionType" "QuestionType" NOT NULL,
    "difficulty" "QuestionDifficulty",
    "bloomLevel" "BloomLevel",
    "requestedCount" INTEGER NOT NULL,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "estimatedTokens" INTEGER,
    "actualTokens" INTEGER,
    "estimatedCostMetadata" JSONB,
    "status" "AiGenerationJobStatus" NOT NULL DEFAULT 'DRAFT',
    "errorSummary" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "syllabusText" TEXT,
    "sourceNotes" TEXT,
    "courseId" TEXT,
    "semesterId" TEXT,
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'English',
    "explanationRequired" BOOLEAN NOT NULL DEFAULT true,
    "answerKeyRequired" BOOLEAN NOT NULL DEFAULT true,
    "outputStyle" TEXT,
    "avoidDuplicate" BOOLEAN NOT NULL DEFAULT true,
    "promptTemplateId" TEXT,
    "promptVariables" JSONB,
    "promptPreview" TEXT,
    "sanitizedPromptHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "questionId" TEXT,
    "reviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "questionType" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "explanation" TEXT,
    "suggestedDifficulty" "QuestionDifficulty",
    "approvedDifficulty" "QuestionDifficulty",
    "measuredDifficulty" "QuestionDifficulty",
    "suggestedBloomLevel" "BloomLevel",
    "approvedBloomLevel" "BloomLevel",
    "suggestedTopic" TEXT,
    "tags" TEXT[],
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warnings" TEXT[],
    "confidence" DOUBLE PRECISION,
    "duplicateCandidate" BOOLEAN NOT NULL DEFAULT false,
    "similarityScore" DOUBLE PRECISION,
    "duplicateReason" TEXT,
    "reviewerChanges" JSONB,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReviewDecision" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resultId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "decision" "AiDecisionType" NOT NULL,
    "reason" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "userId" TEXT,
    "jobId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL,
    "failureSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPromptTemplate" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "name" TEXT NOT NULL,
    "featureType" "AiPromptFeatureType" NOT NULL,
    "systemInstruction" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "variables" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "providerCompatibility" TEXT[],
    "createdById" TEXT,
    "updatedById" TEXT,
    "versionHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderFailure" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "normalizedCode" TEXT NOT NULL,
    "sanitizedError" TEXT NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 1,
    "disabledUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentImportJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "subjectId" TEXT,
    "status" "DocumentImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "extractedChars" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedDocument" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "retentionUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "sheetName" TEXT,
    "rowNumber" INTEGER,
    "paragraph" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "textPreview" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedQuestionCandidate" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "questionId" TEXT,
    "reviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "sourceReference" JSONB NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "explanation" TEXT,
    "suggestedSubjectId" TEXT,
    "suggestedTopic" TEXT,
    "suggestedDifficulty" "QuestionDifficulty",
    "approvedDifficulty" "QuestionDifficulty",
    "suggestedBloomLevel" "BloomLevel",
    "approvedBloomLevel" "BloomLevel",
    "validationIssues" TEXT[],
    "warnings" TEXT[],
    "confidence" DOUBLE PRECISION,
    "duplicateCandidate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedQuestionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportValidationError" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "location" JSONB,
    "message" TEXT NOT NULL,
    "rowData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionDuplicateCandidate" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "newQuestionId" TEXT,
    "existingQuestionId" TEXT,
    "normalizedQuestionHash" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "duplicateReason" TEXT NOT NULL,
    "reviewedStatus" "DuplicateReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionDuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "courseId" TEXT,
    "semesterId" TEXT,
    "subjectId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "learningOutcomes" TEXT[],
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusUnit" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "outcomes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusTopic" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "description" TEXT,
    "outcomes" TEXT[],
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentBlueprint" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "unit" TEXT,
    "topic" TEXT,
    "questionType" "QuestionType",
    "difficulty" "QuestionDifficulty",
    "bloomLevel" "BloomLevel",
    "questionCount" INTEGER NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "autoRecommend" BOOLEAN NOT NULL DEFAULT false,
    "generateMissing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGenerationJob_collegeId_idx" ON "AiGenerationJob"("collegeId");

-- CreateIndex
CREATE INDEX "AiGenerationJob_requestedById_idx" ON "AiGenerationJob"("requestedById");

-- CreateIndex
CREATE INDEX "AiGenerationJob_subjectId_idx" ON "AiGenerationJob"("subjectId");

-- CreateIndex
CREATE INDEX "AiGenerationJob_status_idx" ON "AiGenerationJob"("status");

-- CreateIndex
CREATE INDEX "AiGenerationJob_createdAt_idx" ON "AiGenerationJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiGenerationRequest_jobId_key" ON "AiGenerationRequest"("jobId");

-- CreateIndex
CREATE INDEX "AiGenerationResult_jobId_idx" ON "AiGenerationResult"("jobId");

-- CreateIndex
CREATE INDEX "AiGenerationResult_questionId_idx" ON "AiGenerationResult"("questionId");

-- CreateIndex
CREATE INDEX "AiGenerationResult_reviewStatus_idx" ON "AiGenerationResult"("reviewStatus");

-- CreateIndex
CREATE INDEX "AiReviewDecision_jobId_idx" ON "AiReviewDecision"("jobId");

-- CreateIndex
CREATE INDEX "AiReviewDecision_resultId_idx" ON "AiReviewDecision"("resultId");

-- CreateIndex
CREATE INDEX "AiReviewDecision_reviewerId_idx" ON "AiReviewDecision"("reviewerId");

-- CreateIndex
CREATE INDEX "AiUsageRecord_collegeId_idx" ON "AiUsageRecord"("collegeId");

-- CreateIndex
CREATE INDEX "AiUsageRecord_userId_idx" ON "AiUsageRecord"("userId");

-- CreateIndex
CREATE INDEX "AiUsageRecord_jobId_idx" ON "AiUsageRecord"("jobId");

-- CreateIndex
CREATE INDEX "AiUsageRecord_createdAt_idx" ON "AiUsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AiPromptTemplate_collegeId_idx" ON "AiPromptTemplate"("collegeId");

-- CreateIndex
CREATE INDEX "AiPromptTemplate_featureType_idx" ON "AiPromptTemplate"("featureType");

-- CreateIndex
CREATE INDEX "AiPromptTemplate_active_idx" ON "AiPromptTemplate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "AiPromptTemplate_collegeId_name_version_key" ON "AiPromptTemplate"("collegeId", "name", "version");

-- CreateIndex
CREATE INDEX "AiProviderFailure_collegeId_idx" ON "AiProviderFailure"("collegeId");

-- CreateIndex
CREATE INDEX "AiProviderFailure_provider_idx" ON "AiProviderFailure"("provider");

-- CreateIndex
CREATE INDEX "AiProviderFailure_disabledUntil_idx" ON "AiProviderFailure"("disabledUntil");

-- CreateIndex
CREATE INDEX "DocumentImportJob_collegeId_idx" ON "DocumentImportJob"("collegeId");

-- CreateIndex
CREATE INDEX "DocumentImportJob_requestedById_idx" ON "DocumentImportJob"("requestedById");

-- CreateIndex
CREATE INDEX "DocumentImportJob_subjectId_idx" ON "DocumentImportJob"("subjectId");

-- CreateIndex
CREATE INDEX "DocumentImportJob_status_idx" ON "DocumentImportJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedDocument_jobId_key" ON "ImportedDocument"("jobId");

-- CreateIndex
CREATE INDEX "ImportedDocument_collegeId_idx" ON "ImportedDocument"("collegeId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ExtractedQuestionCandidate_jobId_idx" ON "ExtractedQuestionCandidate"("jobId");

-- CreateIndex
CREATE INDEX "ExtractedQuestionCandidate_questionId_idx" ON "ExtractedQuestionCandidate"("questionId");

-- CreateIndex
CREATE INDEX "ExtractedQuestionCandidate_reviewStatus_idx" ON "ExtractedQuestionCandidate"("reviewStatus");

-- CreateIndex
CREATE INDEX "ImportValidationError_jobId_idx" ON "ImportValidationError"("jobId");

-- CreateIndex
CREATE INDEX "QuestionDuplicateCandidate_collegeId_idx" ON "QuestionDuplicateCandidate"("collegeId");

-- CreateIndex
CREATE INDEX "QuestionDuplicateCandidate_newQuestionId_idx" ON "QuestionDuplicateCandidate"("newQuestionId");

-- CreateIndex
CREATE INDEX "QuestionDuplicateCandidate_existingQuestionId_idx" ON "QuestionDuplicateCandidate"("existingQuestionId");

-- CreateIndex
CREATE INDEX "QuestionDuplicateCandidate_normalizedQuestionHash_idx" ON "QuestionDuplicateCandidate"("normalizedQuestionHash");

-- CreateIndex
CREATE INDEX "QuestionDuplicateCandidate_reviewedStatus_idx" ON "QuestionDuplicateCandidate"("reviewedStatus");

-- CreateIndex
CREATE INDEX "Syllabus_collegeId_idx" ON "Syllabus"("collegeId");

-- CreateIndex
CREATE INDEX "Syllabus_subjectId_idx" ON "Syllabus"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Syllabus_collegeId_subjectId_academicYear_version_key" ON "Syllabus"("collegeId", "subjectId", "academicYear", "version");

-- CreateIndex
CREATE INDEX "SyllabusUnit_syllabusId_idx" ON "SyllabusUnit"("syllabusId");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusUnit_syllabusId_unitNumber_key" ON "SyllabusUnit"("syllabusId", "unitNumber");

-- CreateIndex
CREATE INDEX "SyllabusTopic_unitId_idx" ON "SyllabusTopic"("unitId");

-- CreateIndex
CREATE INDEX "AssessmentBlueprint_collegeId_idx" ON "AssessmentBlueprint"("collegeId");

-- CreateIndex
CREATE INDEX "AssessmentBlueprint_assessmentId_idx" ON "AssessmentBlueprint"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentBlueprint_subjectId_idx" ON "AssessmentBlueprint"("subjectId");

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationJob" ADD CONSTRAINT "AiGenerationJob_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationRequest" ADD CONSTRAINT "AiGenerationRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationResult" ADD CONSTRAINT "AiGenerationResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationResult" ADD CONSTRAINT "AiGenerationResult_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReviewDecision" ADD CONSTRAINT "AiReviewDecision_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReviewDecision" ADD CONSTRAINT "AiReviewDecision_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AiGenerationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReviewDecision" ADD CONSTRAINT "AiReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageRecord" ADD CONSTRAINT "AiUsageRecord_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageRecord" ADD CONSTRAINT "AiUsageRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AiGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPromptTemplate" ADD CONSTRAINT "AiPromptTemplate_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPromptTemplate" ADD CONSTRAINT "AiPromptTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPromptTemplate" ADD CONSTRAINT "AiPromptTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProviderFailure" ADD CONSTRAINT "AiProviderFailure_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportJob" ADD CONSTRAINT "DocumentImportJob_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportJob" ADD CONSTRAINT "DocumentImportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportJob" ADD CONSTRAINT "DocumentImportJob_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedDocument" ADD CONSTRAINT "ImportedDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedDocument" ADD CONSTRAINT "ImportedDocument_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ImportedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedQuestionCandidate" ADD CONSTRAINT "ExtractedQuestionCandidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedQuestionCandidate" ADD CONSTRAINT "ExtractedQuestionCandidate_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationError" ADD CONSTRAINT "ImportValidationError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionDuplicateCandidate" ADD CONSTRAINT "QuestionDuplicateCandidate_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionDuplicateCandidate" ADD CONSTRAINT "QuestionDuplicateCandidate_newQuestionId_fkey" FOREIGN KEY ("newQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionDuplicateCandidate" ADD CONSTRAINT "QuestionDuplicateCandidate_existingQuestionId_fkey" FOREIGN KEY ("existingQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusUnit" ADD CONSTRAINT "SyllabusUnit_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SyllabusUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentBlueprint" ADD CONSTRAINT "AssessmentBlueprint_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentBlueprint" ADD CONSTRAINT "AssessmentBlueprint_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentBlueprint" ADD CONSTRAINT "AssessmentBlueprint_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

