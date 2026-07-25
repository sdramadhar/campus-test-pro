import { academicRequest } from "./academic";

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ProctoringPageConfig {
  title: string;
  eyebrow: string;
  endpoint: string;
  mode:
    | "student"
    | "student-session"
    | "live"
    | "session"
    | "reviews"
    | "review"
    | "policies"
    | "policy"
    | "settings"
    | "retention"
    | "assessment";
}

export async function proctoringRequest<T>(path: string, init: RequestInit = {}) {
  return academicRequest<ApiResponse<T>>(path, init);
}

export function proctorText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length.toString()} items`;
  if (typeof value === "object") return JSON.stringify(value);
  return "-";
}

export function proctorRows(data: unknown): Array<{ label: string; value: unknown }> {
  if (!data || typeof data !== "object") return [];
  const source = data as Record<string, unknown>;
  const list = Array.isArray(source.data) ? source.data : Array.isArray(data) ? data : [data];
  return list.slice(0, 8).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [
      { label: `#${(index + 1).toString()} id`, value: row.id },
      { label: "status", value: row.status ?? row.reviewStatus ?? row.name },
      { label: "risk", value: row.riskLevel ?? row.riskScore ?? row.proctoringEnabled },
    ];
  });
}
