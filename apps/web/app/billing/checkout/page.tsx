import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingCheckoutPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Checkout"
      description="Checkout uses provider-hosted or provider-tokenized flows. Frontend success never activates a subscription without webhook confirmation."
      endpoint="/api/v1/billing/subscription"
    />
  );
}
