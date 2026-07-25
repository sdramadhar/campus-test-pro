import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingHistoryPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Payment History"
      description="Tenant-isolated payment history with provider metadata only. Raw payment instruments are never stored."
      endpoint="/api/v1/billing/payments"
    />
  );
}
