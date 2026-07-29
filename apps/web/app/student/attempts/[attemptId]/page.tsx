"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Save,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
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
import {
  ProctoringEventType,
  ProctoringRuntimePolicy,
  StudentProctoringPolicy,
  createProctoringEvent,
  eventSeverity,
  isForbiddenExamShortcut,
  recordCameraSnapshotMetadata,
  resolveRuntimePolicy,
  sendProctoringEventBatch,
  sendProctoringHeartbeat,
  strictModeRequired,
} from "../../../lib/strict-proctoring";

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
  const [proctoringPolicy, setProctoringPolicy] =
    useState<ProctoringRuntimePolicy | null>(null);
  const [proctoringReady, setProctoringReady] = useState(false);
  const [proctoringMessage, setProctoringMessage] = useState("");
  const [cameraState, setCameraState] = useState("not-started");
  const [fullscreenState, setFullscreenState] = useState("pending");
  const [violationCount, setViolationCount] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const proctorSequenceRef = useRef(1);
  const lastEventRef = useRef(new Map<string, number>());
  const autoSubmitRef = useRef(false);
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
    if (!attempt) {
      return;
    }
    studentExamRequest<{ policy: StudentProctoringPolicy }>(
      `/api/v1/student/assessments/${attempt.assessmentId}/proctoring-policy`,
    )
      .then((data) => {
        const policy = resolveRuntimePolicy(
          data.policy,
          Boolean(attempt.assessment.fullscreenPreferred),
        );
        setProctoringPolicy(policy);
        if (!strictModeRequired(policy)) {
          setProctoringReady(true);
          setCameraState("not-required");
        }
      })
      .catch(() => {
        const policy = resolveRuntimePolicy(
          null,
          Boolean(attempt.assessment.fullscreenPreferred),
        );
        setProctoringPolicy(policy);
        if (!strictModeRequired(policy)) {
          setProctoringReady(true);
        }
      });
  }, [attempt]);

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
      void recordProctoringEvent("NETWORK_RECONNECT");
    };
    const onOffline = () => {
      setOnline(false);
      void recordProctoringEvent("NETWORK_DISCONNECT");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onVisibilityChange = () => {
      if (document.hidden) {
        void recordProctoringEvent("TAB_HIDDEN");
      } else {
        void recordProctoringEvent("TAB_VISIBLE");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [attemptId, proctoringPolicy]);

  useEffect(() => {
    if (
      !attempt ||
      !proctoringPolicy ||
      !strictModeRequired(proctoringPolicy)
    ) {
      return;
    }

    const blockAndReport = (event: Event, eventType: ProctoringEventType) => {
      event.preventDefault();
      event.stopPropagation();
      void recordProctoringEvent(eventType);
    };
    const onCopy = (event: ClipboardEvent) => {
      blockAndReport(event, "COPY");
    };
    const onPaste = (event: ClipboardEvent) => {
      blockAndReport(event, "PASTE");
    };
    const onCut = (event: ClipboardEvent) => {
      blockAndReport(event, "COPY");
    };
    const onContextMenu = (event: MouseEvent) => {
      blockAndReport(event, "CONTEXT_MENU");
    };
    const onBlur = () => {
      void recordProctoringEvent("WINDOW_BLUR");
    };
    const onFocus = () => {
      void recordProctoringEvent("WINDOW_FOCUS");
    };
    const onFullscreenChange = () => {
      setFullscreenState(document.fullscreenElement ? "active" : "pending");
      void recordProctoringEvent(
        document.fullscreenElement ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT",
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isForbiddenExamShortcut(event)) {
        blockAndReport(event, "FORBIDDEN_SHORTCUT");
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [attempt, attemptId, proctoringPolicy]);

  useEffect(() => {
    if (!attempt || !proctoringReady || !proctoringPolicy) {
      return;
    }
    const heartbeat = window.setInterval(() => {
      void sendProctoringHeartbeat(attemptId, nextProctorSequence(), {
        connectivityState: navigator.onLine ? "online" : "offline",
        cameraState,
        fullscreenState,
        currentQuestionId: attempt.questions[current]?.id,
      }).catch(() => undefined);
    }, 15000);
    const evidence = window.setInterval(() => {
      if (proctoringPolicy.cameraRequired && streamRef.current) {
        void captureCameraEvidence();
      }
    }, proctoringPolicy.evidenceIntervalMs);
    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(evidence);
    };
  }, [
    attempt,
    attemptId,
    cameraState,
    current,
    fullscreenState,
    proctoringPolicy,
    proctoringReady,
  ]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    };
  }, []);

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

  function nextProctorSequence(): number {
    const next = proctorSequenceRef.current;
    proctorSequenceRef.current += 1;
    return next;
  }

  async function recordProctoringEvent(
    eventType: ProctoringEventType,
  ): Promise<void> {
    const now = Date.now();
    const last = lastEventRef.current.get(eventType) ?? 0;
    if (now - last < 2000) {
      return;
    }
    lastEventRef.current.set(eventType, now);
    const event = createProctoringEvent(eventType, nextProctorSequence());
    await sendProctoringEventBatch(attemptId, [event]).catch(() => undefined);
    if (eventSeverity(eventType) !== "info") {
      setViolationCount((count) => {
        const next = count + 1;
        if (
          proctoringPolicy?.autoSubmitOnCriticalViolation &&
          next >= proctoringPolicy.violationLimit
        ) {
          void autoSubmitForProctoring(eventType);
        }
        return next;
      });
      setProctoringMessage(
        eventSeverity(eventType) === "critical"
          ? "A critical proctoring issue was recorded."
          : "A proctoring warning was recorded. Return to the exam window.",
      );
    }
  }

  async function beginProctoredAttempt(): Promise<void> {
    if (!attempt || !proctoringPolicy) {
      return;
    }
    setProctoringMessage("Starting secure browser and camera checks...");
    try {
      if (proctoringPolicy.cameraRequired) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        setCameraState("active");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            setCameraState("stopped");
            void recordProctoringEvent("IDENTITY_CHECK_FAILED");
          });
          track.addEventListener("mute", () => {
            setCameraState("muted");
            window.setTimeout(() => {
              if (cameraState !== "active") {
                void recordProctoringEvent("IDENTITY_CHECK_FAILED");
              }
            }, proctoringPolicy.gracePeriodMs);
          });
        });
        await recordProctoringEvent("WEBCAM_PERMISSION_GRANTED");
      }
      await studentExamRequest(
        `/api/v1/student/assessments/${attempt.assessmentId}/system-check`,
        {
          method: "POST",
          body: JSON.stringify({
            browser: navigator.userAgent,
            cameraPermission:
              !proctoringPolicy.cameraRequired || streamRef.current !== null,
            fullscreenSupported:
              typeof document.documentElement.requestFullscreen === "function",
            deviceHash: `${attemptId}:${navigator.userAgent}`,
          }),
        },
      );
      await studentExamRequest(
        `/api/v1/student/attempts/${attemptId}/proctoring/start`,
        {
          method: "POST",
          body: JSON.stringify({
            deviceHash: `${attemptId}:${navigator.userAgent}`,
          }),
        },
      );
      if (proctoringPolicy.fullscreenRequired && !document.fullscreenElement) {
        await document.documentElement
          .requestFullscreen()
          .catch(() => undefined);
      }
      setFullscreenState(document.fullscreenElement ? "active" : "pending");
      setProctoringReady(true);
      setProctoringMessage("Secure proctoring is active.");
      if (proctoringPolicy.cameraRequired) {
        await captureCameraEvidence();
      }
    } catch (error) {
      setCameraState("blocked");
      await recordProctoringEvent("WEBCAM_PERMISSION_DENIED");
      setProctoringMessage(
        error instanceof Error
          ? error.message
          : "Camera permission is required before this proctored attempt can continue.",
      );
    }
  }

  async function captureCameraEvidence(): Promise<void> {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(video.videoWidth, 320);
    canvas.height = Math.max(video.videoHeight, 240);
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.62);
    await recordCameraSnapshotMetadata(
      attemptId,
      Math.ceil(dataUrl.length * 0.75),
    ).catch(() => undefined);
  }

  async function autoSubmitForProctoring(
    reason: ProctoringEventType,
  ): Promise<void> {
    if (autoSubmitRef.current || autoSubmitting) {
      return;
    }
    autoSubmitRef.current = true;
    setAutoSubmitting(true);
    setMessage("Proctoring limits reached. Submitting automatically...");
    await flushQueue().catch(() => undefined);
    await sendProctoringEventBatch(attemptId, [
      createProctoringEvent("AUTO_SUBMIT_TRIGGERED", nextProctorSequence()),
    ]).catch(() => undefined);
    await studentExamRequest(`/api/v1/student/attempts/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `proctoring-auto-${attemptId}`,
        reason,
      }),
    });
    router.replace(`/student/attempts/${attemptId}/submitted`);
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
          void recordProctoringEvent("NETWORK_DISCONNECT");
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
      {proctoringPolicy && strictModeRequired(proctoringPolicy) && (
        <section className="panel proctoring-strip">
          <div className="proctoring-camera">
            <video
              aria-label="Camera monitoring preview"
              muted
              playsInline
              ref={videoRef}
              autoPlay
            />
          </div>
          <div>
            <div className="inline-chip">
              <ShieldCheck aria-hidden="true" />
              Strict proctoring {proctoringReady ? "active" : "pending"}
            </div>
            <p className="body-copy">
              Camera, fullscreen, tab changes, copy/paste, context menu, and
              restricted shortcuts are monitored during this attempt.
            </p>
            <div className="proctoring-status-grid">
              <span>Camera: {cameraState}</span>
              <span>Violations: {violationCount}</span>
              <span>Fullscreen: {fullscreenState}</span>
            </div>
            {proctoringMessage && (
              <div className="preview-box">{proctoringMessage}</div>
            )}
          </div>
          {!proctoringReady && (
            <button
              className="primary-action"
              onClick={() => {
                void beginProctoredAttempt();
              }}
              type="button"
            >
              <Video aria-hidden="true" />
              Start Camera Check
            </button>
          )}
        </section>
      )}
      {message && <div className="error-panel">{message}</div>}
      {attempt &&
        question &&
        (!proctoringPolicy ||
          !strictModeRequired(proctoringPolicy) ||
          proctoringReady) && (
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
