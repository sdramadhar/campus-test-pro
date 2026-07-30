import {
  authenticatedFetch,
  isJsonResponse,
  responseErrorMessage,
} from "./api-client";

export interface StudentAssessment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number | null;
  maxAttempts: number;
  attemptScoringPolicy?: "BEST" | "LATEST" | "FIRST";
  attemptsUsed: number;
  attemptsRemaining: number;
  nextAttemptNumber: number;
  startAt?: string | null;
  endAt?: string | null;
  status: string;
  windowState: string;
  questionCount: number;
  latestAttempt?: { id: string; status: string; attemptNumber: number } | null;
  publishedResultId?: string | null;
  eligibility?: { eligible: boolean; errors: string[] };
}

export interface AttemptQuestion {
  id: string;
  sectionId?: string | null;
  displayOrder: number;
  questionType: string;
  questionText: string;
  options?: Array<{ optionKey: string; optionText: string }> | null;
  assignedMarks: number;
  mandatory: boolean;
  metadata?: Record<string, unknown> | null;
  answer?: SavedAnswer | null;
}

export interface SavedAnswer {
  id: string;
  attemptQuestionId: string;
  selectedOptionKeys: string[];
  textAnswer?: string | null;
  numericalAnswer?: number | null;
  markedForReview: boolean;
  version: number;
  updatedAt: string;
}

export interface StudentAttempt {
  id: string;
  assessmentId: string;
  status: string;
  attemptNumber: number;
  startedAt: string;
  expiresAt: string;
  assessment: {
    id: string;
    title: string;
    instructions?: string | null;
    allowBackNavigation: boolean;
    fullscreenPreferred?: boolean;
    subject?: { id: string; subjectName: string; subjectCode?: string } | null;
  };
  sections: Array<{ id: string; name: string; displayOrder: number }>;
  questions: AttemptQuestion[];
  receipt?: SubmissionReceipt | null;
}

export interface SubmissionReceipt {
  id: string;
  receiptNumber: string;
  submittedAt: string;
  answerCount: number;
  unansweredCount: number;
  status: string;
}

export interface StudentResult {
  id: string;
  assessmentId: string;
  attemptId: string;
  assessment?: { title: string };
  student?: {
    name: string;
    rollNumber?: string | null;
    studentId?: string | null;
  };
  objectiveScore: number;
  descriptiveScore: number;
  codingScore: number;
  totalScore: number;
  percentage: number;
  passStatus: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  attemptedCount: number;
  timeTakenSeconds?: number | null;
  submittedAt?: string | null;
  violations?: number;
  evaluationStatus: string;
  publishedAt?: string | null;
  sectionResults?: Array<{
    sectionName: string;
    totalMarks: number;
    awardedMarks: number;
  }>;
  questionReview?: Array<{
    id: string;
    displayOrder: number;
    questionType: string;
    questionText: string;
    assignedMarks: number;
    selectedOptionKeys: string[];
    textAnswer?: string | null;
    numericalAnswer?: number | null;
    markedForReview: boolean;
    isCorrect?: boolean | null;
    awardedMarks?: number | null;
    maxMarks?: number;
    negativeMarksApplied?: number;
  }>;
}

interface ApiResponse<T> {
  success: true;
  data: T;
}

export async function studentExamRequest<T>(
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
  if (!isJsonResponse(response)) {
    return undefined as T;
  }
  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

export function answerBody(
  question: AttemptQuestion,
  value: unknown,
  markedForReview = false,
) {
  if (
    question.questionType === "SINGLE_CHOICE" ||
    question.questionType === "TRUE_FALSE"
  ) {
    return {
      selectedOptionKeys: typeof value === "string" ? [value] : [],
      markedForReview,
    };
  }
  if (question.questionType === "MULTIPLE_CHOICE") {
    return {
      selectedOptionKeys: Array.isArray(value) ? value : [],
      markedForReview,
    };
  }
  if (question.questionType === "NUMERICAL") {
    return {
      numericalAnswer: value === "" ? undefined : Number(value),
      markedForReview,
    };
  }
  return {
    textAnswer: typeof value === "string" ? value : "",
    markedForReview,
  };
}
