-- CreateEnum
CREATE TYPE "TenantLifecycleStatus" AS ENUM ('LEAD', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('DISABLED', 'MOCK', 'STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingRecordStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "EntitlementValueType" AS ENUM ('BOOLEAN', 'NUMBER', 'TEXT');

-- CreateEnum
CREATE TYPE "OverageBehavior" AS ENUM ('BLOCK', 'SOFT_ALLOW', 'REQUIRE_APPROVAL');

-- CreateEnum
CREATE TYPE "OnboardingStepStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AnnouncementSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TenantDomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'ACTIVE', 'FAILED', 'DISABLED');

-- CreateEnum
CREATE TYPE "DomainCertificateState" AS ENUM ('NOT_REQUESTED', 'PENDING', 'ISSUED', 'RENEWING', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('REQUESTED', 'QUEUED', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'DATA_PROCESSING', 'ACCEPTABLE_USE', 'PROCTORING_NOTICE', 'BILLING_TERMS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEvent" ADD VALUE 'TENANT_REGISTRATION';
ALTER TYPE "AuditEvent" ADD VALUE 'TENANT_ONBOARDING_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'TENANT_STATUS_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'TENANT_EXPORT_REQUEST';
ALTER TYPE "AuditEvent" ADD VALUE 'TENANT_CANCELLATION_REQUEST';
ALTER TYPE "AuditEvent" ADD VALUE 'SUBSCRIPTION_CHANGE';
ALTER TYPE "AuditEvent" ADD VALUE 'BILLING_CHECKOUT';
ALTER TYPE "AuditEvent" ADD VALUE 'BILLING_WEBHOOK';
ALTER TYPE "AuditEvent" ADD VALUE 'BILLING_PAYMENT_EVENT';
ALTER TYPE "AuditEvent" ADD VALUE 'PLAN_OVERRIDE_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'USAGE_METER_RECORDED';
ALTER TYPE "AuditEvent" ADD VALUE 'BRANDING_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'DOMAIN_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'SUPPORT_TICKET_CREATE';
ALTER TYPE "AuditEvent" ADD VALUE 'SUPPORT_TICKET_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'ANNOUNCEMENT_UPDATE';
ALTER TYPE "AuditEvent" ADD VALUE 'LEGAL_ACCEPTANCE';
ALTER TYPE "AuditEvent" ADD VALUE 'MOBILE_DEVICE_UPDATE';

-- CreateTable
CREATE TABLE "TenantProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "status" "TenantLifecycleStatus" NOT NULL DEFAULT 'TRIAL',
    "verifiedAt" TIMESTAMP(3),
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "readOnlyUntil" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "onboardingPercent" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" TIMESTAMP(3),
    "setupChecklist" JSONB,
    "billingEmail" TEXT,
    "lifecycleReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" "OnboardingStepStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "payload" JSONB,
    "completedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "valueType" "EntitlementValueType" NOT NULL DEFAULT 'BOOLEAN',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "value" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanLimit" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "limitKey" TEXT NOT NULL,
    "limitValue" INTEGER NOT NULL,
    "overageBehavior" "OverageBehavior" NOT NULL DEFAULT 'BLOCK',
    "softLimitValue" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "status" "TenantLifecycleStatus" NOT NULL DEFAULT 'TRIAL',
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "planSnapshot" JSONB NOT NULL,
    "overrideReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "fromPlanCode" TEXT,
    "toPlanCode" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "providerCustomerId" TEXT,
    "billingEmail" TEXT NOT NULL,
    "legalName" TEXT,
    "address" JSONB,
    "taxMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "providerInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "amountDueCents" INTEGER NOT NULL DEFAULT 0,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "providerPaymentId" TEXT,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCheckoutSession" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "providerSessionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'PENDING',
    "checkoutUrl" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT NOT NULL,
    "payloadSummary" JSONB,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCredit" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "remainingCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "trialExtensionDays" INTEGER,
    "maxRedemptions" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "redeemedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMeter" (
    "id" TEXT NOT NULL,
    "meterKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL DEFAULT 'SUM',
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "meterKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "correctionOfId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureEntitlement" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "limitValue" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'PLAN',
    "overrideReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantAddOn" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "addOnKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limitDelta" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionChangeRequest" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedPlanId" TEXT,
    "requestType" TEXT NOT NULL,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedById" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxConfiguration" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "legalBusinessName" TEXT NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "country" TEXT NOT NULL,
    "stateRegion" TEXT,
    "postalCode" TEXT,
    "taxId" TEXT,
    "gstVat" TEXT,
    "invoiceEmail" TEXT NOT NULL,
    "providerTaxMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAuditEvent" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "provider" "BillingProvider" NOT NULL DEFAULT 'DISABLED',
    "eventType" TEXT NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantBranding" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "shortName" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "loginBackgroundUrl" TEXT,
    "emailLogoUrl" TEXT,
    "reportLogoUrl" TEXT,
    "footerText" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "privacyPolicyUrl" TEXT,
    "termsUrl" TEXT,
    "draft" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantBrandingVersion" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantBrandingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "TenantDomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationTokenHash" TEXT NOT NULL,
    "cnameTarget" TEXT NOT NULL,
    "certificateStatus" "DomainCertificateState" NOT NULL DEFAULT 'NOT_REQUESTED',
    "activatedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainVerification" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'DNS_TXT',
    "expectedValueHash" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "parentId" TEXT,
    "unitType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "createdById" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "storageObjectId" TEXT,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assignedById" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSLAEvent" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SupportSLAEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAudit" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'INFO',
    "targetCollegeId" TEXT,
    "targetRoles" TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "approvedForPublicStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileDeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT,
    "deviceName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "refreshTokenId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileDeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT,
    "deviceId" TEXT,
    "provider" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotificationDelivery" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "safeTitle" TEXT NOT NULL,
    "safeBody" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDataExport" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedById" TEXT,
    "reason" TEXT NOT NULL,
    "categories" TEXT[],
    "status" "DataExportStatus" NOT NULL DEFAULT 'REQUESTED',
    "storageObjectId" TEXT,
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDataExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCancellationRequest" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedById" TEXT,
    "reason" TEXT NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT true,
    "readOnlyStartsAt" TIMESTAMP(3),
    "retentionEndsAt" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "requiresReacceptance" BOOLEAN NOT NULL DEFAULT false,
    "contentMarkdown" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT,
    "ipHash" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantProfile_collegeId_key" ON "TenantProfile"("collegeId");

-- CreateIndex
CREATE INDEX "TenantProfile_status_idx" ON "TenantProfile"("status");

-- CreateIndex
CREATE INDEX "TenantProfile_trialEndsAt_idx" ON "TenantProfile"("trialEndsAt");

-- CreateIndex
CREATE INDEX "OnboardingProgress_collegeId_idx" ON "OnboardingProgress"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_collegeId_step_key" ON "OnboardingProgress"("collegeId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "PlanVersion_planId_idx" ON "PlanVersion"("planId");

-- CreateIndex
CREATE INDEX "PlanVersion_isActive_idx" ON "PlanVersion"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_version_key" ON "PlanVersion"("planId", "version");

-- CreateIndex
CREATE INDEX "PlanFeature_featureKey_idx" ON "PlanFeature"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planVersionId_featureKey_key" ON "PlanFeature"("planVersionId", "featureKey");

-- CreateIndex
CREATE INDEX "PlanLimit_limitKey_idx" ON "PlanLimit"("limitKey");

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimit_planVersionId_limitKey_key" ON "PlanLimit"("planVersionId", "limitKey");

-- CreateIndex
CREATE INDEX "TenantSubscription_collegeId_idx" ON "TenantSubscription"("collegeId");

-- CreateIndex
CREATE INDEX "TenantSubscription_planId_idx" ON "TenantSubscription"("planId");

-- CreateIndex
CREATE INDEX "TenantSubscription_planVersionId_idx" ON "TenantSubscription"("planVersionId");

-- CreateIndex
CREATE INDEX "TenantSubscription_status_idx" ON "TenantSubscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_collegeId_idx" ON "SubscriptionHistory"("collegeId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_subscriptionId_idx" ON "SubscriptionHistory"("subscriptionId");

-- CreateIndex
CREATE INDEX "BillingCustomer_collegeId_idx" ON "BillingCustomer"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_provider_providerCustomerId_key" ON "BillingCustomer"("provider", "providerCustomerId");

-- CreateIndex
CREATE INDEX "BillingInvoice_collegeId_idx" ON "BillingInvoice"("collegeId");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "BillingInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_provider_providerInvoiceId_key" ON "BillingInvoice"("provider", "providerInvoiceId");

-- CreateIndex
CREATE INDEX "BillingPayment_collegeId_idx" ON "BillingPayment"("collegeId");

-- CreateIndex
CREATE INDEX "BillingPayment_invoiceId_idx" ON "BillingPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "BillingPayment_status_idx" ON "BillingPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPayment_provider_providerPaymentId_key" ON "BillingPayment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "BillingCheckoutSession_collegeId_idx" ON "BillingCheckoutSession"("collegeId");

-- CreateIndex
CREATE INDEX "BillingCheckoutSession_status_idx" ON "BillingCheckoutSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCheckoutSession_provider_idempotencyKey_key" ON "BillingCheckoutSession"("provider", "idempotencyKey");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_status_idx" ON "BillingWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_eventType_idx" ON "BillingWebhookEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_providerEventId_key" ON "BillingWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "BillingCredit_collegeId_idx" ON "BillingCredit"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "CouponRedemption_collegeId_idx" ON "CouponRedemption"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_collegeId_key" ON "CouponRedemption"("couponId", "collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMeter_meterKey_key" ON "UsageMeter"("meterKey");

-- CreateIndex
CREATE INDEX "UsageRecord_collegeId_meterKey_idx" ON "UsageRecord"("collegeId", "meterKey");

-- CreateIndex
CREATE INDEX "UsageRecord_periodStart_periodEnd_idx" ON "UsageRecord"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_collegeId_meterKey_idempotencyKey_key" ON "UsageRecord"("collegeId", "meterKey", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FeatureEntitlement_featureKey_idx" ON "FeatureEntitlement"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureEntitlement_collegeId_featureKey_key" ON "FeatureEntitlement"("collegeId", "featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAddOn_collegeId_addOnKey_key" ON "TenantAddOn"("collegeId", "addOnKey");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_collegeId_idx" ON "SubscriptionChangeRequest"("collegeId");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_status_idx" ON "SubscriptionChangeRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfiguration_collegeId_key" ON "TaxConfiguration"("collegeId");

-- CreateIndex
CREATE INDEX "BillingAuditEvent_collegeId_idx" ON "BillingAuditEvent"("collegeId");

-- CreateIndex
CREATE INDEX "BillingAuditEvent_eventType_idx" ON "BillingAuditEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBranding_collegeId_key" ON "TenantBranding"("collegeId");

-- CreateIndex
CREATE INDEX "TenantBrandingVersion_collegeId_idx" ON "TenantBrandingVersion"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBrandingVersion_collegeId_version_key" ON "TenantBrandingVersion"("collegeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_domain_key" ON "TenantDomain"("domain");

-- CreateIndex
CREATE INDEX "TenantDomain_collegeId_idx" ON "TenantDomain"("collegeId");

-- CreateIndex
CREATE INDEX "TenantDomain_status_idx" ON "TenantDomain"("status");

-- CreateIndex
CREATE INDEX "DomainVerification_domainId_idx" ON "DomainVerification"("domainId");

-- CreateIndex
CREATE INDEX "OrganizationUnit_collegeId_idx" ON "OrganizationUnit"("collegeId");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_collegeId_unitType_code_key" ON "OrganizationUnit"("collegeId", "unitType", "code");

-- CreateIndex
CREATE INDEX "SupportTicket_collegeId_idx" ON "SupportTicket"("collegeId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAssignment_ticketId_idx" ON "SupportAssignment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportSLAEvent_ticketId_idx" ON "SupportSLAEvent"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAudit_ticketId_idx" ON "SupportAudit"("ticketId");

-- CreateIndex
CREATE INDEX "PlatformAnnouncement_targetCollegeId_idx" ON "PlatformAnnouncement"("targetCollegeId");

-- CreateIndex
CREATE INDEX "PlatformAnnouncement_isPublished_idx" ON "PlatformAnnouncement"("isPublished");

-- CreateIndex
CREATE INDEX "PlatformAnnouncement_startsAt_idx" ON "PlatformAnnouncement"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementDismissal_announcementId_userId_key" ON "AnnouncementDismissal"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_templateKey_isActive_idx" ON "EmailTemplateVersion"("templateKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateVersion_templateKey_version_key" ON "EmailTemplateVersion"("templateKey", "version");

-- CreateIndex
CREATE INDEX "MobileDeviceSession_userId_idx" ON "MobileDeviceSession"("userId");

-- CreateIndex
CREATE INDEX "MobileDeviceSession_collegeId_idx" ON "MobileDeviceSession"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "MobilePushToken_tokenHash_key" ON "MobilePushToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MobilePushToken_userId_idx" ON "MobilePushToken"("userId");

-- CreateIndex
CREATE INDEX "MobilePushToken_collegeId_idx" ON "MobilePushToken"("collegeId");

-- CreateIndex
CREATE INDEX "PushNotificationDelivery_collegeId_idx" ON "PushNotificationDelivery"("collegeId");

-- CreateIndex
CREATE INDEX "PushNotificationDelivery_userId_idx" ON "PushNotificationDelivery"("userId");

-- CreateIndex
CREATE INDEX "TenantDataExport_collegeId_idx" ON "TenantDataExport"("collegeId");

-- CreateIndex
CREATE INDEX "TenantDataExport_status_idx" ON "TenantDataExport"("status");

-- CreateIndex
CREATE INDEX "TenantCancellationRequest_collegeId_idx" ON "TenantCancellationRequest"("collegeId");

-- CreateIndex
CREATE INDEX "TenantCancellationRequest_status_idx" ON "TenantCancellationRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_slug_key" ON "LegalDocument"("slug");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentId_idx" ON "LegalDocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_version_key" ON "LegalDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "LegalAcceptance_collegeId_idx" ON "LegalAcceptance"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAcceptance_documentVersionId_userId_key" ON "LegalAcceptance"("documentVersionId", "userId");

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanLimit" ADD CONSTRAINT "PlanLimit_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
