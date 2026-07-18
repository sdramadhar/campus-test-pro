import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CollegesController } from "./colleges.controller";
import { CollegesService } from "./colleges.service";

@Module({
  imports: [AuthModule],
  controllers: [CollegesController],
  providers: [CollegesService],
})
export class CollegesModule {}
