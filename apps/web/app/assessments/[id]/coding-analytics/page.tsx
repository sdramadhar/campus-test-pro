"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function AssessmentCodingAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment coding analytics" title="Coding Analytics">
      <CodingPanel config={{ title: "Assessment Coding Analytics", endpoint: "/api/v1/assessments/[assessmentId]/coding-analytics", mode: "analytics" }} params={{ assessmentId: id }} />
    </AuthShell>
  );
}
