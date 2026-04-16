export function getApiBaseUrl() {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'product.bookedai.au' ||
      window.location.hostname === 'admin.bookedai.au')
  ) {
    return '/api';
  }

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

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return '/api';
}
