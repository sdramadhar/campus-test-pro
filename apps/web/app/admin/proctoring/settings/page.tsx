"use client";

import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function ProctoringSettingsPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Exam security" title="Proctoring Settings">
      <ProctoringPanel config={{ title: "Settings", eyebrow: "Admin", endpoint: "/api/v1/proctoring/policies", mode: "settings" }} />
    </AuthShell>
  );
}
