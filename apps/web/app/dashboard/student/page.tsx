import { DashboardView } from "../../components/dashboard-view";

export default function StudentDashboard() {
  return (
    <DashboardView
      allowedRoles={["STUDENT"]}
      eyebrow="Student workspace"
      title="Student Dashboard"
    />
  );
}
