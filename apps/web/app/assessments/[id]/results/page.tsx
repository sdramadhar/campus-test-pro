"use client";

import { Download } from "lucide-react";
import { use } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { apiUrl } from "../../../lib/auth";

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
      <section className="panel">
        <div className="panel-header">
          <h2>Result Operations</h2>
          <span>{id}</span>
        </div>
        <p className="body-copy">
          Use this view to export assessment results and publish eligible
          results after reviews and moderation holds are cleared.
        </p>
        <div className="form-actions">
          <a
            className="primary-action"
            href={`${apiUrl}/api/v1/result-moderation/assessments/${id}/export.csv`}
          >
            <Download aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </section>
    </AuthShell>
  );
}
