import { AiPromptsPanel } from "../../../../components/ai-admin-panel";
import { AuthShell } from "../../../../components/auth-shell";

export default function EditAiPromptPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="AI administration"
      title="Prompt Template"
    >
      <AiPromptsPanel />
    </AuthShell>
  );
}
