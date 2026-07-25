import { z } from "zod";
import { academicRequest, EntityRecord, ListResponse } from "./academic";

export const bloomLevels = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
] as const;

export const aiQuestionSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  topic: z.string().min(1, "Topic is required"),
  unit: z.string().optional(),
  questionType: z.string().min(1),
  requestedCount: z.coerce.number().int().min(1).max(10),
  difficulty: z.string().optional(),
  bloomLevel: z.string().optional(),
  marks: z.coerce.number().min(0),
  negativeMarks: z.coerce.number().min(0),
  language: z.string().default("English"),
  syllabusText: z.string().optional(),
  sourceNotes: z.string().optional(),
  avoidDuplicate: z.boolean().default(true),
});

export type AiQuestionValues = z.infer<typeof aiQuestionSchema>;

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: ListResponse["meta"];
}

export type AiJob = EntityRecord & {
  id: string;
  status?: string;
  topic?: string;
  requestedCount?: number;
  generatedCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  provider?: string;
  model?: string;
  results?: EntityRecord[];
};

export async function aiRequest<T>(path: string, init: RequestInit = {}) {
  return academicRequest<T>(path, init);
}

export function toJsonBody(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return "-";
}

export function formText(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}
