"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function ReportJobsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Report jobs" title="Report Jobs">
      <AnalyticsPanel config={{ title: "Report Jobs", eyebrow: "Jobs", endpoint: "/api/v1/report-jobs" }} />
    </AuthShell>
  );
}
