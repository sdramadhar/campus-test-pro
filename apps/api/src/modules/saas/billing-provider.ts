import { createHmac, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { BillingProvider } from "../../../generated/phase5-client";
import { env } from "../config/environment";

export interface CheckoutRequest {
  tenantId: string;
  planCode: string;
  planVersionId: string;
  idempotencyKey: string;
}

export interface CheckoutResult {
  provider: BillingProvider;
  providerSessionId: string;
  checkoutUrl: string | null;
  status: "PENDING" | "ACTIVE";
}

export interface BillingPortalResult {
  provider: BillingProvider;
  portalUrl: string | null;
}

export interface BillingProviderAdapter {
  readonly provider: BillingProvider;
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutResult>;
  createPortalSession(tenantId: string): Promise<BillingPortalResult>;
  verifyWebhookSignature(payload: unknown, signature?: string): boolean;
}

@Injectable()
export class BillingProviderRegistry {
  adapter(): BillingProviderAdapter {
    const current = env();
    const provider = current.BILLING_PROVIDER;
    if (provider === BillingProvider.MOCK) {
      return new MockBillingAdapter();
    }
    if (provider === BillingProvider.STRIPE || provider === BillingProvider.RAZORPAY) {
      return new DisabledBillingAdapter(provider);
    }
    return new DisabledBillingAdapter(BillingProvider.DISABLED);
  }
}

class DisabledBillingAdapter implements BillingProviderAdapter {
  constructor(readonly provider: BillingProvider) {}

  createCheckoutSession(): Promise<CheckoutResult> {
    return Promise.resolve({
      provider: this.provider,
      providerSessionId: `manual_${randomUUID()}`,
      checkoutUrl: null,
      status: "PENDING",
    });
  }

  createPortalSession(): Promise<BillingPortalResult> {
    return Promise.resolve({ provider: this.provider, portalUrl: null });
  }

  verifyWebhookSignature(): boolean {
    return this.provider === BillingProvider.DISABLED;
  }
}

class MockBillingAdapter implements BillingProviderAdapter {
  readonly provider = BillingProvider.MOCK;

  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutResult> {
    return Promise.resolve({
      provider: this.provider,
      providerSessionId: `mock_checkout_${request.idempotencyKey}`,
      checkoutUrl: `/billing/checkout?session=${encodeURIComponent(request.idempotencyKey)}`,
      status: "PENDING",
    });
  }

  createPortalSession(tenantId: string): Promise<BillingPortalResult> {
    return Promise.resolve({
      provider: this.provider,
      portalUrl: `/settings/subscription?portal=mock&tenant=${encodeURIComponent(tenantId)}`,
    });
  }

  verifyWebhookSignature(payload: unknown, signature?: string): boolean {
    const secret = env().BILLING_WEBHOOK_SECRET;
    if (!secret) {
      return env().NODE_ENV !== "production" && env().APP_ENV !== "production";
    }
    const expected = createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");
    return signature === expected;
  }
}
