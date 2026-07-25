"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function AnalyticsInsightsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="AI suggestions" title="Analytics Insights">
      <AnalyticsPanel config={{ title: "Analytics Insights", eyebrow: "Insights", endpoint: "/api/v1/analytics/insights", insightMode: true }} />
    </AuthShell>
  );
}
