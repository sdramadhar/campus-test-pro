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
}
