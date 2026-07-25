-- CreateEnum
CREATE TYPE "FullscreenExitPolicy" AS ENUM ('LOG_ONLY', 'WARN', 'FLAG');

-- CreateEnum
CREATE TYPE "MultipleSessionPolicy" AS ENUM ('ALLOW', 'WARN_ONLY', 'BLOCK_SECOND_SESSION');

-- CreateEnum
CREATE TYPE "WebcamSnapshotMode" AS ENUM ('DISABLED', 'START_ONLY', 'PERIODIC', 'EVENT_TRIGGERED');

-- CreateEnum
CREATE TYPE "ScreenCaptureMode" AS ENUM ('DISABLED', 'EVENT_TRIGGERED', 'PERIODIC');

-- CreateEnum
CREATE TYPE "ProctoringSessionStatus" AS ENUM ('NOT_STARTED', 'CONSENT_PENDING', 'CHECK_PENDING', 'READY', 'ACTIVE', 'DISCONNECTED', 'FLAGGED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProctoringReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_REVIEW', 'CLEARED', 'NEEDS_FOLLOW_UP', 'POLICY_VIOLATION', 'INVALIDATED');

-- CreateEnum
CREATE TYPE "ProctoringEventType" AS ENUM ('CONSENT_ACCEPTED', 'CONSENT_DECLINED', 'FULLSCREEN_ENTER', 'FULLSCREEN_EXIT', 'TAB_HIDDEN', 'TAB_VISIBLE', 'WINDOW_BLUR', 'WINDOW_FOCUS', 'COPY', 'PASTE', 'CONTEXT_MENU', 'FORBIDDEN_SHORTCUT', 'NETWORK_DISCONNECT', 'NETWORK_RECONNECT', 'SECOND_SESSION_ATTEMPT', 'WEBCAM_PERMISSION_GRANTED', 'WEBCAM_PERMISSION_DENIED', 'MICROPHONE_PERMISSION_GRANTED', 'MICROPHONE_PERMISSION_DENIED', 'SCREEN_SHARE_STARTED', 'SCREEN_SHARE_STOPPED', 'CAMERA_SNAPSHOT_CAPTURED', 'SCREEN_CAPTURED', 'IDENTITY_CHECK_STARTED', 'IDENTITY_CHECK_COMPLETED', 'IDENTITY_CHECK_FAILED', 'ENVIRONMENT_CHECK_COMPLETED', 'PROCTOR_WARNING', 'PROCTOR_NOTE', 'MANUAL_FLAG', 'MANUAL_CLEAR', 'AUTO_SUBMIT_TRIGGERED');

-- CreateEnum
CREATE TYPE "ProctoringEvidenceType" AS ENUM ('ID_DOCUMENT', 'SELFIE', 'CAMERA_SNAPSHOT', 'SCREEN_CAPTURE', 'ENVIRONMENT_IMAGE', 'PROCTOR_NOTE_ATTACHMENT');

-- CreateEnum
CREATE TYPE "IdentityCheckStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "EnvironmentCheckStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_POLICY_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_CONSENT';
ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_EVENT';
ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_REVIEW';
ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_EVIDENCE_ACCESS';
ALTER TYPE "AuditEvent" ADD VALUE 'PROCTORING_OVERRIDE';

-- CreateTable
CREATE TABLE "ProctoringPolicy" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "assessmentId" TEXT,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "proctoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consentRequired" BOOLEAN NOT NULL DEFAULT false,
    "fullscreenRequired" BOOLEAN NOT NULL DEFAULT false,
    "fullscreenExitPolicy" "FullscreenExitPolicy" NOT NULL DEFAULT 'LOG_ONLY',
    "tabSwitchMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "copyMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "pasteMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "contextMenuMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "keyboardShortcutMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "multipleSessionPolicy" "MultipleSessionPolicy" NOT NULL DEFAULT 'WARN_ONLY',
    "webcamRequired" BOOLEAN NOT NULL DEFAULT false,
    "webcamSnapshotMode" "WebcamSnapshotMode" NOT NULL DEFAULT 'DISABLED',
    "webcamSnapshotIntervalSeconds" INTEGER,
    "microphoneRequired" BOOLEAN NOT NULL DEFAULT false,
    "microphoneCheckOnly" BOOLEAN NOT NULL DEFAULT true,
    "screenShareRequired" BOOLEAN NOT NULL DEFAULT false,
    "screenCaptureMode" "ScreenCaptureMode" NOT NULL DEFAULT 'DISABLED',
    "screenCaptureIntervalSeconds" INTEGER,
    "identityCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "environmentCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "networkDisconnectThresholdSeconds" INTEGER NOT NULL DEFAULT 60,
    "warningThreshold" INTEGER NOT NULL DEFAULT 3,
    "flagThreshold" INTEGER NOT NULL DEFAULT 5,
    "autoSubmitOnCriticalViolation" BOOLEAN NOT NULL DEFAULT false,
    "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
    "evidenceRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "studentReviewVisibility" BOOLEAN NOT NULL DEFAULT true,
    "proctorInstructions" TEXT,
    "institutionPrivacyNotice" TEXT,
    "emergencySupportContact" TEXT,
    "riskWeights" JSONB,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProctoringPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringSession" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ProctoringSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "policyId" TEXT,
    "policySnapshot" JSONB NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "disconnectStartedAt" TIMESTAMP(3),
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "riskContributors" JSONB,
    "reviewStatus" "ProctoringReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sessionChallengeHash" TEXT,
    "sessionChallengeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProctoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "eventType" "ProctoringEventType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "sequenceNumber" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "clientTimestamp" TIMESTAMP(3),
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "riskDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringWarning" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "warningType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvidence" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "evidenceType" "ProctoringEvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "capturedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "malwareScanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAccessAudit" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityCheck" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "IdentityCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentCheck" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "EnvironmentCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "checklist" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "userAgentHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "challengeHash" TEXT,
    "challengeUntil" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionHeartbeat" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "clientTimestamp" TIMESTAMP(3),
    "connectivityState" TEXT NOT NULL,
    "cameraState" TEXT,
    "microphoneState" TEXT,
    "screenShareState" TEXT,
    "fullscreenState" TEXT,
    "currentQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringReview" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ProctoringReviewStatus" NOT NULL DEFAULT 'PENDING',
    "assignedReviewerId" TEXT,
    "decisionReason" TEXT,
    "appealStatus" TEXT,
    "secondReviewerRequired" BOOLEAN NOT NULL DEFAULT false,
    "resultHeld" BOOLEAN NOT NULL DEFAULT false,
    "resultHoldReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProctoringReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringReviewDecision" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ProctoringReviewStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringOverride" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctoringOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringRetentionJob" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "status" "AnalyticsJobStatus" NOT NULL DEFAULT 'QUEUED',
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProctoringRetentionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveProctorAssignment" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "proctorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveProctorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveProctorNote" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "proctorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveProctorNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProctoringPolicy_collegeId_idx" ON "ProctoringPolicy"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringPolicy_assessmentId_idx" ON "ProctoringPolicy"("assessmentId");

-- CreateIndex
CREATE INDEX "ProctoringPolicy_active_idx" ON "ProctoringPolicy"("active");

-- CreateIndex
CREATE INDEX "ProctoringPolicy_isDefault_idx" ON "ProctoringPolicy"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ProctoringSession_attemptId_key" ON "ProctoringSession"("attemptId");

-- CreateIndex
CREATE INDEX "ProctoringSession_collegeId_idx" ON "ProctoringSession"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringSession_assessmentId_idx" ON "ProctoringSession"("assessmentId");

-- CreateIndex
CREATE INDEX "ProctoringSession_studentId_idx" ON "ProctoringSession"("studentId");

-- CreateIndex
CREATE INDEX "ProctoringSession_status_idx" ON "ProctoringSession"("status");

-- CreateIndex
CREATE INDEX "ProctoringSession_reviewStatus_idx" ON "ProctoringSession"("reviewStatus");

-- CreateIndex
CREATE INDEX "ProctoringSession_lastHeartbeatAt_idx" ON "ProctoringSession"("lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "ProctoringEvent_collegeId_idx" ON "ProctoringEvent"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_sessionId_idx" ON "ProctoringEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_attemptId_idx" ON "ProctoringEvent"("attemptId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_studentId_idx" ON "ProctoringEvent"("studentId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_eventType_idx" ON "ProctoringEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProctoringEvent_createdAt_idx" ON "ProctoringEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProctoringEvent_sessionId_idempotencyKey_key" ON "ProctoringEvent"("sessionId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ProctoringWarning_collegeId_idx" ON "ProctoringWarning"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringWarning_sessionId_idx" ON "ProctoringWarning"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringWarning_attemptId_idx" ON "ProctoringWarning"("attemptId");

-- CreateIndex
CREATE INDEX "ProctoringWarning_createdAt_idx" ON "ProctoringWarning"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProctoringEvidence_storageKey_key" ON "ProctoringEvidence"("storageKey");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_collegeId_idx" ON "ProctoringEvidence"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_sessionId_idx" ON "ProctoringEvidence"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_attemptId_idx" ON "ProctoringEvidence"("attemptId");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_studentId_idx" ON "ProctoringEvidence"("studentId");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_evidenceType_idx" ON "ProctoringEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_expiresAt_idx" ON "ProctoringEvidence"("expiresAt");

-- CreateIndex
CREATE INDEX "ProctoringEvidence_legalHold_idx" ON "ProctoringEvidence"("legalHold");

-- CreateIndex
CREATE INDEX "EvidenceAccessAudit_collegeId_idx" ON "EvidenceAccessAudit"("collegeId");

-- CreateIndex
CREATE INDEX "EvidenceAccessAudit_evidenceId_idx" ON "EvidenceAccessAudit"("evidenceId");

-- CreateIndex
CREATE INDEX "EvidenceAccessAudit_userId_idx" ON "EvidenceAccessAudit"("userId");

-- CreateIndex
CREATE INDEX "EvidenceAccessAudit_createdAt_idx" ON "EvidenceAccessAudit"("createdAt");

-- CreateIndex
CREATE INDEX "IdentityCheck_collegeId_idx" ON "IdentityCheck"("collegeId");

-- CreateIndex
CREATE INDEX "IdentityCheck_sessionId_idx" ON "IdentityCheck"("sessionId");

-- CreateIndex
CREATE INDEX "IdentityCheck_status_idx" ON "IdentityCheck"("status");

-- CreateIndex
CREATE INDEX "EnvironmentCheck_collegeId_idx" ON "EnvironmentCheck"("collegeId");

-- CreateIndex
CREATE INDEX "EnvironmentCheck_sessionId_idx" ON "EnvironmentCheck"("sessionId");

-- CreateIndex
CREATE INDEX "EnvironmentCheck_status_idx" ON "EnvironmentCheck"("status");

-- CreateIndex
CREATE INDEX "DeviceSession_collegeId_idx" ON "DeviceSession"("collegeId");

-- CreateIndex
CREATE INDEX "DeviceSession_sessionId_idx" ON "DeviceSession"("sessionId");

-- CreateIndex
CREATE INDEX "DeviceSession_status_idx" ON "DeviceSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_attemptId_deviceHash_key" ON "DeviceSession"("attemptId", "deviceHash");

-- CreateIndex
CREATE INDEX "SessionHeartbeat_collegeId_idx" ON "SessionHeartbeat"("collegeId");

-- CreateIndex
CREATE INDEX "SessionHeartbeat_sessionId_idx" ON "SessionHeartbeat"("sessionId");

-- CreateIndex
CREATE INDEX "SessionHeartbeat_attemptId_idx" ON "SessionHeartbeat"("attemptId");

-- CreateIndex
CREATE INDEX "SessionHeartbeat_createdAt_idx" ON "SessionHeartbeat"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionHeartbeat_sessionId_sequenceNumber_key" ON "SessionHeartbeat"("sessionId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProctoringReview_sessionId_key" ON "ProctoringReview"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringReview_collegeId_idx" ON "ProctoringReview"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringReview_assessmentId_idx" ON "ProctoringReview"("assessmentId");

-- CreateIndex
CREATE INDEX "ProctoringReview_studentId_idx" ON "ProctoringReview"("studentId");

-- CreateIndex
CREATE INDEX "ProctoringReview_status_idx" ON "ProctoringReview"("status");

-- CreateIndex
CREATE INDEX "ProctoringReview_assignedReviewerId_idx" ON "ProctoringReview"("assignedReviewerId");

-- CreateIndex
CREATE INDEX "ProctoringReviewDecision_collegeId_idx" ON "ProctoringReviewDecision"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringReviewDecision_reviewId_idx" ON "ProctoringReviewDecision"("reviewId");

-- CreateIndex
CREATE INDEX "ProctoringReviewDecision_sessionId_idx" ON "ProctoringReviewDecision"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringReviewDecision_reviewerId_idx" ON "ProctoringReviewDecision"("reviewerId");

-- CreateIndex
CREATE INDEX "ProctoringOverride_collegeId_idx" ON "ProctoringOverride"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringOverride_sessionId_idx" ON "ProctoringOverride"("sessionId");

-- CreateIndex
CREATE INDEX "ProctoringOverride_createdById_idx" ON "ProctoringOverride"("createdById");

-- CreateIndex
CREATE INDEX "ProctoringRetentionJob_collegeId_idx" ON "ProctoringRetentionJob"("collegeId");

-- CreateIndex
CREATE INDEX "ProctoringRetentionJob_status_idx" ON "ProctoringRetentionJob"("status");

-- CreateIndex
CREATE INDEX "ProctoringRetentionJob_cutoffAt_idx" ON "ProctoringRetentionJob"("cutoffAt");

-- CreateIndex
CREATE INDEX "LiveProctorAssignment_collegeId_idx" ON "LiveProctorAssignment"("collegeId");

-- CreateIndex
CREATE INDEX "LiveProctorAssignment_proctorId_idx" ON "LiveProctorAssignment"("proctorId");

-- CreateIndex
CREATE INDEX "LiveProctorAssignment_active_idx" ON "LiveProctorAssignment"("active");

-- CreateIndex
CREATE UNIQUE INDEX "LiveProctorAssignment_assessmentId_proctorId_key" ON "LiveProctorAssignment"("assessmentId", "proctorId");

-- CreateIndex
CREATE INDEX "LiveProctorNote_collegeId_idx" ON "LiveProctorNote"("collegeId");

-- CreateIndex
CREATE INDEX "LiveProctorNote_sessionId_idx" ON "LiveProctorNote"("sessionId");

-- CreateIndex
CREATE INDEX "LiveProctorNote_proctorId_idx" ON "LiveProctorNote"("proctorId");
