import { AdminDashboardPanel } from "../components/admin-dashboard-panel";
import { AuthShell } from "../components/auth-shell";

export default function AdminDashboardPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Admin panel"
      title="Dashboard"
    >
      <AdminDashboardPanel />
    </AuthShell>
  );
}
