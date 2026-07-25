"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { CodingPanel } from "../../../components/coding-panel";

export default function AssessmentCodingSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment coding" title="Coding Submissions">
      <CodingPanel config={{ title: "Assessment Coding", endpoint: "/api/v1/coding/submissions?assessmentId=[assessmentId]", mode: "reviews" }} params={{ assessmentId: id }} />
    </AuthShell>
  );
}
