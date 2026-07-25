import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingPlansPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Plans"
      description="Provider-ready plan catalog with feature and limit snapshots. Prices remain configurable and may be marked not configured."
      endpoint="/api/v1/billing/plans"
    />
  );
}
