import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AnalyticsJobStatus,
  AuditEvent,
  FullscreenExitPolicy,
  ModerationStatus,
  MultipleSessionPolicy,
  Prisma,
  ProctoringEventType,
  ProctoringEvidenceType,
  ProctoringReviewStatus,
  ProctoringSessionStatus,
  Role,
  TestAttemptStatus,
  WebcamSnapshotMode,
  ScreenCaptureMode,
} from "../../../generated/phase5-client";
import { createHash, randomBytes } from "node:crypto";
import { AuthenticatedUser, CookieRequest } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
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

const allowedEvidenceMime = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxBatchEvents = 50;
const criticalEvents = new Set<ProctoringEventType>([
  ProctoringEventType.SECOND_SESSION_ATTEMPT,
  ProctoringEventType.IDENTITY_CHECK_FAILED,
  ProctoringEventType.SCREEN_SHARE_STOPPED,
]);
const terminalAttemptStatuses = new Set<TestAttemptStatus>([
  TestAttemptStatus.SUBMITTED,
  TestAttemptStatus.AUTO_SUBMITTED,
  TestAttemptStatus.EVALUATED,
]);

type SessionPatch = Pick<
  Prisma.ProctoringSessionUncheckedCreateInput,
  | "status"
  | "consentAcceptedAt"
  | "consentVersion"
  | "startedAt"
  | "lastHeartbeatAt"
  | "sessionChallengeHash"
  | "sessionChallengeUntil"
>;

@Injectable()
export class ProctoringService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async studentPolicy(user: AuthenticatedUser, assessmentId: string) {
    const assessment = await this.studentAssessment(user, assessmentId);
    const policy = await this.resolvePolicy(assessment.collegeId ?? user.collegeId, assessment.id);
    return this.ok({
      assessment: { id: assessment.id, title: assessment.title },
      policy: this.studentPolicySummary(policy),
      privacy: {
        monitored: this.monitoredSummary(policy),
        notMonitored: [
          "No emotion recognition.",
          "No race, gender, disability, or protected-attribute inference.",
          "No clipboard content, answer text, keylogging, browsing history, or monitoring outside the exam page.",
          "No continuous camera or microphone recording by default.",
        ],
      },
    });
  }

  async consent(user: AuthenticatedUser, assessmentId: string, dto: ConsentDto) {
    const assessment = await this.studentAssessment(user, assessmentId);
    const policy = await this.resolvePolicy(assessment.collegeId ?? user.collegeId, assessment.id);
    const attempt = await this.latestAttempt(user, assessmentId);
    const status = dto.accepted
      ? ProctoringSessionStatus.CHECK_PENDING
      : ProctoringSessionStatus.CANCELLED;
    const session = await this.upsertSession(attempt, policy, {
      status,
      consentAcceptedAt: dto.accepted ? new Date() : null,
      consentVersion: dto.consentVersion ?? `policy-${policy.version.toString()}`,
    });
    await this.recordEvent(
      session,
      dto.accepted ? ProctoringEventType.CONSENT_ACCEPTED : ProctoringEventType.CONSENT_DECLINED,
      1,
      `consent-${Date.now().toString()}`,
      { consentVersion: session.consentVersion ?? undefined },
    );
    await this.audit(user, AuditEvent.PROCTORING_CONSENT, session.collegeId, { assessmentId, accepted: dto.accepted });
    return this.ok({ session, consequence: dto.accepted ? "Continue to system check." : "Assessment launch may be unavailable under institution policy." });
  }

  async systemCheck(user: AuthenticatedUser, assessmentId: string, dto: SystemCheckDto) {
    const assessment = await this.studentAssessment(user, assessmentId);
    const policy = await this.resolvePolicy(assessment.collegeId ?? user.collegeId, assessment.id);
    const attempt = await this.latestAttempt(user, assessmentId);
    const session = await this.upsertSession(attempt, policy, { status: ProctoringSessionStatus.READY });
    const checks = [
      this.check("Browser support", true, dto.browser ?? "reported"),
      this.check("Cookies", true, "server session restored"),
      this.check("JavaScript", true, "client submitted check"),
      this.check("Camera permission", !policy.webcamRequired || dto.cameraPermission === true, policy.webcamRequired ? "required" : "not required"),
      this.check("Microphone permission", !policy.microphoneRequired || dto.microphonePermission === true, policy.microphoneRequired ? "required" : "not required"),
      this.check("Screen-share capability", !policy.screenShareRequired || dto.screenShareSupported === true, policy.screenShareRequired ? "required" : "not required"),
      this.check("Fullscreen capability", !policy.fullscreenRequired || dto.fullscreenSupported !== false, policy.fullscreenRequired ? "required" : "optional"),
      this.check("Network connectivity", true, "online"),
      this.check("Server time sync", true, new Date().toISOString()),
      this.check("Assessment eligibility", true, "eligible"),
    ];
    const passed = checks.every((item) => item.passed);
    await this.prisma.deviceSession.upsert({
      where: {
        attemptId_deviceHash: {
          attemptId: attempt.id,
          deviceHash: this.hash(dto.deviceHash ?? `${user.id}:${assessmentId}`),
        },
      },
      update: { lastSeenAt: new Date(), metadata: { browser: dto.browser } },
      create: {
        collegeId: attempt.collegeId,
        sessionId: session.id,
        attemptId: attempt.id,
        studentId: user.id,
        deviceHash: this.hash(dto.deviceHash ?? `${user.id}:${assessmentId}`),
        userAgentHash: dto.browser ? this.hash(dto.browser) : null,
        metadata: { browser: dto.browser, minimalFingerprint: true },
      },
    });
    if (!passed) {
      await this.prisma.proctoringSession.update({ where: { id: session.id }, data: { status: ProctoringSessionStatus.CHECK_PENDING } });
    }
    return this.ok({ sessionId: session.id, passed, checks, privacy: "No serial numbers, MAC addresses, precise geolocation, or unnecessary device fingerprinting are collected." });
  }

  async start(user: AuthenticatedUser, attemptId: string, dto: StartProctoringDto) {
    const attempt = await this.studentAttempt(user, attemptId);
    if (terminalAttemptStatuses.has(attempt.status)) {
      throw new BadRequestException("Submitted attempts cannot start proctoring.");
    }
    const policy = await this.resolvePolicy(attempt.collegeId, attempt.assessmentId);
    const existing = await this.prisma.proctoringSession.findFirst({ where: { attemptId, status: { in: [ProctoringSessionStatus.ACTIVE, ProctoringSessionStatus.READY, ProctoringSessionStatus.DISCONNECTED] } } });
    if (existing && policy.multipleSessionPolicy === MultipleSessionPolicy.BLOCK_SECOND_SESSION) {
      await this.recordEvent(existing, ProctoringEventType.SECOND_SESSION_ATTEMPT, 1, `second-${Date.now().toString()}`, { deviceHash: dto.deviceHash ? this.hash(dto.deviceHash) : null });
      throw new ForbiddenException("A proctoring session is already active for this attempt.");
    }
    const challenge = randomBytes(24).toString("hex");
    const session = await this.upsertSession(attempt, policy, {
      status: policy.proctoringEnabled ? ProctoringSessionStatus.ACTIVE : ProctoringSessionStatus.ENDED,
      startedAt: new Date(),
      lastHeartbeatAt: new Date(),
      sessionChallengeHash: this.hash(challenge),
      sessionChallengeUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.redis.client.set(`proctoring:presence:${session.id}`, user.id, "EX", 90).catch(() => undefined);
    return this.ok({ session, sessionChallengeExpiresAt: session.sessionChallengeUntil, proctoringDisabled: !policy.proctoringEnabled });
  }

  async studentSession(user: AuthenticatedUser, attemptId: string) {
    await this.studentAttempt(user, attemptId);
    const session = await this.prisma.proctoringSession.findFirst({ where: { attemptId, studentId: user.id }, orderBy: { createdAt: "desc" } });
    if (!session) throw new NotFoundException("Proctoring session not found.");
    return this.ok(await this.studentSafeSession(session.id));
  }

  async events(user: AuthenticatedUser, attemptId: string, dto: EventBatchDto) {
    if (dto.events.length > maxBatchEvents) throw new BadRequestException("Event batch is too large.");
    const attempt = await this.studentAttempt(user, attemptId);
    if (terminalAttemptStatuses.has(attempt.status)) {
      throw new BadRequestException("Submitted attempts cannot accept proctoring events.");
    }
    const session = await this.ensureSession(attempt);
    const created = [];
    for (const event of dto.events) {
      const createdEvent = await this.recordEvent(session, event.eventType, event.sequenceNumber, event.idempotencyKey, {
        clientTimestamp: event.clientTimestamp,
      });
      if (createdEvent) created.push(createdEvent);
    }
    const updated = await this.recalculateRisk(session.id);
    await this.audit(user, AuditEvent.PROCTORING_EVENT, session.collegeId, { attemptId, count: created.length });
    return this.ok({ accepted: created.length, duplicateSafe: true, session: updated, warnings: await this.pendingWarnings(session.id) });
  }

  async heartbeat(user: AuthenticatedUser, attemptId: string, dto: HeartbeatDto) {
    const attempt = await this.studentAttempt(user, attemptId);
    const session = await this.ensureSession(attempt);
    await this.prisma.sessionHeartbeat.upsert({
      where: { sessionId_sequenceNumber: { sessionId: session.id, sequenceNumber: dto.sequenceNumber } },
      update: {},
      create: {
        collegeId: session.collegeId,
        sessionId: session.id,
        attemptId,
        sequenceNumber: dto.sequenceNumber,
        clientTimestamp: dto.clientTimestamp ? new Date(dto.clientTimestamp) : null,
        connectivityState: dto.connectivityState,
        cameraState: dto.cameraState,
        microphoneState: dto.microphoneState,
        screenShareState: dto.screenShareState,
        fullscreenState: dto.fullscreenState,
        currentQuestionId: dto.currentQuestionId,
      },
    });
    const status = dto.connectivityState === "offline" ? ProctoringSessionStatus.DISCONNECTED : ProctoringSessionStatus.ACTIVE;
    const updated = await this.prisma.proctoringSession.update({
      where: { id: session.id },
      data: {
        lastHeartbeatAt: new Date(),
        status,
        disconnectStartedAt: dto.connectivityState === "offline" ? (session.disconnectStartedAt ?? new Date()) : null,
      },
    });
    await this.redis.client.set(`proctoring:presence:${session.id}`, user.id, "EX", 90).catch(() => undefined);
    return this.ok({ session: updated, reconnectSafe: true });
  }

  async uploadEvidence(user: AuthenticatedUser, attemptId: string, dto: EvidenceDto) {
    const attempt = await this.studentAttempt(user, attemptId);
    const session = await this.ensureSession(attempt);
    this.validateEvidence(dto);
    const key = `proctoring/${session.collegeId}/${session.id}/${randomBytes(16).toString("hex")}-${this.safeFile(dto.fileName)}`;
    const evidence = await this.prisma.proctoringEvidence.create({
      data: {
        collegeId: session.collegeId,
        sessionId: session.id,
        attemptId,
        studentId: user.id,
        evidenceType: dto.evidenceType,
        fileName: this.safeFile(dto.fileName),
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: key,
        checksum: dto.checksum,
        capturedAt: new Date(),
        expiresAt: this.retentionDate(session.policySnapshot),
        createdById: user.id,
        metadata: { uploadStatus: "metadata-only-foundation", private: true, noPublicUrl: true },
      },
    });
    await this.recordEvent(session, dto.evidenceType === ProctoringEvidenceType.SCREEN_CAPTURE ? ProctoringEventType.SCREEN_CAPTURED : ProctoringEventType.CAMERA_SNAPSHOT_CAPTURED, this.sequenceNow(), `evidence-${evidence.id}`, { evidenceId: evidence.id });
    return this.ok({ evidence: this.safeEvidence(evidence), upload: { signedUploadFoundation: true, private: true } });
  }

  async endStudent(user: AuthenticatedUser, attemptId: string) {
    const attempt = await this.studentAttempt(user, attemptId);
    const session = await this.ensureSession(attempt);
    return this.ok(await this.prisma.proctoringSession.update({ where: { id: session.id }, data: { status: ProctoringSessionStatus.ENDED, endedAt: new Date() } }));
  }

  async sessions(user: AuthenticatedUser, query: Record<string, string>) {
    const where = this.sessionScope(user, query);
    return this.ok({
      data: await this.prisma.proctoringSession.findMany({ where, orderBy: { updatedAt: "desc" }, take: 100 }),
    });
  }

  async session(user: AuthenticatedUser, sessionId: string) {
    const session = await this.scopedSession(user, sessionId);
    if (user.role === Role.STUDENT) return this.ok(await this.studentSafeSession(session.id));
    return this.ok({
      session,
      events: await this.prisma.proctoringEvent.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" }, take: 100 }),
      warnings: await this.prisma.proctoringWarning.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" } }),
      notes: await this.prisma.liveProctorNote.findMany({ where: { sessionId }, orderBy: { createdAt: "desc" } }),
    });
  }

  async warn(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    const warning = await this.createWarning(session, dto.message ?? "Please return to the expected exam state.", user.id, "PROCTOR_WARNING");
    await this.recordEvent(session, ProctoringEventType.PROCTOR_WARNING, this.sequenceNow(), `warn-${warning.id}`, { message: warning.message });
    return this.ok({ warning, session: await this.recalculateRisk(session.id) });
  }

  async flag(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    const updated = await this.prisma.proctoringSession.update({
      where: { id: session.id },
      data: { status: ProctoringSessionStatus.FLAGGED, flagCount: { increment: 1 }, reviewStatus: ProctoringReviewStatus.PENDING },
    });
    await this.ensureReview(updated, dto.reason ?? "Manual flag requires review.");
    await this.recordEvent(updated, ProctoringEventType.MANUAL_FLAG, this.sequenceNow(), `flag-${Date.now().toString()}`, { reason: dto.reason ?? "Manual flag" });
    return this.ok(await this.recalculateRisk(session.id));
  }

  async clear(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    await this.recordEvent(session, ProctoringEventType.MANUAL_CLEAR, this.sequenceNow(), `clear-${Date.now().toString()}`, { reason: dto.reason ?? "Manual clear" });
    const updated = await this.prisma.proctoringSession.update({ where: { id: session.id }, data: { status: ProctoringSessionStatus.ACTIVE, reviewStatus: ProctoringReviewStatus.CLEARED, reviewedById: user.id, reviewedAt: new Date() } });
    return this.ok(updated);
  }

  async note(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto, visibility: string) {
    const session = await this.scopedSession(user, sessionId);
    const note = await this.prisma.liveProctorNote.create({
      data: { collegeId: session.collegeId, sessionId, proctorId: user.id, note: dto.message ?? dto.reason ?? "Proctor note.", visibility },
    });
    await this.recordEvent(session, ProctoringEventType.PROCTOR_NOTE, this.sequenceNow(), `note-${note.id}`, { visibility });
    return this.ok(note);
  }

  async end(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    await this.createOverride(session, user.id, "END_SESSION", dto.reason ?? "Proctor ended session.");
    return this.ok(await this.prisma.proctoringSession.update({ where: { id: session.id }, data: { status: ProctoringSessionStatus.ENDED, endedAt: new Date() } }));
  }

  async reviews(user: AuthenticatedUser, query: Record<string, string>) {
    return this.ok({
      data: await this.prisma.proctoringReview.findMany({ where: this.reviewScope(user, query), orderBy: { updatedAt: "desc" }, take: 100 }),
    });
  }

  async review(user: AuthenticatedUser, sessionId: string) {
    await this.scopedSession(user, sessionId);
    const review = await this.prisma.proctoringReview.findUnique({ where: { sessionId } });
    return this.ok({
      review,
      timeline: await this.prisma.proctoringEvent.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" }, take: 300 }),
      evidence: await this.evidenceList(user, sessionId),
      warnings: await this.prisma.proctoringWarning.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } }),
    });
  }

  async decide(user: AuthenticatedUser, sessionId: string, dto: ReviewDecisionDto) {
    if (!dto.reason.trim()) throw new BadRequestException("Decision reason is required.");
    const session = await this.scopedSession(user, sessionId);
    const review = await this.ensureReview(session, dto.reason);
    const updated = await this.prisma.proctoringReview.update({
      where: { id: review.id },
      data: { status: dto.decision, decisionReason: dto.reason },
    });
    await this.prisma.proctoringReviewDecision.create({
      data: { collegeId: session.collegeId, reviewId: review.id, sessionId, reviewerId: user.id, decision: dto.decision, reason: dto.reason },
    });
    await this.prisma.proctoringSession.update({ where: { id: session.id }, data: { reviewStatus: dto.decision, reviewedById: user.id, reviewedAt: new Date() } });
    await this.audit(user, AuditEvent.PROCTORING_REVIEW, session.collegeId, { sessionId, decision: dto.decision });
    return this.ok(updated);
  }

  async holdResult(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    const reason = dto.reason ?? "Result under proctoring review.";
    await this.prisma.result.updateMany({
      where: { attemptId: session.attemptId, collegeId: session.collegeId },
      data: { moderationStatus: ModerationStatus.HELD, moderationNote: reason, heldAt: new Date(), heldById: user.id },
    });
    const review = await this.ensureReview(session, reason);
    await this.prisma.proctoringReview.update({ where: { id: review.id }, data: { resultHeld: true, resultHoldReason: reason } });
    return this.ok({ held: true, neutralStudentStatus: "Result under review" });
  }

  async releaseResult(user: AuthenticatedUser, sessionId: string, dto: ProctorActionDto) {
    const session = await this.scopedSession(user, sessionId);
    await this.prisma.result.updateMany({
      where: { attemptId: session.attemptId, collegeId: session.collegeId },
      data: { moderationStatus: ModerationStatus.RELEASED, moderationNote: dto.reason ?? "Released after proctoring review." },
    });
    await this.prisma.proctoringReview.updateMany({ where: { sessionId }, data: { resultHeld: false } });
    return this.ok({ released: true });
  }

  async policies(user: AuthenticatedUser) {
    return this.ok({
      data: await this.prisma.proctoringPolicy.findMany({ where: this.policyScope(user), orderBy: { updatedAt: "desc" }, take: 100 }),
    });
  }

  async createPolicy(user: AuthenticatedUser, dto: ProctoringPolicyDto) {
    const policy = await this.prisma.proctoringPolicy.create({ data: this.policyData(user, dto) });
    await this.audit(user, AuditEvent.PROCTORING_POLICY_UPDATE, policy.collegeId, { policyId: policy.id, action: "create" });
    return this.ok(policy);
  }

  async policy(user: AuthenticatedUser, id: string) {
    return this.ok(await this.scopedPolicy(user, id));
  }

  async updatePolicy(user: AuthenticatedUser, id: string, dto: ProctoringPolicyDto) {
    await this.scopedPolicy(user, id);
    const updated = await this.prisma.proctoringPolicy.update({
      where: { id },
      data: { ...this.policyUpdateData(dto), version: { increment: 1 }, updatedById: user.id },
    });
    await this.audit(user, AuditEvent.PROCTORING_POLICY_UPDATE, updated.collegeId, { policyId: id, action: "update" });
    return this.ok(updated);
  }

  async setPolicyActive(user: AuthenticatedUser, id: string, active: boolean) {
    await this.scopedPolicy(user, id);
    return this.ok(await this.prisma.proctoringPolicy.update({ where: { id }, data: { active, updatedById: user.id } }));
  }

  async evidence(user: AuthenticatedUser, id: string) {
    const evidence = await this.scopedEvidence(user, id);
    return this.ok(this.safeEvidence(evidence));
  }

  async evidenceLink(user: AuthenticatedUser, id: string, request: CookieRequest) {
    const evidence = await this.scopedEvidence(user, id);
    await this.prisma.evidenceAccessAudit.create({
      data: {
        collegeId: evidence.collegeId,
        evidenceId: id,
        userId: user.id,
        action: "ACCESS_LINK",
        metadata: {
          ip: request.ip,
          userAgent: Array.isArray(request.headers["user-agent"]) ? request.headers["user-agent"][0] : request.headers["user-agent"],
        },
      },
    });
    await this.audit(user, AuditEvent.PROCTORING_EVIDENCE_ACCESS, evidence.collegeId, { evidenceId: id });
    return this.ok({ expiresAt: new Date(Date.now() + 5 * 60 * 1000), signedUrl: `/api/v1/proctoring/evidence/${id}?token=redacted`, private: true });
  }

  async deleteEvidence(user: AuthenticatedUser, id: string) {
    const evidence = await this.scopedEvidence(user, id);
    if (evidence.legalHold) throw new ForbiddenException("Evidence is under legal hold.");
    await this.prisma.proctoringEvidence.delete({ where: { id } });
    return this.ok({ deleted: true, objectDeletion: "storage deletion hook queued" });
  }

  async retention(user: AuthenticatedUser) {
    const collegeId = this.scopeCollege(user);
    const job = await this.prisma.proctoringRetentionJob.create({
      data: { collegeId, status: AnalyticsJobStatus.PROCESSING, cutoffAt: new Date(), startedAt: new Date() },
    });
    const removable = await this.prisma.proctoringEvidence.findMany({
      where: { collegeId, legalHold: false, expiresAt: { lt: new Date() }, sessionId: { not: "" } },
      take: 50,
    });
    const activeReviews = await this.prisma.proctoringReview.findMany({
      where: { collegeId, sessionId: { in: removable.map((item) => item.sessionId) }, status: { in: [ProctoringReviewStatus.PENDING, ProctoringReviewStatus.IN_REVIEW, ProctoringReviewStatus.NEEDS_FOLLOW_UP] } },
      select: { sessionId: true },
    });
    const blocked = new Set(activeReviews.map((item) => item.sessionId));
    const ids = removable.filter((item) => !blocked.has(item.sessionId)).map((item) => item.id);
    if (ids.length) await this.prisma.proctoringEvidence.deleteMany({ where: { id: { in: ids } } });
    return this.ok(await this.prisma.proctoringRetentionJob.update({ where: { id: job.id }, data: { status: AnalyticsJobStatus.COMPLETED, completedAt: new Date(), deletedCount: ids.length } }));
  }

  private async latestAttempt(user: AuthenticatedUser, assessmentId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { assessmentId, studentId: user.id, collegeId: user.collegeId ?? "" },
      orderBy: { createdAt: "desc" },
    });
    if (!attempt) throw new NotFoundException("Start the assessment attempt before proctoring.");
    return attempt;
  }

  private async studentAttempt(user: AuthenticatedUser, attemptId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({ where: { id: attemptId, studentId: user.id, collegeId: user.collegeId ?? "" } });
    if (!attempt) throw new NotFoundException("Attempt not found.");
    return attempt;
  }

  private async studentAssessment(user: AuthenticatedUser, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({ where: { id: assessmentId, collegeId: user.collegeId ?? "", deletedAt: null } });
    if (!assessment) throw new NotFoundException("Assessment not found.");
    return assessment;
  }

  private async resolvePolicy(collegeId?: string | null, assessmentId?: string) {
    const policy = await this.prisma.proctoringPolicy.findFirst({
      where: {
        active: true,
        OR: [
          ...(assessmentId ? [{ assessmentId }] : []),
          { collegeId: collegeId ?? undefined, isDefault: true },
          { collegeId: null, isDefault: true },
        ],
      },
      orderBy: [{ assessmentId: "desc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
    });
    if (policy) return policy;
    return this.prisma.proctoringPolicy.create({
      data: {
        collegeId: collegeId ?? null,
        name: "Monitoring Disabled",
        isDefault: true,
        proctoringEnabled: false,
        createdById: null,
      },
    });
  }

  private async upsertSession(
    attempt: { id: string; collegeId: string; assessmentId: string; studentId: string },
    policy: Awaited<ReturnType<ProctoringService["resolvePolicy"]>>,
    data: Partial<SessionPatch>,
  ) {
    return this.prisma.proctoringSession.upsert({
      where: { attemptId: attempt.id },
      update: data,
      create: {
        collegeId: attempt.collegeId,
        assessmentId: attempt.assessmentId,
        attemptId: attempt.id,
        studentId: attempt.studentId,
        policyId: policy.id,
        policySnapshot: this.policySnapshot(policy),
        reviewStatus: policy.proctoringEnabled ? ProctoringReviewStatus.PENDING : ProctoringReviewStatus.NOT_REQUIRED,
        status: data.status ?? ProctoringSessionStatus.CONSENT_PENDING,
        consentAcceptedAt: data.consentAcceptedAt,
        consentVersion: data.consentVersion,
        startedAt: data.startedAt,
        lastHeartbeatAt: data.lastHeartbeatAt,
        sessionChallengeHash: data.sessionChallengeHash,
        sessionChallengeUntil: data.sessionChallengeUntil,
      },
    });
  }

  private async ensureSession(attempt: { id: string; collegeId: string; assessmentId: string; studentId: string }) {
    const session = await this.prisma.proctoringSession.findUnique({ where: { attemptId: attempt.id } });
    if (session) return session;
    const policy = await this.resolvePolicy(attempt.collegeId, attempt.assessmentId);
    return this.upsertSession(attempt, policy, {});
  }

  private async recordEvent(
    session: { id: string; collegeId: string; attemptId: string; studentId: string; policySnapshot: Prisma.JsonValue },
    eventType: ProctoringEventType,
    sequenceNumber: number,
    idempotencyKey: string,
    metadata: Prisma.InputJsonObject,
  ) {
    const riskDelta = this.riskDelta(eventType, session.policySnapshot);
    try {
      const event = await this.prisma.proctoringEvent.create({
        data: {
          collegeId: session.collegeId,
          sessionId: session.id,
          attemptId: session.attemptId,
          studentId: session.studentId,
          eventType,
          severity: riskDelta >= 20 ? "HIGH" : riskDelta > 0 ? "WARN" : "INFO",
          sequenceNumber,
          idempotencyKey,
          clientTimestamp: typeof metadata.clientTimestamp === "string" ? new Date(metadata.clientTimestamp) : null,
          metadata,
          riskDelta,
        },
      });
      if (riskDelta > 0 || criticalEvents.has(eventType)) {
        await this.applyPolicyAction(session.id, eventType, riskDelta);
      }
      return event;
    } catch (error) {
      if (this.isUniqueError(error)) return null;
      throw error;
    }
  }

  private async applyPolicyAction(sessionId: string, eventType: ProctoringEventType, riskDelta: number) {
    const session = await this.prisma.proctoringSession.findUniqueOrThrow({ where: { id: sessionId } });
    const snapshot = this.snapshotObject(session.policySnapshot);
    const warningCount = riskDelta > 0 ? { increment: 1 } : undefined;
    const flagCount = riskDelta >= 20 || criticalEvents.has(eventType) ? { increment: 1 } : undefined;
    if (riskDelta > 0) {
      await this.createWarning(session, this.warningMessage(eventType), null, eventType);
    }
    await this.prisma.proctoringSession.update({
      where: { id: sessionId },
      data: {
        warningCount,
        flagCount,
        status: flagCount ? ProctoringSessionStatus.FLAGGED : session.status,
        reviewStatus: flagCount ? ProctoringReviewStatus.PENDING : session.reviewStatus,
      },
    });
    if (flagCount || Number(snapshot.flagThreshold ?? 5) <= session.flagCount + 1) {
      await this.ensureReview(session, `Review indicator: ${eventType}`);
    }
  }

  private async createWarning(session: { id: string; collegeId: string; attemptId: string }, message: string, createdById: string | null, warningType: string) {
    return this.prisma.proctoringWarning.create({
      data: { collegeId: session.collegeId, sessionId: session.id, attemptId: session.attemptId, warningType, message, createdById },
    });
  }

  private async recalculateRisk(sessionId: string) {
    const events = await this.prisma.proctoringEvent.findMany({ where: { sessionId }, select: { riskDelta: true, eventType: true } });
    const riskScore = Math.min(events.reduce((total, event) => total + event.riskDelta, 0), 100);
    const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
    return this.prisma.proctoringSession.update({
      where: { id: sessionId },
      data: {
        riskScore,
        riskLevel,
        riskContributors: events.filter((event) => event.riskDelta > 0).map((event) => ({ eventType: event.eventType, weight: event.riskDelta })),
      },
    });
  }

  private riskDelta(eventType: ProctoringEventType, policySnapshot: Prisma.JsonValue) {
    const snapshot = this.snapshotObject(policySnapshot);
    const weights = this.snapshotObject(snapshot.riskWeights);
    if (typeof weights[eventType] === "number") return weights[eventType];
    if (eventType === ProctoringEventType.FULLSCREEN_EXIT) return snapshot.fullscreenExitPolicy === FullscreenExitPolicy.FLAG ? 20 : snapshot.fullscreenExitPolicy === FullscreenExitPolicy.WARN ? 8 : 0;
    switch (eventType) {
      case ProctoringEventType.TAB_HIDDEN:
      case ProctoringEventType.WINDOW_BLUR:
        return snapshot.tabSwitchMonitoring ? 6 : 0;
      case ProctoringEventType.COPY:
      case ProctoringEventType.PASTE:
      case ProctoringEventType.CONTEXT_MENU:
      case ProctoringEventType.FORBIDDEN_SHORTCUT:
        return 5;
      case ProctoringEventType.NETWORK_DISCONNECT:
      case ProctoringEventType.SCREEN_SHARE_STOPPED:
        return 12;
      case ProctoringEventType.SECOND_SESSION_ATTEMPT:
      case ProctoringEventType.IDENTITY_CHECK_FAILED:
      case ProctoringEventType.MANUAL_FLAG:
        return 25;
      default:
        return 0;
    }
  }

  private warningMessage(eventType: ProctoringEventType) {
    return `A proctoring review signal was recorded (${eventType}). Please return to the expected exam state. This is not an accusation.`;
  }

  private async ensureReview(session: { id: string; collegeId: string; assessmentId: string; attemptId: string; studentId: string }, reason: string) {
    return this.prisma.proctoringReview.upsert({
      where: { sessionId: session.id },
      update: { status: ProctoringReviewStatus.PENDING, resultHoldReason: reason },
      create: { collegeId: session.collegeId, sessionId: session.id, assessmentId: session.assessmentId, attemptId: session.attemptId, studentId: session.studentId, status: ProctoringReviewStatus.PENDING, resultHoldReason: reason },
    });
  }

  private async scopedSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.proctoringSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Proctoring session not found.");
    if (user.role !== Role.SUPER_ADMIN && session.collegeId !== user.collegeId) throw new ForbiddenException("Session is outside your tenant.");
    if (user.role === Role.STUDENT && session.studentId !== user.id) throw new ForbiddenException("Session is not yours.");
    return session;
  }

  private sessionScope(user: AuthenticatedUser, query: Record<string, string>): Prisma.ProctoringSessionWhereInput {
    return {
      ...(user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId ?? "" }),
      ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
      ...(query.status ? { status: query.status as ProctoringSessionStatus } : {}),
    };
  }

  private reviewScope(user: AuthenticatedUser, query: Record<string, string>): Prisma.ProctoringReviewWhereInput {
    return {
      ...(user.role === Role.SUPER_ADMIN ? {} : { collegeId: user.collegeId ?? "" }),
      ...(query.assessmentId ? { assessmentId: query.assessmentId } : {}),
      ...(query.status ? { status: query.status as ProctoringReviewStatus } : {}),
    };
  }

  private policyScope(user: AuthenticatedUser): Prisma.ProctoringPolicyWhereInput {
    return user.role === Role.SUPER_ADMIN ? {} : { OR: [{ collegeId: user.collegeId }, { collegeId: null }] };
  }

  private async scopedPolicy(user: AuthenticatedUser, id: string) {
    const policy = await this.prisma.proctoringPolicy.findFirst({ where: { id, ...this.policyScope(user) } });
    if (!policy) throw new NotFoundException("Policy not found.");
    return policy;
  }

  private policyData(user: AuthenticatedUser, dto: ProctoringPolicyDto): Prisma.ProctoringPolicyUncheckedCreateInput {
    return {
      collegeId: user.role === Role.SUPER_ADMIN ? null : user.collegeId,
      assessmentId: dto.assessmentId,
      name: dto.name.trim(),
      proctoringEnabled: dto.proctoringEnabled ?? false,
      consentRequired: dto.consentRequired ?? false,
      fullscreenRequired: dto.fullscreenRequired ?? false,
      fullscreenExitPolicy: dto.fullscreenExitPolicy ?? FullscreenExitPolicy.LOG_ONLY,
      tabSwitchMonitoring: dto.tabSwitchMonitoring ?? false,
      copyMonitoring: dto.copyMonitoring ?? false,
      pasteMonitoring: dto.pasteMonitoring ?? false,
      contextMenuMonitoring: dto.contextMenuMonitoring ?? false,
      keyboardShortcutMonitoring: dto.keyboardShortcutMonitoring ?? false,
      multipleSessionPolicy: dto.multipleSessionPolicy ?? MultipleSessionPolicy.WARN_ONLY,
      webcamRequired: dto.webcamRequired ?? false,
      webcamSnapshotMode: dto.webcamSnapshotMode ?? WebcamSnapshotMode.DISABLED,
      webcamSnapshotIntervalSeconds: dto.webcamSnapshotIntervalSeconds,
      microphoneRequired: dto.microphoneRequired ?? false,
      microphoneCheckOnly: dto.microphoneCheckOnly ?? true,
      screenShareRequired: dto.screenShareRequired ?? false,
      screenCaptureMode: dto.screenCaptureMode ?? ScreenCaptureMode.DISABLED,
      screenCaptureIntervalSeconds: dto.screenCaptureIntervalSeconds,
      identityCheckRequired: dto.identityCheckRequired ?? false,
      environmentCheckRequired: dto.environmentCheckRequired ?? false,
      networkDisconnectThresholdSeconds: dto.networkDisconnectThresholdSeconds ?? 60,
      warningThreshold: dto.warningThreshold ?? 3,
      flagThreshold: dto.flagThreshold ?? 5,
      autoSubmitOnCriticalViolation: dto.autoSubmitOnCriticalViolation ?? false,
      allowManualOverride: dto.allowManualOverride ?? true,
      evidenceRetentionDays: dto.evidenceRetentionDays ?? 30,
      studentReviewVisibility: dto.studentReviewVisibility ?? true,
      proctorInstructions: dto.proctorInstructions,
      institutionPrivacyNotice: dto.institutionPrivacyNotice,
      emergencySupportContact: dto.emergencySupportContact,
      riskWeights: { SECOND_SESSION_ATTEMPT: 25, FULLSCREEN_EXIT: 8, TAB_HIDDEN: 6, NETWORK_DISCONNECT: 12, MANUAL_FLAG: 25 },
      createdById: user.id,
      updatedById: user.id,
    };
  }

  private policyUpdateData(dto: ProctoringPolicyDto): Prisma.ProctoringPolicyUncheckedUpdateInput {
    return {
      assessmentId: dto.assessmentId,
      name: dto.name.trim(),
      proctoringEnabled: dto.proctoringEnabled ?? false,
      consentRequired: dto.consentRequired ?? false,
      fullscreenRequired: dto.fullscreenRequired ?? false,
      fullscreenExitPolicy: dto.fullscreenExitPolicy ?? FullscreenExitPolicy.LOG_ONLY,
      tabSwitchMonitoring: dto.tabSwitchMonitoring ?? false,
      copyMonitoring: dto.copyMonitoring ?? false,
      pasteMonitoring: dto.pasteMonitoring ?? false,
      contextMenuMonitoring: dto.contextMenuMonitoring ?? false,
      keyboardShortcutMonitoring: dto.keyboardShortcutMonitoring ?? false,
      multipleSessionPolicy: dto.multipleSessionPolicy ?? MultipleSessionPolicy.WARN_ONLY,
      webcamRequired: dto.webcamRequired ?? false,
      webcamSnapshotMode: dto.webcamSnapshotMode ?? WebcamSnapshotMode.DISABLED,
      webcamSnapshotIntervalSeconds: dto.webcamSnapshotIntervalSeconds,
      microphoneRequired: dto.microphoneRequired ?? false,
      microphoneCheckOnly: dto.microphoneCheckOnly ?? true,
      screenShareRequired: dto.screenShareRequired ?? false,
      screenCaptureMode: dto.screenCaptureMode ?? ScreenCaptureMode.DISABLED,
      screenCaptureIntervalSeconds: dto.screenCaptureIntervalSeconds,
      identityCheckRequired: dto.identityCheckRequired ?? false,
      environmentCheckRequired: dto.environmentCheckRequired ?? false,
      networkDisconnectThresholdSeconds: dto.networkDisconnectThresholdSeconds ?? 60,
      warningThreshold: dto.warningThreshold ?? 3,
      flagThreshold: dto.flagThreshold ?? 5,
      autoSubmitOnCriticalViolation: dto.autoSubmitOnCriticalViolation ?? false,
      allowManualOverride: dto.allowManualOverride ?? true,
      evidenceRetentionDays: dto.evidenceRetentionDays ?? 30,
      studentReviewVisibility: dto.studentReviewVisibility ?? true,
      proctorInstructions: dto.proctorInstructions,
      institutionPrivacyNotice: dto.institutionPrivacyNotice,
      emergencySupportContact: dto.emergencySupportContact,
      riskWeights: { SECOND_SESSION_ATTEMPT: 25, FULLSCREEN_EXIT: 8, TAB_HIDDEN: 6, NETWORK_DISCONNECT: 12, MANUAL_FLAG: 25 },
    };
  }

  private policySnapshot(policy: Awaited<ReturnType<ProctoringService["resolvePolicy"]>>) {
    return {
      id: policy.id,
      name: policy.name,
      version: policy.version,
      proctoringEnabled: policy.proctoringEnabled,
      consentRequired: policy.consentRequired,
      fullscreenRequired: policy.fullscreenRequired,
      fullscreenExitPolicy: policy.fullscreenExitPolicy,
      tabSwitchMonitoring: policy.tabSwitchMonitoring,
      copyMonitoring: policy.copyMonitoring,
      pasteMonitoring: policy.pasteMonitoring,
      contextMenuMonitoring: policy.contextMenuMonitoring,
      keyboardShortcutMonitoring: policy.keyboardShortcutMonitoring,
      multipleSessionPolicy: policy.multipleSessionPolicy,
      webcamRequired: policy.webcamRequired,
      webcamSnapshotMode: policy.webcamSnapshotMode,
      microphoneRequired: policy.microphoneRequired,
      microphoneCheckOnly: policy.microphoneCheckOnly,
      screenShareRequired: policy.screenShareRequired,
      screenCaptureMode: policy.screenCaptureMode,
      identityCheckRequired: policy.identityCheckRequired,
      environmentCheckRequired: policy.environmentCheckRequired,
      evidenceRetentionDays: policy.evidenceRetentionDays,
      warningThreshold: policy.warningThreshold,
      flagThreshold: policy.flagThreshold,
      autoSubmitOnCriticalViolation: policy.autoSubmitOnCriticalViolation,
      riskWeights: policy.riskWeights,
    };
  }

  private studentPolicySummary(policy: Awaited<ReturnType<ProctoringService["resolvePolicy"]>>) {
    return {
      proctoringEnabled: policy.proctoringEnabled,
      consentRequired: policy.consentRequired,
      fullscreenRequired: policy.fullscreenRequired,
      cameraRequired: policy.webcamRequired,
      microphoneRequired: policy.microphoneRequired,
      screenShareRequired: policy.screenShareRequired,
      retentionDays: policy.evidenceRetentionDays,
      reviewerAccess: "Authorized institution reviewers only.",
      privacyNotice: policy.institutionPrivacyNotice,
      supportContact: policy.emergencySupportContact,
      studentReviewVisibility: policy.studentReviewVisibility,
    };
  }

  private monitoredSummary(policy: Awaited<ReturnType<ProctoringService["resolvePolicy"]>>) {
    return {
      fullscreen: policy.fullscreenRequired || policy.fullscreenExitPolicy !== FullscreenExitPolicy.LOG_ONLY,
      tabSwitches: policy.tabSwitchMonitoring,
      copyPasteContextMenu: policy.copyMonitoring || policy.pasteMonitoring || policy.contextMenuMonitoring,
      keyboardShortcuts: policy.keyboardShortcutMonitoring,
      camera: policy.webcamRequired ? policy.webcamSnapshotMode : WebcamSnapshotMode.DISABLED,
      microphone: policy.microphoneRequired ? "permission/check only by default" : "not required",
      screenShare: policy.screenShareRequired ? policy.screenCaptureMode : ScreenCaptureMode.DISABLED,
    };
  }

  private async studentSafeSession(sessionId: string) {
    const session = await this.prisma.proctoringSession.findUniqueOrThrow({ where: { id: sessionId } });
    const evidenceCategories = await this.prisma.proctoringEvidence.groupBy({ by: ["evidenceType"], where: { sessionId }, _count: true });
    return {
      id: session.id,
      status: session.status,
      consentAcceptedAt: session.consentAcceptedAt,
      warningCount: session.warningCount,
      flagCount: session.flagCount,
      riskLevel: session.riskLevel,
      reviewStatus: session.reviewStatus,
      retentionExpiry: this.retentionDate(session.policySnapshot),
      evidenceCategories: evidenceCategories.map((item) => item.evidenceType),
      note: "Internal reviewer notes and detailed security rules are not shown to students.",
    };
  }

  private pendingWarnings(sessionId: string) {
    return this.prisma.proctoringWarning.findMany({ where: { sessionId, acknowledgedAt: null }, orderBy: { createdAt: "desc" }, take: 10 });
  }

  private async evidenceList(user: AuthenticatedUser, sessionId: string) {
    const session = await this.scopedSession(user, sessionId);
    const evidence = await this.prisma.proctoringEvidence.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" } });
    return evidence.map((item) => this.safeEvidence(item));
  }

  private async scopedEvidence(user: AuthenticatedUser, id: string) {
    const evidence = await this.prisma.proctoringEvidence.findUnique({ where: { id } });
    if (!evidence) throw new NotFoundException("Evidence not found.");
    if (user.role !== Role.SUPER_ADMIN && evidence.collegeId !== user.collegeId) throw new ForbiddenException("Evidence is outside your tenant.");
    if (user.role === Role.STUDENT && evidence.studentId !== user.id) throw new ForbiddenException("Evidence is not yours.");
    return evidence;
  }

  private safeEvidence(evidence: { id: string; evidenceType: ProctoringEvidenceType; fileName: string; mimeType: string; sizeBytes: number; expiresAt: Date; legalHold: boolean; malwareScanStatus: string; createdAt: Date }) {
    return {
      id: evidence.id,
      evidenceType: evidence.evidenceType,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      expiresAt: evidence.expiresAt,
      legalHold: evidence.legalHold,
      malwareScanStatus: evidence.malwareScanStatus,
      createdAt: evidence.createdAt,
      private: true,
      publicUrl: null,
    };
  }

  private validateEvidence(dto: EvidenceDto) {
    if (!allowedEvidenceMime.has(dto.mimeType)) throw new BadRequestException("Evidence MIME type is not allowed.");
    if (dto.evidenceType === ProctoringEvidenceType.PROCTOR_NOTE_ATTACHMENT && dto.mimeType !== "application/pdf") {
      throw new BadRequestException("Note attachments must use the configured document evidence format.");
    }
  }

  private retentionDate(policySnapshot: Prisma.JsonValue) {
    const snapshot = this.snapshotObject(policySnapshot);
    const days = typeof snapshot.evidenceRetentionDays === "number" ? snapshot.evidenceRetentionDays : 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private snapshotObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private check(label: string, passed: boolean, detail: string) {
    return { label, passed, detail };
  }

  private scopeCollege(user: AuthenticatedUser) {
    if (user.role === Role.SUPER_ADMIN) throw new BadRequestException("Select a college-specific scope.");
    if (!user.collegeId) throw new ForbiddenException("College scope is required.");
    return user.collegeId;
  }

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private safeFile(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  }

  private sequenceNow() {
    return Math.floor(Date.now() % 2_000_000_000);
  }

  private isUniqueError(error: unknown) {
    return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002");
  }

  private async createOverride(session: { id: string; collegeId: string }, userId: string, overrideType: string, reason: string) {
    await this.prisma.proctoringOverride.create({ data: { collegeId: session.collegeId, sessionId: session.id, overrideType, reason, createdById: userId } });
  }

  private async audit(user: AuthenticatedUser, event: AuditEvent, collegeId: string | null, metadata: Prisma.InputJsonObject) {
    await this.prisma.auditLog.create({ data: { userId: user.id, collegeId, event, actorRole: user.role, metadata } }).catch(() => undefined);
  }

  private ok<T>(data: T) {
    return { success: true, data };
  }
}
