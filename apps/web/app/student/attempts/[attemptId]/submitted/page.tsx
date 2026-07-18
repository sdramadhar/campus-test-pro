"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import {
  StudentAttempt,
  studentExamRequest,
} from "../../../../lib/student-exams";

export default function SubmittedPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);

  useEffect(() => {
    studentExamRequest<StudentAttempt>(`/api/v1/student/attempts/${attemptId}`)
      .then(setAttempt)
      .catch(() => undefined);
  }, [attemptId]);

  return (
    <AuthShell
      allowedRoles={["STUDENT"]}
      eyebrow="Submission"
      title="Attempt Submitted"
    >
      <section className="panel compact-panel">
        <div className="inline-chip">
          <CheckCircle2 aria-hidden="true" />
          Submission locked
        </div>
        <p className="body-copy">
          Your attempt has been submitted. Result visibility follows the
          assessment publication policy.
        </p>
        {attempt?.receipt && (
          <div className="detail-grid">
            <div>
              <span>Receipt</span>
              <strong>{attempt.receipt.receiptNumber}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{attempt.receipt.status}</strong>
            </div>
            <div>
              <span>Answered</span>
              <strong>{attempt.receipt.answerCount}</strong>
            </div>
            <div>
              <span>Unanswered</span>
              <strong>{attempt.receipt.unansweredCount}</strong>
            </div>
          </div>
        )}
        <div className="form-actions">
          <Link className="primary-action" href="/student/tests">
            Back to Tests
          </Link>
          <Link className="secondary-action" href="/student/results">
            View Results
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
