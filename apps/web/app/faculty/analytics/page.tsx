"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function FacultyAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["FACULTY"]} eyebrow="Assigned performance" title="Faculty Analytics">
      <AnalyticsPanel config={{ title: "Faculty Analytics", eyebrow: "Faculty", endpoint: "/api/v1/analytics/faculty", reportMode: true }} />
    </AuthShell>
  );
}
