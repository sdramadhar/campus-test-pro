import { AssessmentBuilder } from "../../../components/assessment-builder";
import { AuthShell } from "../../../components/auth-shell";

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Assessment builder"
      title="Edit Assessment"
    >
      <AssessmentBuilder assessmentId={id} />
    </AuthShell>
  );
}
