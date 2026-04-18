import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import { apiV1 } from '../../shared/api/v1';
import type {
  TenantAuthSessionResponse,
  TenantBookingsResponse,
  TenantCatalogImportRequest,
  TenantCatalogItem,
  TenantCatalogResponse,
  TenantIntegrationsResponse,
  TenantOverviewPriority,
  TenantOverviewResponse,
} from '../../shared/contracts';
import { releaseLabel, releaseVersion } from '../../shared/config/release';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';

type TenantPanel = 'overview' | 'catalog' | 'bookings' | 'integrations';
type CatalogStatusFilter = 'all' | 'search-ready' | 'needs-review' | 'inactive';

type TenantLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      overview: TenantOverviewResponse;
      bookings: TenantBookingsResponse;
      integrations: TenantIntegrationsResponse;
      catalog: TenantCatalogResponse;
    };

type StoredTenantSession = TenantAuthSessionResponse;

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  prompt: () => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number | boolean>,
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function resolveTenantRef() {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const explicitTenant = url.searchParams.get('tenant');
  if (explicitTenant) {
    return explicitTenant;
  }

  const match = window.location.pathname.match(/^\/tenant\/([^/]+)/);
  return match?.[1] ?? null;
}

function resolveInitialPanel(): TenantPanel {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const hash = window.location.hash.replace('#', '');
  if (hash === 'catalog' || hash === 'bookings' || hash === 'integrations') {
    return hash;
  }

  return 'overview';
}

function syncPanelHash(panel: TenantPanel) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = panel === 'overview' ? '' : panel;
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return 'Price on request';
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) {
    return 'Recently updated';
  }

  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function metricCards(
  overview: TenantOverviewResponse,
  catalog: TenantCatalogResponse,
  bookings: TenantBookingsResponse,
) {
  return [
    {
      label: 'Search-ready services',
      value: catalog.counts.search_ready_records,
      caption: `${catalog.counts.total_records} total catalog records`,
    },
    {
      label: 'Needs review',
      value: catalog.counts.warning_records,
      caption: 'Services missing booking-critical data or review signals',
    },
    {
      label: 'Active bookings',
      value: bookings.status_summary.active,
      caption: `${overview.summary.open_booking_requests} requests still open`,
    },
    {
      label: 'Connected providers',
      value: overview.integration_snapshot.connected_count,
      caption: `${overview.integration_snapshot.attention_count} integration signal(s)`,
    },
  ];
}

function priorityToneClasses(priority: TenantOverviewPriority) {
  switch (priority.tone) {
    case 'attention':
      return 'border-amber-300 bg-amber-50 text-amber-950';
    case 'monitor':
      return 'border-sky-300 bg-sky-50 text-sky-950';
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-950';
  }
}

function sessionStorageKey(tenantRef: string | null) {
  return `bookedai.tenant.session.${tenantRef || 'default'}`;
}

function readStoredTenantSession(tenantRef: string | null): StoredTenantSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(sessionStorageKey(tenantRef));
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as StoredTenantSession;
    if (!session.session_token || !session.expires_at) {
      return null;
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      window.localStorage.removeItem(sessionStorageKey(tenantRef));
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(sessionStorageKey(tenantRef));
    return null;
  }
}

function writeStoredTenantSession(tenantRef: string | null, session: StoredTenantSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const key = sessionStorageKey(tenantRef);
  if (!session) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(session));
}

function toBookingReadyServiceItem(item: TenantCatalogItem): BookingReadyServiceItem {
  return {
    id: item.service_id,
    name: item.name,
    category: item.category ?? 'Service',
    summary: item.summary ?? '',
    duration_minutes: item.duration_minutes ?? 0,
    amount_aud: item.amount_aud ?? 0,
    image_url: item.image_url ?? null,
    map_snapshot_url: null,
    venue_name: item.venue_name ?? item.business_name ?? null,
    location: item.location ?? null,
    map_url: item.map_url ?? null,
    booking_url: item.booking_url ?? null,
    tags: item.tags ?? [],
    featured: item.featured,
  };
}

function buildCatalogExplanation(item: TenantCatalogItem) {
  if (item.quality_warnings.length > 0) {
    return item.quality_warnings.join(' • ');
  }

  return item.summary ?? 'Booking metadata is ready for search and shortlist flows.';
}

function buildPublishStateLabel(item: TenantCatalogItem) {
  if (item.publish_state === 'published') {
    return 'Published';
  }
  if (item.publish_state === 'archived') {
    return 'Archived';
  }
  if (item.publish_state === 'review') {
    return 'In review';
  }
  return 'Draft';
}

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GoogleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.17-1.95H12v3.69h5.39a4.62 4.62 0 0 1-2 3.03v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.28Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.23-2.51c-.9.6-2.04.95-3.38.95-2.59 0-4.78-1.75-5.56-4.11H3.1v2.58A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC04" d="M6.44 13.89A5.98 5.98 0 0 1 6.13 12c0-.65.11-1.28.31-1.89V7.53H3.1A9.97 9.97 0 0 0 2 12c0 1.61.38 3.13 1.1 4.47l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.82 1.49l2.86-2.86C16.95 2.99 14.69 2 12 2A9.99 9.99 0 0 0 3.1 7.53l3.34 2.58C7.22 7.75 9.41 5.98 12 5.98Z" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 3v3M19.5 4.5h-3M4.5 16.5h3M6 15v3" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" strokeWidth="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M10 14 8 16a3 3 0 1 1-4-4l3-3a3 3 0 0 1 4 0" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m14 10 2-2a3 3 0 1 1 4 4l-3 3a3 3 0 0 1-4 0" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m9 15 6-6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DatabaseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <ellipse cx="12" cy="6" rx="7" ry="3.5" strokeWidth="1.8" />
      <path d="M5 6v6.5C5 14.43 8.13 16 12 16s7-1.57 7-3.5V6" strokeWidth="1.8" />
      <path d="M5 12v6.5C5 20.43 8.13 22 12 22s7-1.57 7-3.5V12" strokeWidth="1.8" />
    </svg>
  );
}

export function TenantApp() {
  const tenantRef = useMemo(resolveTenantRef, []);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<TenantPanel>(resolveInitialPanel);
  const [state, setState] = useState<TenantLoadState>({ status: 'loading' });
  const [session, setSession] = useState<StoredTenantSession | null>(() => readStoredTenantSession(tenantRef));
  const [googleReady, setGoogleReady] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<CatalogStatusFilter>('all');
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [catalogEditPending, setCatalogEditPending] = useState(false);
  const [catalogActionPending, setCatalogActionPending] = useState(false);
  const [catalogEditMessage, setCatalogEditMessage] = useState<string | null>(null);
  const [catalogEditError, setCatalogEditError] = useState<string | null>(null);
  const [catalogEditForm, setCatalogEditForm] = useState({
    business_name: '',
    business_email: '',
    name: '',
    category: '',
    summary: '',
    amount_aud: '',
    duration_minutes: '',
    venue_name: '',
    location: '',
    map_url: '',
    booking_url: '',
    image_url: '',
    tags: '',
    featured: false,
  });
  const [importForm, setImportForm] = useState<TenantCatalogImportRequest>({
    website_url: '',
    business_name: '',
    business_email: '',
    category: '',
    search_focus:
      'Prioritize search-ready booking fields: product or service name, duration, location, price, description, imagery, booking link, and other booking-critical notes.',
    location_hint: '',
  });

  useEffect(() => {
    writeStoredTenantSession(tenantRef, session);
  }, [session, tenantRef]);

  useEffect(() => {
    let cancelled = false;

    async function loadTenantWorkspace() {
      try {
        const [overviewEnvelope, bookingsEnvelope, integrationsEnvelope, catalogEnvelope] =
          await Promise.all([
            apiV1.getTenantOverview(tenantRef),
            apiV1.getTenantBookings(tenantRef),
            apiV1.getTenantIntegrations(tenantRef),
            apiV1.getTenantCatalog(tenantRef, session?.session_token ?? null),
          ]);

        if (cancelled) {
          return;
        }

        if (
          overviewEnvelope.status !== 'ok' ||
          bookingsEnvelope.status !== 'ok' ||
          integrationsEnvelope.status !== 'ok' ||
          catalogEnvelope.status !== 'ok'
        ) {
          setState({ status: 'error', message: 'Tenant workspace read models are not ready yet.' });
          return;
        }

        setState({
          status: 'ready',
          overview: overviewEnvelope.data,
          bookings: bookingsEnvelope.data,
          integrations: integrationsEnvelope.data,
          catalog: catalogEnvelope.data,
        });

        setImportForm((current) => ({
          ...current,
          business_name: current.business_name || overviewEnvelope.data.tenant.name || '',
          business_email: current.business_email || session?.user.email || '',
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallbackMessage =
          error instanceof Error ? error.message : 'Tenant runtime could not be loaded.';
        const apiError = error as ApiClientError | undefined;
        const bodyMessage =
          typeof apiError?.body === 'object' &&
          apiError?.body &&
          'error' in apiError.body &&
          typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
            ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
            : null;

        setState({
          status: 'error',
          message: bodyMessage ?? fallbackMessage,
        });
      }
    }

    void loadTenantWorkspace();

    return () => {
      cancelled = true;
    };
  }, [session?.session_token, session?.user.email, tenantRef]);

  useEffect(() => {
    syncPanelHash(panel);
  }, [panel]);

  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') {
      return;
    }

    if (window.google?.accounts.id) {
      setGoogleReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => setGoogleReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleClientId]);

  useEffect(() => {
    if (!googleReady || !googleClientId || !googleButtonRef.current || !window.google?.accounts.id) {
      return;
    }

    const container = googleButtonRef.current;
    container.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        const idToken = response.credential?.trim();
        if (!idToken) {
          setAuthError('Google sign-in did not return a usable credential.');
          return;
        }

        setAuthPending(true);
        setAuthError(null);

        void apiV1
          .tenantGoogleAuth({
            id_token: idToken,
            tenant_ref: tenantRef,
          })
          .then((envelope) => {
            if (envelope.status !== 'ok') {
              throw new Error('Tenant authentication could not be established.');
            }

            setSession(envelope.data);
            setImportMessage('Google account connected. AI import and catalog controls are now enabled.');
          })
          .catch((error: unknown) => {
            const fallbackMessage =
              error instanceof Error ? error.message : 'Google sign-in failed.';
            const apiError = error as ApiClientError | undefined;
            const bodyMessage =
              typeof apiError?.body === 'object' &&
              apiError?.body &&
              'error' in apiError.body &&
              typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
                ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
                : null;

            setAuthError(bodyMessage ?? fallbackMessage);
          })
          .finally(() => {
            setAuthPending(false);
          });
      },
    });

    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 280,
    });
  }, [googleClientId, googleReady, tenantRef]);

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return [];
    }

    return metricCards(state.overview, state.catalog, state.bookings);
  }, [state]);

  const filteredCatalogItems = useMemo(() => {
    if (state.status !== 'ready') {
      return [];
    }

    const normalizedQuery = catalogQuery.trim().toLowerCase();
    return state.catalog.items.filter((item) => {
      if (catalogStatusFilter === 'search-ready' && !item.is_search_ready) {
        return false;
      }
      if (catalogStatusFilter === 'needs-review' && item.quality_warnings.length === 0 && item.is_search_ready) {
        return false;
      }
      if (catalogStatusFilter === 'inactive' && item.is_active) {
        return false;
      }
      if (catalogStatusFilter === 'all') {
        // no-op
      } else if (catalogStatusFilter !== 'inactive' && !item.is_active && catalogStatusFilter !== 'needs-review') {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item.name,
        item.business_name,
        item.category,
        item.summary,
        item.location,
        item.venue_name,
        item.tags.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [catalogQuery, catalogStatusFilter, state]);

  useEffect(() => {
    if (filteredCatalogItems.length === 0) {
      setSelectedCatalogServiceId(null);
      return;
    }

    if (!selectedCatalogServiceId || !filteredCatalogItems.some((item) => item.service_id === selectedCatalogServiceId)) {
      setSelectedCatalogServiceId(filteredCatalogItems[0].service_id);
    }
  }, [filteredCatalogItems, selectedCatalogServiceId]);

  const selectedCatalogItem = useMemo(
    () => filteredCatalogItems.find((item) => item.service_id === selectedCatalogServiceId) ?? null,
    [filteredCatalogItems, selectedCatalogServiceId],
  );

  useEffect(() => {
    if (!selectedCatalogItem) {
      return;
    }

    setCatalogEditForm({
      business_name: selectedCatalogItem.business_name ?? '',
      business_email: selectedCatalogItem.business_email ?? '',
      name: selectedCatalogItem.name ?? '',
      category: selectedCatalogItem.category ?? '',
      summary: selectedCatalogItem.summary ?? '',
      amount_aud:
        typeof selectedCatalogItem.amount_aud === 'number' ? String(selectedCatalogItem.amount_aud) : '',
      duration_minutes:
        typeof selectedCatalogItem.duration_minutes === 'number'
          ? String(selectedCatalogItem.duration_minutes)
          : '',
      venue_name: selectedCatalogItem.venue_name ?? '',
      location: selectedCatalogItem.location ?? '',
      map_url: selectedCatalogItem.map_url ?? '',
      booking_url: selectedCatalogItem.booking_url ?? '',
      image_url: selectedCatalogItem.image_url ?? '',
      tags: selectedCatalogItem.tags.join(', '),
      featured: selectedCatalogItem.featured,
    });
    setCatalogEditError(null);
    setCatalogEditMessage(null);
  }, [selectedCatalogItem]);

  async function refreshTenantWorkspace(nextSession = session) {
    const [overviewEnvelope, bookingsEnvelope, integrationsEnvelope, catalogEnvelope] = await Promise.all([
      apiV1.getTenantOverview(tenantRef),
      apiV1.getTenantBookings(tenantRef),
      apiV1.getTenantIntegrations(tenantRef),
      apiV1.getTenantCatalog(tenantRef, nextSession?.session_token ?? null),
    ]);

    if (
      overviewEnvelope.status !== 'ok' ||
      bookingsEnvelope.status !== 'ok' ||
      integrationsEnvelope.status !== 'ok' ||
      catalogEnvelope.status !== 'ok'
    ) {
      throw new Error('Tenant workspace refresh failed.');
    }

    setState({
      status: 'ready',
      overview: overviewEnvelope.data,
      bookings: bookingsEnvelope.data,
      integrations: integrationsEnvelope.data,
      catalog: catalogEnvelope.data,
    });
  }

  function applyCatalogSnapshot(nextCatalog: TenantCatalogResponse) {
    setState((current) =>
      current.status === 'ready'
        ? {
            ...current,
            catalog: nextCatalog,
          }
        : current,
    );
  }

  async function handleCatalogImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setImportError('Connect a verified Google account before importing website data.');
      return;
    }

    if (!importForm.website_url?.trim()) {
      setImportError('Enter a website URL for the AI import step.');
      return;
    }

    setImportPending(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const envelope = await apiV1.importTenantCatalogFromWebsite(
        {
          website_url: importForm.website_url.trim(),
          business_name: importForm.business_name?.trim() || null,
          business_email: importForm.business_email?.trim() || session.user.email,
          category: importForm.category?.trim() || null,
          search_focus: importForm.search_focus?.trim() || null,
          location_hint: importForm.location_hint?.trim() || null,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Catalog import was queued but no updated data was returned.');
      }

      applyCatalogSnapshot(envelope.data);

      setPanel('catalog');
      setImportMessage(
        `AI import completed. ${envelope.data.counts.search_ready_records} search-ready service(s) are now available in the tenant catalog.`,
      );
      await refreshTenantWorkspace(session);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Website import failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setImportError(bodyMessage ?? fallbackMessage);
    } finally {
      setImportPending(false);
    }
  }

  function handleSignOut() {
    setSession(null);
    setAuthError(null);
    setImportMessage('Tenant session cleared. Preview remains available, but AI import is locked.');
    void refreshTenantWorkspace(null).catch(() => {
      // Keep current state if preview refresh fails after sign-out.
    });
  }

  async function handleCatalogSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token || !selectedCatalogItem) {
      setCatalogEditError('Connect a tenant Google account before editing catalog rows.');
      return;
    }

    setCatalogEditPending(true);
    setCatalogEditError(null);
    setCatalogEditMessage(null);

    try {
      const envelope = await apiV1.updateTenantCatalogService(
        selectedCatalogItem.service_id,
        {
          business_name: catalogEditForm.business_name.trim() || null,
          business_email: catalogEditForm.business_email.trim() || null,
          name: catalogEditForm.name.trim() || null,
          category: catalogEditForm.category.trim() || null,
          summary: catalogEditForm.summary.trim() || null,
          amount_aud: catalogEditForm.amount_aud.trim()
            ? Number(catalogEditForm.amount_aud)
            : null,
          duration_minutes: catalogEditForm.duration_minutes.trim()
            ? Number(catalogEditForm.duration_minutes)
            : null,
          venue_name: catalogEditForm.venue_name.trim() || null,
          location: catalogEditForm.location.trim() || null,
          map_url: catalogEditForm.map_url.trim() || null,
          booking_url: catalogEditForm.booking_url.trim() || null,
          image_url: catalogEditForm.image_url.trim() || null,
          tags: catalogEditForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          featured: catalogEditForm.featured,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Catalog service update did not return a refreshed catalog snapshot.');
      }

      applyCatalogSnapshot(envelope.data);
      setCatalogEditMessage('Catalog row saved. It remains out of public search until published.');
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Catalog update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;
      setCatalogEditError(bodyMessage ?? fallbackMessage);
    } finally {
      setCatalogEditPending(false);
    }
  }

  async function runCatalogStateAction(action: 'publish' | 'archive') {
    if (!session?.session_token || !selectedCatalogItem) {
      setCatalogEditError('Connect a tenant Google account before changing publish state.');
      return;
    }

    setCatalogActionPending(true);
    setCatalogEditError(null);
    setCatalogEditMessage(null);

    try {
      const envelope =
        action === 'publish'
          ? await apiV1.publishTenantCatalogService(selectedCatalogItem.service_id, {
              tenantRef,
              sessionToken: session.session_token,
            })
          : await apiV1.archiveTenantCatalogService(selectedCatalogItem.service_id, {
              tenantRef,
              sessionToken: session.session_token,
            });

      if (envelope.status !== 'ok') {
        throw new Error(`Catalog ${action} action did not return a refreshed snapshot.`);
      }

      applyCatalogSnapshot(envelope.data);
      setCatalogEditMessage(
        action === 'publish'
          ? 'Catalog row published. It is now eligible for public matching when search-ready.'
          : 'Catalog row archived. It is now removed from public matching.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : `Catalog ${action} failed.`;
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;
      setCatalogEditError(bodyMessage ?? fallbackMessage);
    } finally {
      setCatalogActionPending(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <main className="booked-runtime-shell bookedai-brand-shell lg:px-8">
        <div className="booked-runtime-card bookedai-stage-frame border-white/10 bg-[rgba(11,16,32,0.88)] text-white">
          <div className="booked-runtime-eyebrow text-[var(--bookedai-accent-purple)]">
            Tenant runtime
          </div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-white">
            Loading tenant workspace
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-white/70">
            Search-ready catalog, bookings, and integration visibility are being prepared for this
            tenant.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="booked-runtime-shell bookedai-brand-shell lg:px-8">
        <div className="booked-runtime-card bookedai-stage-frame max-w-4xl border-rose-400/30 bg-[rgba(36,10,18,0.92)] text-white">
          <div className="booked-runtime-eyebrow text-rose-300">Tenant runtime</div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-white">
            Tenant workspace needs attention
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-white/72">
            {state.message}
          </p>
        </div>
      </main>
    );
  }

  const { overview, bookings, integrations, catalog } = state;
  const selectionService = selectedCatalogItem ? toBookingReadyServiceItem(selectedCatalogItem) : null;

  return (
    <main className="booked-admin-shell bookedai-brand-shell min-h-screen px-4 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(72,123,255,0.24),transparent_34%),linear-gradient(180deg,rgba(10,16,31,0.97),rgba(14,24,46,0.95))] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/90">
                Tenant search workspace
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                {overview.tenant.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/74">
                Search, shortlist, booking data, and AI-assisted catalog import now live in one
                operator surface. Public discovery and tenant curation use the same result language,
                so services stay consistent from search to booking.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-white/78 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Runtime mode
                </div>
                <div className="mt-1 font-semibold text-white">{overview.shell.current_role}</div>
                <div className="mt-1 text-xs text-white/62">
                  {overview.shell.read_only ? 'Preview access' : 'Live access'} • {overview.shell.deployment_mode}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white/12 bg-white/8 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Release
                </div>
                <div className="mt-1 font-semibold text-white">{releaseLabel}</div>
                <div className="mt-1 text-xs text-white/62">Source {releaseVersion}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/72">
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">
              Tenant: {overview.tenant.slug}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">
              Status: {overview.tenant.status ?? 'unknown'}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">
              Timezone: {overview.tenant.timezone ?? 'n/a'}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5">
              Search-ready: {catalog.counts.search_ready_records}/{catalog.counts.total_records}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'overview', label: 'Overview' },
                { key: 'catalog', label: 'Catalog' },
                { key: 'bookings', label: 'Bookings' },
                { key: 'integrations', label: 'Integrations' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPanel(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    panel === item.key
                      ? 'bg-white text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.18)]'
                      : 'border border-white/12 bg-white/6 text-white/76 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {session ? (
                <>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-3 py-1.5 text-xs font-medium text-emerald-100">
                    Connected as {session.user.full_name || session.user.email}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/82 transition hover:bg-white/12"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setPanel('catalog')}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-400/14 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/18"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Connect Google to import
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <article
              key={item.label}
              className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {item.value}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.caption}</p>
            </article>
          ))}
        </section>

        {panel === 'overview' ? (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Booking pipeline
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Recent bookings
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel('bookings')}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    Open bookings
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {overview.recent_bookings.slice(0, 5).map((booking) => (
                    <div
                      key={`${booking.booking_reference ?? 'booking'}-${booking.created_at ?? booking.requested_time ?? ''}`}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {booking.service_name ?? 'Service request'}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Ref {booking.booking_reference ?? 'pending'} • {booking.status ?? 'unknown'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            {booking.requested_date ?? 'Date tbc'} {booking.requested_time ?? ''}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            Confidence {booking.confidence_level ?? 'n/a'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Search intelligence
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Catalog readiness
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel('catalog')}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    Open catalog
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Search-ready
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {catalog.counts.search_ready_records}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Needs review
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {catalog.counts.warning_records}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Inactive
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {catalog.counts.inactive_records}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-5 py-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                    <SparkIcon className="h-4 w-4" />
                    AI import focus
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {catalog.import_guidance.recommended_focus}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {catalog.import_guidance.required_fields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        {field.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Priorities
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Operator focus
                </h2>
                <div className="mt-5 space-y-3">
                  {overview.priorities.map((priority) => (
                    <div
                      key={priority.title}
                      className={`rounded-[1.25rem] border px-4 py-4 ${priorityToneClasses(priority)}`}
                    >
                      <div className="text-sm font-semibold">{priority.title}</div>
                      <p className="mt-2 text-sm leading-6 opacity-80">{priority.body}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Search control
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  What AI pulls into BookedAI
                </h2>
                <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                  <p>
                    Imported data is tuned for search and booking conversion, not generic scraping.
                    The tenant prompt steers AI toward service name, price, duration, location,
                    description, image, and direct booking details.
                  </p>
                  <p>
                    Google login unlocks write access so imported fields can safely become part of
                    the tenant catalog used by public search and booking flows.
                  </p>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {panel === 'catalog' ? (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Search result workspace
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Booking catalog
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      Review how each service will appear to search and booking flows. Filter by
                      search readiness, then inspect individual service cards using the same visual
                      language as the public discovery experience.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                  <label className="relative block flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <SearchIcon className="h-4 w-4" />
                    </span>
                    <input
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      placeholder="Search by product, category, location, or tag"
                      className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'all', label: 'All records' },
                      { key: 'search-ready', label: 'Search-ready' },
                      { key: 'needs-review', label: 'Needs review' },
                      { key: 'inactive', label: 'Inactive' },
                    ] as const).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCatalogStatusFilter(item.key)}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                          catalogStatusFilter === item.key
                            ? 'bg-slate-950 text-white'
                            : 'border border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>

              <div className="space-y-4">
                {filteredCatalogItems.length ? (
                  filteredCatalogItems.map((item) => {
                    const service = toBookingReadyServiceItem(item);
                    return (
                      <div key={item.service_id} className="space-y-3">
                        <PartnerMatchCard
                          card={buildPartnerMatchCardModelFromServiceItem(service, {
                            providerNameOverride: item.business_name,
                            explanation: buildCatalogExplanation(item),
                          })}
                          tone={selectedCatalogServiceId === item.service_id ? 'selected' : 'default'}
                          badge={buildPublishStateLabel(item)}
                          trailingLabel={item.is_search_ready ? 'Search ready' : item.category ?? 'Service'}
                          onClick={() => setSelectedCatalogServiceId(item.service_id)}
                        />
                        {selectedCatalogServiceId === item.service_id ? (
                          <PartnerMatchActionFooter
                            model={buildPartnerMatchActionFooterModelFromServiceItem(service, {
                              selected: true,
                              providerNameOverride: item.business_name,
                            })}
                            tone="selected"
                          />
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <article className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-10 text-sm leading-6 text-slate-600">
                    No catalog records matched this search. Try another filter or run a fresh AI
                    import from the business website.
                  </article>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Secure tenant access
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Google sign-in
                    </h2>
                  </div>
                  <GoogleIcon className="h-5 w-5" />
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Verified Google login unlocks AI-powered catalog import and tenant-level write
                  actions. Preview remains available without login, but imported data is only saved
                  when a tenant admin session is active.
                </p>

                {session ? (
                  <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <div className="text-sm font-semibold text-emerald-900">
                      Connected as {session.user.full_name || session.user.email}
                    </div>
                    <div className="mt-1 text-xs text-emerald-800">
                      Session expires {formatUpdatedAt(session.expires_at)}
                    </div>
                    {session.membership ? (
                      <div className="mt-1 text-xs text-emerald-800">
                        Membership {session.membership.role} on {session.membership.tenant_slug}
                      </div>
                    ) : null}
                  </div>
                ) : googleClientId ? (
                  <>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div ref={googleButtonRef} />
                      <button
                        type="button"
                        onClick={() => window.google?.accounts.id.prompt()}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        <GoogleIcon className="h-4 w-4" />
                        Use another Google account
                      </button>
                    </div>
                    {!googleReady ? (
                      <div className="mt-3 text-xs text-slate-500">
                        Loading Google Identity Services...
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                    Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment and
                    `GOOGLE_OAUTH_CLIENT_ID` in the backend to enable tenant Google login.
                  </div>
                )}

                {authPending ? (
                  <div className="mt-4 text-sm text-slate-600">Verifying Google account...</div>
                ) : null}
                {authError ? (
                  <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {authError}
                  </div>
                ) : null}
                {importMessage ? (
                  <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {importMessage}
                  </div>
                ) : null}
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-950 p-2 text-white">
                    <SparkIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      AI import
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Import website data into BookedAI
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Tune the search focus before import so AI extracts only booking-critical content:
                  product or service name, duration, location, pricing, description, image, booking
                  link, and directly relevant commercial details.
                </p>

                <form className="mt-5 space-y-4" onSubmit={handleCatalogImport}>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Website URL
                    </div>
                    <input
                      value={importForm.website_url ?? ''}
                      onChange={(event) =>
                        setImportForm((current) => ({ ...current, website_url: event.target.value }))
                      }
                      placeholder="https://business.example.com"
                      className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Business name
                      </div>
                      <input
                        value={importForm.business_name ?? ''}
                        onChange={(event) =>
                          setImportForm((current) => ({ ...current, business_name: event.target.value }))
                        }
                        className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Contact email
                      </div>
                      <input
                        value={importForm.business_email ?? ''}
                        onChange={(event) =>
                          setImportForm((current) => ({ ...current, business_email: event.target.value }))
                        }
                        className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Search category
                      </div>
                      <input
                        value={importForm.category ?? ''}
                        onChange={(event) =>
                          setImportForm((current) => ({ ...current, category: event.target.value }))
                        }
                        placeholder="Beauty, dining, wellness, services..."
                        className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Location hint
                      </div>
                      <input
                        value={importForm.location_hint ?? ''}
                        onChange={(event) =>
                          setImportForm((current) => ({ ...current, location_hint: event.target.value }))
                        }
                        placeholder="Sydney CBD, Melbourne, Brisbane..."
                        className="h-12 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      AI search focus
                    </div>
                    <textarea
                      rows={5}
                      value={importForm.search_focus ?? ''}
                      onChange={(event) =>
                        setImportForm((current) => ({ ...current, search_focus: event.target.value }))
                      }
                      className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white"
                    />
                  </label>

                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <DatabaseIcon className="h-4 w-4" />
                      Fields AI should prioritize
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {catalog.import_guidance.required_fields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                        >
                          {field.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {importError ? (
                    <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {importError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={importPending || !session}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
                      importPending || !session
                        ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                    }`}
                  >
                    <SparkIcon className="h-4 w-4" />
                    {importPending ? 'Importing website data...' : 'Import into BookedAI'}
                  </button>
                </form>
              </article>

              {selectedCatalogItem && selectionService ? (
                <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Selected result
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedCatalogItem.name}
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {formatCurrency(selectedCatalogItem.amount_aud)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {selectedCatalogItem.duration_minutes
                        ? `${selectedCatalogItem.duration_minutes} min`
                        : 'Duration not set'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {buildPublishStateLabel(selectedCatalogItem)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Updated {formatUpdatedAt(selectedCatalogItem.updated_at)}
                    </span>
                  </div>

                  {selectedCatalogItem.quality_warnings.length ? (
                    <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-4">
                      <div className="text-sm font-semibold text-amber-900">Needs review</div>
                      <div className="mt-2 space-y-2 text-sm leading-6 text-amber-900">
                        {selectedCatalogItem.quality_warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCatalogItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <span>{selectedCatalogItem.location || 'Location not set'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {selectedCatalogItem.booking_url ? 'Direct booking link captured' : 'Booking link not yet captured'}
                      </span>
                    </div>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={handleCatalogSave}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Business name
                        </div>
                        <input
                          value={catalogEditForm.business_name}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, business_name: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Contact email
                        </div>
                        <input
                          value={catalogEditForm.business_email}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, business_email: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Service name
                        </div>
                        <input
                          value={catalogEditForm.name}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Category
                        </div>
                        <input
                          value={catalogEditForm.category}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, category: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Description
                      </div>
                      <textarea
                        rows={4}
                        value={catalogEditForm.summary}
                        onChange={(event) =>
                          setCatalogEditForm((current) => ({ ...current, summary: event.target.value }))
                        }
                        className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Price (AUD)
                        </div>
                        <input
                          value={catalogEditForm.amount_aud}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, amount_aud: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Duration (minutes)
                        </div>
                        <input
                          value={catalogEditForm.duration_minutes}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, duration_minutes: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Venue name
                        </div>
                        <input
                          value={catalogEditForm.venue_name}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, venue_name: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Location
                        </div>
                        <input
                          value={catalogEditForm.location}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, location: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Booking URL
                        </div>
                        <input
                          value={catalogEditForm.booking_url}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, booking_url: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Image URL
                        </div>
                        <input
                          value={catalogEditForm.image_url}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, image_url: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Tags
                      </div>
                      <input
                        value={catalogEditForm.tags}
                        onChange={(event) =>
                          setCatalogEditForm((current) => ({ ...current, tags: event.target.value }))
                        }
                        placeholder="spa, facial, sydney"
                        className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                      />
                    </label>

                    <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={catalogEditForm.featured}
                        onChange={(event) =>
                          setCatalogEditForm((current) => ({ ...current, featured: event.target.checked }))
                        }
                      />
                      Mark this row as featured
                    </label>

                    {catalogEditError ? (
                      <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {catalogEditError}
                      </div>
                    ) : null}
                    {catalogEditMessage ? (
                      <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {catalogEditMessage}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={catalogEditPending || catalogActionPending || !session}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-slate-950 text-white'
                        }`}
                      >
                        {catalogEditPending ? 'Saving...' : 'Save draft'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogEditPending || catalogActionPending || !session}
                        onClick={() => void runCatalogStateAction('publish')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {catalogActionPending ? 'Working...' : 'Publish to search'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogEditPending || catalogActionPending || !session}
                        onClick={() => void runCatalogStateAction('archive')}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        Archive
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {panel === 'bookings' ? (
          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status mix
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Booking posture
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(bookings.status_summary).map(([key, value]) => (
                  <div key={key} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Recent records
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Booking list
              </h2>
              <div className="mt-5 space-y-3">
                {bookings.items.map((booking) => (
                  <div
                    key={`${booking.booking_reference ?? 'booking'}-${booking.created_at ?? booking.requested_time ?? ''}`}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {booking.service_name ?? 'Service request'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Ref {booking.booking_reference ?? 'pending'} • {booking.status ?? 'unknown'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {booking.requested_date ?? 'Date tbc'} {booking.requested_time ?? ''}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Confidence {booking.confidence_level ?? 'n/a'}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Payment {booking.payment_dependency_state ?? 'n/a'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {panel === 'integrations' ? (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Attention queue
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Current signals
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.attention.length ? (
                    integrations.attention.map((item) => (
                      <div
                        key={`${item.source}-${item.issue_type}`}
                        className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {item.source.replace(/_/g, ' ')}
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {item.severity}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          {item.item_count} item(s) • {item.issue_type}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.recommended_action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      No elevated attention items in this tenant slice.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  CRM retry backlog
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Retry posture
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {integrations.crm_retry_backlog.summary.operator_note}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Retrying
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.retrying_records}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Manual review
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.manual_review_records}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Failed
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.failed_records}
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Providers
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Connections
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.providers.map((provider) => (
                    <div
                      key={provider.provider}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{provider.provider}</div>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {provider.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {provider.sync_mode} •{' '}
                        {provider.safe_config.configured_fields.join(', ') || 'no configured fields'}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Reconciliation
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Section detail
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.reconciliation.sections.map((section) => (
                    <div
                      key={section.area}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">
                          {section.area.replace(/_/g, ' ')}
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {section.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        total {section.total_count} • pending {section.pending_count} • failed{' '}
                        {section.failed_count}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{section.recommended_action}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
