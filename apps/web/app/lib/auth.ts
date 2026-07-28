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

export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export async function restoreSession(): Promise<AuthUser | null> {
  const me = await fetch(`${apiUrl}/api/v1/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });
  if (me.ok) {
    return (await me.json()) as AuthUser;
  }

  const refresh = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  if (!refresh.ok) {
    return null;
  }

  const body = (await refresh.json()) as AuthResponse;
  return body.user;
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
