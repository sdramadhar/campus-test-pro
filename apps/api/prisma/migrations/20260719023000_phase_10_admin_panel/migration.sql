-- Phase 10: Admin panel persistence for settings, permissions, activity, and theme.

CREATE TYPE "ThemePreference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'ADMIN_SETTINGS_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'PROFILE_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'NOTIFICATION_READ';
ALTER TYPE "AuditEvent" ADD VALUE IF NOT EXISTS 'PERMISSION_OVERRIDE_UPDATE';

ALTER TABLE "User"
  ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM';

CREATE TABLE "CollegeSettings" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "academicYearStartMonth" INTEGER NOT NULL DEFAULT 6,
  "brandingColor" TEXT NOT NULL DEFAULT '#0f5d4e',
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "examGraceMinutes" INTEGER NOT NULL DEFAULT 5,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CollegeSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPermissionOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "collegeId" TEXT,
  "module" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT true,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canUpdate" BOOLEAN NOT NULL DEFAULT false,
  "canDelete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "collegeId" TEXT,
  "action" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollegeSettings_collegeId_key" ON "CollegeSettings"("collegeId");
CREATE INDEX "CollegeSettings_collegeId_idx" ON "CollegeSettings"("collegeId");
CREATE UNIQUE INDEX "UserPermissionOverride_userId_module_key" ON "UserPermissionOverride"("userId", "module");
CREATE INDEX "UserPermissionOverride_collegeId_idx" ON "UserPermissionOverride"("collegeId");
CREATE INDEX "UserPermissionOverride_module_idx" ON "UserPermissionOverride"("module");
CREATE INDEX "ActivityHistory_userId_idx" ON "ActivityHistory"("userId");
CREATE INDEX "ActivityHistory_collegeId_idx" ON "ActivityHistory"("collegeId");
CREATE INDEX "ActivityHistory_action_idx" ON "ActivityHistory"("action");
CREATE INDEX "ActivityHistory_createdAt_idx" ON "ActivityHistory"("createdAt");

ALTER TABLE "CollegeSettings"
  ADD CONSTRAINT "CollegeSettings_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityHistory"
  ADD CONSTRAINT "ActivityHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityHistory"
  ADD CONSTRAINT "ActivityHistory_collegeId_fkey"
  FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
