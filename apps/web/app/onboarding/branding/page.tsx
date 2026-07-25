import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingBrandingPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Branding"
      description="Configure logo, colors, footer, and support details when the tenant plan includes custom branding."
      endpoint="/api/v1/tenant/branding"
    />
  );
}
