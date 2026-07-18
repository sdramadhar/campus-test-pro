"use client";

import { CalendarClock, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { StudentAssessment, studentExamRequest } from "../../lib/student-exams";

export default function StudentTestsPage() {
  const [items, setItems] = useState<StudentAssessment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const path =
      filter === "all"
        ? "/api/v1/student/assessments"
        : `/api/v1/student/assessments?status=${filter}`;
    setStatus("loading");
    studentExamRequest<StudentAssessment[]>(path)
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
      allowedRoles={["STUDENT"]}
      eyebrow="Student exams"
      title="Assigned Tests"
    >
      <section className="panel">
        <div className="question-toolbar">
          <div className="step-tabs">
            {["all", "upcoming", "active", "completed"].map((item) => (
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
        </div>
        {status === "loading" && (
          <div className="skeleton-panel">Loading assigned tests...</div>
        )}
        {status === "error" && (
          <div className="error-panel">Could not load assigned tests.</div>
        )}
        {status === "ready" && items.length === 0 && (
          <div className="empty-panel">No tests found for this view.</div>
        )}
        <div className="exam-list">
          {items.map((item) => (
            <article className="exam-row" key={item.id}>
              <div>
                <span className="eyebrow">{item.windowState}</span>
                <h2>{item.title}</h2>
                <p>
                  {item.questionCount} questions · {item.durationMinutes}{" "}
                  minutes · {item.totalMarks} marks
                </p>
              </div>
              <div className="exam-actions">
                {item.publishedResultId && (
                  <Link
                    className="secondary-action"
                    href={`/student/results/${item.publishedResultId}`}
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Result
                  </Link>
                )}
                {item.latestAttempt?.status === "IN_PROGRESS" ? (
                  <Link
                    className="primary-action"
                    href={`/student/attempts/${item.latestAttempt.id}`}
                  >
                    <PlayCircle aria-hidden="true" />
                    Resume
                  </Link>
                ) : (
                  <Link
                    className="primary-action"
                    href={`/student/tests/${item.id}/instructions`}
                  >
                    <CalendarClock aria-hidden="true" />
                    Instructions
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
