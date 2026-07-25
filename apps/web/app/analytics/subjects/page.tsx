"use client";

import { AuthShell } from "../../components/auth-shell";
import { AnalyticsPanel } from "../../components/analytics-panel";

export default function SubjectAnalyticsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]} eyebrow="Curriculum intelligence" title="Subject Analytics">
      <AnalyticsPanel config={{ title: "Subject Analytics", eyebrow: "Subjects", endpoint: "/api/v1/analytics/subjects", reportMode: true }} />
    </AuthShell>
  );
}
