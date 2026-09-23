export type UserRole = "SUPER_ADMIN" | "COLLEGE_ADMIN" | "FACULTY" | "STUDENT";

export interface AuthUser {
  id: string;
  email: string;
  studentId: string | null;
  name: string;
  role: UserRole;
  collegeId: string | null;
  collegeName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const LOCAL_API_URL = "http://localhost:4000";
const PRODUCTION_API_URL = "https://campus-test-pro.onrender.com";
const SESSION_RESTORE_TIMEOUT_MS = 3500;

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function normalizeApiUrl(value: string | undefined): string {
  const fallback =
    process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : LOCAL_API_URL;
  const raw = (value?.trim() || fallback).replace(/\/+$/, "");

  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return fallback;
  }
}

export const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const roleRoutes: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin/colleges",
  COLLEGE_ADMIN: "/dashboard/college-admin",
  FACULTY: "/dashboard/faculty",
  STUDENT: "/dashboard/student",
};

export const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  COLLEGE_ADMIN: "College Admin",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

export async function signIn(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new AuthRequestError(
      "CampusTest API is not reachable. Verify NEXT_PUBLIC_API_URL is set to the production API URL.",
      0,
    );
  }

  if (!response.ok) {
    throw new AuthRequestError(
      response.status === 403
        ? "This account is disabled. Contact your college administrator."
        : "Invalid email/student ID or password.",
      response.status,
    );
  }

  return (await response.json()) as AuthResponse;
}

export async function restoreSession(
  timeoutMs = SESSION_RESTORE_TIMEOUT_MS,
): Promise<AuthUser | null> {
  let me: Response;
  try {
    me = await fetchWithTimeout(
      `${apiUrl}/api/v1/auth/me`,
      {
        credentials: "include",
        cache: "no-store",
      },
      timeoutMs,
    );
  } catch {
    return null;
  }
  if (me.ok) {
    return (await me.json()) as AuthUser;
  }

  let refresh: Response;
  try {
    refresh = await fetchWithTimeout(
      `${apiUrl}/api/v1/auth/refresh`,
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      },
      timeoutMs,
    );
  } catch {
    return null;
  }
  if (!refresh.ok) {
    return null;
  }

  const body = (await refresh.json()) as AuthResponse;
  return body.user;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function requestPasswordReset(identifier: string): Promise<void> {
  const response = await fetch(`${apiUrl}/api/v1/auth/forgot-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  if (!response.ok) {
    throw new Error("Password reset request could not be completed.");
  }
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${apiUrl}/api/v1/auth/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Password reset failed.");
  }
}
