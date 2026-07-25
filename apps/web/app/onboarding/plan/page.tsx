import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingPlanPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Plan Selection"
      description="Choose a plan version snapshot. Redirect success alone never activates billing; webhook confirmation is required."
      endpoint="/api/v1/billing/plans"
    />
  );
}
