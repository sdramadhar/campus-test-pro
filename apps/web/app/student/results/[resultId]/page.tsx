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
            <article>
              <span>Time Taken</span>
              <strong>{formatDuration(result.timeTakenSeconds ?? null)}</strong>
            </article>
            <article>
              <span>Violations</span>
              <strong>{result.violations ?? 0}</strong>
            </article>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Score Breakdown</h2>
              <span>
                {result.submittedAt
                  ? `Submitted ${new Date(result.submittedAt).toLocaleString()}`
                  : result.publishedAt
                    ? `Published ${new Date(result.publishedAt).toLocaleString()}`
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
          {(result.questionReview ?? []).length > 0 && (
            <section className="panel">
              <div className="panel-header">
                <h2>Question Review</h2>
                <span>Published review summary</span>
              </div>
              <div className="activity-list">
                {(result.questionReview ?? []).map((question) => (
                  <div key={question.id}>
                    <span>
                      {question.displayOrder}. {question.questionText}
                    </span>
                    <strong>
                      {question.awardedMarks ?? "-"} /{" "}
                      {question.maxMarks ?? question.assignedMarks}
                      {question.isCorrect === true
                        ? " Correct"
                        : question.isCorrect === false
                          ? " Wrong"
                          : ""}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AuthShell>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
