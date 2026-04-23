import "server-only";

type Envelope<T> = {
  status?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export function getBackendApiBaseUrl() {
  const configured =
    process.env.ADMIN_BACKEND_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.VITE_API_BASE_URL?.trim();

  if (configured) {
    const normalized = configured.replace(/\/$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://api.bookedai.au/api";
  }

  return "http://127.0.0.1:8000/api";
}

export async function fetchBackendEnvelope<T>(path: string): Promise<T | null> {
  const payload = await fetchBackendResponse<T>(path);
  if (!payload.ok) {
    return null;
  }

  return payload.data;
}

export async function fetchBackendResponse<T>(path: string): Promise<
  | { ok: true; data: T }
  | {
      ok: false;
      status: number | null;
      errorCode?: string;
      message?: string;
      details?: unknown;
    }
> {
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}${path}`, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const payload = (await response.json()) as Envelope<T>;
    if (!response.ok || payload?.status !== "ok" || payload.data === undefined) {
      return {
        ok: false,
        status: response.status,
        errorCode: payload?.error?.code,
        message: payload?.error?.message,
        details: payload?.error?.details,
      };
    }

    return {
      ok: true,
      data: payload.data,
    };
  } catch {
    return {
      ok: false,
      status: null,
      errorCode: "network_error",
      message: "Backend runtime request failed.",
    };
  }
}
