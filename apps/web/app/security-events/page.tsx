"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "../components/auth-shell";
import { examOpsRequest } from "../lib/exam-operations";

interface SecuritySummary {
  counts: Record<string, number>;
  events: Array<{
    id: string;
    attemptId: string;
    eventType: string;
    reviewStatus: string;
    createdAt: string;
    student: { name: string };
    assessment: { title: string };
  }>;
}

export default function SecurityEventsPage() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);

  useEffect(() => {
    examOpsRequest<SecuritySummary>("/api/v1/security-events")
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Security review"
      title="Attempt Security Events"
    >
      <section className="metrics">
        {Object.entries(summary?.counts ?? {}).map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="exam-list">
          {(summary?.events ?? []).map((event) => (
            <article className="exam-row" key={event.id}>
              <div>
                <span className="eyebrow">{event.reviewStatus}</span>
                <h2>{event.eventType}</h2>
                <p>
                  {event.student.name} · {event.assessment.title} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
              <a
                className="primary-action"
                href={`/attempts/${event.attemptId}/security`}
              >
                Open
              </a>
            </article>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
