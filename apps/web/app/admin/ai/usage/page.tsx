import { AiUsagePanel } from "../../../components/ai-admin-panel";
import { AuthShell } from "../../../components/auth-shell";

export default function AiUsagePage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="AI administration"
      title="Usage and Cost"
    >
      <AiUsagePanel mode="usage" />
    </AuthShell>
  );
}
