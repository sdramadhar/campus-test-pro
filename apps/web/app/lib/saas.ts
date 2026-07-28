import { apiJson } from "./api-client";

export async function saasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return apiJson<T>(path, { ...init, headers, cache: "no-store" });
}

export interface SaaSCard {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}

export function compactCount(value: unknown): string {
  if (typeof value === "number") {
    return Intl.NumberFormat("en").format(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "Not configured";
}
