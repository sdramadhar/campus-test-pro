CREATE TYPE "AttemptScoringPolicy" AS ENUM ('BEST', 'LATEST', 'FIRST');

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'ATTEMPT_RESET';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'ATTEMPT_GRANT';
ALTER TYPE "ProctoringEventType" ADD VALUE IF NOT EXISTS 'CAMERA_DISABLED';
ALTER TYPE "ProctoringEventType" ADD VALUE IF NOT EXISTS 'PAGE_RELOAD_ATTEMPT';

ALTER TABLE "Assessment"
  ADD COLUMN "attemptScoringPolicy" "AttemptScoringPolicy" NOT NULL DEFAULT 'BEST',
  ALTER COLUMN "maxAttempts" SET DEFAULT 3;

UPDATE "Assessment"
SET "maxAttempts" = 3
WHERE "maxAttempts" IS NULL OR "maxAttempts" < 3;

CREATE TABLE "AssessmentAttemptGrant" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "additionalAttempts" INTEGER NOT NULL DEFAULT 0,
  "resetBefore" TIMESTAMP(3),
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssessmentAttemptGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentAttemptGrant_assessmentId_studentId_key"
  ON "AssessmentAttemptGrant"("assessmentId", "studentId");
CREATE INDEX "AssessmentAttemptGrant_collegeId_idx"
  ON "AssessmentAttemptGrant"("collegeId");
CREATE INDEX "AssessmentAttemptGrant_studentId_idx"
  ON "AssessmentAttemptGrant"("studentId");

ALTER TABLE "AssessmentAttemptGrant"
  ADD CONSTRAINT "AssessmentAttemptGrant_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttemptGrant"
  ADD CONSTRAINT "AssessmentAttemptGrant_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttemptGrant"
  ADD CONSTRAINT "AssessmentAttemptGrant_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttemptGrant"
  ADD CONSTRAINT "AssessmentAttemptGrant_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "ProctoringPolicy"
SET
  "proctoringEnabled" = TRUE,
  "consentRequired" = TRUE,
  "fullscreenRequired" = TRUE,
  "fullscreenExitPolicy" = 'WARN',
  "tabSwitchMonitoring" = TRUE,
  "webcamRequired" = TRUE,
  "webcamSnapshotMode" = 'PERIODIC',
  "warningThreshold" = 2,
  "flagThreshold" = 3,
  "autoSubmitOnCriticalViolation" = TRUE
WHERE "isDefault" = TRUE;
