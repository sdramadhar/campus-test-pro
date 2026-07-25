"use client";

import { AuthShell } from "../../components/auth-shell";
import { ProctoringPanel } from "../../components/proctoring-panel";

export default function LiveProctorPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]} eyebrow="Live monitoring" title="Proctor Dashboard">
      <ProctoringPanel config={{ title: "Live Sessions", eyebrow: "Proctor", endpoint: "/api/v1/proctoring/sessions", mode: "live" }} />
    </AuthShell>
  );
}
