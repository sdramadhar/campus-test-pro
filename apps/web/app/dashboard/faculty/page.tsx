import { DashboardView } from "../../components/dashboard-view";

export default function FacultyDashboard() {
  return (
    <DashboardView
      allowedRoles={["FACULTY"]}
      eyebrow="Faculty workspace"
      title="Faculty Dashboard"
    />
  );
}
