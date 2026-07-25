"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function StudentAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="My progress" title="Student Analytics">
      <AnalyticsPanel config={{ title: "Student Analytics", eyebrow: "Student", endpoint: "/api/v1/analytics/student" }} />
    </AuthShell>
  );
}
