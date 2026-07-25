"use client";

import { AuthShell } from "../../components/auth-shell";
import { CodingPanel } from "../../components/coding-panel";

export default function CodingAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Coding analytics" title="Coding Analytics">
      <CodingPanel config={{ title: "Coding Analytics", endpoint: "/api/v1/analytics/coding", mode: "analytics" }} />
    </AuthShell>
  );
}
