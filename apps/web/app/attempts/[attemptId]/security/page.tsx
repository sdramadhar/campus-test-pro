"use client";

import { use, useEffect, useState } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { examOpsRequest } from "../../../lib/exam-operations";

export default function AttemptSecurityPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<
    Array<{
      id: string;
      eventType: string;
      reviewStatus: string;
      createdAt: string;
    }>
  >([]);

  useEffect(() => {
    examOpsRequest<{
      events: Array<{
        id: string;
        eventType: string;
        reviewStatus: string;
        createdAt: string;
      }>;
    }>(`/api/v1/security-events/attempts/${attemptId}`)
      .then((data) => {
        setEvents(data.events);
      })
      .catch(() => {
        setMessage("Could not load security events.");
      });
  }, [attemptId]);

  async function update(status: string): Promise<void> {
    await examOpsRequest(
      `/api/v1/security-events/attempts/${attemptId}/review`,
      {
        method: "POST",
        body: JSON.stringify({ status, notes }),
      },
    );
    setMessage(`Security review marked ${status}.`);
  }

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Security review"
      title="Attempt Security"
    >
      {message && <div className="error-panel">{message}</div>}
      <section className="panel">
        <div className="activity-list">
          {events.map((event) => (
            <div key={event.id}>
              <span>{new Date(event.createdAt).toLocaleString()}</span>
              <strong>
                {event.eventType} · {event.reviewStatus}
              </strong>
            </div>
          ))}
        </div>
        <label className="form-field">
          Reviewer notes
          <textarea
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            rows={4}
            value={notes}
          />
        </label>
        <div className="form-actions">
          {["NORMAL", "FLAGGED", "REVIEWED", "CLEARED"].map((status) => (
            <button
              key={status}
              onClick={() => {
                void update(status);
              }}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
