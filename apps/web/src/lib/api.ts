import { apiError, type ApiError, type ApiResponse } from "@tpt-hearth/shared";

export const SESSION_STORAGE_KEY = "tpt-hearth.session.v1";

export type SessionToken = {
  id: string;
  userId: string;
  token: string;
  displayName: string;
  expiresAt: string;
  createdAt: string;
  authProvider: "invite_code" | "magic_link" | "username" | "oauth" | "local_demo";
};

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
  baseUrl?: string;
};

export type ApiFetchError = ApiError & {
  status?: number;
  statusText?: string;
};

export async function apiFetch<T>(pathOrUrl: string, options: ApiFetchOptions = {}): Promise<ApiResponse<T>> {
  const { body, token = getSessionToken(), baseUrl, headers, ...requestInit } = options;
  const url = buildApiUrl(pathOrUrl, baseUrl);
  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  injectSessionToken(requestHeaders, token);

  try {
    const fetchInit: RequestInit = {
      ...requestInit,
      headers: requestHeaders,
      cache: requestInit.cache ?? "no-store"
    };

    if (body !== undefined) {
      fetchInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchInit);

    const payload = (await response.json().catch(() => undefined)) as ApiResponse<T> | undefined;

    if (isApiResponse(payload)) {
      return payload;
    }

    if (!response.ok) {
      return apiError("http_error", normalizeHttpError(response));
    }

    return apiError("invalid_response", "The API returned an unexpected response.");
  } catch (error) {
    return apiError("network_error", getErrorMessage(error));
  }
}

export async function getJson<T>(path: string, options: Omit<ApiFetchOptions, "body" | "method"> = {}) {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export async function postJson<T>(path: string, body: unknown, options: Omit<ApiFetchOptions, "body" | "method"> = {}) {
  return apiFetch<T>(path, { ...options, method: "POST", body });
}

export async function patchJson<T>(path: string, body: unknown, options: Omit<ApiFetchOptions, "body" | "method"> = {}) {
  return apiFetch<T>(path, { ...options, method: "PATCH", body });
}

export async function deleteJson<T>(path: string, options: Omit<ApiFetchOptions, "body" | "method"> = {}) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}

export async function fetchText(pathOrUrl: string, options: ApiFetchOptions = {}) {
  const { token = getSessionToken(), baseUrl, headers, body: _body, ...requestInit } = options;
  const url = buildApiUrl(pathOrUrl, baseUrl);
  const requestHeaders = new Headers(headers);

  injectSessionToken(requestHeaders, token);

  try {
    const fetchInit: RequestInit = {
      ...requestInit,
      headers: requestHeaders,
      cache: requestInit.cache ?? "no-store"
    };

    const response = await fetch(url, fetchInit);

    if (!response.ok) {
      const payload = (await response.json().catch(() => undefined)) as ApiResponse<unknown> | undefined;
      const message = isApiResponse(payload) && !payload.ok ? payload.error.message : normalizeHttpError(response);
      return { ok: false, error: apiError("http_error", message) } as const;
    }

    return { ok: true, text: await response.text() } as const;
  } catch (error) {
    return { ok: false, error: apiError("network_error", getErrorMessage(error)) } as const;
  }
}

export async function requireApiData<T>(response: ApiResponse<T>): Promise<T> {
  if (response.ok) {
    return response.data;
  }

  throw new Error(response.error.message);
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<SessionToken>;
    return typeof parsed.token === "string" && parsed.token.length > 0 ? parsed.token : null;
  } catch {
    return null;
  }
}

export function injectSessionToken(headers: Headers, token?: string | null) {
  if (!token || headers.has("Authorization") || headers.has("X-Session-Token")) {
    return;
  }

  headers.set("Authorization", `Bearer ${token}`);
}

export function normalizeApiError(error: unknown): ApiFetchError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return apiError("api_error", error.message);
  }

  return apiError("api_error", "Unable to complete API request.");
}

export function getErrorMessage(error: unknown) {
  return normalizeApiError(error).error.message;
}

function buildApiUrl(pathOrUrl: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  if (!base) {
    return path;
  }

  return `${base.replace(/\/$/, "")}${path}`;
}

function normalizeHttpError(response: Response) {
  if (response.status === 401) {
    return "Your session expired. Please sign in again.";
  }

  if (response.status === 403) {
    return "You do not have permission to complete that action.";
  }

  if (response.status === 404) {
    return "The requested resource was not found.";
  }

  return `Request failed with status ${response.status}${response.statusText ? `: ${response.statusText}` : ""}.`;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return typeof value === "object" && value !== null && typeof (value as { ok?: unknown }).ok === "boolean";
}

function isApiError(value: unknown): value is ApiFetchError {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}