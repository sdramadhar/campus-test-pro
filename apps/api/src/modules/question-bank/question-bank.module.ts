import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AssessmentsController,
  QuestionsController,
} from "./question-bank.controller";
import { QuestionBankService } from "./question-bank.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [QuestionsController, AssessmentsController],
  providers: [QuestionBankService],
})
export class QuestionBankModule {}
