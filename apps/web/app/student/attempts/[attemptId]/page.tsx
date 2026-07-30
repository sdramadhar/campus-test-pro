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
type WarningState = {
  eventType: ProctoringEventType;
  violationCount: number;
  remainingChances: number;
  finalWarning: boolean;
  message: string;
} | null;

export default function StudentAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
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
  const [remainingChances, setRemainingChances] = useState(2);
  const [warningState, setWarningState] = useState<WarningState>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const proctorSequenceRef = useRef(1);
  const lastEventRef = useRef(new Map<string, number>());
  const lastViolationBurstRef = useRef(0);
  const autoSubmitRef = useRef(false);
  const queueKey = `campustest-answer-queue-${attemptId}`;

  useEffect(() => {
    studentExamRequest<StudentAttempt>(`/api/v1/student/attempts/${attemptId}`)
      .then((data) => {
        setAttempt(data);
        const initialRemaining = Math.max(
          0,
          Math.floor(
            (new Date(data.expiresAt).getTime() - Date.now()) / 1000,
          ),
        );
        setRemaining(Number.isFinite(initialRemaining) ? initialRemaining : 0);
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
        setRemainingChances(policy.allowedExamExitViolations);
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
        setRemainingChances(policy.allowedExamExitViolations);
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
      remaining === null ||
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
      setRemaining((value) => (value === null ? null : Math.max(0, value - 1)));
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("exam-body-lock");
    return () => {
      document.body.classList.remove("exam-body-lock");
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
    const onPageHide = () => {
      void recordProctoringEvent("PAGE_RELOAD_ATTEMPT");
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      void recordProctoringEvent("PAGE_RELOAD_ATTEMPT");
      event.preventDefault();
      try {
        Object.defineProperty(event, "returnValue", {
          configurable: true,
          value: "",
        });
      } catch {
        // preventDefault still triggers the browser's supported unload warning.
      }
      return "";
    };
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      void recordProctoringEvent("BACK_NAVIGATION_ATTEMPT");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
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
    const result = await sendProctoringEventBatch(attemptId, [event]).catch(
      () => null,
    );
    if (result) {
      setViolationCount(result.violationCount);
      setRemainingChances(result.remainingChances);
      if (result.autoSubmitted) {
        autoSubmitRef.current = true;
        setAutoSubmitting(true);
        setMessage("Proctoring limits reached. Submitting automatically...");
        router.replace(`/student/attempts/${attemptId}/submitted`);
        return;
      }
    }
    if (eventSeverity(eventType) !== "info") {
      const count = result?.violationCount ?? violationCount + 1;
      const chances =
        result?.remainingChances ??
        Math.max((proctoringPolicy?.allowedExamExitViolations ?? 2) - count, 0);
      setViolationWarning(eventType, count, chances);
      setProctoringMessage(
        eventSeverity(eventType) === "critical"
          ? "A critical proctoring issue was recorded."
          : "A proctoring warning was recorded. Return to the exam window.",
      );
    }
  }

  function setViolationWarning(
    eventType: ProctoringEventType,
    count: number,
    chances: number,
  ): void {
    const now = Date.now();
    if (now - lastViolationBurstRef.current < 1500) {
      return;
    }
    lastViolationBurstRef.current = now;
    const allowed = proctoringPolicy?.allowedExamExitViolations ?? 2;
    setWarningState({
      eventType,
      violationCount: count,
      remainingChances: chances,
      finalWarning: count >= allowed,
      message:
        eventType === "FULLSCREEN_EXIT"
          ? "Fullscreen exited. Return to fullscreen to continue the exam."
          : "Exam focus was interrupted. Return to fullscreen to continue the exam.",
    });
    void playAlarm();
  }

  async function playAlarm(): Promise<void> {
    const audio = alarmRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play().catch(() => undefined);
    window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 3500);
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
            void recordProctoringEvent("CAMERA_DISABLED");
          });
          track.addEventListener("mute", () => {
            setCameraState("muted");
            window.setTimeout(() => {
              if (cameraState !== "active") {
                void recordProctoringEvent("CAMERA_DISABLED");
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

  async function returnToFullscreen(): Promise<void> {
    await document.documentElement.requestFullscreen().catch(() => undefined);
    setFullscreenState(document.fullscreenElement ? "active" : "pending");
    if (document.fullscreenElement) {
      setWarningState(null);
      setProctoringMessage("Fullscreen restored. Continue the exam.");
    }
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
    if (warningState) {
      return;
    }
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
    if (!question || warningState) {
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
      examMode
      title={attempt?.assessment.title ?? "Exam Attempt"}
    >
      <audio preload="auto" ref={alarmRef} src="/audio/exam-alert.wav" />
      <section className="exam-banner exam-only-banner">
        <div>
          <p className="eyebrow">Live attempt</p>
          <h1>{attempt?.assessment.title ?? "Exam Attempt"}</h1>
        </div>
        <div className={online ? "status ok" : "status warn"}>
          {online ? "Connected" : "Reconnecting"}
        </div>
        <strong>{remaining === null ? "--:--" : formatSeconds(remaining)}</strong>
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
              <span>Remaining chances: {remainingChances}</span>
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
          <section
            aria-hidden={warningState ? "true" : undefined}
            className={warningState ? "exam-layout exam-paused" : "exam-layout"}
          >
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
                    disabled={Boolean(warningState)}
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
                  disabled={current === 0 || Boolean(warningState)}
                  onClick={() => {
                    setQuestion(current - 1);
                  }}
                  type="button"
                >
                  Previous
                </button>
                <button
                  disabled={Boolean(warningState)}
                  onClick={() => {
                    scheduleSave(question, "", true);
                  }}
                  type="button"
                >
                  <AlertTriangle aria-hidden="true" />
                  Mark for Review
                </button>
                <button
                  disabled={Boolean(warningState)}
                  onClick={() => {
                    void clearAnswer();
                  }}
                  type="button"
                >
                  Clear Answer
                </button>
                <button
                  disabled={Boolean(warningState)}
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
                  disabled={Boolean(warningState)}
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
      {warningState && (
        <div className="exam-warning-overlay" role="alertdialog" aria-modal="true">
          <div className="exam-warning-panel">
            <AlertTriangle aria-hidden="true" size={54} />
            <p className="eyebrow">
              {warningState.finalWarning
                ? `Final Warning ${String(warningState.violationCount)} of 2`
                : `Warning ${String(warningState.violationCount)} of 2`}
            </p>
            <h2>{warningState.message}</h2>
            <p>
              Violation count: {String(warningState.violationCount)}. Remaining
              chances: {String(warningState.remainingChances)}.
            </p>
            {warningState.finalWarning && (
              <p className="strong-warning">
                The next violation will automatically submit this assessment.
              </p>
            )}
            <button
              className="primary-action warning-action"
              onClick={() => {
                void returnToFullscreen();
              }}
              type="button"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
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
