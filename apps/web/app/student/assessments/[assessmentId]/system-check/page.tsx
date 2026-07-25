"use client";

import { use } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import { ProctoringPanel } from "../../../../components/proctoring-panel";

export default function SystemCheckPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = use(params);
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Exam readiness" title="System Check">
      <ProctoringPanel
        config={{ title: "System Check", eyebrow: "Student", endpoint: "/api/v1/student/assessments/[assessmentId]/proctoring-policy", mode: "student" }}
        params={{ assessmentId }}
      />
    </AuthShell>
  );
}
