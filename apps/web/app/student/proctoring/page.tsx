"use client";

import { AuthShell } from "../../components/auth-shell";
import { ProctoringPanel } from "../../components/proctoring-panel";

export default function StudentProctoringPage() {
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Exam integrity" title="My Proctoring">
      <ProctoringPanel
        config={{ title: "Active Policy", eyebrow: "Student", endpoint: "/api/v1/student/assessments/seed-assessment-active-phase7/proctoring-policy", mode: "student" }}
        params={{ assessmentId: "seed-assessment-active-phase7" }}
      />
    </AuthShell>
  );
}
