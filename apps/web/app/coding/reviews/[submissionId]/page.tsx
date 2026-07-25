"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function CodingReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Submission review" title="Coding Review">
      <CodingPanel config={{ title: "Coding Review", endpoint: "/api/v1/coding/submissions/[submissionId]", mode: "review-detail" }} params={{ submissionId }} />
    </AuthShell>
  );
}
