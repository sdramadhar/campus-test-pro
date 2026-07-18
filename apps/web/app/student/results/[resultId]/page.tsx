"use client";

import { use, useEffect, useState } from "react";
import { AuthShell } from "../../../components/auth-shell";
import { StudentResult, studentExamRequest } from "../../../lib/student-exams";

export default function StudentResultDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = use(params);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    studentExamRequest<StudentResult>(`/api/v1/student/results/${resultId}`)
      .then(setResult)
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Could not load result.",
        );
      });
  }, [resultId]);

  return (
    <AuthShell
      allowedRoles={["STUDENT"]}
      eyebrow="Result detail"
      title={result?.assessment?.title ?? "Result"}
    >
      {message && <div className="error-panel">{message}</div>}
      {result && (
        <>
          <section className="metrics">
            <article>
              <span>Total score</span>
              <strong>{result.totalScore}</strong>
            </article>
            <article>
              <span>Percentage</span>
              <strong>{result.percentage}%</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{result.passStatus}</strong>
            </article>
            <article>
              <span>Evaluation</span>
              <strong>{result.evaluationStatus}</strong>
            </article>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Score Breakdown</h2>
              <span>
                {result.publishedAt
                  ? new Date(result.publishedAt).toLocaleString()
                  : "Published"}
              </span>
            </div>
            <div className="detail-grid">
              <div>
                <span>Objective</span>
                <strong>{result.objectiveScore}</strong>
              </div>
              <div>
                <span>Descriptive</span>
                <strong>{result.descriptiveScore}</strong>
              </div>
              <div>
                <span>Coding</span>
                <strong>{result.codingScore}</strong>
              </div>
              <div>
                <span>Attempted</span>
                <strong>{result.attemptedCount}</strong>
              </div>
              <div>
                <span>Correct</span>
                <strong>{result.correctCount}</strong>
              </div>
              <div>
                <span>Incorrect</span>
                <strong>{result.incorrectCount}</strong>
              </div>
              <div>
                <span>Unanswered</span>
                <strong>{result.unansweredCount}</strong>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Sections</h2>
              <span>No answer keys are shown in student results.</span>
            </div>
            <div className="activity-list">
              {(result.sectionResults ?? []).map((section) => (
                <div key={section.sectionName}>
                  <span>{section.sectionName}</span>
                  <strong>
                    {section.awardedMarks} / {section.totalMarks}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AuthShell>
  );
}
