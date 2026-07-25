import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingSuccessPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Checkout Pending Confirmation"
      description="Payment redirects are informational. Subscription state updates only after a verified provider webhook is processed."
      endpoint="/api/v1/billing/subscription"
    />
  );
}
