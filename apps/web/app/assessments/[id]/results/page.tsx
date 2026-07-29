"use client";

import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { ResultReportsPanel } from "../../../components/result-reports-panel";

export default function AssessmentResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Result moderation"
      title="Assessment Results"
    >
      <ResultReportsPanel assessmentId={id} />
    </AuthShell>
  );
}
