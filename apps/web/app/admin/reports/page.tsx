"use client";

import { AuthShell } from "../../components/auth-shell";
import { ResultReportsPanel } from "../../components/result-reports-panel";

export default function AdminReportsPage() {
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN"]}
      eyebrow="Reports"
      title="Admin Reports"
    >
      <ResultReportsPanel />
    </AuthShell>
  );
}
