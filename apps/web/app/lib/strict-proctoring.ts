import { studentExamRequest } from "./student-exams";

export type ProctoringEventType =
  | "FULLSCREEN_ENTER"
  | "FULLSCREEN_EXIT"
  | "TAB_HIDDEN"
  | "TAB_VISIBLE"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "COPY"
  | "PASTE"
  | "CONTEXT_MENU"
  | "FORBIDDEN_SHORTCUT"
  | "NETWORK_DISCONNECT"
  | "NETWORK_RECONNECT"
  | "WEBCAM_PERMISSION_GRANTED"
  | "WEBCAM_PERMISSION_DENIED"
  | "CAMERA_SNAPSHOT_CAPTURED"
  | "IDENTITY_CHECK_FAILED"
  | "AUTO_SUBMIT_TRIGGERED";

export interface StudentProctoringPolicy {
  proctoringEnabled?: boolean;
  fullscreenRequired?: boolean;
  cameraRequired?: boolean;
  retentionDays?: number;
}

export interface ProctoringRuntimePolicy {
  proctoringEnabled: boolean;
  fullscreenRequired: boolean;
  cameraRequired: boolean;
  autoSubmitOnCriticalViolation: boolean;
  violationLimit: number;
  gracePeriodMs: number;
  evidenceIntervalMs: number;
}

export interface ProctoringEventPayload {
  eventType: ProctoringEventType;
  sequenceNumber: number;
  idempotencyKey: string;
  clientTimestamp: string;
}

export const strictProctoringDefaults = {
  violationLimit: 3,
  gracePeriodMs: 10000,
  evidenceIntervalMs: 60000,
};

export function resolveRuntimePolicy(
  policy: StudentProctoringPolicy | null | undefined,
  fullscreenPreferred: boolean,
): ProctoringRuntimePolicy {
  const proctoringEnabled = Boolean(policy?.proctoringEnabled);
  return {
    proctoringEnabled,
    fullscreenRequired:
      policy?.fullscreenRequired === true || fullscreenPreferred,
    cameraRequired: policy?.cameraRequired === true && proctoringEnabled,
    autoSubmitOnCriticalViolation: proctoringEnabled,
    violationLimit: strictProctoringDefaults.violationLimit,
    gracePeriodMs: strictProctoringDefaults.gracePeriodMs,
    evidenceIntervalMs: strictProctoringDefaults.evidenceIntervalMs,
  };
}

export function strictModeRequired(policy: ProctoringRuntimePolicy): boolean {
  return (
    policy.proctoringEnabled ||
    policy.fullscreenRequired ||
    policy.cameraRequired
  );
}

export function createProctoringEvent(
  eventType: ProctoringEventType,
  sequenceNumber: number,
): ProctoringEventPayload {
  return {
    eventType,
    sequenceNumber,
    idempotencyKey: `${eventType.toLowerCase()}-${sequenceNumber.toString()}-${Date.now().toString(36)}`,
    clientTimestamp: new Date().toISOString(),
  };
}

export function isForbiddenExamShortcut(
  event: Pick<
    KeyboardEvent,
    "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
  >,
): boolean {
  const key = event.key.toLowerCase();
  if (event.metaKey) return true;
  if (
    event.ctrlKey &&
    ["c", "v", "x", "a", "p", "s", "u", "f", "r"].includes(key)
  )
    return true;
  if (event.altKey && ["tab", "f4", "arrowleft", "arrowright"].includes(key))
    return true;
  if (event.key === "F12" || event.key === "PrintScreen") return true;
  if (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))
    return true;
  return false;
}

export function eventSeverity(
  eventType: ProctoringEventType,
): "info" | "warning" | "critical" {
  if (
    eventType === "WEBCAM_PERMISSION_DENIED" ||
    eventType === "IDENTITY_CHECK_FAILED"
  )
    return "critical";
  if (
    eventType === "FULLSCREEN_EXIT" ||
    eventType === "TAB_HIDDEN" ||
    eventType === "WINDOW_BLUR"
  )
    return "warning";
  if (
    eventType === "COPY" ||
    eventType === "PASTE" ||
    eventType === "CONTEXT_MENU" ||
    eventType === "FORBIDDEN_SHORTCUT"
  )
    return "warning";
  return "info";
}

export async function sendProctoringEventBatch(
  attemptId: string,
  events: ProctoringEventPayload[],
): Promise<void> {
  if (!events.length) return;
  await studentExamRequest(
    `/api/v1/student/attempts/${attemptId}/proctoring/events/batch`,
    {
      method: "POST",
      body: JSON.stringify({ events }),
    },
  );
}

export async function sendProctoringHeartbeat(
  attemptId: string,
  sequenceNumber: number,
  state: {
    connectivityState: string;
    cameraState?: string;
    fullscreenState?: string;
    currentQuestionId?: string;
  },
): Promise<void> {
  await studentExamRequest(
    `/api/v1/student/attempts/${attemptId}/proctoring/heartbeat`,
    {
      method: "POST",
      body: JSON.stringify({
        sequenceNumber,
        clientTimestamp: new Date().toISOString(),
        ...state,
      }),
    },
  );
}

export async function recordCameraSnapshotMetadata(
  attemptId: string,
  sizeBytes: number,
): Promise<void> {
  await studentExamRequest(
    `/api/v1/student/attempts/${attemptId}/proctoring/evidence`,
    {
      method: "POST",
      body: JSON.stringify({
        evidenceType: "CAMERA_SNAPSHOT",
        fileName: `camera-snapshot-${Date.now().toString()}.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: Math.max(sizeBytes, 1),
      }),
    },
  );
}
