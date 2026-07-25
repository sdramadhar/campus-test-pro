"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { AnalyticsPanel } from "../../../components/analytics-panel";

export default function AssessmentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"]} eyebrow="Published ranking" title="Assessment Leaderboard">
      <AnalyticsPanel config={{ title: "Assessment Leaderboard", eyebrow: "Leaderboard", endpoint: "/api/v1/assessments/[id]/leaderboard" }} params={{ id }} />
    </AuthShell>
  );
}
