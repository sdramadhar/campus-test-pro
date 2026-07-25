import { Body, Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SystemService } from "./system.service";

@ApiTags("system")
@Controller("api/v1/system")
export class SystemController {
  constructor(@Inject(SystemService) private readonly system: SystemService) {}

  @Get("version")
  version() {
    return this.system.version();
  }

  @Get("workers")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  workerStatus() {
    return this.system.workerStatus();
  }

  @Get("infrastructure")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  infrastructure() {
    return this.system.infrastructure();
  }

  @Get("capacity")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  capacity() {
    return this.system.capacity();
  }

  @Get("deployment-safety")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  deploymentSafety() {
    return this.system.deploymentSafety();
  }

  @Get("backups")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  backups() {
    return this.system.backups();
  }

  @Get("alerts")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  alerts() {
    return this.system.alerts();
  }

  @Get("metrics-summary")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  metricsSummary() {
    return this.system.metricsSummary();
  }

  @Get("metrics")
  metricsText() {
    return this.system.metricsText();
  }

  @Get("release-readiness")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  releaseReadiness() {
    return this.system.releaseReadiness();
  }

  @Get("jobs")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  jobs() {
    return this.system.jobs();
  }

  @Get("maintenance")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  maintenance() {
    return this.system.maintenance();
  }

  @Post("maintenance")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  updateMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { enabled: boolean; message?: string; allowAdmins?: boolean },
  ) {
    return this.system.updateMaintenance(user, body);
  }

  @Post("maintenance/enable")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  enableMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      message?: string;
      allowAdmins?: boolean;
      blockNewExamStarts?: boolean;
    },
  ) {
    return this.system.updateMaintenance(user, { ...body, enabled: true });
  }

  @Post("maintenance/disable")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  disableMaintenance(@CurrentUser() user: AuthenticatedUser) {
    return this.system.updateMaintenance(user, { enabled: false });
  }
}
