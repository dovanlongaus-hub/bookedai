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
      window.location.hostname === 'tenant.bookedai.au')
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

export function shouldUseLocalStaticPublicData() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname } = window.location;
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, '');

  return (hostname === 'localhost' || hostname === '127.0.0.1') && !configuredBaseUrl;
}
