import { getApiBaseUrl } from '../config/api';

function buildApiUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readDetailMessage(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string' && item.trim()) {
          return item.trim();
        }

        if (isRecord(item) && typeof item.msg === 'string' && item.msg.trim()) {
          return item.msg.trim();
        }

        return null;
      })
      .filter((message): message is string => Boolean(message));

    return messages.length > 0 ? messages.join(' ') : null;
  }

  return null;
}

export function resolveApiErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    const detailMessage = readDetailMessage(body.detail);
    if (detailMessage) {
      return detailMessage;
    }

    if (isRecord(body.error)) {
      const errorDetailMessage = readDetailMessage(body.error.detail);
      if (errorDetailMessage) {
        return errorDetailMessage;
      }

      if (typeof body.error.message === 'string' && body.error.message.trim()) {
        return body.error.message.trim();
      }
    }

    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  }

  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  return fallback;
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class ApiClientError extends Error {
  readonly status: number;

  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

export const API_REQUEST_DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_REQUEST_DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const abortFromCaller = () => {
    if (!controller.signal.aborted) {
      controller.abort(callerSignal?.reason);
    }
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new ApiClientError(
        `Network request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again.`,
        0,
        null,
      );
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(buildApiUrl(path), init);
  try {
    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiClientError(
        resolveApiErrorMessage(body, `API request failed: ${response.status}`),
        response.status,
        body,
      );
    }

    return body as T;
  } catch (error) {
    throw error;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init);
}
