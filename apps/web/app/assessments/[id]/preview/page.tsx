import { AuthShell } from "../../../components/auth-shell";

export default async function AssessmentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Assessment preview"
      title="Preview"
    >
      <section className="panel">
        <div className="panel-header">
          <h2>Safe Preview</h2>
          <span>{id}</span>
        </div>
        <p className="body-copy">
          The backend preview endpoint validates publish blockers and omits
          student-unsafe internals from delivery phases.
        </p>
      </section>
    </AuthShell>
  );
}
