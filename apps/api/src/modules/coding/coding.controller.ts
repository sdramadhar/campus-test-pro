import {
  Body,
  Controller,
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
import {
  CodingActionDto,
  CodingRunDto,
  CodingScoreDto,
  CodingSubmitDto,
  PlagiarismDecisionDto,
  PlagiarismJobDto,
} from "./dto/coding.dto";
import { CodingService } from "./coding.service";

@ApiTags("coding")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api/v1")
export class CodingController {
  constructor(@Inject(CodingService) private readonly coding: CodingService) {}

  @Post("student/attempts/:attemptId/coding/:attemptQuestionId/run")
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: "Queue a public-sample coding run." })
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("attemptQuestionId") attemptQuestionId: string,
    @Body() dto: CodingRunDto,
  ) {
    return this.coding.run(user, attemptId, attemptQuestionId, dto);
  }

  @Post("student/attempts/:attemptId/coding/:attemptQuestionId/submit")
  @Roles(Role.STUDENT)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Param("attemptQuestionId") attemptQuestionId: string,
    @Body() dto: CodingSubmitDto,
  ) {
    return this.coding.submit(user, attemptId, attemptQuestionId, dto);
  }

  @Get("student/coding-submissions")
  @Roles(Role.STUDENT)
  studentSubmissions(@CurrentUser() user: AuthenticatedUser) {
    return this.coding.studentSubmissions(user);
  }

  @Get("student/coding-submissions/:submissionId")
  @Roles(Role.STUDENT)
  studentSubmission(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string) {
    return this.coding.studentSubmission(user, submissionId);
  }

  @Get("coding/jobs/:jobId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  job(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.coding.job(user, jobId);
  }

  @Post("coding/jobs/:jobId/cancel")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  cancelJob(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.coding.cancelJob(user, jobId);
  }

  @Get("coding/submissions")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  submissions(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string>) {
    return this.coding.submissions(user, query);
  }

  @Get("coding/submissions/:submissionId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  submission(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string) {
    return this.coding.submission(user, submissionId);
  }

  @Post("coding/submissions/:submissionId/rejudge")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  rejudge(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: CodingActionDto) {
    return this.coding.rejudge(user, submissionId, dto);
  }

  @Post("coding/submissions/:submissionId/hold")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  hold(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: CodingActionDto) {
    return this.coding.setReviewStatus(user, submissionId, "HELD", dto.reason);
  }

  @Post("coding/submissions/:submissionId/release")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  release(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: CodingActionDto) {
    return this.coding.setReviewStatus(user, submissionId, "RELEASED", dto.reason);
  }

  @Patch("coding/submissions/:submissionId/score")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  score(@CurrentUser() user: AuthenticatedUser, @Param("submissionId") submissionId: string, @Body() dto: CodingScoreDto) {
    return this.coding.overrideScore(user, submissionId, dto);
  }

  @Post("assessments/:assessmentId/coding/rejudge")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  rejudgeAssessment(@CurrentUser() user: AuthenticatedUser, @Param("assessmentId") assessmentId: string, @Body() dto: CodingActionDto) {
    return this.coding.rejudgeAssessment(user, assessmentId, dto);
  }

  @Post("coding/plagiarism/jobs")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  plagiarismJob(@CurrentUser() user: AuthenticatedUser, @Body() dto: PlagiarismJobDto) {
    return this.coding.createPlagiarismJob(user, dto);
  }

  @Get("coding/plagiarism/jobs")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  plagiarismJobs(@CurrentUser() user: AuthenticatedUser) {
    return this.coding.plagiarismJobs(user);
  }

  @Get("coding/plagiarism/jobs/:jobId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  plagiarismJobDetail(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.coding.plagiarismJob(user, jobId);
  }

  @Get("coding/plagiarism/matches/:matchId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  plagiarismMatch(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    return this.coding.plagiarismMatch(user, matchId);
  }

  @Patch("coding/plagiarism/matches/:matchId/review")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  plagiarismReview(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string, @Body() dto: PlagiarismDecisionDto) {
    return this.coding.reviewPlagiarismMatch(user, matchId, dto);
  }

  @Get("analytics/coding")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  codingAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.coding.analytics(user);
  }

  @Get("assessments/:assessmentId/coding-analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  assessmentCodingAnalytics(@CurrentUser() user: AuthenticatedUser, @Param("assessmentId") assessmentId: string) {
    return this.coding.analytics(user, { assessmentId });
  }

  @Get("questions/:questionId/coding-analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  questionCodingAnalytics(@CurrentUser() user: AuthenticatedUser, @Param("questionId") questionId: string) {
    return this.coding.analytics(user, { questionId });
  }
}
