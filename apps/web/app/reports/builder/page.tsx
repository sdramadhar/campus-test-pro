"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function ReportBuilderPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Report builder" title="Report Builder">
      <AnalyticsPanel config={{ title: "Report Builder", eyebrow: "Builder", endpoint: "/api/v1/reports", reportMode: true }} />
    </AuthShell>
  );
}
