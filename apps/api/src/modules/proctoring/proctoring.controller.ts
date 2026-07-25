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
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../generated/phase5-client";
import { AuthenticatedUser, CookieRequest } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  ConsentDto,
  EventBatchDto,
  EvidenceDto,
  HeartbeatDto,
  ProctorActionDto,
  ProctoringPolicyDto,
  ReviewDecisionDto,
  StartProctoringDto,
  SystemCheckDto,
} from "./dto/proctoring.dto";
import { ProctoringService } from "./proctoring.service";

@ApiTags("proctoring")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api/v1")
export class ProctoringController {
  constructor(@Inject(ProctoringService) private readonly service: ProctoringService) {}

  @Get("student/assessments/:assessmentId/proctoring-policy")
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: "Return student-facing proctoring policy summary." })
  studentPolicy(@CurrentUser() user: AuthenticatedUser, @Param("assessmentId") assessmentId: string) {
    return this.service.studentPolicy(user, assessmentId);
  }

  @Post("student/assessments/:assessmentId/proctoring-consent")
  @Roles(Role.STUDENT)
  consent(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Body() dto: ConsentDto,
  ) {
    return this.service.consent(user, assessmentId, dto);
  }

  @Post("student/assessments/:assessmentId/system-check")
  @Roles(Role.STUDENT)
  systemCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param("assessmentId") assessmentId: string,
    @Body() dto: SystemCheckDto,
  ) {
    return this.service.systemCheck(user, assessmentId, dto);
  }

  @Post("student/attempts/:attemptId/proctoring/start")
  @Roles(Role.STUDENT)
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: StartProctoringDto,
  ) {
    return this.service.start(user, attemptId, dto);
  }

  @Get("student/attempts/:attemptId/proctoring/session")
  @Roles(Role.STUDENT)
  studentSession(@CurrentUser() user: AuthenticatedUser, @Param("attemptId") attemptId: string) {
    return this.service.studentSession(user, attemptId);
  }

  @Post("student/attempts/:attemptId/proctoring/events/batch")
  @Roles(Role.STUDENT)
  events(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: EventBatchDto,
  ) {
    return this.service.events(user, attemptId, dto);
  }

  @Post("student/attempts/:attemptId/proctoring/heartbeat")
  @Roles(Role.STUDENT)
  heartbeat(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: HeartbeatDto,
  ) {
    return this.service.heartbeat(user, attemptId, dto);
  }

  @Post("student/attempts/:attemptId/proctoring/evidence")
  @Roles(Role.STUDENT)
  uploadEvidence(
    @CurrentUser() user: AuthenticatedUser,
    @Param("attemptId") attemptId: string,
    @Body() dto: EvidenceDto,
  ) {
    return this.service.uploadEvidence(user, attemptId, dto);
  }

  @Post("student/attempts/:attemptId/proctoring/end")
  @Roles(Role.STUDENT)
  endStudent(@CurrentUser() user: AuthenticatedUser, @Param("attemptId") attemptId: string) {
    return this.service.endStudent(user, attemptId);
  }

  @Get("proctoring/sessions")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  sessions(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string>) {
    return this.service.sessions(user, query);
  }

  @Get("proctoring/sessions/:sessionId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  session(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string) {
    return this.service.session(user, sessionId);
  }

  @Post("proctoring/sessions/:sessionId/warn")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  warn(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.warn(user, sessionId, dto);
  }

  @Post("proctoring/sessions/:sessionId/message")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  message(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    const action: ProctorActionDto = { reason: dto.reason, message: dto.message ?? "Neutral proctor message." };
    return this.service.note(user, sessionId, action, "STUDENT_VISIBLE");
  }

  @Post("proctoring/sessions/:sessionId/flag")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  flag(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.flag(user, sessionId, dto);
  }

  @Post("proctoring/sessions/:sessionId/clear")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  clear(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.clear(user, sessionId, dto);
  }

  @Post("proctoring/sessions/:sessionId/note")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  note(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.note(user, sessionId, dto, "INTERNAL");
  }

  @Post("proctoring/sessions/:sessionId/end")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  end(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.end(user, sessionId, dto);
  }

  @Get("proctoring/reviews")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  reviews(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string>) {
    return this.service.reviews(user, query);
  }

  @Get("proctoring/reviews/:sessionId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  review(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string) {
    return this.service.review(user, sessionId);
  }

  @Patch("proctoring/reviews/:sessionId")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  decide(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ReviewDecisionDto) {
    return this.service.decide(user, sessionId, dto);
  }

  @Post("proctoring/reviews/:sessionId/hold-result")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  hold(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.holdResult(user, sessionId, dto);
  }

  @Post("proctoring/reviews/:sessionId/release-result")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  release(@CurrentUser() user: AuthenticatedUser, @Param("sessionId") sessionId: string, @Body() dto: ProctorActionDto) {
    return this.service.releaseResult(user, sessionId, dto);
  }

  @Get("proctoring/policies")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  policies(@CurrentUser() user: AuthenticatedUser) {
    return this.service.policies(user);
  }

  @Post("proctoring/policies")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  createPolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProctoringPolicyDto) {
    return this.service.createPolicy(user, dto);
  }

  @Get("proctoring/policies/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY)
  policy(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.policy(user, id);
  }

  @Patch("proctoring/policies/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  updatePolicy(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ProctoringPolicyDto) {
    return this.service.updatePolicy(user, id, dto);
  }

  @Post("proctoring/policies/:id/activate")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  activatePolicy(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.setPolicyActive(user, id, true);
  }

  @Post("proctoring/policies/:id/deactivate")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  deactivatePolicy(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.setPolicyActive(user, id, false);
  }

  @Get("proctoring/evidence/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  evidence(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.evidence(user, id);
  }

  @Post("proctoring/evidence/:id/access-link")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT)
  evidenceLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: CookieRequest,
  ) {
    return this.service.evidenceLink(user, id, request);
  }

  @Delete("proctoring/evidence/:id")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  deleteEvidence(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.service.deleteEvidence(user, id);
  }

  @Post("proctoring/retention/run")
  @Roles(Role.SUPER_ADMIN, Role.COLLEGE_ADMIN)
  retention(@CurrentUser() user: AuthenticatedUser) {
    return this.service.retention(user);
  }
}
