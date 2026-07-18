-- CreateEnum
CREATE TYPE "CollegeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "AuditEvent" ADD VALUE 'COLLEGE_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'COLLEGE_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'COLLEGE_ACTIVATE';
ALTER TYPE "AuditEvent" ADD VALUE 'COLLEGE_DEACTIVATE';
ALTER TYPE "AuditEvent" ADD VALUE 'COLLEGE_DELETE';

-- AlterTable
ALTER TABLE "College"
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "collegeCode" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "email" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "status" "CollegeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "updatedById" TEXT,
ADD COLUMN "website" TEXT;

-- Backfill existing colleges before enforcing required columns.
UPDATE "College"
SET
  "collegeCode" = COALESCE("collegeCode", UPPER(REPLACE("slug", '-', '_'))),
  "email" = COALESCE("email", CONCAT("slug", '@campustest.local')),
  "addressLine1" = COALESCE("addressLine1", '1 Campus Green'),
  "city" = COALESCE("city", 'Springfield'),
  "state" = COALESCE("state", 'Illinois'),
  "postalCode" = COALESCE("postalCode", '62701'),
  "country" = COALESCE("country", 'United States'),
  "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"CollegeStatus" ELSE 'INACTIVE'::"CollegeStatus" END;

UPDATE "College"
SET
  "collegeCode" = 'DEMO',
  "email" = 'info@demo-college.local',
  "website" = 'https://demo-college.local',
  "phone" = '+1 555 0101',
  "addressLine2" = 'Administration Block'
WHERE "slug" = 'demo-college';

ALTER TABLE "College"
ALTER COLUMN "addressLine1" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "collegeCode" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "postalCode" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "College_collegeCode_key" ON "College"("collegeCode");

-- CreateIndex
CREATE UNIQUE INDEX "College_email_key" ON "College"("email");

-- CreateIndex
CREATE INDEX "College_name_idx" ON "College"("name");

-- CreateIndex
CREATE INDEX "College_city_idx" ON "College"("city");

-- CreateIndex
CREATE INDEX "College_state_idx" ON "College"("state");

-- CreateIndex
CREATE INDEX "College_status_idx" ON "College"("status");

-- CreateIndex
CREATE INDEX "College_deletedAt_idx" ON "College"("deletedAt");

-- CreateIndex
CREATE INDEX "College_createdById_idx" ON "College"("createdById");

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "College" ADD CONSTRAINT "College_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
