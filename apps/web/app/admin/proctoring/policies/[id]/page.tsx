"use client";

import { use } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import { ProctoringPanel } from "../../../../components/proctoring-panel";

export default function ProctoringPolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthShell allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]} eyebrow="Policy detail" title="Proctoring Policy">
      <ProctoringPanel
        config={{ title: "Policy", eyebrow: "Admin", endpoint: "/api/v1/proctoring/policies/[id]", mode: "policy" }}
        params={{ id }}
      />
    </AuthShell>
  );
}
