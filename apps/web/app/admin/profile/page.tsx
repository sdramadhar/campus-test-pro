import { AdminProfilePanel } from "../../components/admin-profile-panel";
import { AuthShell } from "../../components/auth-shell";

export default function ProfilePage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]}
      eyebrow="Account"
      title="Profile Settings"
    >
      <AdminProfilePanel />
    </AuthShell>
  );
}
