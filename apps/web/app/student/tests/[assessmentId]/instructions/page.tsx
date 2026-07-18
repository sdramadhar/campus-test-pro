"use client";

import { PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import {
  StudentAssessment,
  StudentAttempt,
  studentExamRequest,
} from "../../../../lib/student-exams";

export default function InstructionsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = use(params);
  const router = useRouter();
  const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
  const [declared, setDeclared] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "starting" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    studentExamRequest<StudentAssessment>(
      `/api/v1/student/assessments/${assessmentId}`,
    )
      .then((data) => {
        setAssessment(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load instructions.",
        );
        setStatus("error");
      });
  }, [assessmentId]);

  async function start(): Promise<void> {
    setStatus("starting");
    setMessage("");
    try {
      const attempt = await studentExamRequest<StudentAttempt>(
        `/api/v1/student/assessments/${assessmentId}/start`,
        {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: `web-${assessmentId}-${String(Date.now())}`,
            sessionKey: `web-session-${String(Date.now())}`,
            clientStartMetadata: { source: "web" },
          }),
        },
      );
      router.replace(`/student/attempts/${attempt.id}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not start test.",
      );
      setStatus("ready");
    }
  }

  return (
    <AuthShell
      allowedRoles={["STUDENT"]}
      eyebrow="Instructions"
      title={assessment?.title ?? "Test Instructions"}
    >
      <section className="panel">
        {status === "loading" && (
          <div className="skeleton-panel">Loading instructions...</div>
        )}
        {status === "error" && <div className="error-panel">{message}</div>}
        {assessment && (
          <div className="exam-instructions">
            <p className="body-copy">{assessment.description}</p>
            <div className="metrics">
              <article>
                <span>Duration</span>
                <strong>{assessment.durationMinutes} min</strong>
              </article>
              <article>
                <span>Questions</span>
                <strong>{assessment.questionCount}</strong>
              </article>
              <article>
                <span>Total marks</span>
                <strong>{assessment.totalMarks}</strong>
              </article>
              <article>
                <span>Attempts</span>
                <strong>{assessment.maxAttempts}</strong>
              </article>
            </div>
            <div className="preview-box">
              {assessment.instructions ??
                "Follow all college examination rules."}
            </div>
            <ul className="exam-rules">
              <li>
                Server time controls the test timer and submission window.
              </li>
              <li>
                Answers auto-save after a short pause and are restored after
                refresh.
              </li>
              <li>
                Copy, paste, reconnect, fullscreen, and tab events are review
                signals only.
              </li>
              <li>
                Coding questions show public examples, but local code execution
                is unavailable without a secure sandbox.
              </li>
            </ul>
            {assessment.eligibility && !assessment.eligibility.eligible && (
              <div className="error-panel">
                {assessment.eligibility.errors.join(" ")}
              </div>
            )}
            {message && <div className="error-panel">{message}</div>}
            <label className="toggle-row">
              <input
                checked={declared}
                onChange={(event) => {
                  setDeclared(event.target.checked);
                }}
                type="checkbox"
              />
              I understand the instructions and will submit my own work.
            </label>
            <div className="form-actions">
              <button
                className="primary-action"
                disabled={
                  !declared ||
                  status === "starting" ||
                  assessment.eligibility?.eligible === false
                }
                onClick={() => {
                  void start();
                }}
                type="button"
              >
                <PlayCircle aria-hidden="true" />
                {status === "starting" ? "Starting..." : "Start Test"}
              </button>
            </div>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
