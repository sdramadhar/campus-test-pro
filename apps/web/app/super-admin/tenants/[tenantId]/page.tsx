import { ProtectedSaasPage } from "../../../components/saas-pages";

export default async function SuperAdminTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="SaaS"
      title="Tenant Detail"
      description="Tenant controls require a reason for activation, suspension, trial extension, plan override, credit, cancellation, export, and restoration actions."
      endpoint={`/api/v1/platform/tenants/${tenantId}`}
    />
  );
}
