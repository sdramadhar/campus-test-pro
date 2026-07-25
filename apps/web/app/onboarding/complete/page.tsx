import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingCompletePage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Final Review"
      description="Review setup checklist, security settings, imports, and subscription state before completing onboarding."
      endpoint="/api/v1/onboarding"
    />
  );
}
