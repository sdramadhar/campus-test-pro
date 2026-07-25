"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function AssessmentProctoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Assessment security" title="Assessment Proctoring">
      <ProctoringPanel
        config={{ title: "Assessment Sessions", eyebrow: "Assessment", endpoint: "/api/v1/proctoring/sessions?assessmentId=[id]", mode: "assessment" }}
        params={{ id }}
      />
    </AuthShell>
  );
}
