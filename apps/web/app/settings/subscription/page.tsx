import { ProtectedSaasPage } from "../../components/saas-pages";

export default function SubscriptionSettingsPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Subscription"
      title="Current Plan"
      description="View the current tenant subscription, feature entitlements, limits, grace state, and provider mode."
      endpoint="/api/v1/billing/subscription"
      actions={[
        { href: "/settings/subscription/change", label: "Change plan" },
        { href: "/settings/subscription/usage", label: "Usage" },
        { href: "/billing/invoices", label: "Invoices" },
      ]}
    />
  );
}
