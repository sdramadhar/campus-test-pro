"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { AnalyticsPanel } from "../../../components/analytics-panel";

export default function AssessmentReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Result report" title="Assessment Reports">
      <AnalyticsPanel config={{ title: "Assessment Result Report", eyebrow: "Reports", endpoint: "/api/v1/assessments/[id]/report", reportMode: true }} params={{ id }} />
    </AuthShell>
  );
}
