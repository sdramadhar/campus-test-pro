import { apiUrl } from "./auth";

export async function saasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    throw new Error(typeof body?.message === "string" ? body.message : "Request failed");
  }
  return (await response.json()) as T;
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
