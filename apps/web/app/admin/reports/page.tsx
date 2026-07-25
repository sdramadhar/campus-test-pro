"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function AdminReportsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Reports" title="Admin Reports">
      <AnalyticsPanel config={{ title: "Saved Reports", eyebrow: "Reports", endpoint: "/api/v1/reports", reportMode: true }} />
    </AuthShell>
  );
}
