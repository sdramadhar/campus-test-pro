-- Phase 9: production hardening, password reset, email, heartbeat, storage, and code-runner foundations.

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_REQUEST';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET_COMPLETE';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'EMAIL_QUEUED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'EMAIL_DELIVERED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'EMAIL_FAILED';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'MAINTENANCE_MODE_UPDATE';

CREATE TYPE "EmailProvider" AS ENUM ('CONSOLE', 'SMTP', 'RESEND', 'SENDGRID', 'SES');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
CREATE TYPE "PasswordResetStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');
CREATE TYPE "CodeExecutionStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'ACCEPTED',
  'WRONG_ANSWER',
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'INTERNAL_ERROR'
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "PasswordResetStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "provider" "EmailProvider" NOT NULL DEFAULT 'CONSOLE',
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "template" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "metadata" JSONB,
  "error" TEXT,
  "userId" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkerHeartbeat" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "queues" TEXT[],
  "version" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorageObject" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT,
  "ownerId" TEXT,
  "bucket" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "checksum" TEXT,
  "isPrivate" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodeExecutionJob" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT,
  "userId" TEXT,
  "questionId" TEXT,
  "language" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" "CodeExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "mockResult" BOOLEAN NOT NULL DEFAULT false,
  "inputHash" TEXT,
  "result" JSONB,
  "error" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "CodeExecutionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeploymentMetadata" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "commitSha" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "buildTime" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeploymentMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceState" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "message" TEXT,
  "allowAdmins" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "updatedByUserId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_status_idx" ON "PasswordResetToken"("status");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

CREATE INDEX "EmailDelivery_status_idx" ON "EmailDelivery"("status");
CREATE INDEX "EmailDelivery_template_idx" ON "EmailDelivery"("template");
CREATE INDEX "EmailDelivery_userId_idx" ON "EmailDelivery"("userId");

CREATE UNIQUE INDEX "WorkerHeartbeat_instanceId_key" ON "WorkerHeartbeat"("instanceId");
CREATE INDEX "WorkerHeartbeat_service_idx" ON "WorkerHeartbeat"("service");
CREATE INDEX "WorkerHeartbeat_expiresAt_idx" ON "WorkerHeartbeat"("expiresAt");

CREATE UNIQUE INDEX "StorageObject_objectKey_key" ON "StorageObject"("objectKey");
CREATE INDEX "StorageObject_collegeId_idx" ON "StorageObject"("collegeId");
CREATE INDEX "StorageObject_ownerId_idx" ON "StorageObject"("ownerId");
CREATE INDEX "StorageObject_purpose_idx" ON "StorageObject"("purpose");

CREATE INDEX "CodeExecutionJob_collegeId_idx" ON "CodeExecutionJob"("collegeId");
CREATE INDEX "CodeExecutionJob_userId_idx" ON "CodeExecutionJob"("userId");
CREATE INDEX "CodeExecutionJob_status_idx" ON "CodeExecutionJob"("status");
CREATE INDEX "CodeExecutionJob_queuedAt_idx" ON "CodeExecutionJob"("queuedAt");

CREATE INDEX "DeploymentMetadata_environment_idx" ON "DeploymentMetadata"("environment");
CREATE INDEX "DeploymentMetadata_commitSha_idx" ON "DeploymentMetadata"("commitSha");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeExecutionJob" ADD CONSTRAINT "CodeExecutionJob_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeExecutionJob" ADD CONSTRAINT "CodeExecutionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
