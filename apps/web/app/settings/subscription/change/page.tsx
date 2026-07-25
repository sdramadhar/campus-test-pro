import { ProtectedSaasPage } from "../../../components/saas-pages";

export default function ChangeSubscriptionPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Subscription"
      title="Change Plan"
      description="Upgrade, downgrade, request enterprise review, or schedule cancellation. Downgrade effects are recorded without deleting tenant data."
      endpoint="/api/v1/billing/plans"
    />
  );
}
