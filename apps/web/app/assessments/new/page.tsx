import { AssessmentBuilder } from "../../components/assessment-builder";
import { AuthShell } from "../../components/auth-shell";

export default function NewAssessmentPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Assessment builder"
      title="New Assessment"
    >
      <AssessmentBuilder />
    </AuthShell>
  );
}
