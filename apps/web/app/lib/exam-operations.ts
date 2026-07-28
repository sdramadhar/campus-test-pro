import {
  authenticatedFetch,
  isJsonResponse,
  responseErrorMessage,
} from "./api-client";

export async function examOpsRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await authenticatedFetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await responseErrorMessage(response));
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv")) {
    return (await response.text()) as T;
  }
  if (!isJsonResponse(response)) {
    return undefined as T;
  }
  const body = (await response.json()) as { success: true; data: T };
  return body.data;
}

export interface ReviewTask {
  id: string;
  status: string;
  maxMarks: number;
  awardedMarks?: number | null;
  feedback?: string | null;
  updatedAt: string;
  attempt: {
    id: string;
    assessment: { id: string; title: string };
    student: { name: string; email: string; studentId?: string | null };
  };
  question: {
    id: string;
    questionType: string;
    questionText: string;
    rubric?: unknown;
    modelAnswer?: unknown;
  };
}

export interface OperationsStats {
  scheduledAssessments: number;
  activeAssessments: number;
  activeAttempts: number;
  submittedAttempts: number;
  autoSubmittedAttempts: number;
  expiredAttempts: number;
  pendingReviews: number;
  failedJobs: number;
  resultBacklog: number;
  disconnectedStudents: number;
  flaggedAttempts: number;
}

export interface QueueSummary {
  name: string;
  counts: Record<string, number>;
}
