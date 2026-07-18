import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import {
  ExamOperationsController,
  ResultModerationController,
  ReviewWorkflowController,
  SecurityEventsController,
  SystemQueuesController,
} from "./exam-operations.controller";
import { ExamOperationsService } from "./exam-operations.service";
import { ExamQueueService } from "./exam-queue.service";

@Module({
  imports: [AuthModule, PrismaModule, RedisModule],
  controllers: [
    ExamOperationsController,
    ReviewWorkflowController,
    ResultModerationController,
    SecurityEventsController,
    SystemQueuesController,
  ],
  providers: [ExamOperationsService, ExamQueueService],
  exports: [ExamOperationsService, ExamQueueService],
})
export class ExamOperationsModule {}
