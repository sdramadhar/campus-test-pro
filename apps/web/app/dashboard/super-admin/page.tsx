import { DashboardView } from "../../components/dashboard-view";

export default function SuperAdminDashboard() {
  return (
    <DashboardView
      allowedRoles={["SUPER_ADMIN"]}
      eyebrow="Platform administration"
      title="Super Admin Dashboard"
    />
  );
}
