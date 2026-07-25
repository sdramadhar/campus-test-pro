import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminPlansPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="SaaS"
      title="Plans"
      description="Create and version plan features, limits, prices, trial days, and provider metadata without hardcoding commercial prices in core logic."
      endpoint="/api/v1/billing/plans"
    />
  );
}
