import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { CodingController } from "./coding.controller";
import { CodingService } from "./coding.service";

@Module({
  imports: [AuthModule, PrismaModule, RedisModule],
  controllers: [CodingController],
  providers: [CodingService],
  exports: [CodingService],
})
export class CodingModule {}
