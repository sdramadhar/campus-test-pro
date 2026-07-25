"use client";

import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function ProctoringRetentionPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Evidence lifecycle" title="Evidence Retention">
      <ProctoringPanel config={{ title: "Retention", eyebrow: "Admin", endpoint: "/api/v1/proctoring/policies", mode: "retention" }} />
    </AuthShell>
  );
}
