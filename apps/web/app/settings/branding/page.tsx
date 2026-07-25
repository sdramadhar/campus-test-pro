import { ProtectedSaasPage } from "../../components/saas-pages";

export default function BrandingSettingsPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Branding"
      title="White Label Branding"
      description="Manage tenant branding with entitlement checks, contrast validation, safe URLs, draft preview, and version history."
      endpoint="/api/v1/tenant/branding"
      actions={[{ href: "/settings/branding/preview", label: "Preview" }]}
    />
  );
}
