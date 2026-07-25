import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingCancelPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Checkout Cancelled"
      description="No payment method or raw card details are stored by CampusTest Pro. You can return to plans at any time."
      endpoint="/api/v1/billing/subscription"
    />
  );
}
