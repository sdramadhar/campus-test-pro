import { AiReviewPanel } from "../../../components/ai-review-panel";
import { AuthShell } from "../../../components/auth-shell";

export default async function AiReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Human review"
      title="AI Review"
    >
      <AiReviewPanel jobId={jobId} />
    </AuthShell>
  );
}
