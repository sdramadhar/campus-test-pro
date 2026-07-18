import Link from "next/link";
import { AuthShell } from "../../components/auth-shell";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Question bank"
      title="Question Detail"
    >
      <section className="panel">
        <div className="panel-header">
          <h2>Question Record</h2>
          <span>{id}</span>
        </div>
        <p className="body-copy">
          Open this question in edit mode to inspect and update its full secure
          configuration.
        </p>
        <Link className="primary-action" href={`/questions/${id}/edit`}>
          Edit Question
        </Link>
      </section>
    </AuthShell>
  );
}
