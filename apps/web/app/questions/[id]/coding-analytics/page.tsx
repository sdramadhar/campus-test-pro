"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function QuestionCodingAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Question coding analytics" title="Coding Analytics">
      <CodingPanel config={{ title: "Question Coding Analytics", endpoint: "/api/v1/questions/[questionId]/coding-analytics", mode: "analytics" }} params={{ questionId: id }} />
    </AuthShell>
  );
}
