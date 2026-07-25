"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function LiveAssessmentPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment monitoring" title="Assessment Proctoring">
      <ProctoringPanel
        config={{ title: "Assessment Sessions", eyebrow: "Proctor", endpoint: "/api/v1/proctoring/sessions?assessmentId=[assessmentId]", mode: "live" }}
        params={{ assessmentId }}
      />
    </AuthShell>
  );
}
