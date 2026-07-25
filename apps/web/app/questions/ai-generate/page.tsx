import { AiGeneratePanel } from "../../components/ai-generate-panel";
import { AuthShell } from "../../components/auth-shell";

export default function AiGeneratePage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="AI question workflow"
      title="AI Question Generator"
    >
      <AiGeneratePanel />
    </AuthShell>
  );
}
