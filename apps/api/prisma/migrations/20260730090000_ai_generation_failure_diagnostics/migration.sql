-- Add job-level diagnostics for asynchronous AI generation failures.
ALTER TABLE "AiGenerationJob"
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "failedAt" TIMESTAMP(3);
