import { ProtectedSaasPage } from "../components/saas-pages";

export default function OnboardingPage() {
  return (
    <ProtectedSaasPage
      eyebrow="Onboarding"
      title="Setup Checklist"
      description="Save and resume onboarding progress across institution details, administrators, academic structure, branding, plan selection, imports, security, and final review."
      endpoint="/api/v1/onboarding"
      actions={[
        { href: "/onboarding/college", label: "College" },
        { href: "/onboarding/admin", label: "Admin" },
        { href: "/onboarding/academic", label: "Academic" },
        { href: "/onboarding/branding", label: "Branding" },
        { href: "/onboarding/plan", label: "Plan" },
        { href: "/onboarding/complete", label: "Review" },
      ]}
    />
  );
}
