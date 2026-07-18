import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "../../../generated/phase5-client";
import { CollegesService } from "./colleges.service";
import {
  CreateCollegeDto,
  ListCollegesQueryDto,
  UpdateCollegeDto,
  UpdateCollegeStatusDto,
} from "./dto/college.dto";

@ApiTags("colleges")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("api/v1/colleges")
export class CollegesController {
  constructor(
    @Inject(CollegesService) private readonly colleges: CollegesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List colleges with pagination, filters, and sorting.",
  })
  @ApiOkResponse({ description: "College list returned." })
  list(@Query() query: ListCollegesQueryDto) {
    return this.colleges.list(query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a college profile, statistics, admins, and activity.",
  })
  @ApiOkResponse({ description: "College detail returned." })
  get(@Param("id") id: string) {
    return this.colleges.get(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a college and optionally its first admin." })
  @ApiCreatedResponse({ description: "College created." })
  create(
    @Body() dto: CreateCollegeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.colleges.create(dto, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update permitted college profile fields." })
  @ApiOkResponse({ description: "College updated." })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCollegeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.colleges.update(id, dto, user);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Activate or deactivate a college." })
  @ApiOkResponse({ description: "College status updated." })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateCollegeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.colleges.updateStatus(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({
    summary: "Safely archive a college without deleting history.",
  })
  @ApiOkResponse({ description: "College archived." })
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.colleges.archive(id, user);
  }
}
