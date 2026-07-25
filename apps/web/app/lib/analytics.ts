import { academicRequest } from "./academic";

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface AnalyticsPageConfig {
  title: string;
  eyebrow: string;
  endpoint: string;
  method?: "GET" | "POST";
  reportMode?: boolean;
  insightMode?: boolean;
}

export async function analyticsRequest<T>(path: string, init: RequestInit = {}) {
  return academicRequest<ApiResponse<T>>(path, init);
}

export function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${String(value.length)} items`;
  if (typeof value === "object") return JSON.stringify(value);
  return "-";
}

export function flattenMetrics(data: unknown): Array<{ label: string; value: unknown }> {
  if (!data || typeof data !== "object") return [];
  const source = data as Record<string, unknown>;
  const totals = typeof source.totals === "object" && source.totals ? (source.totals as Record<string, unknown>) : source;
  return Object.entries(totals)
    .filter(([, value]) => typeof value === "number" || typeof value === "string" || typeof value === "boolean")
    .slice(0, 12)
    .map(([label, value]) => ({ label, value }));
}

export function chartRows(data: unknown): Array<{ label: string; value: number }> {
  const rows: Array<{ label: string; value: number }> = [];
  if (!data || typeof data !== "object") return rows;
  const charts = (data as Record<string, unknown>).charts;
  if (!charts || typeof charts !== "object") return rows;
  for (const [group, value] of Object.entries(charts as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          rows.push({
            label: `${group}: ${textValue(row.label)}`,
            value: Number(row.value ?? 0),
          });
        }
      }
    }
  }
  return rows.slice(0, 16);
}
