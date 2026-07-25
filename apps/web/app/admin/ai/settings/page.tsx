import { AiUsagePanel } from "../../../components/ai-admin-panel";
import { AuthShell } from "../../../components/auth-shell";

export default function AiSettingsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="AI administration"
      title="AI Settings"
    >
      <AiUsagePanel mode="settings" />
    </AuthShell>
  );
}
