"use client";

import { AlertTriangle, CheckCircle2, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { AuthShell } from "../../../components/auth-shell";
import {
  AttemptQuestion,
  SavedAnswer,
  StudentAttempt,
  answerBody,
  studentExamRequest,
} from "../../../lib/student-exams";

type SaveState = "idle" | "saving" | "saved" | "failed";

export default function StudentAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const queueKey = `campustest-answer-queue-${attemptId}`;

  useEffect(() => {
    studentExamRequest<StudentAttempt>(`/api/v1/student/attempts/${attemptId}`)
      .then((data) => {
        setAttempt(data);
        const savedIndex = Number(
          localStorage.getItem(`campustest-current-${attemptId}`) ?? 0,
        );
        setCurrent(Number.isFinite(savedIndex) ? savedIndex : 0);
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Could not load attempt.",
        );
      });
  }, [attemptId]);

  useEffect(() => {
    const syncTime = () => {
      studentExamRequest<{ remainingSeconds: number; attemptStatus: string }>(
        `/api/v1/student/attempts/${attemptId}/time`,
      )
        .then((data) => {
          setRemaining(data.remainingSeconds);
          if (data.attemptStatus !== "IN_PROGRESS") {
            setMessage(`Attempt status is ${data.attemptStatus}.`);
            if (
              data.attemptStatus === "AUTO_SUBMITTED" ||
              data.attemptStatus === "SUBMITTED" ||
              data.attemptStatus === "EVALUATED" ||
              data.attemptStatus === "UNDER_REVIEW"
            ) {
              router.replace(`/student/attempts/${attemptId}/submitted`);
            }
          }
        })
        .catch(() => {
          setOnline(false);
        });
    };
    syncTime();
    const interval = window.setInterval(syncTime, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [attemptId]);

  useEffect(() => {
    if (
      remaining !== 0 ||
      autoSubmitting ||
      !attempt ||
      attempt.status !== "IN_PROGRESS"
    ) {
      return;
    }
    setAutoSubmitting(true);
    setMessage("Time expired. Submitting automatically with the server...");
    studentExamRequest(`/api/v1/student/attempts/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: `auto-${attemptId}` }),
    })
      .then(() => {
        router.replace(`/student/attempts/${attemptId}/submitted`);
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Server auto-submit is processing this attempt.",
        );
      });
  }, [attempt, attemptId, autoSubmitting, remaining, router]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void flushQueue();
      void logEvent("RECONNECT");
    };
    const onOffline = () => {
      setOnline(false);
      void logEvent("DISCONNECT");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        void logEvent("TAB_HIDDEN");
      }
    });
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });

  const question = attempt?.questions[current];
  const answersByQuestion = useMemo(() => {
    const map = new Map<string, SavedAnswer>();
    attempt?.questions.forEach((item) => {
      if (item.answer) {
        map.set(item.id, item.answer);
      }
    });
    return map;
  }, [attempt]);

  async function logEvent(eventType: string): Promise<void> {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/student/attempts/${attemptId}/events`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, metadata: { source: "web" } }),
      },
    ).catch(() => undefined);
  }

  function setQuestion(index: number): void {
    setCurrent(index);
    localStorage.setItem(`campustest-current-${attemptId}`, String(index));
  }

  function enqueue(questionId: string, body: unknown): void {
    const queued = JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Array<{
      questionId: string;
      body: unknown;
    }>;
    localStorage.setItem(
      queueKey,
      JSON.stringify([
        ...queued.filter((item) => item.questionId !== questionId),
        { questionId, body },
      ]),
    );
  }

  async function flushQueue(): Promise<void> {
    const queued = JSON.parse(localStorage.getItem(queueKey) ?? "[]") as Array<{
      questionId: string;
      body: unknown;
    }>;
    if (!queued.length) {
      return;
    }
    for (const item of queued) {
      await studentExamRequest(
        `/api/v1/student/attempts/${attemptId}/answers/${item.questionId}`,
        {
          method: "PUT",
          body: JSON.stringify(item.body),
        },
      );
    }
    localStorage.removeItem(queueKey);
  }

  function scheduleSave(
    nextQuestion: AttemptQuestion,
    value: unknown,
    markedForReview = nextQuestion.answer?.markedForReview ?? false,
  ): void {
    const body = answerBody(nextQuestion, value, markedForReview);
    window.clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = window.setTimeout(() => {
      studentExamRequest<SavedAnswer>(
        `/api/v1/student/attempts/${attemptId}/answers/${nextQuestion.id}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
      )
        .then((saved) => {
          setAttempt((existing) =>
            existing
              ? {
                  ...existing,
                  questions: existing.questions.map((item) =>
                    item.id === nextQuestion.id
                      ? { ...item, answer: saved }
                      : item,
                  ),
                }
              : existing,
          );
          setSaveState("saved");
        })
        .catch(() => {
          enqueue(nextQuestion.id, body);
          setSaveState("failed");
          void logEvent("ANSWER_SAVE_FAILURE");
        });
    }, 700);
  }

  async function clearAnswer(): Promise<void> {
    if (!question) {
      return;
    }
    await studentExamRequest<SavedAnswer>(
      `/api/v1/student/attempts/${attemptId}/answers/${question.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ clearAnswer: true }),
      },
    );
    setAttempt((existing) =>
      existing
        ? {
            ...existing,
            questions: existing.questions.map((item) =>
              item.id === question.id ? { ...item, answer: null } : item,
            ),
          }
        : existing,
    );
  }

  async function submit(): Promise<void> {
    if (
      !window.confirm(
        "Submit this attempt now? You cannot change answers after final submission.",
      )
    ) {
      return;
    }
    await flushQueue();
    await studentExamRequest(`/api/v1/student/attempts/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    router.replace(`/student/attempts/${attemptId}/submitted`);
  }

  return (
    <AuthShell
      allowedRoles={["STUDENT"]}
      eyebrow="Live attempt"
      title={attempt?.assessment.title ?? "Exam Attempt"}
    >
      <section className="exam-banner">
        <div className={online ? "status ok" : "status warn"}>
          {online ? "Connected" : "Reconnecting"}
        </div>
        <strong>{formatSeconds(remaining)}</strong>
        <span>
          {autoSubmitting
            ? "Submitting automatically"
            : saveState === "idle"
              ? "Ready"
              : saveState}
        </span>
      </section>
      {message && <div className="error-panel">{message}</div>}
      {attempt && question && (
        <section className="exam-layout">
          <aside className="question-palette">
            {attempt.questions.map((item, index) => {
              const saved = answersByQuestion.get(item.id);
              return (
                <button
                  className={index === current ? "active-step" : ""}
                  key={item.id}
                  onClick={() => {
                    setQuestion(index);
                  }}
                  type="button"
                >
                  {index + 1}
                  {saved?.markedForReview ? " ?" : saved ? " ✓" : ""}
                </button>
              );
            })}
          </aside>
          <article className="panel exam-question">
            <div className="panel-header">
              <h2>Question {current + 1}</h2>
              <span>
                {question.questionType} · {question.assignedMarks} marks
              </span>
            </div>
            <p className="body-copy">{question.questionText}</p>
            <QuestionInput
              question={question}
              onChange={(value) => {
                scheduleSave(question, value);
              }}
            />
            {question.questionType === "CODING" && (
              <div className="preview-box">
                Code execution is unavailable in this local foundation until a
                secure sandbox is connected.
              </div>
            )}
            <div className="form-actions">
              <button
                disabled={current === 0}
                onClick={() => {
                  setQuestion(current - 1);
                }}
                type="button"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  scheduleSave(question, "", true);
                }}
                type="button"
              >
                <AlertTriangle aria-hidden="true" />
                Mark for Review
              </button>
              <button
                onClick={() => {
                  void clearAnswer();
                }}
                type="button"
              >
                Clear Answer
              </button>
              <button
                onClick={() => {
                  setQuestion(
                    Math.min(current + 1, attempt.questions.length - 1),
                  );
                }}
                type="button"
              >
                <Save aria-hidden="true" />
                Save and Next
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  void submit();
                }}
                type="button"
              >
                <Send aria-hidden="true" />
                Final Submit
              </button>
            </div>
            {saveState === "saved" && (
              <div className="inline-chip">
                <CheckCircle2 aria-hidden="true" />
                Saved
              </div>
            )}
          </article>
        </section>
      )}
    </AuthShell>
  );
}

function QuestionInput({
  question,
  onChange,
}: {
  question: AttemptQuestion;
  onChange: (value: unknown) => void;
}) {
  if (
    question.questionType === "SINGLE_CHOICE" ||
    question.questionType === "TRUE_FALSE"
  ) {
    return (
      <div className="answer-stack">
        {(question.options ?? []).map((option) => (
          <label key={option.optionKey}>
            <input
              defaultChecked={question.answer?.selectedOptionKeys.includes(
                option.optionKey,
              )}
              name={question.id}
              onChange={() => {
                onChange(option.optionKey);
              }}
              type="radio"
            />
            {option.optionText}
          </label>
        ))}
      </div>
    );
  }
  if (question.questionType === "MULTIPLE_CHOICE") {
    return (
      <div className="answer-stack">
        {(question.options ?? []).map((option) => (
          <label key={option.optionKey}>
            <input
              defaultChecked={question.answer?.selectedOptionKeys.includes(
                option.optionKey,
              )}
              onChange={(event) => {
                const current = new Set(
                  question.answer?.selectedOptionKeys ?? [],
                );
                if (event.target.checked) {
                  current.add(option.optionKey);
                } else {
                  current.delete(option.optionKey);
                }
                onChange([...current]);
              }}
              type="checkbox"
            />
            {option.optionText}
          </label>
        ))}
      </div>
    );
  }
  if (question.questionType === "NUMERICAL") {
    return (
      <input
        className="exam-answer-input"
        defaultValue={question.answer?.numericalAnswer ?? ""}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        type="number"
      />
    );
  }
  return (
    <textarea
      className="exam-answer-textarea"
      defaultValue={question.answer?.textAnswer ?? ""}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      rows={8}
    />
  );
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
