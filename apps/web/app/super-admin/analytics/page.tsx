"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function SuperAdminAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN"]} eyebrow="Platform intelligence" title="Super Admin Analytics">
      <AnalyticsPanel config={{ title: "Platform Analytics", eyebrow: "Platform", endpoint: "/api/v1/analytics/platform" }} />
    </AuthShell>
  );
}
