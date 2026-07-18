CREATE TYPE "ResultVisibility" AS ENUM ('NEVER', 'AFTER_SUBMISSION', 'AFTER_END', 'SCHEDULED');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'NUMERICAL', 'SHORT_ANSWER', 'DESCRIPTIVE', 'CODING');
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "TestCaseVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_DUPLICATE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_ACTIVATE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_DEACTIVATE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_ARCHIVE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_DELETE';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_IMPORT';
ALTER TYPE "AuditEvent" ADD VALUE 'QUESTION_EXPORT';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_DUPLICATE';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_PUBLISH';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_SCHEDULE';
ALTER TYPE "AuditEvent" ADD VALUE 'ASSESSMENT_CANCEL';

ALTER TYPE "AssessmentStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "AssessmentStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "AssessmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "AssessmentStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "Assessment" ADD COLUMN "allowBackNavigation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowSectionNavigation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "collegeId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "description" TEXT,
ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "endAt" TIMESTAMP(3),
ADD COLUMN "fullscreenPreferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "instructions" TEXT,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "negativeMarkingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passingMarks" DOUBLE PRECISION,
ADD COLUMN "resultPublishAt" TIMESTAMP(3),
ADD COLUMN "resultVisibility" "ResultVisibility" NOT NULL DEFAULT 'AFTER_END',
ADD COLUMN "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "totalMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "updatedById" TEXT,
ALTER COLUMN "opensAt" DROP NOT NULL,
ALTER COLUMN "closesAt" DROP NOT NULL,
ALTER COLUMN "durationMin" DROP NOT NULL,
ALTER COLUMN "courseId" DROP NOT NULL;

ALTER TABLE "Question" ADD COLUMN "collegeId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "defaultMarks" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "defaultNegativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "explanation" TEXT,
ADD COLUMN "language" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "questionText" TEXT,
ADD COLUMN "questionType" "QuestionType",
ADD COLUMN "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "title" TEXT,
ADD COLUMN "topic" TEXT,
ADD COLUMN "updatedById" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "prompt" DROP NOT NULL,
ALTER COLUMN "points" DROP NOT NULL,
ALTER COLUMN "order" DROP NOT NULL,
ALTER COLUMN "assessmentId" DROP NOT NULL;

CREATE TABLE "QuestionOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionText" TEXT NOT NULL,
  "optionKey" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "explanation" TEXT,
  "mediaMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionTag" (
  "questionId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
);

CREATE TABLE "CodingQuestion" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "problemStatement" TEXT NOT NULL,
  "inputFormat" TEXT,
  "outputFormat" TEXT,
  "constraints" TEXT,
  "examples" JSONB,
  "timeLimitMs" INTEGER NOT NULL,
  "memoryLimitMb" INTEGER NOT NULL,
  "allowedLanguages" TEXT[],
  "starterCode" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestCase" (
  "id" TEXT NOT NULL,
  "codingQuestionId" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "expectedOutput" TEXT NOT NULL,
  "visibility" "TestCaseVisibility" NOT NULL DEFAULT 'PUBLIC',
  "scoreWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "displayOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionAttachment" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionImportJob" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "fileName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "preview" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionImportError" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "rowData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionImportError_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentSection" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "displayOrder" INTEGER NOT NULL,
  "durationLimitMinutes" INTEGER,
  "questionCountRule" JSONB,
  "marksRule" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentQuestion" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "sectionId" TEXT,
  "questionId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "assignedMarks" DOUBLE PRECISION NOT NULL,
  "assignedNegativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mandatory" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentAssignment" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "departmentId" TEXT,
  "courseId" TEXT,
  "semesterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentBatchAssignment" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentBatchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentStudentAssignment" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentStudentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");
CREATE UNIQUE INDEX "QuestionOption_questionId_optionKey_key" ON "QuestionOption"("questionId", "optionKey");
CREATE INDEX "Tag_collegeId_idx" ON "Tag"("collegeId");
CREATE UNIQUE INDEX "Tag_collegeId_slug_key" ON "Tag"("collegeId", "slug");
CREATE INDEX "QuestionTag_tagId_idx" ON "QuestionTag"("tagId");
CREATE UNIQUE INDEX "CodingQuestion_questionId_key" ON "CodingQuestion"("questionId");
CREATE INDEX "TestCase_codingQuestionId_idx" ON "TestCase"("codingQuestionId");
CREATE INDEX "TestCase_visibility_idx" ON "TestCase"("visibility");
CREATE INDEX "QuestionAttachment_questionId_idx" ON "QuestionAttachment"("questionId");
CREATE INDEX "QuestionImportJob_collegeId_idx" ON "QuestionImportJob"("collegeId");
CREATE INDEX "QuestionImportJob_createdById_idx" ON "QuestionImportJob"("createdById");
CREATE INDEX "QuestionImportError_jobId_idx" ON "QuestionImportError"("jobId");
CREATE INDEX "AssessmentSection_assessmentId_idx" ON "AssessmentSection"("assessmentId");
CREATE UNIQUE INDEX "AssessmentSection_assessmentId_displayOrder_key" ON "AssessmentSection"("assessmentId", "displayOrder");
CREATE INDEX "AssessmentQuestion_sectionId_idx" ON "AssessmentQuestion"("sectionId");
CREATE INDEX "AssessmentQuestion_questionId_idx" ON "AssessmentQuestion"("questionId");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_displayOrder_key" ON "AssessmentQuestion"("assessmentId", "displayOrder");
CREATE INDEX "AssessmentAssignment_assessmentId_idx" ON "AssessmentAssignment"("assessmentId");
CREATE UNIQUE INDEX "AssessmentAssignment_assessmentId_departmentId_courseId_sem_key" ON "AssessmentAssignment"("assessmentId", "departmentId", "courseId", "semesterId");
CREATE INDEX "AssessmentBatchAssignment_batchId_idx" ON "AssessmentBatchAssignment"("batchId");
CREATE UNIQUE INDEX "AssessmentBatchAssignment_assessmentId_batchId_key" ON "AssessmentBatchAssignment"("assessmentId", "batchId");
CREATE INDEX "AssessmentStudentAssignment_studentProfileId_idx" ON "AssessmentStudentAssignment"("studentProfileId");
CREATE UNIQUE INDEX "AssessmentStudentAssignment_assessmentId_studentProfileId_key" ON "AssessmentStudentAssignment"("assessmentId", "studentProfileId");
CREATE INDEX "Assessment_collegeId_idx" ON "Assessment"("collegeId");
CREATE INDEX "Assessment_subjectId_idx" ON "Assessment"("subjectId");
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");
CREATE INDEX "Assessment_createdById_idx" ON "Assessment"("createdById");
CREATE INDEX "Assessment_deletedAt_idx" ON "Assessment"("deletedAt");
CREATE INDEX "Question_collegeId_idx" ON "Question"("collegeId");
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");
CREATE INDEX "Question_questionType_idx" ON "Question"("questionType");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX "Question_status_idx" ON "Question"("status");
CREATE INDEX "Question_createdById_idx" ON "Question"("createdById");
CREATE INDEX "Question_deletedAt_idx" ON "Question"("deletedAt");

ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionTag" ADD CONSTRAINT "QuestionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingQuestion" ADD CONSTRAINT "CodingQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttachment" ADD CONSTRAINT "QuestionAttachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionImportError" ADD CONSTRAINT "QuestionImportError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "QuestionImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentSection" ADD CONSTRAINT "AssessmentSection_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentBatchAssignment" ADD CONSTRAINT "AssessmentBatchAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentBatchAssignment" ADD CONSTRAINT "AssessmentBatchAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentStudentAssignment" ADD CONSTRAINT "AssessmentStudentAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentStudentAssignment" ADD CONSTRAINT "AssessmentStudentAssignment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
