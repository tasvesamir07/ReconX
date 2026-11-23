import { ApiError } from "@/types";

function resolveApiBaseUrl(): string {
  let raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && typeof raw === "string") {
    // Auto-correct stale Render service subdomains
    raw = raw.replace(
      "https://reconx-backend.onrender.com",
      "https://reconx-backend-ljsn.onrender.com"
    );
    return raw.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://reconx-backend-ljsn.onrender.com/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();

const API_BASE = API_BASE_URL;

/**
 * Pre-warms the backend by sending a lightweight, non-blocking ping.
 * Triggers Render container spin-up immediately when frontend is loaded.
 */
export function warmBackend(): void {
  if (typeof window === "undefined") return;
  try {
    const healthUrl = API_BASE.replace(/\/api\/v1\/?$/, "") + "/api/v1/health";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(healthUrl);
    } else {
      fetch(healthUrl, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
    }
  } catch (_) {}
}

export class ReconXApiError extends Error {
  code: string;
  details?: Record<string, any>;
  statusCode: number;
  status: number;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "ReconXApiError";
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 1
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const timeoutMs = 45000; // 45s allows for Render free-tier cold starts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal || controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);

    // If server was waking up, retry once automatically
    if (retryCount > 0 && (fetchErr.name === "AbortError" || fetchErr.message?.includes("Failed to fetch"))) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return apiRequest<T>(endpoint, options, retryCount - 1);
    }

    if (fetchErr.name === "AbortError") {
      throw new ReconXApiError(
        504,
        "BACKEND_TIMEOUT",
        `Backend request timed out (45s) contacting: ${url}. Please verify your Render backend service is awake and running.`
      );
    }
    throw new ReconXApiError(
      503,
      "BACKEND_UNREACHABLE",
      `Unable to connect to backend at: ${url}. Please verify your Render backend service URL and CORS configuration.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/dashboard")) {
        window.location.href = "/login";
      }
    }

    if (data && data.error) {
      throw new ReconXApiError(
        res.status,
        data.error.code,
        data.error.message,
        data.error.details
      );
    }
    if (data && data.detail) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail[0]?.msg || JSON.stringify(data.detail)
            : JSON.stringify(data.detail);
      throw new ReconXApiError(res.status, "VALIDATION_ERROR", message);
    }
    throw new ReconXApiError(
      res.status,
      "HTTP_ERROR",
      res.statusText || `Request failed with status ${res.status}`
    );
  }

  return data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ReconXApiError) return error.message;
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "Could not reach the ReconX API. Check that the backend is running and reachable.";
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export async function apiDownload(endpoint: string, fallbackName = "reconx-report.pdf") {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    let message = res.statusText || `Download failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error?.message || data?.detail || message;
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new ReconXApiError(res.status, "DOWNLOAD_FAILED", message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
