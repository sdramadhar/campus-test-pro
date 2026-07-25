import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  AuditEvent,
  BillingProvider,
  DataExportStatus,
  OnboardingStepStatus,
  Role,
  SupportTicketStatus,
  TenantDomainStatus,
  TenantLifecycleStatus,
  WebhookProcessingStatus,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { env } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { BillingProviderRegistry } from "./billing-provider";
import {
  BrandingDto,
  ChangeSubscriptionDto,
  CheckoutSessionDto,
  DataExportDto,
  DomainDto,
  InstitutionSignupDto,
  MobileDeviceDto,
  PushTokenDto,
  ReasonDto,
  SaveOnboardingStepDto,
  SupportReplyDto,
  SupportTicketDto,
  TenantCreditDto,
  TenantStatusDto,
  TrialExtensionDto,
} from "./dto/saas.dto";

const setupChecklist = [
  "college profile completed",
  "logo uploaded",
  "departments created",
  "faculty added",
  "students added",
  "subjects configured",
  "first question added",
  "first assessment created",
  "first test assigned",
];

const entitlementFeatureKeys = [
  "ai_question_generation",
  "ai_provider_usage",
  "document_import",
  "ocr",
  "advanced_analytics",
  "scheduled_reports",
  "coding_assessments",
  "proctoring",
  "live_proctoring",
  "private_object_storage",
  "custom_branding",
  "custom_domain",
  "api_access",
  "sso",
  "priority_support",
  "data_export",
  "mobile_access",
  "white_label",
];

@Injectable()
export class SaasService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(BillingProviderRegistry)
    private readonly billingProviders: BillingProviderRegistry,
  ) {}

  async publicPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isPublic: true, isActive: true },
      include: {
        versions: {
          where: { isActive: true },
          include: { features: true, limits: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });
    return {
      billingProvider: env().BILLING_PROVIDER,
      billingEnabled: env().BILLING_ENABLED === "true",
      note:
        env().BILLING_ENABLED === "true"
          ? "Checkout is completed through a provider-hosted flow."
          : "Billing is disabled locally; plans are shown for configuration and manual administration.",
      plans: plans.map((plan) => {
        const version = plan.versions[0];
        return {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          versionId: version?.id ?? null,
          currency: version?.currency ?? env().BILLING_CURRENCY,
          priceCents: version?.priceCents ?? null,
          trialDays: version?.trialDays ?? env().TRIAL_DAYS,
          features: version?.features ?? [],
          limits: version?.limits ?? [],
        };
      }),
    };
  }

  async publicPlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        versions: {
          where: { isActive: true },
          include: { features: true, limits: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!plan || !plan.isPublic || !plan.isActive) {
      throw new NotFoundException("Plan not found.");
    }
    return plan;
  }

  async institutionSignup(dto: InstitutionSignupDto) {
    const code = dto.institutionCode.trim().toUpperCase();
    const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await this.prisma.college.findFirst({
      where: {
        OR: [{ collegeCode: code }, { email: dto.adminEmail }, { slug }],
      },
    });
    if (existing) {
      throw new BadRequestException("Institution registration could not be completed.");
    }
    const trialPlan = await this.activePlanVersion("FREE_TRIAL");
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + env().TRIAL_DAYS * 86_400_000);
    const college = await this.prisma.college.create({
      data: {
        slug,
        collegeCode: code,
        name: dto.institutionName.trim(),
        email: dto.adminEmail.toLowerCase(),
        phone: dto.phone,
        website: dto.website,
        addressLine1: "Pending onboarding",
        city: "Pending",
        state: "Pending",
        postalCode: "000000",
        country: "Pending",
        isActive: true,
      },
    });
    const admin = await this.prisma.user.create({
      data: {
        email: dto.adminEmail.toLowerCase(),
        name: dto.adminName.trim(),
        phone: dto.phone,
        role: Role.COLLEGE_ADMIN,
        collegeId: college.id,
        isActive: true,
        mustChangePassword: true,
      },
    });
    await this.prisma.tenantProfile.create({
      data: {
        collegeId: college.id,
        status: TenantLifecycleStatus.TRIAL,
        trialStartedAt: now,
        trialEndsAt,
        billingEmail: dto.adminEmail.toLowerCase(),
        onboardingPercent: 12,
        setupChecklist: Object.fromEntries(
          setupChecklist.map((item) => [item, false]),
        ),
      },
    });
    await this.prisma.tenantSubscription.create({
      data: {
        collegeId: college.id,
        planId: trialPlan.planId,
        planVersionId: trialPlan.id,
        status: TenantLifecycleStatus.TRIAL,
        provider: BillingProvider.DISABLED,
        trialEndsAt,
        planSnapshot: this.planSnapshot(trialPlan),
      },
    });
    await this.prisma.billingCustomer.create({
      data: {
        collegeId: college.id,
        provider: BillingProvider.DISABLED,
        billingEmail: dto.adminEmail.toLowerCase(),
        legalName: dto.institutionName.trim(),
      },
    });
    await this.audit(AuditEvent.TENANT_REGISTRATION, admin.id, college.id, {
      status: "TRIAL",
    });
    return {
      tenantId: college.id,
      status: "TRIAL",
      onboardingUrl: "/onboarding",
      message: "Institution trial created. Invitation email is queued in development console mode.",
    };
  }

  async onboarding(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    const [profile, steps] = await Promise.all([
      this.prisma.tenantProfile.findUnique({ where: { collegeId } }),
      this.prisma.onboardingProgress.findMany({
        where: { collegeId },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      status: profile?.status ?? "TRIAL",
      onboardingPercent: profile?.onboardingPercent ?? 0,
      setupChecklist: profile?.setupChecklist ?? {},
      steps,
    };
  }

  async saveOnboardingStep(user: AuthenticatedUser, dto: SaveOnboardingStepDto) {
    const collegeId = this.requireTenant(user);
    const status = dto.skipped
      ? OnboardingStepStatus.SKIPPED
      : dto.completed
        ? OnboardingStepStatus.COMPLETED
        : OnboardingStepStatus.IN_PROGRESS;
    const step = await this.prisma.onboardingProgress.upsert({
      where: { collegeId_step: { collegeId, step: dto.step } },
      update: {
        status,
        payload: this.safeJson(dto.payload),
        completedAt: status === OnboardingStepStatus.COMPLETED ? new Date() : null,
        updatedById: user.id,
      },
      create: {
        collegeId,
        step: dto.step,
        status,
        payload: this.safeJson(dto.payload),
        completedAt: status === OnboardingStepStatus.COMPLETED ? new Date() : null,
        updatedById: user.id,
      },
    });
    const completed = await this.prisma.onboardingProgress.count({
      where: { collegeId, status: OnboardingStepStatus.COMPLETED },
    });
    await this.prisma.tenantProfile.update({
      where: { collegeId },
      data: { onboardingPercent: Math.min(100, Math.round((completed / 8) * 100)) },
    });
    await this.audit(AuditEvent.TENANT_ONBOARDING_UPDATE, user.id, collegeId, {
      step: dto.step,
      status,
    });
    return step;
  }

  async subscription(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    const [subscription, entitlements] = await Promise.all([
      this.prisma.tenantSubscription.findFirst({
        where: { collegeId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.featureEntitlement.findMany({ where: { collegeId } }),
    ]);
    return { subscription, entitlements, provider: env().BILLING_PROVIDER };
  }

  async checkoutSession(user: AuthenticatedUser, dto: CheckoutSessionDto) {
    const collegeId = this.requireTenant(user);
    const version = await this.prisma.planVersion.findUnique({
      where: { id: dto.planVersionId },
      include: { plan: true, features: true, limits: true },
    });
    if (!version || !version.isActive || !version.plan.isActive) {
      throw new BadRequestException("Selected plan is not available.");
    }
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();
    const adapter = this.billingProviders.adapter();
    const checkout = await adapter.createCheckoutSession({
      tenantId: collegeId,
      planCode: version.plan.code,
      planVersionId: version.id,
      idempotencyKey,
    });
    const session = await this.prisma.billingCheckoutSession.upsert({
      where: { provider_idempotencyKey: { provider: checkout.provider, idempotencyKey } },
      update: { status: checkout.status, checkoutUrl: checkout.checkoutUrl },
      create: {
        collegeId,
        planVersionId: version.id,
        provider: checkout.provider,
        providerSessionId: checkout.providerSessionId,
        idempotencyKey,
        status: checkout.status,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        metadata: { providerHosted: checkout.checkoutUrl !== null },
      },
    });
    await this.audit(AuditEvent.BILLING_CHECKOUT, user.id, collegeId, {
      provider: checkout.provider,
      planCode: version.plan.code,
    });
    return {
      session,
      providerHosted: checkout.checkoutUrl !== null,
      message:
        checkout.checkoutUrl === null
          ? "Billing is disabled or manual; no payment was collected."
          : "Continue with the provider-hosted checkout.",
    };
  }

  async portalSession(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.billingProviders.adapter().createPortalSession(collegeId);
  }

  async changeSubscription(user: AuthenticatedUser, dto: ChangeSubscriptionDto) {
    const collegeId = this.requireTenant(user);
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
      include: {
        versions: {
          where: { isActive: true },
          include: { features: true, limits: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!plan || !plan.versions[0]) {
      throw new BadRequestException("Plan is not available.");
    }
    const request = await this.prisma.subscriptionChangeRequest.create({
      data: {
        collegeId,
        requestedPlanId: plan.id,
        requestType: "CHANGE_PLAN",
        reason: dto.reason,
        requestedById: user.id,
      },
    });
    await this.audit(AuditEvent.SUBSCRIPTION_CHANGE, user.id, collegeId, {
      requestedPlan: plan.code,
      requestId: request.id,
    });
    return {
      request,
      message: "Plan change request recorded. Provider proration is handled by the billing adapter.",
    };
  }

  async cancelSubscription(user: AuthenticatedUser, dto: ReasonDto) {
    const collegeId = this.requireTenant(user);
    const request = await this.prisma.tenantCancellationRequest.create({
      data: {
        collegeId,
        requestedById: user.id,
        reason: dto.reason,
        cancelAtPeriodEnd: true,
        readOnlyStartsAt: new Date(Date.now() + 30 * 86_400_000),
        retentionEndsAt: new Date(Date.now() + 120 * 86_400_000),
      },
    });
    await this.prisma.tenantProfile.update({
      where: { collegeId },
      data: {
        status: TenantLifecycleStatus.CANCELLED,
        cancelledAt: new Date(),
        lifecycleReason: dto.reason,
      },
    });
    await this.audit(AuditEvent.TENANT_CANCELLATION_REQUEST, user.id, collegeId, {
      requestId: request.id,
    });
    return {
      request,
      message: "Cancellation is scheduled. Data is retained through the configured retention period.",
    };
  }

  async reactivateSubscription(user: AuthenticatedUser, dto: ReasonDto) {
    const collegeId = this.requireTenant(user);
    await this.prisma.tenantProfile.update({
      where: { collegeId },
      data: { status: TenantLifecycleStatus.ACTIVE, lifecycleReason: dto.reason },
    });
    await this.audit(AuditEvent.TENANT_STATUS_UPDATE, user.id, collegeId, {
      status: "ACTIVE",
    });
    return { status: "ACTIVE" };
  }

  async invoices(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.prisma.billingInvoice.findMany({
      where: { collegeId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async payments(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.prisma.billingPayment.findMany({
      where: { collegeId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async usage(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.usageForTenant(collegeId);
  }

  async webhook(provider: string, signature: string | undefined, payload: unknown) {
    const normalizedProvider = provider.toUpperCase() as BillingProvider;
    if (!Object.values(BillingProvider).includes(normalizedProvider)) {
      throw new BadRequestException("Unsupported billing provider.");
    }
    if (!this.billingProviders.adapter().verifyWebhookSignature(payload, signature)) {
      throw new UnauthorizedException("Invalid webhook signature.");
    }
    const event = this.providerEvent(payload);
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    const record = await this.prisma.billingWebhookEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: normalizedProvider,
          providerEventId: event.id,
        },
      },
      update: { status: WebhookProcessingStatus.PROCESSED, processedAt: new Date() },
      create: {
        provider: normalizedProvider,
        providerEventId: event.id,
        eventType: event.type,
        status: WebhookProcessingStatus.PROCESSED,
        payloadHash,
        payloadSummary: event.summary,
        processedAt: new Date(),
      },
    });
    await this.prisma.billingAuditEvent.create({
      data: {
        provider: normalizedProvider,
        eventType: event.type,
        metadata: { eventId: event.id, status: "PROCESSED" },
      },
    });
    return { received: true, idempotent: record.createdAt < record.updatedAt };
  }

  async branding(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.prisma.tenantBranding.findUnique({ where: { collegeId } });
  }

  async updateBranding(user: AuthenticatedUser, dto: BrandingDto) {
    const collegeId = this.requireTenant(user);
    await this.assertEntitled(collegeId, "custom_branding");
    this.validateBranding(dto);
    const current = await this.prisma.tenantBranding.findUnique({ where: { collegeId } });
    const nextVersion = (current?.version ?? 0) + 1;
    if (current) {
      await this.prisma.tenantBrandingVersion.create({
        data: { collegeId, version: current.version, snapshot: current, createdById: user.id },
      });
    }
    const branding = await this.prisma.tenantBranding.upsert({
      where: { collegeId },
      update: {
        institutionName: dto.institutionName,
        shortName: dto.shortName,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        supportEmail: dto.supportEmail,
        supportPhone: dto.supportPhone,
        privacyPolicyUrl: dto.privacyPolicyUrl,
        termsUrl: dto.termsUrl,
        version: nextVersion,
        updatedById: user.id,
      },
      create: {
        collegeId,
        institutionName: dto.institutionName,
        shortName: dto.shortName,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        supportEmail: dto.supportEmail,
        supportPhone: dto.supportPhone,
        privacyPolicyUrl: dto.privacyPolicyUrl,
        termsUrl: dto.termsUrl,
        updatedById: user.id,
      },
    });
    await this.audit(AuditEvent.BRANDING_UPDATE, user.id, collegeId, {
      version: branding.version,
    });
    return branding;
  }

  async domains(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.prisma.tenantDomain.findMany({
      where: { collegeId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDomain(user: AuthenticatedUser, dto: DomainDto) {
    const collegeId = this.requireTenant(user);
    await this.assertEntitled(collegeId, "custom_domain");
    const domain = dto.domain.toLowerCase().trim();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) || domain.includes("..")) {
      throw new BadRequestException("Enter a valid domain name.");
    }
    const existing = await this.prisma.tenantDomain.findUnique({ where: { domain } });
    if (existing) {
      if (existing.collegeId !== collegeId) {
        throw new BadRequestException("Domain is already registered.");
      }
      return {
        ...existing,
        dnsTxtName: `_campustest.${domain}`,
        dnsTxtValue: "already-issued",
        note: "Domain verification already exists for this tenant.",
      };
    }
    const verificationValue = `campustest-verify-${randomUUID()}`;
    const created = await this.prisma.tenantDomain.create({
      data: {
        collegeId,
        domain,
        status: TenantDomainStatus.PENDING,
        verificationTokenHash: this.hash(verificationValue),
        cnameTarget: "tenant.campustest.example",
      },
    });
    await this.prisma.domainVerification.create({
      data: {
        domainId: created.id,
        expectedValueHash: this.hash(verificationValue),
      },
    });
    await this.audit(AuditEvent.DOMAIN_UPDATE, user.id, collegeId, {
      domain,
      status: "PENDING",
    });
    return {
      ...created,
      dnsTxtName: `_campustest.${domain}`,
      dnsTxtValue: verificationValue,
      note: "DNS changes are not attempted automatically.",
    };
  }

  async dataExports(user: AuthenticatedUser) {
    const collegeId = this.requireTenant(user);
    return this.prisma.tenantDataExport.findMany({
      where: { collegeId },
      orderBy: { createdAt: "desc" },
    });
  }

  async requestDataExport(user: AuthenticatedUser, dto: DataExportDto) {
    const collegeId = this.requireTenant(user);
    await this.assertEntitled(collegeId, "data_export");
    const exportRecord = await this.prisma.tenantDataExport.create({
      data: {
        collegeId,
        requestedById: user.id,
        reason: dto.reason,
        categories: dto.categories,
        status: DataExportStatus.QUEUED,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        metadata: {
          encryptedStorageGuidance: true,
          excludesSecretsAndProviderTokens: true,
        },
      },
    });
    await this.audit(AuditEvent.TENANT_EXPORT_REQUEST, user.id, collegeId, {
      exportId: exportRecord.id,
    });
    return exportRecord;
  }

  async supportTickets(user: AuthenticatedUser) {
    const where =
      user.role === Role.SUPER_ADMIN ? {} : { collegeId: this.requireTenant(user) };
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async supportTicket(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Support ticket not found.");
    }
    if (user.role !== Role.SUPER_ADMIN && ticket.collegeId !== this.requireTenant(user)) {
      throw new ForbiddenException("Support ticket belongs to another tenant.");
    }
    const messages = await this.prisma.supportMessage.findMany({
      where: {
        ticketId: id,
        ...(user.role === Role.SUPER_ADMIN ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: "asc" },
    });
    return { ticket, messages };
  }

  async createSupportTicket(user: AuthenticatedUser, dto: SupportTicketDto) {
    const collegeId = this.requireTenant(user);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        collegeId,
        createdById: user.id,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
      },
    });
    await this.prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorUserId: user.id, body: dto.message },
    });
    await this.prisma.supportAudit.create({
      data: { ticketId: ticket.id, actorUserId: user.id, action: "CREATE" },
    });
    await this.audit(AuditEvent.SUPPORT_TICKET_CREATE, user.id, collegeId, {
      ticketId: ticket.id,
    });
    return ticket;
  }

  async replySupportTicket(user: AuthenticatedUser, id: string, dto: SupportReplyDto) {
    const { ticket } = await this.supportTicket(user, id);
    if (dto.internal && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Internal notes are platform-admin only.");
    }
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        authorUserId: user.id,
        body: dto.message,
        isInternal: dto.internal ?? false,
      },
    });
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status:
          user.role === Role.SUPER_ADMIN
            ? SupportTicketStatus.WAITING_ON_CUSTOMER
            : SupportTicketStatus.IN_PROGRESS,
      },
    });
    await this.prisma.supportAudit.create({
      data: {
        ticketId: id,
        actorUserId: user.id,
        action: dto.internal ? "INTERNAL_NOTE" : "REPLY",
      },
    });
    await this.audit(AuditEvent.SUPPORT_TICKET_UPDATE, user.id, ticket.collegeId, {
      ticketId: id,
    });
    return message;
  }

  async announcements(user?: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.platformAnnouncement.findMany({
      where: {
        isPublished: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(user?.role === Role.SUPER_ADMIN
          ? {}
          : {
              OR: [
                { isPublic: true, approvedForPublicStatus: true },
                { targetCollegeId: user?.collegeId ?? undefined },
              ],
            }),
      },
      orderBy: { startsAt: "desc" },
      take: 20,
    });
  }

  async publicStatus() {
    const announcements = await this.prisma.platformAnnouncement.findMany({
      where: {
        isPublished: true,
        isPublic: true,
        approvedForPublicStatus: true,
        startsAt: { lte: new Date() },
      },
      orderBy: { startsAt: "desc" },
      take: 5,
    });
    return {
      status: "operational",
      updatedAt: new Date().toISOString(),
      announcements,
      note: "Internal incidents are only displayed publicly after explicit approval.",
    };
  }

  mobileConfig(user: AuthenticatedUser) {
    return {
      userId: user.id,
      collegeId: user.collegeId,
      minSupportedVersion: env().MOBILE_MIN_SUPPORTED_VERSION,
      maintenanceAware: true,
      featureFlags: env().FEATURE_FLAGS,
      pagination: { defaultLimit: 25, maxLimit: 100 },
      caching: {
        answers: "never",
        reports: "never",
        evidence: "never",
      },
    };
  }

  async createMobileDevice(user: AuthenticatedUser, dto: MobileDeviceDto) {
    const device = await this.prisma.mobileDeviceSession.create({
      data: {
        userId: user.id,
        collegeId: user.collegeId,
        deviceName: dto.deviceName,
        platform: dto.platform,
        appVersion: dto.appVersion,
      },
    });
    await this.audit(AuditEvent.MOBILE_DEVICE_UPDATE, user.id, user.collegeId, {
      action: "CREATE",
    });
    return device;
  }

  async deleteMobileDevice(user: AuthenticatedUser, id: string) {
    const device = await this.prisma.mobileDeviceSession.findUnique({ where: { id } });
    if (!device || device.userId !== user.id) {
      throw new NotFoundException("Device not found.");
    }
    return this.prisma.mobileDeviceSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async createPushToken(user: AuthenticatedUser, dto: PushTokenDto) {
    const token = await this.prisma.mobilePushToken.upsert({
      where: { tokenHash: this.hash(dto.token) },
      update: { enabled: true, revokedAt: null, lastSeenAt: new Date() },
      create: {
        userId: user.id,
        collegeId: user.collegeId,
        deviceId: dto.deviceId,
        provider: dto.provider,
        tokenHash: this.hash(dto.token),
      },
    });
    return { ...token, tokenHash: undefined };
  }

  async deletePushToken(user: AuthenticatedUser, id: string) {
    const token = await this.prisma.mobilePushToken.findUnique({ where: { id } });
    if (!token || token.userId !== user.id) {
      throw new NotFoundException("Push token not found.");
    }
    return this.prisma.mobilePushToken.update({
      where: { id },
      data: { enabled: false, revokedAt: new Date() },
    });
  }

  async legalDocuments() {
    return this.prisma.legalDocument.findMany({ orderBy: { title: "asc" } });
  }

  async acceptLegal(user: AuthenticatedUser, documentVersionId: string, ip?: string) {
    const version = await this.prisma.legalDocumentVersion.findUnique({
      where: { id: documentVersionId },
    });
    if (!version || !version.isPublished) {
      throw new NotFoundException("Legal document version not found.");
    }
    const accepted = await this.prisma.legalAcceptance.upsert({
      where: { documentVersionId_userId: { documentVersionId, userId: user.id } },
      update: { acceptedAt: new Date(), ipHash: ip ? this.hash(ip) : null },
      create: {
        documentVersionId,
        userId: user.id,
        collegeId: user.collegeId,
        ipHash: ip ? this.hash(ip) : null,
      },
    });
    await this.audit(AuditEvent.LEGAL_ACCEPTANCE, user.id, user.collegeId, {
      documentVersionId,
    });
    return accepted;
  }

  async platformSaasDashboard(user: AuthenticatedUser) {
    this.requireSuperAdmin(user);
    const [totalTenants, trialTenants, activeSubscriptions, pastDue, cancelled] =
      await Promise.all([
        this.prisma.tenantProfile.count(),
        this.prisma.tenantProfile.count({ where: { status: TenantLifecycleStatus.TRIAL } }),
        this.prisma.tenantSubscription.count({ where: { status: TenantLifecycleStatus.ACTIVE } }),
        this.prisma.tenantSubscription.count({ where: { status: TenantLifecycleStatus.PAST_DUE } }),
        this.prisma.tenantSubscription.count({ where: { status: TenantLifecycleStatus.CANCELLED } }),
      ]);
    const usage = await this.prisma.usageRecord.groupBy({
      by: ["meterKey"],
      _sum: { quantity: true },
    });
    return {
      totalTenants,
      trialTenants,
      activeSubscriptions,
      pastDueSubscriptions: pastDue,
      cancelledSubscriptions: cancelled,
      monthlyRecurringRevenueCents:
        env().BILLING_PROVIDER === "DISABLED" || env().BILLING_PROVIDER === "MOCK"
          ? null
          : 0,
      revenueLabel:
        env().BILLING_PROVIDER === "DISABLED" || env().BILLING_PROVIDER === "MOCK"
          ? "Revenue is not calculated in disabled/mock billing mode."
          : "Provider-backed revenue field.",
      usage,
    };
  }

  async platformTenants(user: AuthenticatedUser) {
    this.requireSuperAdmin(user);
    return this.prisma.college.findMany({
      select: {
        id: true,
        name: true,
        collegeCode: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async platformTenant(user: AuthenticatedUser, id: string) {
    this.requireSuperAdmin(user);
    const tenant = await this.prisma.college.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        collegeCode: true,
        email: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException("Tenant not found.");
    }
    const [profile, subscription, usage, invoices] = await Promise.all([
      this.prisma.tenantProfile.findUnique({ where: { collegeId: id } }),
      this.prisma.tenantSubscription.findFirst({
        where: { collegeId: id },
        orderBy: { createdAt: "desc" },
      }),
      this.usageForTenant(id),
      this.prisma.billingInvoice.findMany({ where: { collegeId: id }, take: 10 }),
    ]);
    return { tenant, profile, subscription, usage, invoices };
  }

  async updateTenantStatus(user: AuthenticatedUser, id: string, dto: TenantStatusDto) {
    this.requireSuperAdmin(user);
    const profile = await this.prisma.tenantProfile.upsert({
      where: { collegeId: id },
      update: {
        status: dto.status,
        lifecycleReason: dto.reason,
      },
      create: {
        collegeId: id,
        status: dto.status,
        lifecycleReason: dto.reason,
      },
    });
    await this.audit(AuditEvent.TENANT_STATUS_UPDATE, user.id, id, {
      status: dto.status,
      reason: dto.reason,
    });
    return profile;
  }

  async platformChangePlan(user: AuthenticatedUser, id: string, dto: ChangeSubscriptionDto) {
    this.requireSuperAdmin(user);
    const plan = await this.activePlanVersionById(dto.planId);
    const subscription = await this.prisma.tenantSubscription.create({
      data: {
        collegeId: id,
        planId: plan.planId,
        planVersionId: plan.id,
        status: TenantLifecycleStatus.ACTIVE,
        provider: BillingProvider.DISABLED,
        planSnapshot: this.planSnapshot(plan),
        overrideReason: dto.reason,
      },
    });
    await this.syncEntitlements(id, plan.id, dto.reason);
    await this.audit(AuditEvent.PLAN_OVERRIDE_UPDATE, user.id, id, {
      planVersionId: plan.id,
      reason: dto.reason,
    });
    return subscription;
  }

  async extendTrial(user: AuthenticatedUser, id: string, dto: TrialExtensionDto) {
    this.requireSuperAdmin(user);
    const profile = await this.prisma.tenantProfile.findUnique({ where: { collegeId: id } });
    const base = profile?.trialEndsAt ?? new Date();
    const trialEndsAt = new Date(base.getTime() + dto.days * 86_400_000);
    const updated = await this.prisma.tenantProfile.upsert({
      where: { collegeId: id },
      update: { trialEndsAt, lifecycleReason: dto.reason },
      create: { collegeId: id, status: TenantLifecycleStatus.TRIAL, trialEndsAt },
    });
    await this.audit(AuditEvent.TENANT_STATUS_UPDATE, user.id, id, {
      action: "TRIAL_EXTENSION",
      days: dto.days,
    });
    return updated;
  }

  async addCredit(user: AuthenticatedUser, id: string, dto: TenantCreditDto) {
    this.requireSuperAdmin(user);
    const credit = await this.prisma.billingCredit.create({
      data: {
        collegeId: id,
        amountCents: dto.amountCents,
        remainingCents: dto.amountCents,
        currency: dto.currency ?? env().BILLING_CURRENCY,
        reason: dto.reason,
        createdById: user.id,
      },
    });
    await this.audit(AuditEvent.BILLING_PAYMENT_EVENT, user.id, id, {
      action: "CREDIT",
    });
    return credit;
  }

  private async usageForTenant(collegeId: string) {
    const [records, studentCount, facultyCount] = await Promise.all([
      this.prisma.usageRecord.groupBy({
        by: ["meterKey"],
        where: { collegeId },
        _sum: { quantity: true },
      }),
      this.prisma.user.count({ where: { collegeId, role: Role.STUDENT, isActive: true } }),
      this.prisma.user.count({ where: { collegeId, role: Role.FACULTY, isActive: true } }),
    ]);
    return {
      active_students: studentCount,
      faculty: facultyCount,
      meters: records.map((record) => ({
        meterKey: record.meterKey,
        quantity: record._sum.quantity ?? 0,
      })),
    };
  }

  private async activePlanVersion(code: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code },
      include: {
        versions: {
          where: { isActive: true },
          include: { plan: true, features: true, limits: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!plan || !plan.versions[0]) {
      throw new BadRequestException("Required subscription plan is not seeded.");
    }
    return plan.versions[0];
  }

  private async activePlanVersionById(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        versions: {
          where: { isActive: true },
          include: { plan: true, features: true, limits: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
    if (!plan || !plan.versions[0]) {
      throw new BadRequestException("Plan is not seeded.");
    }
    return plan.versions[0];
  }

  private planSnapshot(version: {
    id: string;
    version: number;
    currency: string;
    priceCents: number | null;
    trialDays: number;
    plan: { code: string; name: string };
    features: Array<{ featureKey: string; enabled: boolean; value: string | null }>;
    limits: Array<{ limitKey: string; limitValue: number }>;
  }) {
    return {
      versionId: version.id,
      planCode: version.plan.code,
      planName: version.plan.name,
      version: version.version,
      currency: version.currency,
      priceCents: version.priceCents,
      trialDays: version.trialDays,
      features: version.features,
      limits: version.limits,
    };
  }

  private async syncEntitlements(
    collegeId: string,
    planVersionId: string,
    reason: string,
  ): Promise<void> {
    const [features, limits] = await Promise.all([
      this.prisma.planFeature.findMany({ where: { planVersionId } }),
      this.prisma.planLimit.findMany({ where: { planVersionId } }),
    ]);
    for (const feature of features) {
      await this.prisma.featureEntitlement.upsert({
        where: { collegeId_featureKey: { collegeId, featureKey: feature.featureKey } },
        update: {
          enabled: feature.enabled,
          source: "PLAN",
          overrideReason: reason,
        },
        create: {
          collegeId,
          featureKey: feature.featureKey,
          enabled: feature.enabled,
          source: "PLAN",
          overrideReason: reason,
        },
      });
    }
    for (const limit of limits) {
      await this.prisma.featureEntitlement.upsert({
        where: { collegeId_featureKey: { collegeId, featureKey: limit.limitKey } },
        update: {
          enabled: true,
          limitValue: limit.limitValue,
          source: "PLAN",
          overrideReason: reason,
        },
        create: {
          collegeId,
          featureKey: limit.limitKey,
          enabled: true,
          limitValue: limit.limitValue,
          source: "PLAN",
          overrideReason: reason,
        },
      });
    }
  }

  private async assertEntitled(collegeId: string, featureKey: string) {
    const entitlement = await this.prisma.featureEntitlement.findUnique({
      where: { collegeId_featureKey: { collegeId, featureKey } },
    });
    if (!entitlement?.enabled) {
      throw new ForbiddenException(
        `Your current plan does not include ${featureKey.replace(/_/g, " ")}.`,
      );
    }
  }

  private validateBranding(dto: BrandingDto): void {
    const colors = [dto.primaryColor, dto.secondaryColor];
    if (!colors.every((color) => /^#[0-9a-fA-F]{6}$/.test(color))) {
      throw new BadRequestException("Brand colors must be hex colors.");
    }
    const serialized = JSON.stringify(dto).toLowerCase();
    if (serialized.includes("<script") || serialized.includes("javascript:")) {
      throw new BadRequestException("Branding cannot include scripts.");
    }
  }

  private providerEvent(payload: unknown): { id: string; type: string; summary: object } {
    const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    return {
      id: typeof value.id === "string" ? value.id : randomUUID(),
      type: typeof value.type === "string" ? value.type : "unknown",
      summary: {
        type: typeof value.type === "string" ? value.type : "unknown",
        object: typeof value.object === "string" ? value.object : "event",
      },
    };
  }

  private requireTenant(user: AuthenticatedUser): string {
    if (!user.collegeId) {
      throw new ForbiddenException("Tenant context is required.");
    }
    return user.collegeId;
  }

  private requireSuperAdmin(user: AuthenticatedUser): void {
    if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Platform administrator access is required.");
    }
  }

  private safeJson(value: unknown): object | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value)) as object;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private async audit(
    event: AuditEvent,
    userId: string | null,
    collegeId: string | null,
    metadata?: object,
  ) {
    await this.prisma.auditLog.create({
      data: {
        event,
        userId,
        collegeId,
        metadata,
      },
    });
  }
}

export { entitlementFeatureKeys, setupChecklist };
