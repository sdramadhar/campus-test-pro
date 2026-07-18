import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CompleteReviewDto,
  ModerateResultDto,
  OperationsQueryDto,
  PublishSelectedDto,
  QueueActionDto,
  ReviewListQueryDto,
  SecurityReviewDto,
} from "./dto/exam-operations.dto";
import { ExamOperationsService } from "./exam-operations.service";
import { ExamQueueService, QueueName } from "./exam-queue.service";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
class ExamOperationsBaseController {
  constructor(
    @Inject(ExamOperationsService)
    protected readonly service: ExamOperationsService,
    @Inject(ExamQueueService) protected readonly queues: ExamQueueService,
  ) {}
}

@ApiTags("exam-operations")
@Controller("api/v1/exam-operations")
export class ExamOperationsController extends ExamOperationsBaseController {
  @Get("dashboard")
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OperationsQueryDto,
  ) {
    return this.service.operationsDashboard(user, query);
  }

  @Post("sweep-expired")
  sweep() {
    return this.service.sweepExpiredAttempts();
  }

  @Get("analytics")
  analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query("assessmentId") assessmentId?: string,
  ) {
    return this.service.analytics(user, assessmentId);
  }
}

@ApiTags("review-workflow")
@Controller("api/v1/review-workflow")
export class ReviewWorkflowController extends ExamOperationsBaseController {
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReviewListQueryDto,
  ) {
    return this.service.listReviews(user, query);
  }

  @Post(":id/complete")
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CompleteReviewDto,
  ) {
    return this.service.completeReview(user, id, dto);
  }
}

@ApiTags("result-moderation")
@Controller("api/v1/result-moderation")
export class ResultModerationController extends ExamOperationsBaseController {
  @Post(":resultId")
  moderate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("resultId") resultId: string,
    @Body() dto: ModerateResultDto,
  ) {
    return this.service.moderateResult(user, resultId, dto);
  }

  @Post("assessments/:assessmentId/publish-selected")
  publishSelected(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Body() dto: PublishSelectedDto,
  ) {
    return this.service.publishEligible(user, assessmentId, dto.resultIds);
  }

  @Post("assessments/:assessmentId/publish-eligible")
  publishEligible(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.publishEligible(user, assessmentId);
  }

  @Get("assessments/:assessmentId/export.csv")
  @Header("Content-Type", "text/csv")
  export(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.service.exportResultsCsv(user, assessmentId);
  }
}

@ApiTags("security-event-review")
@Controller("api/v1/security-events")
export class SecurityEventsController extends ExamOperationsBaseController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.securitySummary(user);
  }

  @Get("attempts/:attemptId")
  attempt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
  ) {
    return this.service.securitySummary(user, attemptId);
  }

  @Post("attempts/:attemptId/review")
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: SecurityReviewDto,
  ) {
    return this.service.updateSecurityReview(user, attemptId, dto);
  }
}

@ApiTags("system-queues")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("api/v1/system/queues")
export class SystemQueuesController {
  constructor(
    @Inject(ExamQueueService) private readonly queues: ExamQueueService,
  ) {}

  @Get()
  summary() {
    return this.queues.queueSummary().then((data) => ({ success: true, data }));
  }

  @Post("retry")
  retry(@Body() dto: QueueActionDto) {
    return this.queues
      .retryFailed(dto.queueName as QueueName, dto.jobId)
      .then(() => ({ success: true, data: { retried: true } }));
  }

  @Post("remove")
  remove(@Body() dto: QueueActionDto) {
    return this.queues
      .removeFailed(dto.queueName as QueueName, dto.jobId)
      .then(() => ({ success: true, data: { removed: true } }));
  }

  @Post(":queueName/pause")
  pause(@Param("queueName") queueName: QueueName) {
    return this.queues
      .pause(queueName)
      .then(() => ({ success: true, data: { paused: true } }));
  }

  @Post(":queueName/resume")
  resume(@Param("queueName") queueName: QueueName) {
    return this.queues
      .resume(queueName)
      .then(() => ({ success: true, data: { resumed: true } }));
  }
}
