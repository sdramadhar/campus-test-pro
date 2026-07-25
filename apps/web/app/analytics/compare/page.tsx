"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function CompareAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]} eyebrow="Comparative analytics" title="Compare Analytics">
      <AnalyticsPanel config={{ title: "Comparative Analytics", eyebrow: "Compare", endpoint: "/api/v1/analytics/compare", method: "POST", reportMode: true }} />
    </AuthShell>
  );
}
