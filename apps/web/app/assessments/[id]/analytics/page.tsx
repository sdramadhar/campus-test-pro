"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { AnalyticsPanel } from "../../../components/analytics-panel";

export default function AssessmentAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment intelligence" title="Assessment Analytics">
      <AnalyticsPanel config={{ title: "Assessment Analytics", eyebrow: "Assessment", endpoint: "/api/v1/assessments/[id]/analytics", reportMode: true }} params={{ id }} />
    </AuthShell>
  );
}
