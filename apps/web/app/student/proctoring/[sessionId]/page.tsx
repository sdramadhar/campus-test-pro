"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function StudentProctoringSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <AuthShell allowedRoles={["STUDENT"]} eyebrow="Exam session" title="Proctoring Session">
      <ProctoringPanel
        config={{ title: "Session", eyebrow: "Student", endpoint: "/api/v1/proctoring/sessions/[sessionId]", mode: "student-session" }}
        params={{ sessionId }}
      />
    </AuthShell>
  );
}
