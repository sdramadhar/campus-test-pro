"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function AdminAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="College intelligence" title="Admin Analytics">
      <AnalyticsPanel config={{ title: "College Analytics", eyebrow: "College", endpoint: "/api/v1/analytics/college", reportMode: true }} />
    </AuthShell>
  );
}
