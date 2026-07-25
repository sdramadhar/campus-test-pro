import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminSubscriptionsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="SaaS"
      title="Subscriptions"
      description="Review active, trial, past-due, cancelled, and manually administered subscriptions across tenants."
      endpoint="/api/v1/platform/saas"
    />
  );
}
