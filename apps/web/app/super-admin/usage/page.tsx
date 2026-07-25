import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminUsagePage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Usage"
      title="Tenant Usage"
      description="Cross-tenant usage summary for billing-safe reconciliation, corrections, overage foundations, and quota visibility."
      endpoint="/api/v1/platform/saas"
    />
  );
}
