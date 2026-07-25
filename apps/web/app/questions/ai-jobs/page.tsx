import { AiJobsPanel } from "../../components/ai-jobs-panel";
import { AuthShell } from "../../components/auth-shell";

export default function AiJobsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="AI question workflow"
      title="AI Jobs"
    >
      <AiJobsPanel />
    </AuthShell>
  );
}
