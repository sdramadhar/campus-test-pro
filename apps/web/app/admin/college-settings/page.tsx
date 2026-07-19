import { AdminSettingsPanel } from "../../components/admin-settings-panel";
import { AuthShell } from "../../components/auth-shell";

export default function CollegeSettingsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Admin panel"
      title="College Settings"
    >
      <AdminSettingsPanel />
    </AuthShell>
  );
}
