import { ProtectedSaasPage } from "../../components/saas-pages";

export default function LegalSettingsPage() {
  return (
    <ProtectedSaasPage
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Legal"
      title="Policy Acceptance"
      description="Track versioned terms, privacy, data processing, acceptable use, proctoring notice, and billing terms. Templates require legal review."
      endpoint="/api/v1/legal/documents"
    />
  );
}
