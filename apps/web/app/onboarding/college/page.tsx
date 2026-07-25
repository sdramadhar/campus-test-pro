import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingCollegePage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Institution Details"
      description="Confirm profile, contact, address, timezone, and public institution identity before activation."
      endpoint="/api/v1/onboarding"
    />
  );
}
