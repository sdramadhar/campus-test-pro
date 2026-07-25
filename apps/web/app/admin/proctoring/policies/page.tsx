"use client";

import { AuthShell } from "../../../components/auth-shell";
import { ProctoringPanel } from "../../../components/proctoring-panel";

export default function ProctoringPoliciesPage() {
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Policy management" title="Proctoring Policies">
      <ProctoringPanel config={{ title: "Policies", eyebrow: "Admin", endpoint: "/api/v1/proctoring/policies", mode: "policies" }} />
    </AuthShell>
  );
}
