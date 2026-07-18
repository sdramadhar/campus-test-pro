"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "../components/auth-shell";
import { ReviewTask, examOpsRequest } from "../lib/exam-operations";

export default function ReviewsPage() {
  const [items, setItems] = useState<ReviewTask[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    setStatus("loading");
    examOpsRequest<ReviewTask[]>(`/api/v1/review-workflow?status=${filter}`)
      .then((data) => {
        setItems(data);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [filter]);

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Review workflow"
      title="Manual Reviews"
    >
      <section className="panel">
        <div className="step-tabs">
          {["PENDING", "ASSIGNED", "COMPLETED"].map((item) => (
            <button
              className={filter === item ? "active-step" : ""}
              key={item}
              onClick={() => {
                setFilter(item);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        {status === "loading" && (
          <div className="skeleton-panel">Loading review queue...</div>
        )}
        {status === "error" && (
          <div className="error-panel">Could not load review queue.</div>
        )}
        {status === "ready" && items.length === 0 && (
          <div className="empty-panel">No review tasks found.</div>
        )}
        <div className="exam-list">
          {items.map((item) => (
            <article className="exam-row" key={item.id}>
              <div>
                <span className="eyebrow">{item.status}</span>
                <h2>{item.attempt.assessment.title}</h2>
                <p>
                  {item.attempt.student.name} · {item.question.questionType} ·{" "}
                  {item.maxMarks} marks
                </p>
              </div>
              <Link className="primary-action" href={`/reviews/${item.id}`}>
                Review
              </Link>
            </article>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
