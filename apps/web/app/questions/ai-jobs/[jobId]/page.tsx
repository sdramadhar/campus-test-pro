import { AiReviewPanel } from "../../../components/ai-review-panel";
import { AuthShell } from "../../../components/auth-shell";

export default async function AiJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="AI job detail"
      title="Generated Questions"
    >
      <AiReviewPanel jobId={jobId} />
    </AuthShell>
  );
}
