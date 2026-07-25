"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { AnalyticsPanel } from "../../../components/analytics-panel";

export default function StudentReportPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Report card" title="Student Report">
      <AnalyticsPanel config={{ title: "Student Report Card", eyebrow: "Report", endpoint: "/api/v1/students/[studentId]/analytics", reportMode: true }} params={{ studentId }} />
    </AuthShell>
  );
}
