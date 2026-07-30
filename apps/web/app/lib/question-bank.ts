import { z } from "zod";
import {
  academicRequest,
  EntityRecord,
  ListResponse,
  SingleResponse,
} from "./academic";

export const questionTypes = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANK",
  "NUMERICAL",
  "SHORT_ANSWER",
  "DESCRIPTIVE",
  "CODING",
] as const;

export const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
export const questionStatuses = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
] as const;
export const assessmentStatuses = [
  "DRAFT",
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "PUBLISHED",
] as const;

export type QuestionType = (typeof questionTypes)[number];
export type QuestionStatus = (typeof questionStatuses)[number];
export type AssessmentStatus = (typeof assessmentStatuses)[number];

export const optionSchema = z.object({
  optionKey: z.string().trim().min(1),
  optionText: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(1),
  isCorrect: z.boolean().default(false),
  explanation: z.string().optional(),
});

export const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  visibility: z.enum(["PUBLIC", "HIDDEN"]),
  scoreWeight: z.coerce.number().min(0),
  displayOrder: z.coerce.number().int().min(1),
});

export const questionSchema = z
  .object({
    collegeId: z.string().optional(),
    subjectId: z.string().trim().min(1, "Subject is required"),
    topic: z.string().trim().min(1, "Topic is required"),
    title: z.string().trim().min(1, "Title is required"),
    questionText: z.string().trim().min(1, "Question text is required"),
    questionType: z.enum(questionTypes),
    difficulty: z.enum(difficulties),
    defaultMarks: z.coerce.number().min(0),
    defaultNegativeMarks: z.coerce.number().min(0).default(0),
    explanation: z.string().optional(),
    status: z.enum(questionStatuses),
    tagsText: z.string().optional(),
    correctBoolean: z.string().optional(),
    acceptedAnswersText: z.string().optional(),
    acceptedNumber: z.string().optional(),
    tolerance: z.string().optional(),
    modelAnswer: z.string().optional(),
    rubric: z.string().optional(),
    problemStatement: z.string().optional(),
    inputFormat: z.string().optional(),
    outputFormat: z.string().optional(),
    constraints: z.string().optional(),
    timeLimitMs: z.coerce.number().optional(),
    memoryLimitMb: z.coerce.number().optional(),
    allowedLanguagesText: z.string().optional(),
    options: z.array(optionSchema).default([]),
    testCases: z.array(testCaseSchema).default([]),
  })
  .superRefine((value, context) => {
    const correctCount = value.options.filter(
      (option) => option.isCorrect,
    ).length;
    if (value.questionType === "SINGLE_CHOICE" && correctCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Pick exactly one correct option.",
      });
    }
    if (value.questionType === "MULTIPLE_CHOICE" && correctCount < 1) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Pick at least one correct option.",
      });
    }
    if (
      value.questionType === "TRUE_FALSE" &&
      value.correctBoolean !== "true" &&
      value.correctBoolean !== "false"
    ) {
      context.addIssue({
        code: "custom",
        path: ["correctBoolean"],
        message: "Select true or false.",
      });
    }
    if (
      value.questionType === "FILL_IN_THE_BLANK" &&
      !value.acceptedAnswersText?.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["acceptedAnswersText"],
        message: "Accepted answers are required.",
      });
    }
    if (
      value.questionType === "NUMERICAL" &&
      Number.isNaN(Number(value.acceptedNumber))
    ) {
      context.addIssue({
        code: "custom",
        path: ["acceptedNumber"],
        message: "Accepted number is required.",
      });
    }
    if (value.questionType === "CODING" && value.testCases.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["testCases"],
        message: "At least one test case is required.",
      });
    }
  });

export const assessmentSchema = z.object({
  collegeId: z.string().optional(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  subjectId: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1),
  passingMarks: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(10),
  attemptScoringPolicy: z
    .enum(["BEST", "LATEST", "FIRST"])
    .default("BEST"),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
});

export type QuestionFormValues = z.infer<typeof questionSchema>;
export type AssessmentFormValues = z.infer<typeof assessmentSchema>;

export function questionPayload(
  values: QuestionFormValues,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  if (values.questionType === "TRUE_FALSE")
    metadata.correctBoolean = values.correctBoolean === "true";
  if (values.questionType === "FILL_IN_THE_BLANK")
    metadata.acceptedAnswers = splitList(values.acceptedAnswersText);
  if (values.questionType === "NUMERICAL") {
    metadata.acceptedNumber = Number(values.acceptedNumber);
    metadata.tolerance = Number(values.tolerance || 0);
  }
  if (
    values.questionType === "SHORT_ANSWER" ||
    values.questionType === "DESCRIPTIVE"
  ) {
    metadata.modelAnswer = values.modelAnswer;
    metadata.rubric = values.rubric;
  }
  return {
    collegeId: values.collegeId || undefined,
    subjectId: values.subjectId,
    topic: values.topic,
    title: values.title,
    questionText: values.questionText,
    type: values.questionType,
    questionType: values.questionType,
    difficulty: values.difficulty,
    marks: values.defaultMarks,
    defaultMarks: values.defaultMarks,
    negativeMarks: values.defaultNegativeMarks,
    defaultNegativeMarks: values.defaultNegativeMarks,
    explanation: values.explanation,
    status: values.status,
    tags: splitList(values.tagsText),
    metadata,
    options: values.options,
    coding:
      values.questionType === "CODING"
        ? {
            problemStatement: values.problemStatement || values.questionText,
            inputFormat: values.inputFormat,
            outputFormat: values.outputFormat,
            constraints: values.constraints,
            timeLimitMs: values.timeLimitMs || 1000,
            memoryLimitMb: values.memoryLimitMb || 128,
            allowedLanguages: splitList(values.allowedLanguagesText),
            testCases: values.testCases,
          }
        : undefined,
  };
}

export function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function listQuestions(query: URLSearchParams) {
  return academicRequest<ListResponse>(`/api/v1/questions?${query.toString()}`);
}

export async function getQuestion(id: string) {
  return academicRequest<SingleResponse>(`/api/v1/questions/${id}`);
}

export function nestedValue(row: EntityRecord, key: string): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current)
      return (current as EntityRecord)[part];
    return undefined;
  }, row);
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "-";
}
