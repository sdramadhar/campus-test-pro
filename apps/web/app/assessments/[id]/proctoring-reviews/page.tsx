"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function AssessmentProctoringReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment reviews" title="Proctoring Reviews">
      <ProctoringPanel
        config={{ title: "Assessment Reviews", eyebrow: "Reviews", endpoint: "/api/v1/proctoring/reviews?assessmentId=[id]", mode: "reviews" }}
        params={{ id }}
      />
    </AuthShell>
  );
}
