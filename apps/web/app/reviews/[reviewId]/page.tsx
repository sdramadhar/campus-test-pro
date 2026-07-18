"use client";

import { use, useEffect, useState } from "react";
import { AuthShell } from "../../components/auth-shell";
import { ReviewTask, examOpsRequest } from "../../lib/exam-operations";

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = use(params);
  const [review, setReview] = useState<ReviewTask | null>(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    examOpsRequest<ReviewTask[]>("/api/v1/review-workflow")
      .then((items) => {
        const found = items.find((item) => item.id === reviewId) ?? null;
        setReview(found);
        setMarks(
          found?.awardedMarks === null || found?.awardedMarks === undefined
            ? ""
            : String(found.awardedMarks),
        );
        setFeedback(found?.feedback ?? "");
      })
      .catch(() => {
        setMessage("Could not load review task.");
      });
  }, [reviewId]);

  async function complete(): Promise<void> {
    if (!review || !window.confirm("Complete this manual review?")) {
      return;
    }
    try {
      await examOpsRequest(`/api/v1/review-workflow/${review.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          awardedMarks: Number(marks),
          feedback,
          expectedUpdatedAt: review.updatedAt,
        }),
      });
      setMessage("Review completed and result recalculated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not complete review.",
      );
    }
  }

  return (
    <AuthShell
      allowedRoles={["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"]}
      eyebrow="Review detail"
      title="Manual Review"
    >
      {message && <div className="error-panel">{message}</div>}
      {review && (
        <section className="panel">
          <div className="panel-header">
            <h2>{review.attempt.assessment.title}</h2>
            <span>{review.attempt.student.name}</span>
          </div>
          <div className="preview-box">{review.question.questionText}</div>
          <div className="detail-grid">
            <div>
              <span>Question type</span>
              <strong>{review.question.questionType}</strong>
            </div>
            <div>
              <span>Maximum marks</span>
              <strong>{review.maxMarks}</strong>
            </div>
            <div>
              <span>Rubric</span>
              <strong>
                {displayValue(review.question.rubric, "Not provided")}
              </strong>
            </div>
            <div>
              <span>Model answer</span>
              <strong>
                {displayValue(
                  review.question.modelAnswer,
                  "Restricted or not provided",
                )}
              </strong>
            </div>
          </div>
          <div className="form-grid">
            <label className="form-field">
              Awarded marks
              <input
                max={review.maxMarks}
                min={0}
                onChange={(event) => {
                  setMarks(event.target.value);
                }}
                type="number"
                value={marks}
              />
            </label>
            <label className="form-field">
              Feedback
              <textarea
                onChange={(event) => {
                  setFeedback(event.target.value);
                }}
                rows={5}
                value={feedback}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="primary-action"
              onClick={() => void complete()}
              type="button"
            >
              Complete Review
            </button>
          </div>
        </section>
      )}
    </AuthShell>
  );
}

function displayValue(value: unknown, fallback: string): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}
