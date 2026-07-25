import { academicRequest } from "./academic";

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface CodingPageConfig {
  title: string;
  endpoint: string;
  mode:
    | "editor"
    | "history"
    | "history-detail"
    | "reviews"
    | "review-detail"
    | "plagiarism"
    | "plagiarism-job"
    | "plagiarism-match"
    | "runner"
    | "languages"
    | "images"
    | "analytics";
}

export async function codingRequest<T>(path: string, init: RequestInit = {}) {
  return academicRequest<ApiResponse<T>>(path, init);
}

export function codingText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length.toString()} items`;
  if (typeof value === "object") return JSON.stringify(value);
  return "-";
}
