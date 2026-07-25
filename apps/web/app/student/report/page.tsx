"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function MyReportPage() {
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Report card" title="My Report">
      <AnalyticsPanel config={{ title: "My Report Card", eyebrow: "Report", endpoint: "/api/v1/analytics/student" }} />
    </AuthShell>
  );
}
