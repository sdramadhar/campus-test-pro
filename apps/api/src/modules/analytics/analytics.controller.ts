import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser, CookieRequest } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsQueryDto,
  CompareAnalyticsDto,
  CreateReportDefinitionDto,
  ReviewInsightDto,
  RunReportDto,
  ScheduleReportDto,
  UpdateReportDefinitionDto,
} from "./dto/analytics.dto";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api/v1")
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  @Get("analytics/platform")
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Return platform-wide aggregate analytics." })
  platform(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.platform(user, query);
  }

  @Get("analytics/colleges")
  @Roles(Role.SUPER_ADMIN)
  colleges(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.colleges(user, query);
  }

  @Get("analytics/college")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  college(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.college(user, query);
  }

  @Get("analytics/departments")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  departments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.departmentAnalytics(user, query);
  }

  @Get("analytics/batches")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  batches(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.batchAnalytics(user, query);
  }

  @Get("analytics/faculty")
  @Roles(Role.FACULTY, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN)
  faculty(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.faculty(user, query);
  }

  @Get("analytics/student")
  @Roles(Role.STUDENT)
  student(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.studentSelf(user, query);
  }

  @Get("students/:studentId/analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  studentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("studentId") studentId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.studentById(user, studentId, query);
  }

  @Get("assessments/:assessmentId/analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  assessmentAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.assessment(user, assessmentId, query);
  }

  @Get("assessments/:assessmentId/leaderboard")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  leaderboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
  ) {
    return this.analytics.assessmentLeaderboard(user, assessmentId);
  }

  @Get("assessments/:assessmentId/report")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  assessmentReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.assessmentReport(user, assessmentId, query);
  }

  @Get("questions/:questionId/analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  questionAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param("questionId") questionId: string,
  ) {
    return this.analytics.question(user, questionId);
  }

  @Get("analytics/subjects")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  subjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.subjects(user, query);
  }

  @Get("analytics/topics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  topics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.topics(user, query);
  }

  @Get("academic/syllabi/:id/analytics")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  syllabus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.analytics.syllabus(user, id);
  }

  @Post("analytics/compare")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  compare(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompareAnalyticsDto,
  ) {
    return this.analytics.compare(user, dto);
  }

  @Get("reports")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  reports(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.reports(user);
  }

  @Get("reports/results")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  resultReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.resultReports(user, query);
  }

  @Get("reports/results/export.csv")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  @Header("Content-Type", "text/csv; charset=utf-8")
  resultReportsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.resultReportsCsv(user, query);
  }

  @Post("reports")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDefinitionDto,
  ) {
    return this.analytics.createReport(user, dto);
  }

  @Get("reports/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  report(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.analytics.report(user, id);
  }

  @Patch("reports/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateReportDefinitionDto,
  ) {
    return this.analytics.updateReport(user, id, dto);
  }

  @Delete("reports/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  deleteReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.analytics.deleteReport(user, id);
  }

  @Post("reports/:id/run")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  runReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RunReportDto,
  ) {
    return this.analytics.runReport(user, id, dto);
  }

  @Post("reports/:id/schedule")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  scheduleReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ScheduleReportDto,
  ) {
    return this.analytics.scheduleReport(user, id, dto);
  }

  @Get("report-jobs")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  jobs(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.reportJobs(user);
  }

  @Get("report-jobs/:jobId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  job(@CurrentUser() user: AuthenticatedUser, @Param("jobId") jobId: string) {
    return this.analytics.reportJob(user, jobId);
  }

  @Post("report-jobs/:jobId/cancel")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  cancelJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param("jobId") jobId: string,
  ) {
    return this.analytics.cancelReportJob(user, jobId);
  }

  @Get("report-files/:fileId/download")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  @Header("Content-Type", "text/csv; charset=utf-8")
  @ApiOkResponse({ description: "Report file content returned." })
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("fileId") fileId: string,
    @Req() request: CookieRequest,
  ) {
    return this.analytics.downloadReport(user, fileId, request);
  }

  @Get("analytics/insights")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  insights(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analytics.insights(user, query);
  }

  @Post("analytics/insights/generate")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  generateInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Body() query: AnalyticsQueryDto,
  ) {
    return this.analytics.generateInsights(user, query);
  }

  @Patch("analytics/insights/:id/review")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  reviewInsight(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewInsightDto,
  ) {
    return this.analytics.reviewInsight(user, id, dto);
  }
}
