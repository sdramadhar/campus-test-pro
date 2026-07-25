import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminCouponsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Billing"
      title="Coupons"
      description="Foundation for global coupons, trial extensions, credits, redemption limits, tenant restrictions, and audited changes."
      endpoint="/api/v1/platform/saas"
    />
  );
}
