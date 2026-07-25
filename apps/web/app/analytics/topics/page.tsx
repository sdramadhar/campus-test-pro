"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function TopicAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]} eyebrow="Topic coverage" title="Topic Analytics">
      <AnalyticsPanel config={{ title: "Topic Analytics", eyebrow: "Topics", endpoint: "/api/v1/analytics/topics", reportMode: true }} />
    </AuthShell>
  );
}
