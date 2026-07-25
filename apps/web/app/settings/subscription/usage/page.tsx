import { ProtectedSaasPage } from "../../../components/saas-pages";

export default function SubscriptionUsagePage() {
  return (
    <ProtectedSaasPage
      eyebrow="Subscription"
      title="Usage"
      description="Tenant-scoped usage meters for students, faculty, attempts, AI, OCR, storage, reports, coding, proctoring, and API requests."
      endpoint="/api/v1/billing/usage"
    />
  );
}
