import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminTenantsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="SaaS"
      title="Tenants"
      description="Platform administrators can inspect tenant lifecycle state without silent access to private student data."
      endpoint="/api/v1/platform/tenants"
    />
  );
}
