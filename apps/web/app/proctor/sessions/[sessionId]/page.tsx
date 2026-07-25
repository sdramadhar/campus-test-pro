"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function ProctorSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Session control" title="Proctoring Session">
      <ProctoringPanel
        config={{ title: "Session", eyebrow: "Proctor", endpoint: "/api/v1/proctoring/sessions/[sessionId]", mode: "session" }}
        params={{ sessionId }}
      />
    </AuthShell>
  );
}
