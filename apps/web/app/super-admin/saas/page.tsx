import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SuperAdminSaasPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="SaaS"
      title="Platform SaaS"
      description="Platform-level SaaS dashboard for tenants, trials, subscriptions, past-due accounts, usage, failed payments, and upcoming trial expirations."
      endpoint="/api/v1/platform/saas"
      actions={[
        { href: "/super-admin/tenants", label: "Tenants" },
        { href: "/super-admin/plans", label: "Plans" },
        { href: "/super-admin/subscriptions", label: "Subscriptions" },
        { href: "/super-admin/support", label: "Support" },
      ]}
    />
  );
}
