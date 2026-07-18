import { AssessmentList } from "../components/assessment-builder";
import { AuthShell } from "../components/auth-shell";

export default function AssessmentsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Assessment builder"
      title="Assessments"
    >
      <AssessmentList />
    </AuthShell>
  );
}
