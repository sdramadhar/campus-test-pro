-- CreateEnum
CREATE TYPE "AnalyticsJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportJobStatus" AS ENUM ('DRAFT', 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportOutputFormat" AS ENUM ('CSV', 'XLSX', 'PDF', 'HTML');

-- CreateEnum
CREATE TYPE "ReportScheduleFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CRON');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING_REVIEW', 'USEFUL', 'DISMISSED', 'NEEDS_REVIEW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'REPORT_DOWNLOAD';
ALTER TYPE "AuditEvent" ADD VALUE 'REPORT_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'REPORT_RUN';
ALTER TYPE "AuditEvent" ADD VALUE 'ANALYTICS_INSIGHT_REVIEW';

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "scope" TEXT NOT NULL,
    "subjectId" TEXT,
    "assessmentId" TEXT,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "dateRange" JSONB,
    "metrics" JSONB NOT NULL,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsAggregationJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "scope" TEXT NOT NULL,
    "status" "AnalyticsJobStatus" NOT NULL DEFAULT 'QUEUED',
    "dateRange" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" JSONB,
    "errorMessage" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsAggregationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDefinition" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB,
    "columns" TEXT[],
    "sortOrder" JSONB,
    "outputFormat" "ReportOutputFormat" NOT NULL DEFAULT 'CSV',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportGenerationJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "reportId" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" "ReportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "reportType" TEXT NOT NULL,
    "filters" JSONB,
    "outputFormat" "ReportOutputFormat" NOT NULL DEFAULT 'CSV',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportFile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "jobId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "outputFormat" "ReportOutputFormat" NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "reportId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "frequency" "ReportScheduleFrequency" NOT NULL,
    "cronExpression" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "delivery" JSONB,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedDashboard" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "filters" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsInsight" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "scope" TEXT NOT NULL,
    "assessmentId" TEXT,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT,
    "confidence" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'rule-based',
    "aggregatePayload" JSONB,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "assessmentId" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "questionId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "approvedDifficulty" "QuestionDifficulty",
    "measuredDifficulty" "QuestionDifficulty",
    "measuredAt" TIMESTAMP(3),
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "scope" TEXT NOT NULL,
    "assessmentId" TEXT,
    "subjectId" TEXT,
    "batchId" TEXT,
    "policy" JSONB NOT NULL,
    "entries" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkSnapshot" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "dimension" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportAudit" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "userId" TEXT NOT NULL,
    "reportFileId" TEXT,
    "reportJobId" TEXT,
    "reportType" TEXT NOT NULL,
    "format" "ReportOutputFormat" NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'DOWNLOAD',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_collegeId_scope_idx" ON "AnalyticsSnapshot"("collegeId", "scope");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_assessmentId_idx" ON "AnalyticsSnapshot"("assessmentId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_subjectId_idx" ON "AnalyticsSnapshot"("subjectId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_metricDate_idx" ON "AnalyticsSnapshot"("metricDate");

-- CreateIndex
CREATE INDEX "AnalyticsAggregationJob_collegeId_idx" ON "AnalyticsAggregationJob"("collegeId");

-- CreateIndex
CREATE INDEX "AnalyticsAggregationJob_scope_idx" ON "AnalyticsAggregationJob"("scope");

-- CreateIndex
CREATE INDEX "AnalyticsAggregationJob_status_idx" ON "AnalyticsAggregationJob"("status");

-- CreateIndex
CREATE INDEX "AnalyticsAggregationJob_createdAt_idx" ON "AnalyticsAggregationJob"("createdAt");

-- CreateIndex
CREATE INDEX "ReportDefinition_collegeId_idx" ON "ReportDefinition"("collegeId");

-- CreateIndex
CREATE INDEX "ReportDefinition_ownerId_idx" ON "ReportDefinition"("ownerId");

-- CreateIndex
CREATE INDEX "ReportDefinition_reportType_idx" ON "ReportDefinition"("reportType");

-- CreateIndex
CREATE INDEX "ReportDefinition_createdAt_idx" ON "ReportDefinition"("createdAt");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_collegeId_idx" ON "ReportGenerationJob"("collegeId");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_reportId_idx" ON "ReportGenerationJob"("reportId");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_requestedById_idx" ON "ReportGenerationJob"("requestedById");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_status_idx" ON "ReportGenerationJob"("status");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_createdAt_idx" ON "ReportGenerationJob"("createdAt");

-- CreateIndex
CREATE INDEX "ReportGenerationJob_expiresAt_idx" ON "ReportGenerationJob"("expiresAt");

-- CreateIndex
CREATE INDEX "ReportFile_collegeId_idx" ON "ReportFile"("collegeId");

-- CreateIndex
CREATE INDEX "ReportFile_jobId_idx" ON "ReportFile"("jobId");

-- CreateIndex
CREATE INDEX "ReportFile_requestedById_idx" ON "ReportFile"("requestedById");

-- CreateIndex
CREATE INDEX "ReportFile_expiresAt_idx" ON "ReportFile"("expiresAt");

-- CreateIndex
CREATE INDEX "ReportSchedule_collegeId_idx" ON "ReportSchedule"("collegeId");

-- CreateIndex
CREATE INDEX "ReportSchedule_reportId_idx" ON "ReportSchedule"("reportId");

-- CreateIndex
CREATE INDEX "ReportSchedule_ownerId_idx" ON "ReportSchedule"("ownerId");

-- CreateIndex
CREATE INDEX "ReportSchedule_active_idx" ON "ReportSchedule"("active");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRunAt_idx" ON "ReportSchedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "SavedDashboard_collegeId_idx" ON "SavedDashboard"("collegeId");

-- CreateIndex
CREATE INDEX "SavedDashboard_ownerId_idx" ON "SavedDashboard"("ownerId");

-- CreateIndex
CREATE INDEX "SavedDashboard_isDefault_idx" ON "SavedDashboard"("isDefault");

-- CreateIndex
CREATE INDEX "SavedFilter_collegeId_idx" ON "SavedFilter"("collegeId");

-- CreateIndex
CREATE INDEX "SavedFilter_ownerId_idx" ON "SavedFilter"("ownerId");

-- CreateIndex
CREATE INDEX "SavedFilter_context_idx" ON "SavedFilter"("context");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_collegeId_idx" ON "AnalyticsInsight"("collegeId");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_scope_idx" ON "AnalyticsInsight"("scope");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_assessmentId_idx" ON "AnalyticsInsight"("assessmentId");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_subjectId_idx" ON "AnalyticsInsight"("subjectId");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_status_idx" ON "AnalyticsInsight"("status");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_createdAt_idx" ON "AnalyticsInsight"("createdAt");

-- CreateIndex
CREATE INDEX "StudentPerformanceSnapshot_collegeId_studentId_idx" ON "StudentPerformanceSnapshot"("collegeId", "studentId");

-- CreateIndex
CREATE INDEX "StudentPerformanceSnapshot_subjectId_idx" ON "StudentPerformanceSnapshot"("subjectId");

-- CreateIndex
CREATE INDEX "StudentPerformanceSnapshot_assessmentId_idx" ON "StudentPerformanceSnapshot"("assessmentId");

-- CreateIndex
CREATE INDEX "StudentPerformanceSnapshot_snapshotDate_idx" ON "StudentPerformanceSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "AssessmentPerformanceSnapshot_collegeId_assessmentId_idx" ON "AssessmentPerformanceSnapshot"("collegeId", "assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentPerformanceSnapshot_snapshotDate_idx" ON "AssessmentPerformanceSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "QuestionPerformanceSnapshot_collegeId_idx" ON "QuestionPerformanceSnapshot"("collegeId");

-- CreateIndex
CREATE INDEX "QuestionPerformanceSnapshot_questionId_idx" ON "QuestionPerformanceSnapshot"("questionId");

-- CreateIndex
CREATE INDEX "QuestionPerformanceSnapshot_assessmentId_idx" ON "QuestionPerformanceSnapshot"("assessmentId");

-- CreateIndex
CREATE INDEX "QuestionPerformanceSnapshot_measuredAt_idx" ON "QuestionPerformanceSnapshot"("measuredAt");

-- CreateIndex
CREATE INDEX "QuestionPerformanceSnapshot_sampleSize_idx" ON "QuestionPerformanceSnapshot"("sampleSize");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_collegeId_idx" ON "LeaderboardSnapshot"("collegeId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_scope_idx" ON "LeaderboardSnapshot"("scope");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_assessmentId_idx" ON "LeaderboardSnapshot"("assessmentId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_subjectId_idx" ON "LeaderboardSnapshot"("subjectId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_batchId_idx" ON "LeaderboardSnapshot"("batchId");

-- CreateIndex
CREATE INDEX "LeaderboardSnapshot_generatedAt_idx" ON "LeaderboardSnapshot"("generatedAt");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_collegeId_idx" ON "BenchmarkSnapshot"("collegeId");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_dimension_idx" ON "BenchmarkSnapshot"("dimension");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_groupKey_idx" ON "BenchmarkSnapshot"("groupKey");

-- CreateIndex
CREATE INDEX "BenchmarkSnapshot_metricDate_idx" ON "BenchmarkSnapshot"("metricDate");

-- CreateIndex
CREATE INDEX "ExportAudit_collegeId_idx" ON "ExportAudit"("collegeId");

-- CreateIndex
CREATE INDEX "ExportAudit_userId_idx" ON "ExportAudit"("userId");

-- CreateIndex
CREATE INDEX "ExportAudit_reportFileId_idx" ON "ExportAudit"("reportFileId");

-- CreateIndex
CREATE INDEX "ExportAudit_reportJobId_idx" ON "ExportAudit"("reportJobId");

-- CreateIndex
CREATE INDEX "ExportAudit_createdAt_idx" ON "ExportAudit"("createdAt");

