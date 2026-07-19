import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminPanelService } from "./admin-panel.service";
import {
  AdminPanelQueryDto,
  UpdateCollegeSettingsDto,
  UpdateProfileDto,
  UpsertPermissionOverrideDto,
} from "./dto/admin-panel.dto";

@ApiTags("admin-panel")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api/v1/admin-panel")
export class AdminPanelController {
  constructor(
    @Inject(AdminPanelService) private readonly adminPanel: AdminPanelService,
  ) {}

  @Get("dashboard")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  @ApiOperation({ summary: "Return tenant-scoped admin dashboard statistics." })
  @ApiOkResponse({ description: "Admin dashboard statistics returned." })
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.dashboard(user, query);
  }

  @Get("college-settings")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  settings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.collegeSettings(user, query);
  }

  @Patch("college-settings")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
    @Body() dto: UpdateCollegeSettingsDto,
  ) {
    return this.adminPanel.updateCollegeSettings(user, query, dto);
  }

  @Get("profile")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.adminPanel.profile(user);
  }

  @Patch("profile")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.adminPanel.updateProfile(user, dto);
  }

  @Get("notifications")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  notifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.notifications(user, query);
  }

  @Patch("notifications/:id/read")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  markNotificationRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.adminPanel.markNotificationRead(user, id);
  }

  @Get("audit-logs")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  auditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.auditLogs(user, query);
  }

  @Get("activity-history")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  activityHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.activityHistory(user, query);
  }

  @Get("permissions")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  permissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminPanelQueryDto,
  ) {
    return this.adminPanel.permissions(user, query);
  }

  @Patch("permissions")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  upsertPermission(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPermissionOverrideDto,
  ) {
    return this.adminPanel.upsertPermission(user, dto);
  }
}
