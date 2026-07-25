import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { ProctoringController } from "./proctoring.controller";
import { ProctoringService } from "./proctoring.service";

@Module({
  imports: [AuthModule, PrismaModule, RedisModule],
  controllers: [ProctoringController],
  providers: [ProctoringService],
})
export class ProctoringModule {}
