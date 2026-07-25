import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AiWorkflowsService } from "./ai-workflows.service";
import {
  AiJobListQueryDto,
  BlueprintDto,
  DuplicateCheckDto,
  DuplicateReviewDto,
  GenerateQuestionsDto,
  ImportDocumentDto,
  PromptTemplateDto,
  ReviewGeneratedQuestionDto,
  SyllabusDto,
  UpdateGeneratedQuestionDto,
} from "./dto/ai-workflows.dto";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
class AiBaseController {
  constructor(protected readonly service: AiWorkflowsService) {}
}

@ApiTags("ai-question-workflows")
@Controller("api/v1/ai")
export class AiQuestionsController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Get("status")
  @ApiOperation({ summary: "Return AI provider and quota status." })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.service.providerStatus(user);
  }

  @Post("questions/generate")
  @ApiOperation({ summary: "Create a review-first AI question generation job." })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.service.generateQuestions(user, dto);
  }

  @Get("jobs")
  jobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AiJobListQueryDto,
  ) {
    return this.service.listJobs(user, query);
  }

  @Get("jobs/:jobId")
  job(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.getJob(user, jobId);
  }

  @Post("jobs/:jobId/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.cancelJob(user, jobId);
  }

  @Post("jobs/:jobId/regenerate")
  regenerate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
  ) {
    return this.service.regenerateJob(user, jobId);
  }

  @Patch("jobs/:jobId/results/:resultId")
  updateResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
    @Param("resultId") resultId: string,
    @Body() dto: UpdateGeneratedQuestionDto,
  ) {
    return this.service.updateGeneratedQuestion(user, jobId, resultId, dto);
  }

  @Get("jobs/:jobId/results/:resultId/versions")
  versions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
    @Param("resultId") resultId: string,
  ) {
    return this.service.resultVersions(user, jobId, resultId);
  }

  @Post("jobs/:jobId/approve")
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
    @Body() dto: ReviewGeneratedQuestionDto,
  ) {
    return this.service.approveResults(user, jobId, dto);
  }

  @Post("jobs/:jobId/reject")
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
    @Body() dto: ReviewGeneratedQuestionDto,
  ) {
    return this.service.rejectResults(user, jobId, dto);
  }

  @Post("jobs/:jobId/save-approved")
  saveApproved(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
  ) {
    return this.service.saveApprovedToQuestionBank(user, jobId);
  }
}

@ApiTags("ai-prompt-management")
@Controller("api/v1/ai/prompts")
export class AiPromptsController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listPromptTemplates(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PromptTemplateDto,
  ) {
    return this.service.createPromptTemplate(user, dto);
  }

  @Patch(":id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: Partial<PromptTemplateDto>,
  ) {
    return this.service.updatePromptTemplate(user, id, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.deletePromptTemplate(user, id);
  }
}

@ApiTags("ai-usage-settings")
@Controller("api/v1/ai")
export class AiUsageController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Get("usage")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  usage(@CurrentUser() user: AuthenticatedUser) {
    return this.service.usage(user);
  }

  @Get("settings")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  settings(@CurrentUser() user: AuthenticatedUser) {
    return this.service.settings(user);
  }

  @Patch("settings")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  updateSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.service.updateSettings(user);
  }
}

@ApiTags("question-document-imports")
@Controller("api/v1/question-imports")
export class QuestionImportsController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Post("documents")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportDocumentDto,
  ) {
    return this.service.importDocument(user, dto);
  }

  @Get("jobs")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AiJobListQueryDto,
  ) {
    return this.service.listDocumentJobs(user, query);
  }

  @Get("jobs/:jobId")
  get(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.getDocumentJob(user, jobId);
  }

  @Post("jobs/:jobId/process")
  process(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.processDocumentJob(user, jobId);
  }

  @Post("jobs/:jobId/approve")
  approve(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.approveDocumentJob(user, jobId);
  }

  @Delete("jobs/:jobId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.service.deleteDocumentJob(user, jobId);
  }
}

@ApiTags("question-duplicates")
@Controller("api/v1")
export class QuestionDuplicatesController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Post("questions/check-duplicate")
  check(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DuplicateCheckDto,
  ) {
    return this.service.checkDuplicate(user, dto);
  }

  @Get("questions/:id/duplicates")
  list(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.questionDuplicates(user, id);
  }

  @Patch("question-duplicates/:id/review")
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: DuplicateReviewDto,
  ) {
    return this.service.reviewDuplicate(user, id, dto);
  }
}

@ApiTags("syllabi")
@Controller("api/v1/syllabi")
export class SyllabiController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listSyllabi(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SyllabusDto) {
    return this.service.createSyllabus(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.getSyllabus(user, id);
  }

  @Patch(":id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SyllabusDto,
  ) {
    return this.service.updateSyllabus(user, id, dto);
  }

  @Get(":id/coverage")
  coverage(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.syllabusCoverage(user, id);
  }
}

@ApiTags("assessment-blueprints")
@Controller("api/v1/assessment-blueprints")
export class AssessmentBlueprintsController extends AiBaseController {
  constructor(@Inject(AiWorkflowsService) service: AiWorkflowsService) {
    super(service);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: BlueprintDto) {
    return this.service.createBlueprint(user, dto);
  }
}
