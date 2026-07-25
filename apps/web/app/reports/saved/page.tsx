"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function SavedReportsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Saved reports" title="Saved Reports">
      <AnalyticsPanel config={{ title: "Saved Reports", eyebrow: "Reports", endpoint: "/api/v1/reports", reportMode: true }} />
    </AuthShell>
  );
}
