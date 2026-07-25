import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminInvoicesPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Billing"
      title="Invoices"
      description="Platform invoice operations show provider references and demo values without fabricating revenue in disabled or mock modes."
      endpoint="/api/v1/platform/saas"
    />
  );
}
