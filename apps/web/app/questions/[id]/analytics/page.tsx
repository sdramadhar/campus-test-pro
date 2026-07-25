"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { AnalyticsPanel } from "../../../components/analytics-panel";

export default function QuestionAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Measured quality" title="Question Analytics">
      <AnalyticsPanel config={{ title: "Question Analytics", eyebrow: "Question", endpoint: "/api/v1/questions/[id]/analytics" }} params={{ id }} />
    </AuthShell>
  );
}
