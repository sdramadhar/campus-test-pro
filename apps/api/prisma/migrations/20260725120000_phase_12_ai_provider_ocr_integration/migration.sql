-- AlterTable
ALTER TABLE "AiGenerationRequest" ADD COLUMN     "maxTokens" INTEGER,
ADD COLUMN     "runtimeModel" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "AiPromptTemplate" ADD COLUMN     "maxTokens" INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2;

-- AlterTable
ALTER TABLE "DocumentImportJob" ADD COLUMN     "ocrAttempted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "ocrProvider" TEXT,
ADD COLUMN     "parserProvider" TEXT;

-- AlterTable
ALTER TABLE "QuestionDuplicateCandidate" ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingProvider" TEXT,
ADD COLUMN     "fuzzyScore" DOUBLE PRECISION,
ADD COLUMN     "semanticScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AiGenerationResultVersion" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "editedById" TEXT NOT NULL,
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationResultVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionEmbedding" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "questionId" TEXT,
    "sourceTextHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGenerationResultVersion_resultId_idx" ON "AiGenerationResultVersion"("resultId");

-- CreateIndex
CREATE INDEX "AiGenerationResultVersion_editedById_idx" ON "AiGenerationResultVersion"("editedById");

-- CreateIndex
CREATE UNIQUE INDEX "AiGenerationResultVersion_resultId_versionNumber_key" ON "AiGenerationResultVersion"("resultId", "versionNumber");

-- CreateIndex
CREATE INDEX "QuestionEmbedding_collegeId_idx" ON "QuestionEmbedding"("collegeId");

-- CreateIndex
CREATE INDEX "QuestionEmbedding_questionId_idx" ON "QuestionEmbedding"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionEmbedding_sourceTextHash_provider_model_key" ON "QuestionEmbedding"("sourceTextHash", "provider", "model");

-- AddForeignKey
ALTER TABLE "AiGenerationResultVersion" ADD CONSTRAINT "AiGenerationResultVersion_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AiGenerationResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationResultVersion" ADD CONSTRAINT "AiGenerationResultVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionEmbedding" ADD CONSTRAINT "QuestionEmbedding_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionEmbedding" ADD CONSTRAINT "QuestionEmbedding_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

