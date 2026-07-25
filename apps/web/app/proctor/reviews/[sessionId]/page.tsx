"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function ProctorReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Decision workflow" title="Proctoring Review">
      <ProctoringPanel
        config={{ title: "Review", eyebrow: "Reviews", endpoint: "/api/v1/proctoring/reviews/[sessionId]", mode: "review" }}
        params={{ sessionId }}
      />
    </AuthShell>
  );
}
