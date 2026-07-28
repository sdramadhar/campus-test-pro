import { apiUrl } from "./auth";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetchWithAuth(path, init, true);
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (!response.ok) {
    throw new ApiClientError(
      await responseErrorMessage(response),
      response.status,
    );
  }
  if (!isJsonResponse(response)) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function apiData<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const body = await apiJson<{ success: true; data: T }>(path, init);
  return body.data;
}

export async function responseErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return "Your session expired. Please log in again.";
  }
  if (isJsonResponse(response)) {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    if (typeof body?.message === "string") {
      return body.message;
    }
    if (Array.isArray(body?.message)) {
      return body.message
        .filter((item): item is string => typeof item === "string")
        .join(", ");
    }
  }
  const text = await response.text().catch(() => "");
  return text || `Request failed with ${String(response.status)}`;
}

export function isJsonResponse(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes(
    "application/json",
  );
}

async function fetchWithAuth(
  path: string,
  init: RequestInit,
  canRefresh: boolean,
): Promise<Response> {
  const response = await fetch(`${apiUrl}${path}`, withCredentials(init));
  if (
    response.status !== 401 ||
    !canRefresh ||
    path === "/api/v1/auth/refresh"
  ) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    redirectToLogin();
    return response;
  }

  return fetch(`${apiUrl}${path}`, withCredentials(init));
}

function withCredentials(init: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
    cache: init.cache ?? "no-store",
  };
}

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= fetch(`${apiUrl}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("campustest:session-expired"));
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}
