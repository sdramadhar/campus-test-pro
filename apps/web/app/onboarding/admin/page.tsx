import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingAdminPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Primary Administrator"
      description="Invite and verify the primary administrator. Development email delivery uses the configured console provider."
      endpoint="/api/v1/onboarding"
    />
  );
}
