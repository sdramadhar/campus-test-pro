import { AdminPermissionsPanel } from "../../components/admin-permissions-panel";
import { AuthShell } from "../../components/auth-shell";

export default function PermissionsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Admin panel"
      title="User Permissions"
    >
      <AdminPermissionsPanel />
    </AuthShell>
  );
}
