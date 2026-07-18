import Link from "next/link";
import { AuthShell } from "../../components/auth-shell";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Assessment builder"
      title="Assessment Detail"
    >
      <section className="panel">
        <div className="panel-header">
          <h2>Assessment Record</h2>
          <span>{id}</span>
        </div>
        <div className="form-actions">
          <Link className="primary-action" href={`/assessments/${id}/edit`}>
            Edit Builder
          </Link>
          <Link className="primary-action" href={`/assessments/${id}/preview`}>
            Preview
          </Link>
          <Link className="primary-action" href={`/assessments/${id}/assign`}>
            Assign
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
