"use client";

import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { StudentResult, studentExamRequest } from "../../lib/student-exams";

export default function StudentResultsPage() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    studentExamRequest<StudentResult[]>("/api/v1/student/results")
      .then((data) => {
        setResults(data);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  return (
    <AuthShell
      allowedRoles={["STUDENT"]}
      eyebrow="Student results"
      title="Published Results"
    >
      <section className="panel">
        {status === "loading" && (
          <div className="skeleton-panel">Loading results...</div>
        )}
        {status === "error" && (
          <div className="error-panel">Could not load results.</div>
        )}
        {status === "ready" && results.length === 0 && (
          <div className="empty-panel">No published results yet.</div>
        )}
        <div className="exam-list">
          {results.map((result) => (
            <article className="exam-row" key={result.id}>
              <div>
                <span className="eyebrow">{result.evaluationStatus}</span>
                <h2>{result.assessment?.title ?? result.assessmentId}</h2>
                <p>
                  {result.totalScore} marks · {result.percentage}% ·{" "}
                  {result.passStatus}
                </p>
              </div>
              <Link
                className="primary-action"
                href={`/student/results/${result.id}`}
              >
                <BarChart3 aria-hidden="true" />
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}
