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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  AssessmentAssignmentDto,
  AssessmentImportSetDto,
  AssessmentQuestionDto,
  AssessmentSectionDto,
  BankListQueryDto,
  CreateAssessmentDto,
  CreateQuestionDto,
  ImportQuestionsDto,
  ScheduleAssessmentDto,
  UpdateAssessmentDto,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from "./dto/question-bank.dto";
import { QuestionBankService } from "./question-bank.service";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
class QuestionBankBaseController {
  constructor(
    @Inject(QuestionBankService)
    protected readonly service: QuestionBankService,
  ) {}
}

@ApiTags("questions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
@Controller("api/v1/questions")
export class QuestionsController extends QuestionBankBaseController {
  @Get()
  @ApiOperation({ summary: "List tenant-scoped question-bank records." })
  @ApiOkResponse({ description: "Question list returned." })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BankListQueryDto,
  ) {
    return this.service.listQuestions(user, query);
  }

  @Get("stats")
  stats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BankListQueryDto,
  ) {
    return this.service.questionStats(user, query);
  }

  @Get("import/template")
  importTemplate() {
    return this.service.importTemplate();
  }

  @Get("import/:jobId")
  importJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
  ) {
    return this.service.getImportJob(user, jobId);
  }

  @Get("export")
  export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BankListQueryDto,
  ) {
    return this.service.exportQuestions(user, query);
  }

  @Post("import")
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportQuestionsDto,
  ) {
    return this.service.importQuestions(user, dto);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.service.createQuestion(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.getQuestion(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.service.updateQuestion(user, id, dto);
  }

  @Patch(":id/status")
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateQuestionStatusDto,
  ) {
    return this.service.updateQuestionStatus(user, id, dto.status);
  }

  @Post(":id/duplicate")
  duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.duplicateQuestion(user, id);
  }

  @Delete(":id")
  @HttpCode(200)
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.deleteQuestion(user, id);
  }
}

@ApiTags("assessments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
@Controller("api/v1/assessments")
export class AssessmentsController extends QuestionBankBaseController {
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BankListQueryDto,
  ) {
    return this.service.listAssessments(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.service.createAssessment(user, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.getAssessment(user, id);
  }

  @Get(":id/question-options")
  questionOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.assessmentQuestionOptions(user, id);
  }

  @Get(":id/question-import-sets")
  questionImportSets(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.assessmentQuestionImportSets(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.service.updateAssessment(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.deleteAssessment(user, id);
  }

  @Post(":id/sections")
  addSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AssessmentSectionDto,
  ) {
    return this.service.addSection(user, id, dto);
  }

  @Patch(":id/sections/:sectionId")
  updateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: AssessmentSectionDto,
  ) {
    return this.service.updateSection(user, id, sectionId, dto);
  }

  @Delete(":id/sections/:sectionId")
  @HttpCode(200)
  deleteSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
  ) {
    return this.service.deleteSection(user, id, sectionId);
  }

  @Post(":id/questions")
  addQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AssessmentQuestionDto,
  ) {
    return this.service.addAssessmentQuestion(user, id, dto);
  }

  @Post(":id/question-import-sets/:jobId/questions")
  addImportSetQuestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("jobId") jobId: string,
    @Body() dto: AssessmentImportSetDto,
  ) {
    return this.service.addAssessmentImportSetQuestions(user, id, jobId, dto);
  }

  @Delete(":id/questions/:questionId")
  @HttpCode(200)
  deleteQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("questionId") questionId: string,
  ) {
    return this.service.deleteAssessmentQuestion(user, id, questionId);
  }

  @Post(":id/assignments")
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AssessmentAssignmentDto,
  ) {
    return this.service.addAssessmentAssignments(user, id, dto);
  }

  @Delete(":id/assignments/:assignmentId")
  @HttpCode(200)
  deleteAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.service.deleteAssignment(user, id, assignmentId);
  }

  @Post(":id/preview")
  preview(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.previewAssessment(user, id);
  }

  @Post(":id/schedule")
  schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ScheduleAssessmentDto,
  ) {
    return this.service.scheduleAssessment(user, id, dto);
  }

  @Post(":id/publish")
  publish(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.publishAssessment(user, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.cancelAssessment(user, id);
  }

  @Post(":id/duplicate")
  duplicate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.duplicateAssessment(user, id);
  }
}
