"use client";

import { AuthShell } from "../components/auth-shell";
import { AnalyticsPanel } from "../components/analytics-panel";

export default function LeaderboardsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]} eyebrow="Published rankings" title="Leaderboards">
      <AnalyticsPanel config={{ title: "Leaderboards", eyebrow: "Rankings", endpoint: "/api/v1/analytics/college" }} />
    </AuthShell>
  );
}
