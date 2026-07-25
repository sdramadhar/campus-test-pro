import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import { AdminPanelModule } from "./admin-panel/admin-panel.module";
import { AcademicModule } from "./academic/academic.module";
import { AiWorkflowsModule } from "./ai-workflows/ai-workflows.module";
import { AuthModule } from "./auth/auth.module";
import { CollegesModule } from "./colleges/colleges.module";
import { CodeRunnerModule } from "./code-runner/code-runner.module";
import { validateEnvironment } from "./config/environment";
import { EmailModule } from "./email/email.module";
import { ExamOperationsModule } from "./exam-operations/exam-operations.module";
import { HealthModule } from "./health/health.module";
import { MaintenanceMiddleware } from "./maintenance/maintenance.middleware";
import { PrismaModule } from "./prisma/prisma.module";
import { QuestionBankModule } from "./question-bank/question-bank.module";
import { RedisModule } from "./redis/redis.module";
import { StorageModule } from "./storage/storage.module";
import { StudentExamModule } from "./student-exam/student-exam.module";
import { SystemModule } from "./system/system.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        join(process.cwd(), ".env"),
        join(process.cwd(), "..", "..", ".env"),
      ],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AdminPanelModule,
    AcademicModule,
    AiWorkflowsModule,
    AuthModule,
    CodeRunnerModule,
    CollegesModule,
    EmailModule,
    ExamOperationsModule,
    PrismaModule,
    QuestionBankModule,
    RedisModule,
    StorageModule,
    StudentExamModule,
    HealthModule,
    SystemModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MaintenanceMiddleware).forRoutes("*");
  }
}
