import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingProviderRegistry } from "./billing-provider";
import {
  SaasPlatformController,
  SaasPublicController,
  SaasTenantController,
} from "./saas.controller";
import { SaasService } from "./saas.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SaasPublicController, SaasTenantController, SaasPlatformController],
  providers: [BillingProviderRegistry, SaasService],
})
export class SaasModule {}
