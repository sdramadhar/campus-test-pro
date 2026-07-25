import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
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
import { SaasService } from "./saas.service";

const tenantRoles = [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY, Role.STUDENT];
const adminRoles = [Role.SUPER_ADMIN, Role.COLLEGE_ADMIN];

@ApiTags("saas-public")
@Controller("api/v1")
export class SaasPublicController {
  constructor(@Inject(SaasService) private readonly saas: SaasService) {}

  @Get("billing/plans")
  @ApiOperation({ summary: "List public SaaS subscription plans." })
  plans() {
    return this.saas.publicPlans();
  }

  @Get("billing/plans/:id")
  plan(@Param("id") id: string) {
    return this.saas.publicPlan(id);
  }

  @Post("tenants/signup")
  @ApiOperation({ summary: "Create a trial institution tenant." })
  signup(@Body() dto: InstitutionSignupDto) {
    return this.saas.institutionSignup(dto);
  }

  @Post("billing/webhooks/:provider")
  @ApiOperation({ summary: "Receive provider billing webhooks with idempotency." })
  webhook(
    @Param("provider") provider: string,
    @Headers("x-campustest-webhook-signature") signature: string | undefined,
    @Body() body: unknown,
  ) {
    return this.saas.webhook(provider, signature, body);
  }

  @Get("announcements/public")
  publicAnnouncements() {
    return this.saas.announcements();
  }

  @Get("status")
  status() {
    return this.saas.publicStatus();
  }
}

@ApiTags("saas-tenant")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api/v1")
export class SaasTenantController {
  constructor(@Inject(SaasService) private readonly saas: SaasService) {}

  @Get("onboarding")
  @Roles(...adminRoles)
  onboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.onboarding(user);
  }

  @Post("onboarding/steps")
  @Roles(...adminRoles)
  saveOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveOnboardingStepDto,
  ) {
    return this.saas.saveOnboardingStep(user, dto);
  }

  @Post("billing/checkout-session")
  @Roles(...adminRoles)
  checkoutLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutSessionDto,
  ) {
    return this.saas.checkoutSession(user, dto);
  }

  @Post("billing/portal-session")
  @Roles(...adminRoles)
  portalLegacy(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.portalSession(user);
  }

  @Get("billing/subscription")
  @Roles(...adminRoles)
  subscription(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.subscription(user);
  }

  @Post("billing/subscription/checkout")
  @Roles(...adminRoles)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutSessionDto,
  ) {
    return this.saas.checkoutSession(user, dto);
  }

  @Post("billing/subscription/change")
  @Roles(...adminRoles)
  change(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeSubscriptionDto) {
    return this.saas.changeSubscription(user, dto);
  }

  @Post("billing/subscription/cancel")
  @Roles(...adminRoles)
  cancel(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReasonDto) {
    return this.saas.cancelSubscription(user, dto);
  }

  @Post("billing/subscription/reactivate")
  @Roles(...adminRoles)
  reactivate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReasonDto) {
    return this.saas.reactivateSubscription(user, dto);
  }

  @Post("billing/portal")
  @Roles(...adminRoles)
  portal(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.portalSession(user);
  }

  @Get("billing/invoices")
  @Roles(...adminRoles)
  invoices(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.invoices(user);
  }

  @Get("billing/payments")
  @Roles(...adminRoles)
  payments(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.payments(user);
  }

  @Get("billing/usage")
  @Roles(...adminRoles)
  usage(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.usage(user);
  }

  @Get("tenant/branding")
  @Roles(...adminRoles)
  branding(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.branding(user);
  }

  @Patch("tenant/branding")
  @Roles(...adminRoles)
  updateBranding(@CurrentUser() user: AuthenticatedUser, @Body() dto: BrandingDto) {
    return this.saas.updateBranding(user, dto);
  }

  @Get("tenant/domains")
  @Roles(...adminRoles)
  domains(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.domains(user);
  }

  @Post("tenant/domains")
  @Roles(...adminRoles)
  createDomain(@CurrentUser() user: AuthenticatedUser, @Body() dto: DomainDto) {
    return this.saas.createDomain(user, dto);
  }

  @Get("tenant/data-exports")
  @Roles(...adminRoles)
  dataExports(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.dataExports(user);
  }

  @Post("tenant/data-exports")
  @Roles(...adminRoles)
  requestDataExport(@CurrentUser() user: AuthenticatedUser, @Body() dto: DataExportDto) {
    return this.saas.requestDataExport(user, dto);
  }

  @Get("support/tickets")
  @Roles(...tenantRoles)
  supportTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.supportTickets(user);
  }

  @Get("support/tickets/:id")
  @Roles(...tenantRoles)
  supportTicket(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.saas.supportTicket(user, id);
  }

  @Post("support/tickets")
  @Roles(...tenantRoles)
  createSupport(@CurrentUser() user: AuthenticatedUser, @Body() dto: SupportTicketDto) {
    return this.saas.createSupportTicket(user, dto);
  }

  @Post("support/tickets/:id/messages")
  @Roles(...tenantRoles)
  replySupport(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SupportReplyDto,
  ) {
    return this.saas.replySupportTicket(user, id, dto);
  }

  @Get("announcements")
  @Roles(...tenantRoles)
  announcements(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.announcements(user);
  }

  @Post("mobile/devices")
  @Roles(...tenantRoles)
  createDevice(@CurrentUser() user: AuthenticatedUser, @Body() dto: MobileDeviceDto) {
    return this.saas.createMobileDevice(user, dto);
  }

  @Delete("mobile/devices/:id")
  @Roles(...tenantRoles)
  deleteDevice(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.saas.deleteMobileDevice(user, id);
  }

  @Post("mobile/push-tokens")
  @Roles(...tenantRoles)
  createPushToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: PushTokenDto) {
    return this.saas.createPushToken(user, dto);
  }

  @Delete("mobile/push-tokens/:id")
  @Roles(...tenantRoles)
  deletePushToken(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.saas.deletePushToken(user, id);
  }

  @Get("mobile/config")
  @Roles(...tenantRoles)
  mobileConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.mobileConfig(user);
  }

  @Get("legal/documents")
  @Roles(...tenantRoles)
  legalDocuments() {
    return this.saas.legalDocuments();
  }

  @Post("legal/accept/:documentVersionId")
  @Roles(...tenantRoles)
  acceptLegal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("documentVersionId") documentVersionId: string,
    @Req() request: CookieRequest,
  ) {
    return this.saas.acceptLegal(user, documentVersionId, request.ip);
  }
}

@ApiTags("saas-platform")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("api/v1/platform")
export class SaasPlatformController {
  constructor(@Inject(SaasService) private readonly saas: SaasService) {}

  @Get("saas")
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.platformSaasDashboard(user);
  }

  @Get("tenants")
  tenants(@CurrentUser() user: AuthenticatedUser) {
    return this.saas.platformTenants(user);
  }

  @Get("tenants/:id")
  tenant(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.saas.platformTenant(user, id);
  }

  @Patch("tenants/:id/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: TenantStatusDto,
  ) {
    return this.saas.updateTenantStatus(user, id, dto);
  }

  @Patch("tenants/:id/plan")
  updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChangeSubscriptionDto,
  ) {
    return this.saas.platformChangePlan(user, id, dto);
  }

  @Post("tenants/:id/trial-extension")
  extendTrial(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: TrialExtensionDto,
  ) {
    return this.saas.extendTrial(user, id, dto);
  }

  @Post("tenants/:id/credits")
  addCredit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: TenantCreditDto,
  ) {
    return this.saas.addCredit(user, id, dto);
  }
}
