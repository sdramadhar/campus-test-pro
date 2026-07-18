import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
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
import {
  AttemptEventDto,
  BatchSaveAnswersDto,
  SaveAnswerDto,
  StartAttemptDto,
  StudentAssessmentQueryDto,
  SubmitAttemptDto,
  UpdateReviewDto,
} from "./dto/student-exam.dto";
import { StudentExamService } from "./student-exam.service";

@ApiTags("student-exams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller("api/v1/student")
export class StudentExamController {
  constructor(
    @Inject(StudentExamService) private readonly service: StudentExamService,
  ) {}

  @Get("assessments")
  @ApiOperation({
    summary: "List assessments assigned to the current student.",
  })
  listAssessments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentAssessmentQueryDto,
  ) {
    return this.service.listStudentAssessments(user, query);
  }

  @Get("assessments/:assessmentId")
  getAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.getStudentAssessment(user, assessmentId);
  }

  @Post("assessments/:assessmentId/start")
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Body() dto: StartAttemptDto,
  ) {
    return this.service.startAttempt(user, assessmentId, dto);
  }

  @Get("attempts/:attemptId")
  getAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.getStudentAttempt(user, attemptId);
  }

  @Get("attempts/:attemptId/time")
  time(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.getAttemptTime(user, attemptId);
  }

  @Get("attempts/:attemptId/answers")
  answers(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.listAnswers(user, attemptId);
  }

  @Put("attempts/:attemptId/answers/:attemptQuestionId")
  saveAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("attemptQuestionId") attemptQuestionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.service.saveAnswer(user, attemptId, attemptQuestionId, dto);
  }

  @Post("attempts/:attemptId/answers/batch")
  batchSave(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: BatchSaveAnswersDto,
  ) {
    return this.service.batchSaveAnswers(user, attemptId, dto);
  }

  @Post("attempts/:attemptId/submit")
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.service.submitAttempt(user, attemptId, dto);
  }

  @Post("attempts/:attemptId/events")
  event(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: AttemptEventDto,
  ) {
    return this.service.logSecurityEvent(user, attemptId, dto);
  }

  @Get("results")
  results(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listStudentResults(user);
  }

  @Get("results/:resultId")
  result(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resultId") resultId: string,
  ) {
    return this.service.getStudentResult(user, resultId);
  }
}

@ApiTags("manual-reviews")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
@Controller("api/v1/reviews")
export class ReviewsController {
  constructor(
    @Inject(StudentExamService) private readonly service: StudentExamService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listReviews(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.getReview(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.updateReview(user, id, dto);
  }
}

@ApiTags("results")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
@Controller("api/v1/assessments")
export class AssessmentResultsController {
  constructor(
    @Inject(StudentExamService) private readonly service: StudentExamService,
  ) {}

  @Get(":assessmentId/results")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.assessmentResults(user, assessmentId);
  }

  @Post(":assessmentId/results/publish")
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.publishResults(user, assessmentId);
  }

  @Post(":assessmentId/results/unpublish")
  unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.unpublishResults(user, assessmentId);
  }
}

@ApiTags("results")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
@Controller("api/v1/attempts")
export class AttemptResultsController {
  constructor(
    @Inject(StudentExamService) private readonly service: StudentExamService,
  ) {}

  @Get(":attemptId/result")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.attemptResult(user, attemptId);
  }
}

@ApiTags("dashboards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
@Controller("api/v1/exam-dashboard")
export class ExamDashboardController {
  constructor(
    @Inject(StudentExamService) private readonly service: StudentExamService,
  ) {}

  @Get("stats")
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.service.dashboardStats(user);
  }
}
