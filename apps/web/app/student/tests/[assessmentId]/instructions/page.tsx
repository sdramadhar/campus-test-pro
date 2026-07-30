"use client";

import { PlayCircle, ShieldCheck, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { AuthShell } from "../../../../components/auth-shell";
import {
  StudentAssessment,
  StudentAttempt,
  studentExamRequest,
} from "../../../../lib/student-exams";
import {
  StudentProctoringPolicy,
  resolveRuntimePolicy,
  strictModeRequired,
} from "../../../../lib/strict-proctoring";

export default function InstructionsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = use(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
  const [policy, setPolicy] = useState(
    resolveRuntimePolicy(null, true),
  );
  const [declared, setDeclared] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "checking" | "starting" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    studentExamRequest<StudentAssessment>(
      `/api/v1/student/assessments/${assessmentId}`,
    )
      .then((data) => {
        setAssessment(data);
        setStatus("ready");
        return studentExamRequest<{ policy: StudentProctoringPolicy }>(
          `/api/v1/student/assessments/${assessmentId}/proctoring-policy`,
        );
      })
      .then((response) => {
        setPolicy(resolveRuntimePolicy(response.policy, true));
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

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreenReady(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    };
  }, []);

  async function runProctoringCheck(): Promise<void> {
    setStatus("checking");
    setMessage("");
    try {
      const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
      const fullscreenElement = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      if (typeof mediaDevices?.getUserMedia !== "function") {
        throw new Error("Camera access is not supported in this browser.");
      }
      if (typeof fullscreenElement.requestFullscreen !== "function") {
        throw new Error("Fullscreen mode is not supported in this browser.");
      }
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const activeVideoTrack = stream
        .getVideoTracks()
        .find((track) => track.readyState === "live" && track.enabled);
      if (!activeVideoTrack) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        throw new Error("No active camera video track was detected.");
      }
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = stream;
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      await fullscreenElement.requestFullscreen();
      setFullscreenReady(true);
      setStatus("ready");
      setMessage("Proctoring check passed. You can start the attempt.");
    } catch (error) {
      setCameraReady(false);
      setFullscreenReady(Boolean(document.fullscreenElement));
      setStatus("ready");
      setMessage(
        error instanceof Error
          ? error.message
          : "Proctoring check could not be completed.",
      );
    }
  }

  async function start(): Promise<void> {
    if (policy.cameraRequired && !cameraReady) {
      setMessage("Camera permission is required before starting.");
      return;
    }
    if (policy.fullscreenRequired && !fullscreenReady) {
      setMessage("Fullscreen mode is required before starting.");
      return;
    }
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
            clientStartMetadata: {
              source: "web",
              cameraReady,
              fullscreenReady,
            },
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

  const needsProctoring = strictModeRequired(policy);
  const proctoringReady =
    (!policy.cameraRequired || cameraReady) &&
    (!policy.fullscreenRequired || fullscreenReady);

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
                <strong>
                  {assessment.attemptsUsed} / {assessment.maxAttempts}
                </strong>
              </article>
            </div>
            <div className="preview-box">
              {assessment.instructions ??
                "Follow all college examination rules."}
            </div>
            <ul className="exam-rules">
              <li>Server time controls the test timer and submission window.</li>
              <li>
                Answers auto-save after a short pause and are restored after
                refresh.
              </li>
              <li>
                Camera, fullscreen, tab, blur, and reload events are monitored.
              </li>
              <li>
                Browser monitoring cannot fully prevent OS-level switching,
                other devices, or actions outside the browser.
              </li>
            </ul>
            {needsProctoring && (
              <section className="panel">
                <div className="panel-header">
                  <h2>Proctoring Check</h2>
                  <span>{proctoringReady ? "Ready" : "Required"}</span>
                </div>
                <div className="metrics">
                  <article>
                    <span>Camera</span>
                    <strong>{cameraReady ? "Granted" : "Required"}</strong>
                  </article>
                  <article>
                    <span>Fullscreen</span>
                    <strong>{fullscreenReady ? "Active" : "Required"}</strong>
                  </article>
                </div>
                <video
                  autoPlay
                  className="camera-preview"
                  muted
                  playsInline
                  ref={videoRef}
                />
                <button
                  className="secondary-action"
                  disabled={status === "checking"}
                  onClick={() => void runProctoringCheck()}
                  type="button"
                >
                  {cameraReady ? (
                    <ShieldCheck aria-hidden="true" />
                  ) : (
                    <Video aria-hidden="true" />
                  )}
                  {status === "checking"
                    ? "Checking..."
                    : "Start Camera and Fullscreen Check"}
                </button>
              </section>
            )}
            {assessment.eligibility && !assessment.eligibility.eligible && (
              <div className="error-panel">
                {assessment.eligibility.errors.join(" ")}
              </div>
            )}
            {message && (
              <div className={proctoringReady ? "success-alert" : "error-panel"}>
                {message}
              </div>
            )}
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
                  status === "checking" ||
                  (needsProctoring && !proctoringReady) ||
                  assessment.eligibility?.eligible === false ||
                  assessment.attemptsRemaining <= 0
                }
                onClick={() => {
                  void start();
                }}
                type="button"
              >
                <PlayCircle aria-hidden="true" />
                {status === "starting" ? "Starting..." : "Start Attempt"}
              </button>
            </div>
          </div>
        )}
      </section>
    </AuthShell>
  );
}
