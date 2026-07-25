"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function StudentCodingSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = use(params);
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Submission detail" title="Coding Submission">
      <CodingPanel config={{ title: "Coding Submission", endpoint: "/api/v1/student/coding-submissions/[submissionId]", mode: "history-detail" }} params={{ submissionId }} />
    </AuthShell>
  );
}
