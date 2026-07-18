import { DashboardView } from "../../components/dashboard-view";

export default function CollegeAdminDashboard() {
  return (
    <DashboardView
      allowedRoles={["COLLEGE_ADMIN"]}
      eyebrow="College administration"
      title="College Admin Dashboard"
    />
  );
}
