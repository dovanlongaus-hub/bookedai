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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiClientError(
      resolveApiErrorMessage(body, `API request failed: ${response.status}`),
      response.status,
      body,
    );
  }

  return body as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, init);
}
