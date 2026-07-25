import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BillingInvoicesPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Billing"
      title="Invoices"
      description="View invoice references and provider-hosted download links where supported by the configured provider."
      endpoint="/api/v1/billing/invoices"
    />
  );
}
