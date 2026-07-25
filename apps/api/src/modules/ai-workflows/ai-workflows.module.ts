import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AiExamEngineController,
  AiPromptsController,
  AiQuestionsController,
  AiUsageController,
  AssessmentBlueprintsController,
  QuestionDuplicatesController,
  QuestionImportsController,
  SyllabiController,
} from "./ai-workflows.controller";
import { AiWorkflowsService } from "./ai-workflows.service";
import { AiProviderFactory } from "./providers/ai-provider.factory";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [
    AiQuestionsController,
    AiPromptsController,
    AiUsageController,
    QuestionImportsController,
    QuestionDuplicatesController,
    SyllabiController,
    AssessmentBlueprintsController,
    AiExamEngineController,
  ],
  providers: [AiWorkflowsService, AiProviderFactory],
})
export class AiWorkflowsModule {}
