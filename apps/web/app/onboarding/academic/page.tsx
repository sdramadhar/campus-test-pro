import { ProtectedSaasPage } from "../../components/saas-pages";

export default function OnboardingAcademicPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Academic Structure"
      description="Track setup of departments, courses, semesters, subjects, batches, faculty, and students."
      endpoint="/api/v1/onboarding"
    />
  );
}
