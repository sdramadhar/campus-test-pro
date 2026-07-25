"use client";

import { use } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import { CodingPanel } from "../../../../components/coding-panel";

export default function PlagiarismJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Similarity job" title="Plagiarism Job">
      <CodingPanel config={{ title: "Plagiarism Job", endpoint: "/api/v1/coding/plagiarism/jobs/[jobId]", mode: "plagiarism-job" }} params={{ jobId }} />
    </AuthShell>
  );
}
