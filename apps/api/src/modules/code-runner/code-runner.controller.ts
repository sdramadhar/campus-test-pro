import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CodeRunnerService } from "./code-runner.service";

@ApiTags("code-runner")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
@Controller("api/v1/code-runner")
export class CodeRunnerController {
  constructor(
    @Inject(CodeRunnerService) private readonly codeRunner: CodeRunnerService,
  ) {}

  @Post("jobs")
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      questionId?: string;
      language: string;
      sourceCode: string;
      stdin?: string;
    },
  ) {
    return this.codeRunner.submit(user, body);
  }

  @Get("jobs/:id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.codeRunner.get(user, id);
  }
}
