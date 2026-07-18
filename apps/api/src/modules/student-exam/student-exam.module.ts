import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ExamOperationsModule } from "../exam-operations/exam-operations.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AssessmentResultsController,
  AttemptResultsController,
  ExamDashboardController,
  ReviewsController,
  StudentExamController,
} from "./student-exam.controller";
import { StudentExamService } from "./student-exam.service";

@Module({
  imports: [AuthModule, ExamOperationsModule, PrismaModule],
  controllers: [
    StudentExamController,
    ReviewsController,
    AssessmentResultsController,
    AttemptResultsController,
    ExamDashboardController,
  ],
  providers: [StudentExamService],
  exports: [StudentExamService],
})
export class StudentExamModule {}
