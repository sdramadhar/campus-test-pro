import { ProtectedSaasPage } from "../../components/saas-pages";

export default function DataExportPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Tenant Data"
      title="Data Export"
      description="Request authorized tenant exports for users, academics, questions, assessments, results, audit logs, reports, settings, subscriptions, and branding."
      endpoint="/api/v1/tenant/data-exports"
    />
  );
}
