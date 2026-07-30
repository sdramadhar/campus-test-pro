ALTER TABLE "QuestionImportJob"
  ADD COLUMN "subjectId" TEXT;

ALTER TABLE "Question"
  ADD COLUMN "importJobId" TEXT;

CREATE INDEX "QuestionImportJob_subjectId_idx"
  ON "QuestionImportJob"("subjectId");

CREATE INDEX "Question_importJobId_idx"
  ON "Question"("importJobId");

ALTER TABLE "QuestionImportJob"
  ADD CONSTRAINT "QuestionImportJob_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Question"
  ADD CONSTRAINT "Question_importJobId_fkey"
  FOREIGN KEY ("importJobId") REFERENCES "QuestionImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
