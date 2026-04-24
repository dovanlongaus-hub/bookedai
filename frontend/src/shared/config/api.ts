export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (configuredBaseUrl) {
    try {
      const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '');
      const candidate = normalizedBaseUrl.endsWith('/api')
        ? normalizedBaseUrl
        : `${normalizedBaseUrl}/api`;
      return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
      return '/api';
    }
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'product.bookedai.au' ||
      window.location.hostname === 'admin.bookedai.au' ||
      window.location.hostname === 'tenant.bookedai.au' ||
      window.location.hostname === 'futureswim.bookedai.au' ||
      window.location.hostname === 'ai.longcare.au')
  ) {
    return '/api';
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return '/api';
}

/**
 * Base URL for public booking-assistant endpoints (catalog, chat, session, stream).
 * When `VITE_OPENCLAW_PUBLIC_CHAT_URL` is set (e.g. `http://127.0.0.1:18810/public`), the UI
 * sends main chat traffic through the OpenClaw internal-api-bridge, which proxies to
 * `BOOKEDAI_PUBLIC_API_BASE_URL` on the BookedAI backend. Must be reachable from the browser.
 */
export function getBookingAssistantPublicApiBaseUrl() {
  const openclaw = import.meta.env.VITE_OPENCLAW_PUBLIC_CHAT_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (openclaw) {
    try {
      return new URL(openclaw).toString().replace(/\/$/, '');
    } catch {
      return getApiBaseUrl();
    }
  }
  return getApiBaseUrl();
}

export function shouldUseLocalStaticPublicData() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname } = window.location;
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, '');

  return (hostname === 'localhost' || hostname === '127.0.0.1') && !configuredBaseUrl;
}
