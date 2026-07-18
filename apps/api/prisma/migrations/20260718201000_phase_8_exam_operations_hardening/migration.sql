-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSESSMENT_ASSIGNED', 'ASSESSMENT_STARTING_SOON', 'SUBMISSION_RECEIPT', 'RESULT_PUBLISHED', 'REVIEW_COMPLETED', 'ACCOUNT_STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "SecurityReviewStatus" AS ENUM ('NORMAL', 'FLAGGED', 'REVIEWED', 'CLEARED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NONE', 'HELD', 'RELEASED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "AttemptSessionPolicy" AS ENUM ('WARN_ONLY', 'BLOCK_SECOND_SESSION');

-- AlterTable
ALTER TABLE "AttemptSecurityFlag" ADD COLUMN     "reviewStatus" "SecurityReviewStatus" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "heldAt" TIMESTAMP(3),
ADD COLUMN     "heldById" TEXT,
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "rankEligible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "TestAttempt" ADD COLUMN     "autoSubmitClaimedAt" TIMESTAMP(3),
ADD COLUMN     "autoSubmitClaimedBy" TEXT,
ADD COLUMN     "expiryJobId" TEXT,
ADD COLUMN     "sessionPolicy" "AttemptSessionPolicy" NOT NULL DEFAULT 'WARN_ONLY';

-- CreateTable
CREATE TABLE "ResultModeration" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "oldScore" DOUBLE PRECISION,
    "newScore" DOUBLE PRECISION,
    "oldStatus" "ModerationStatus",
    "newStatus" "ModerationStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSecurityReview" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" "SecurityReviewStatus" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptSecurityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptSession" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AttemptSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJobRecord" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'WAITING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payloadHash" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResultModeration_resultId_idx" ON "ResultModeration"("resultId");

-- CreateIndex
CREATE INDEX "ResultModeration_moderatorId_idx" ON "ResultModeration"("moderatorId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSecurityReview_attemptId_key" ON "AttemptSecurityReview"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptSecurityReview_status_idx" ON "AttemptSecurityReview"("status");

-- CreateIndex
CREATE INDEX "AttemptSecurityReview_reviewedById_idx" ON "AttemptSecurityReview"("reviewedById");

-- CreateIndex
CREATE INDEX "AttemptSession_attemptId_idx" ON "AttemptSession"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptSession_status_idx" ON "AttemptSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptSession_attemptId_sessionHash_key" ON "AttemptSession"("attemptId", "sessionHash");

-- CreateIndex
CREATE INDEX "BackgroundJobRecord_queueName_idx" ON "BackgroundJobRecord"("queueName");

-- CreateIndex
CREATE INDEX "BackgroundJobRecord_status_idx" ON "BackgroundJobRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJobRecord_queueName_jobId_key" ON "BackgroundJobRecord"("queueName", "jobId");

-- CreateIndex
CREATE INDEX "Notification_collegeId_idx" ON "Notification"("collegeId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- AddForeignKey
ALTER TABLE "ResultModeration" ADD CONSTRAINT "ResultModeration_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultModeration" ADD CONSTRAINT "ResultModeration_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSecurityReview" ADD CONSTRAINT "AttemptSecurityReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSecurityReview" ADD CONSTRAINT "AttemptSecurityReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptSession" ADD CONSTRAINT "AttemptSession_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
