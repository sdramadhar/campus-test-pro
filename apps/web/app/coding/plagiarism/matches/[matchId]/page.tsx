"use client";

import { use } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import { CodingPanel } from "../../../../components/coding-panel";

export default function PlagiarismMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Similarity match" title="Plagiarism Match">
      <CodingPanel config={{ title: "Plagiarism Match", endpoint: "/api/v1/coding/plagiarism/matches/[matchId]", mode: "plagiarism-match" }} params={{ matchId }} />
    </AuthShell>
  );
}
