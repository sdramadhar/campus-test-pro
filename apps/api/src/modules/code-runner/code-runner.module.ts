import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CodeRunnerController } from "./code-runner.controller";
import { CodeRunnerService } from "./code-runner.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CodeRunnerController],
  providers: [CodeRunnerService],
})
export class CodeRunnerModule {}
