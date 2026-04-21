import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import { apiV1 } from '../../shared/api/v1';
import type {
  TenantAuthSessionResponse,
  TenantBillingResponse,
  TenantBookingsResponse,
  TenantCatalogImportRequest,
  TenantCatalogItem,
  TenantCatalogResponse,
  TenantIntegrationsResponse,
  TenantOnboardingResponse,
  TenantOverviewPriority,
  TenantOverviewResponse,
  TenantRevenueMetrics,
  TenantTeamResponse,
} from '../../shared/contracts';
import { releaseLabel, releaseVersion } from '../../shared/config/release';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import {
  TenantAuthWorkspace,
  type TenantAuthMode,
} from '../../features/tenant-auth/TenantAuthWorkspace';
import {
  TenantBusinessProfileCard,
  type TenantBusinessProfileFormState,
} from '../../features/tenant-onboarding/TenantBusinessProfileCard';
import { TenantOnboardingStatusCard } from '../../features/tenant-onboarding/TenantOnboardingStatusCard';
import {
  TenantBillingWorkspace,
  type TenantBillingAccountFormState,
} from '../../features/tenant-billing/TenantBillingWorkspace';
import {
  TenantTeamWorkspace,
  type TenantInviteMemberFormState,
} from '../../features/tenant-team/TenantTeamWorkspace';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';

type TenantPanel = 'overview' | 'catalog' | 'bookings' | 'integrations' | 'billing' | 'team';
type CatalogStatusFilter = 'all' | 'search-ready' | 'needs-review' | 'inactive';

type TenantLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      overview: TenantOverviewResponse;
      bookings: TenantBookingsResponse;
      integrations: TenantIntegrationsResponse;
      billing: TenantBillingResponse;
      onboarding: TenantOnboardingResponse;
      team: TenantTeamResponse;
      catalog: TenantCatalogResponse;
    };

type StoredTenantSession = TenantAuthSessionResponse;

type GoogleCredentialResponse = {
  credential?: string;
};

type TenantGatewayChoice = {
  slug: string;
  label: string;
};

type TenantInviteContext = {
  authMode: TenantAuthMode;
  email: string | null;
  full_name: string | null;
  role: string | null;
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

  const tenantPathMatch = window.location.pathname.match(/^\/tenant\/([^/]+)/);
  if (tenantPathMatch?.[1]) {
    return tenantPathMatch[1];
  }

  if (window.location.hostname === 'tenant.bookedai.au') {
    const [firstPathSegment] = window.location.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (firstPathSegment) {
      return firstPathSegment;
    }
  }

  return null;
}

function resolveTenantInviteContext(): TenantInviteContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const auth = url.searchParams.get('auth')?.trim().toLowerCase();
  const inviteEmail = url.searchParams.get('invite_email')?.trim().toLowerCase() || null;
  const inviteName = url.searchParams.get('invite_name')?.trim() || null;
  const inviteRole = url.searchParams.get('invite_role')?.trim().toLowerCase() || null;
  if (!inviteEmail && auth !== 'claim') {
    return null;
  }

  return {
    authMode: 'claim',
    email: inviteEmail,
    full_name: inviteName,
    role: inviteRole,
  };
}

function resolveInitialAuthMode(
  isGateway: boolean,
  inviteContext: TenantInviteContext | null,
): TenantAuthMode {
  if (!isGateway && inviteContext) {
    return inviteContext.authMode;
  }

  if (typeof window === 'undefined') {
    return 'sign-in';
  }

  const auth = new URL(window.location.href).searchParams.get('auth')?.trim().toLowerCase();
  if (auth === 'create' && isGateway) {
    return 'create';
  }
  if (auth === 'claim') {
    return 'claim';
  }
  return 'sign-in';
}

function resolveInitialPanel(): TenantPanel {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'catalog'
    || hash === 'bookings'
    || hash === 'integrations'
    || hash === 'billing'
    || hash === 'team'
  ) {
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

function formatCatalogPrice(options: {
  amount?: number | null;
  currencyCode?: string | null;
  displayPrice?: string | null;
}) {
  if (options.displayPrice?.trim()) {
    return options.displayPrice.trim();
  }

  if (typeof options.amount !== 'number' || Number.isNaN(options.amount) || options.amount <= 0) {
    return 'Price on request';
  }

  const currencyCode = options.currencyCode?.trim().toUpperCase() || 'AUD';
  try {
    return new Intl.NumberFormat(currencyCode === 'VND' ? 'vi-VN' : 'en-AU', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'VND' ? 0 : 2,
    }).format(options.amount);
  } catch {
    return `${currencyCode} ${options.amount}`;
  }
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

function redirectToTenantWorkspace(nextTenantSlug: string) {
  if (typeof window === 'undefined' || !nextTenantSlug.trim()) {
    return;
  }

  const normalizedSlug = nextTenantSlug.trim();
  if (window.location.hostname === 'tenant.bookedai.au') {
    window.location.assign(`https://tenant.bookedai.au/${normalizedSlug}`);
    return;
  }

  window.location.assign(`/tenant/${normalizedSlug}`);
}

function metricCards(
  overview: TenantOverviewResponse,
  catalog: TenantCatalogResponse,
  bookings: TenantBookingsResponse,
  billing: TenantBillingResponse,
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
    {
      label: 'Billing readiness',
      value: billing.collection.can_charge ? 'Live' : billing.subscription.status.replace(/_/g, ' '),
      caption: billing.collection.recommended_action,
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

const TENANT_GATEWAY_CHOICES_STORAGE_KEY = 'bookedai.tenant.gateway.choices';

function readStoredTenantGatewayChoices(): TenantGatewayChoice[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.sessionStorage.getItem(TENANT_GATEWAY_CHOICES_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return null;
        }

        const slug = 'slug' in item && typeof item.slug === 'string' ? item.slug.trim() : '';
        const label = 'label' in item && typeof item.label === 'string' ? item.label.trim() : '';
        if (!slug || !label) {
          return null;
        }

        return { slug, label };
      })
      .filter((item): item is TenantGatewayChoice => Boolean(item));
  } catch {
    window.sessionStorage.removeItem(TENANT_GATEWAY_CHOICES_STORAGE_KEY);
    return [];
  }
}

function writeStoredTenantGatewayChoices(choices: TenantGatewayChoice[]) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!choices.length) {
    window.sessionStorage.removeItem(TENANT_GATEWAY_CHOICES_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(TENANT_GATEWAY_CHOICES_STORAGE_KEY, JSON.stringify(choices));
}

function buildGatewayOnboardingState(): TenantOnboardingResponse {
  return {
    tenant: {
      id: 'tenant-gateway',
      slug: 'tenant.bookedai.au',
      name: 'BookedAI Tenant Gateway',
      status: 'active',
      timezone: 'Australia/Sydney',
      locale: 'en-AU',
      industry: 'multi-tenant saas',
    },
    progress: {
      completed_steps: 0,
      total_steps: 3,
      percent: 0,
    },
    steps: [
      {
        id: 'sign_in',
        label: 'Sign in to an existing tenant',
        status: 'pending',
        description: 'Use your tenant username/password or the linked Google account.',
      },
      {
        id: 'create',
        label: 'Create a new tenant account',
        status: 'pending',
        description: 'Register a new tenant workspace from the shared login gateway.',
      },
      {
        id: 'redirect',
        label: 'Open the tenant workspace',
        status: 'pending',
        description: 'BookedAI will route you into the correct tenant workspace after authentication.',
      },
    ],
    checkpoints: {
      catalog_records: 0,
      published_records: 0,
      has_billing_account: false,
      has_active_subscription: false,
    },
    recommended_next_action:
      'Sign in to an existing tenant or create a new tenant account from this shared gateway.',
  };
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
    currency_code: item.currency_code ?? null,
    display_price: item.display_price ?? null,
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

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M12 3.5c2.7 1.86 5.35 2.8 7.5 3v5.58c0 4.23-2.36 7.92-7.5 8.92-5.14-1-7.5-4.69-7.5-8.92V6.5c2.15-.2 4.8-1.14 7.5-3Z"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m9.5 11.8 1.7 1.7 3.7-4.3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const inviteContext = useMemo(resolveTenantInviteContext, []);
  const isGateway = !tenantRef;
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [panel, setPanel] = useState<TenantPanel>(resolveInitialPanel);
  const [authMode, setAuthMode] = useState<TenantAuthMode>(() =>
    resolveInitialAuthMode(isGateway, inviteContext),
  );
  const [state, setState] = useState<TenantLoadState>({ status: 'loading' });
  const [revenueMetrics, setRevenueMetrics] = useState<TenantRevenueMetrics | null>(null);
  const [session, setSession] = useState<StoredTenantSession | null>(() => readStoredTenantSession(tenantRef));
  const [googleReady, setGoogleReady] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tenantChoices, setTenantChoices] = useState<TenantGatewayChoice[]>(() =>
    isGateway ? readStoredTenantGatewayChoices() : [],
  );
  const [lastGoogleCredential, setLastGoogleCredential] = useState<string | null>(null);
  const [passwordUsername, setPasswordUsername] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [createAccountForm, setCreateAccountForm] = useState({
    business_name: '',
    full_name: '',
    email: '',
    username: '',
    password: '',
    industry: '',
  });
  const [claimAccountForm, setClaimAccountForm] = useState({
    full_name: inviteContext?.full_name || '',
    email: inviteContext?.email || '',
    username: '',
    password: '',
  });
  const [profileForm, setProfileForm] = useState<TenantBusinessProfileFormState>({
    business_name: '',
    industry: '',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    operator_full_name: '',
  });
  const [profilePending, setProfilePending] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [billingAccountForm, setBillingAccountForm] = useState<TenantBillingAccountFormState>({
    billing_email: '',
    merchant_mode: 'test',
  });
  const [billingPending, setBillingPending] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscriptionPendingPlanCode, setSubscriptionPendingPlanCode] = useState<string | null>(null);
  const [invoiceActionPendingId, setInvoiceActionPendingId] = useState<string | null>(null);
  const [inviteMemberForm, setInviteMemberForm] = useState<TenantInviteMemberFormState>({
    email: '',
    full_name: '',
    role: 'operator',
  });
  const [teamPending, setTeamPending] = useState(false);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [integrationPendingProvider, setIntegrationPendingProvider] = useState<string | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
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
    currency_code: 'AUD',
    display_price: '',
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
    if (!isGateway || !session?.tenant.slug) {
      return;
    }

    writeStoredTenantSession(session.tenant.slug, session);
    redirectToTenantWorkspace(session.tenant.slug);
  }, [isGateway, session]);

  useEffect(() => {
    if (!isGateway) {
      return;
    }

    writeStoredTenantGatewayChoices(tenantChoices);
  }, [isGateway, tenantChoices]);

  useEffect(() => {
    if (isGateway || session || !inviteContext) {
      return;
    }

    setAuthMode('claim');
    setClaimAccountForm((current) => ({
      ...current,
      email: current.email || inviteContext.email || '',
      full_name: current.full_name || inviteContext.full_name || '',
    }));
  }, [inviteContext, isGateway, session]);

  useEffect(() => {
    if (isGateway) {
      return;
    }

    let cancelled = false;

    async function loadTenantWorkspace() {
      try {
        const [overviewEnvelope, bookingsEnvelope, integrationsEnvelope, billingEnvelope, onboardingEnvelope, teamEnvelope, catalogEnvelope] =
          await Promise.all([
            apiV1.getTenantOverview(tenantRef),
            apiV1.getTenantBookings(tenantRef),
            apiV1.getTenantIntegrations(tenantRef, session?.session_token ?? null),
            apiV1.getTenantBilling(tenantRef, session?.session_token ?? null),
            apiV1.getTenantOnboarding(tenantRef, session?.session_token ?? null),
            apiV1.getTenantTeam(tenantRef, session?.session_token ?? null),
            apiV1.getTenantCatalog(tenantRef, session?.session_token ?? null),
          ]);

        if (cancelled) {
          return;
        }

        if (
          overviewEnvelope.status !== 'ok' ||
          bookingsEnvelope.status !== 'ok' ||
          integrationsEnvelope.status !== 'ok' ||
          billingEnvelope.status !== 'ok' ||
          onboardingEnvelope.status !== 'ok' ||
          teamEnvelope.status !== 'ok' ||
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
          billing: billingEnvelope.data,
          onboarding: onboardingEnvelope.data,
          team: teamEnvelope.data,
          catalog: catalogEnvelope.data,
        });

        apiV1
          .getTenantRevenueMetrics(tenantRef, session?.session_token ?? null)
          .then((env) => {
            if (!cancelled && env.status === 'ok') setRevenueMetrics(env.data);
          })
          .catch(() => {});

        setCreateAccountForm((current) => ({
          ...current,
          business_name: current.business_name || overviewEnvelope.data.tenant.name || '',
          email: current.email || session?.user.email || '',
        }));
        setClaimAccountForm((current) => ({
          ...current,
          email: current.email || session?.user.email || '',
        }));
        setProfileForm((current) => ({
          ...current,
          business_name: overviewEnvelope.data.tenant.name || current.business_name,
          industry: overviewEnvelope.data.tenant.industry || current.industry,
          timezone: overviewEnvelope.data.tenant.timezone || current.timezone,
          locale: overviewEnvelope.data.tenant.locale || current.locale,
          operator_full_name: session?.user.full_name || current.operator_full_name,
        }));
        setImportForm((current) => ({
          ...current,
          business_name: current.business_name || overviewEnvelope.data.tenant.name || '',
          business_email: current.business_email || session?.user.email || '',
        }));
        setBillingAccountForm((current) => ({
          ...current,
          billing_email: billingEnvelope.data.account.billing_email || session?.user.email || current.billing_email,
          merchant_mode: billingEnvelope.data.account.merchant_mode || current.merchant_mode || 'test',
        }));
        setInviteMemberForm((current) => ({
          ...current,
          role: current.role || teamEnvelope.data.available_roles[0]?.code || 'operator',
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
  }, [isGateway, session?.session_token, session?.user.email, tenantRef]);

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

        if (isGateway && authMode === 'create' && !createAccountForm.business_name.trim()) {
          setAuthError('Enter a business name before creating a tenant account with Google.');
          return;
        }

        setAuthPending(true);
        setAuthError(null);
        setTenantChoices([]);
        setLastGoogleCredential(idToken);

        void apiV1
          .tenantGoogleAuth({
            id_token: idToken,
            tenant_ref: tenantRef,
            auth_intent: authMode === 'create' ? 'create' : 'sign-in',
            business_name: authMode === 'create' ? createAccountForm.business_name.trim() : null,
            industry: authMode === 'create' ? createAccountForm.industry.trim() || null : null,
          })
          .then((envelope) => {
            if (envelope.status !== 'ok') {
              throw new Error('Tenant authentication could not be established.');
            }

            return completeTenantAuth(
              envelope.data,
              isGateway
                ? 'Google account connected. Redirecting to your tenant workspace now.'
                : 'Google account connected. AI import and catalog controls are now enabled.',
            );
          })
          .catch((error: unknown) => {
            const fallbackMessage =
              error instanceof Error ? error.message : 'Google sign-in failed.';
            const apiError = error as ApiClientError | undefined;
            const nextTenantChoices = normalizeTenantChoicesFromApiError(apiError);
            const bodyMessage =
              typeof apiError?.body === 'object' &&
              apiError?.body &&
              'error' in apiError.body &&
              typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
                ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
                : null;

            setTenantChoices(nextTenantChoices);
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
  }, [
    authMode,
    createAccountForm.business_name,
    createAccountForm.industry,
    googleClientId,
    googleReady,
    isGateway,
    tenantRef,
  ]);

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return [];
    }

    return metricCards(state.overview, state.catalog, state.bookings, state.billing);
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
      currency_code: selectedCatalogItem.currency_code ?? 'AUD',
      display_price: selectedCatalogItem.display_price ?? '',
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
    const [overviewEnvelope, bookingsEnvelope, integrationsEnvelope, billingEnvelope, onboardingEnvelope, teamEnvelope, catalogEnvelope] = await Promise.all([
      apiV1.getTenantOverview(tenantRef),
      apiV1.getTenantBookings(tenantRef),
      apiV1.getTenantIntegrations(tenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantBilling(tenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantOnboarding(tenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantTeam(tenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantCatalog(tenantRef, nextSession?.session_token ?? null),
    ]);

    if (
      overviewEnvelope.status !== 'ok' ||
      bookingsEnvelope.status !== 'ok' ||
      integrationsEnvelope.status !== 'ok' ||
      billingEnvelope.status !== 'ok' ||
      onboardingEnvelope.status !== 'ok' ||
      teamEnvelope.status !== 'ok' ||
      catalogEnvelope.status !== 'ok'
    ) {
      throw new Error('Tenant workspace refresh failed.');
    }

    setState({
      status: 'ready',
      overview: overviewEnvelope.data,
      bookings: bookingsEnvelope.data,
      integrations: integrationsEnvelope.data,
      billing: billingEnvelope.data,
      onboarding: onboardingEnvelope.data,
      team: teamEnvelope.data,
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

  async function completeTenantAuth(
    nextSession: TenantAuthSessionResponse,
    successMessage: string,
  ) {
    setTenantChoices([]);
    setLastGoogleCredential(null);
    writeStoredTenantSession(nextSession.tenant.slug, nextSession);
    setSession(nextSession);
    setImportMessage(successMessage);

    if (!tenantRef || nextSession.tenant.slug !== tenantRef) {
      redirectToTenantWorkspace(nextSession.tenant.slug);
      return;
    }

    await refreshTenantWorkspace(nextSession);
  }

  function normalizeTenantChoicesFromApiError(error: ApiClientError | undefined): TenantGatewayChoice[] {
    const tenantSlugs =
      typeof error?.body === 'object'
      && error?.body
      && 'error' in error.body
      && Array.isArray((error.body as { error?: { details?: { tenant_slugs?: unknown } } }).error?.details?.tenant_slugs)
        ? ((error.body as { error?: { details?: { tenant_slugs?: unknown[] } } }).error?.details?.tenant_slugs as unknown[])
        : [];

    return tenantSlugs
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .map((slug) => ({
        slug,
        label: slug
          .split('-')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
      }));
  }

  async function handleTenantChoiceSelection(selectedTenantSlug: string) {
    if (!lastGoogleCredential) {
      setAuthError(
        'Google verification is no longer active. Choose "Use another Google account" to confirm ownership again, then select the tenant workspace.',
      );
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    try {
      const envelope = await apiV1.tenantGoogleAuth({
        id_token: lastGoogleCredential,
        tenant_ref: selectedTenantSlug,
        auth_intent: 'sign-in',
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant authentication could not be established.');
      }

      await completeTenantAuth(
        envelope.data,
        'Google account connected. Redirecting to your selected tenant workspace now.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant workspace selection failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setAuthError(bodyMessage ?? fallbackMessage);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleCatalogImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setImportError('Sign in with a tenant account before importing website data.');
      return;
    }
    if (!canWriteCatalog) {
      setImportError('Your current tenant role can review catalog data but cannot import or publish catalog changes.');
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
    if (session?.tenant.slug) {
      writeStoredTenantSession(session.tenant.slug, null);
    }
    setSession(null);
    setAuthError(null);
    setImportMessage('Tenant session cleared. Preview remains available, but AI import is locked.');
    if (!isGateway) {
      void refreshTenantWorkspace(null).catch(() => {
        // Keep current state if preview refresh fails after sign-out.
      });
    }
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordUsername.trim() || !passwordValue.trim()) {
      setAuthError('Enter the tenant username and password.');
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    try {
      const envelope = await apiV1.tenantPasswordAuth({
        username: passwordUsername.trim(),
        password: passwordValue,
        tenant_ref: tenantRef,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant authentication could not be established.');
      }

      setPasswordValue('');
      await completeTenantAuth(
        envelope.data,
        isGateway
          ? 'Tenant account connected. Redirecting to your tenant workspace now.'
          : 'Tenant account connected. Catalog import and tenant write access are now enabled.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant password sign-in failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setAuthError(bodyMessage ?? fallbackMessage);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !createAccountForm.business_name.trim()
      || !createAccountForm.email.trim()
      || !createAccountForm.username.trim()
      || !createAccountForm.password.trim()
    ) {
      setAuthError('Enter business name, email, username, and password to create a tenant account.');
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    try {
      const envelope = await apiV1.tenantCreateAccount({
        business_name: createAccountForm.business_name.trim(),
        full_name: createAccountForm.full_name.trim() || null,
        email: createAccountForm.email.trim(),
        username: createAccountForm.username.trim(),
        password: createAccountForm.password,
        industry: createAccountForm.industry.trim() || null,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant account could not be created.');
      }

      await completeTenantAuth(
        envelope.data,
        'Tenant account created. Redirecting into your workspace now.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant account creation failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setAuthError(bodyMessage ?? fallbackMessage);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleClaimAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantRef) {
      setAuthError('Open a tenant workspace first before claiming it.');
      return;
    }
    if (
      !claimAccountForm.email.trim()
      || !claimAccountForm.username.trim()
      || !claimAccountForm.password.trim()
    ) {
      setAuthError('Enter email, username, and password to claim this tenant workspace.');
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    try {
      const envelope = await apiV1.tenantClaimAccount({
        tenant_ref: tenantRef,
        email: claimAccountForm.email.trim(),
        username: claimAccountForm.username.trim(),
        password: claimAccountForm.password,
        full_name: claimAccountForm.full_name.trim() || null,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant workspace claim failed.');
      }

      await completeTenantAuth(
        envelope.data,
        'Tenant workspace claimed. Write access is now enabled for this tenant.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant workspace claim failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setAuthError(bodyMessage ?? fallbackMessage);
    } finally {
      setAuthPending(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setProfileError('Sign in with a tenant account before updating workspace profile details.');
      return;
    }

    setProfilePending(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const envelope = await apiV1.updateTenantProfile(
        {
          business_name: profileForm.business_name.trim() || null,
          industry: profileForm.industry.trim() || null,
          timezone: profileForm.timezone.trim() || null,
          locale: profileForm.locale.trim() || null,
          operator_full_name: profileForm.operator_full_name.trim() || null,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant profile update did not return a refreshed tenant state.');
      }

      setProfileMessage('Business profile saved. Workspace setup progress has been refreshed.');
      await refreshTenantWorkspace(session);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant profile update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setProfileError(bodyMessage ?? fallbackMessage);
    } finally {
      setProfilePending(false);
    }
  }

  async function handleBillingAccountSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setBillingError('Sign in with a tenant account before updating billing setup.');
      return;
    }
    if (!billingAccountForm.billing_email.trim()) {
      setBillingError('Enter a billing email before saving tenant billing setup.');
      return;
    }

    setBillingPending(true);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const envelope = await apiV1.updateTenantBillingAccount(
        {
          billing_email: billingAccountForm.billing_email.trim(),
          merchant_mode: billingAccountForm.merchant_mode.trim() || 'test',
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant billing setup did not return a refreshed workspace state.');
      }

      setBillingMessage('Billing setup saved. The tenant workspace billing state has been refreshed.');
      await refreshTenantWorkspace(session);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant billing setup update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setBillingError(bodyMessage ?? fallbackMessage);
    } finally {
      setBillingPending(false);
    }
  }

  async function handlePlanSelection(planCode: string) {
    if (!session?.session_token) {
      setBillingError('Sign in with a tenant account before selecting a package.');
      return;
    }

    setSubscriptionPendingPlanCode(planCode);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const envelope = await apiV1.updateTenantSubscription(
        {
          package_code: planCode,
          mode: billing.collection.has_active_subscription ? 'activate' : 'trial',
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant package update did not return a refreshed workspace state.');
      }

      const selectedPackageLabel =
        billing.plans.find((plan) => plan.code === planCode)?.label ?? planCode;
      setBillingMessage(
        billing.collection.has_active_subscription
          ? 'Tenant package updated. Billing and onboarding have been refreshed.'
          : `Trial started on ${selectedPackageLabel}. Billing and onboarding have been refreshed.`,
      );
      await refreshTenantWorkspace(session);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Tenant package update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setBillingError(bodyMessage ?? fallbackMessage);
    } finally {
      setSubscriptionPendingPlanCode(null);
    }
  }

  async function handleMarkInvoicePaid(invoiceId: string) {
    if (!session?.session_token) {
      setBillingError('Sign in with a tenant billing account before updating invoice state.');
      return;
    }

    setInvoiceActionPendingId(invoiceId);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const envelope = await apiV1.markTenantBillingInvoicePaid(
        invoiceId,
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant invoice update did not return a refreshed workspace state.');
      }

      setBillingMessage('Invoice marked paid. Billing and onboarding have been refreshed.');
      await refreshTenantWorkspace(session);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Tenant invoice update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setBillingError(bodyMessage ?? fallbackMessage);
    } finally {
      setInvoiceActionPendingId(null);
    }
  }

  async function handleDownloadReceipt(invoiceId: string) {
    if (!session?.session_token) {
      setBillingError('Sign in with a tenant billing account before downloading receipt seams.');
      return;
    }

    setInvoiceActionPendingId(invoiceId);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const envelope = await apiV1.getTenantBillingInvoiceReceipt(
        invoiceId,
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant receipt seam could not be prepared.');
      }

      const blob = new Blob([envelope.data.text], { type: 'text/plain;charset=utf-8' });
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = envelope.data.download_filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setBillingMessage(`Receipt seam prepared for ${envelope.data.invoice_number}.`);
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Tenant receipt download failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setBillingError(bodyMessage ?? fallbackMessage);
    } finally {
      setInvoiceActionPendingId(null);
    }
  }

  async function handleInviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setTeamError('Sign in with a tenant admin account before inviting teammates.');
      return;
    }
    if (!inviteMemberForm.email.trim()) {
      setTeamError('Enter an email address before inviting a team member.');
      return;
    }

    setTeamPending(true);
    setTeamError(null);
    setTeamMessage(null);

    try {
      const envelope = await apiV1.inviteTenantTeamMember(
        {
          email: inviteMemberForm.email.trim(),
          full_name: inviteMemberForm.full_name.trim() || null,
          role: inviteMemberForm.role,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant team invite did not return a refreshed team state.');
      }

      setInviteMemberForm((current) => ({ ...current, email: '', full_name: '' }));
      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              team: envelope.data,
            }
          : current,
      );
      setTeamMessage(
        envelope.data.invite_delivery?.status === 'sent'
          ? 'Team member invited. The tenant portal invite email has been sent.'
          : 'Team member invited. SMTP is not configured, so use the generated invite link in Team.',
      );
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Tenant member invite failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setTeamError(bodyMessage ?? fallbackMessage);
    } finally {
      setTeamPending(false);
    }
  }

  async function handleUpdateMemberAccess(email: string, nextRole: string, nextStatus: string) {
    if (!session?.session_token) {
      setTeamError('Sign in with a tenant admin account before updating team access.');
      return;
    }

    setTeamPending(true);
    setTeamError(null);
    setTeamMessage(null);

    try {
      const envelope = await apiV1.updateTenantTeamMemberAccess(
        email,
        {
          role: nextRole,
          status: nextStatus,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant member access update did not return a refreshed team state.');
      }

      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              team: envelope.data,
            }
          : current,
      );
      setTeamMessage('Team access updated. Role changes now apply across the tenant workspace.');
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant member access update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setTeamError(bodyMessage ?? fallbackMessage);
    } finally {
      setTeamPending(false);
    }
  }

  async function handleResendInvite(email: string) {
    if (!session?.session_token) {
      setTeamError('Sign in with a tenant admin account before resending invites.');
      return;
    }

    setTeamPending(true);
    setTeamError(null);
    setTeamMessage(null);

    try {
      const envelope = await apiV1.resendTenantTeamInvite(
        email,
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant invite resend did not return a refreshed team state.');
      }

      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              team: envelope.data,
            }
          : current,
      );
      setTeamMessage(
        envelope.data.invite_delivery?.status === 'sent'
          ? 'Invite resent from the tenant portal.'
          : 'Invite refreshed. SMTP is not configured, so use the generated invite link in Team.',
      );
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Tenant invite resend failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setTeamError(bodyMessage ?? fallbackMessage);
    } finally {
      setTeamPending(false);
    }
  }

  async function handleIntegrationProviderUpdate(provider: string, nextStatus: string, nextSyncMode: string) {
    if (!session?.session_token) {
      setIntegrationError('Sign in with a tenant account before updating integration controls.');
      return;
    }

    setIntegrationPendingProvider(provider);
    setIntegrationError(null);
    setIntegrationMessage(null);

    try {
      const envelope = await apiV1.updateTenantIntegrationProvider(
        provider,
        {
          status: nextStatus,
          sync_mode: nextSyncMode,
        },
        {
          tenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Integration provider update did not return a refreshed tenant state.');
      }

      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              integrations: envelope.data,
            }
          : current,
      );
      setIntegrationMessage(`Integration posture saved for ${provider}.`);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Integration provider update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setIntegrationError(bodyMessage ?? fallbackMessage);
    } finally {
      setIntegrationPendingProvider(null);
    }
  }

  async function handleCatalogSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token || !selectedCatalogItem) {
      setCatalogEditError('Sign in with a tenant account before editing catalog rows.');
      return;
    }
    if (!canWriteCatalog) {
      setCatalogEditError('Your current tenant role can review catalog data but cannot edit or publish catalog rows.');
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
          currency_code: catalogEditForm.currency_code.trim() || null,
          display_price: catalogEditForm.display_price.trim() || null,
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
      setCatalogEditError('Sign in with a tenant account before changing publish state.');
      return;
    }
    if (!canWriteCatalog) {
      setCatalogEditError('Your current tenant role can review catalog data but cannot edit or publish catalog rows.');
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

  if (isGateway) {
    const gatewayOnboarding = buildGatewayOnboardingState();

    return (
      <main className="booked-admin-shell booked-page-shell text-slate-950">
        <div className="booked-page-frame booked-page-stack">
          <section className="overflow-hidden rounded-[2rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(72,123,255,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.98))] p-6 text-[var(--apple-near-black)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apple-blue)]">
                  Shared tenant gateway
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--apple-near-black)] lg:text-4xl">
                  One login portal for every tenant workspace
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/66">
                  Sign in with your tenant credentials, continue with Google, or create a brand-new
                  tenant account from one canonical entry point at `tenant.bookedai.au`.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-black/72 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-3 backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                    Entry point
                  </div>
                  <div className="mt-1 font-semibold text-[var(--apple-near-black)]">
                    tenant.bookedai.au
                  </div>
                  <div className="mt-1 text-xs text-black/54">
                    Shared sign-in and tenant registration
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-3 backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                    Release
                  </div>
                  <div className="mt-1 font-semibold text-[var(--apple-near-black)]">{releaseLabel}</div>
                  <div className="mt-1 text-xs text-black/54">Source {releaseVersion}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Gateway flow
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Sign in or create a tenant from one place
                </h2>
                <div className="mt-5 space-y-3">
                  {[
                    'Existing tenants can sign in with username/password and get routed into the correct workspace.',
                    'New tenants can create an account with password credentials or Google sign-up from this same gateway.',
                    'After authentication, BookedAI stores the session against the resolved tenant workspace and redirects automatically.',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  After sign-in
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Tenant workspace routing
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Successful authentication always lands on `/tenant/&lt;slug&gt;`, so operators
                  move from the shared gateway into their own overview, catalog, bookings,
                  integrations, and billing workspace without a second login.
                </p>
              </article>
            </div>

            <TenantAuthWorkspace
              tenantName="BookedAI Tenant Gateway"
              tenantSlug="tenant.bookedai.au"
              tenantRef={null}
              session={session}
              onboarding={gatewayOnboarding}
              authMode={authMode}
              setAuthMode={setAuthMode}
              authPending={authPending}
              authError={authError}
              importMessage={importMessage}
              passwordUsername={passwordUsername}
              setPasswordUsername={setPasswordUsername}
              passwordValue={passwordValue}
              setPasswordValue={setPasswordValue}
              createAccountForm={createAccountForm}
              setCreateAccountForm={setCreateAccountForm}
              claimAccountForm={claimAccountForm}
              setClaimAccountForm={setClaimAccountForm}
              googleEnabled={Boolean(googleClientId)}
              googleReady={googleReady}
              googleButtonSlot={<div ref={googleButtonRef} />}
              onPromptGoogle={() => window.google?.accounts.id.prompt()}
              onPasswordSignIn={handlePasswordSignIn}
              onCreateAccount={handleCreateAccount}
              onClaimAccount={handleClaimAccount}
              tenantChoices={tenantChoices}
              onSelectTenantChoice={handleTenantChoiceSelection}
              onSignOut={handleSignOut}
              inviteContext={inviteContext}
            />
          </section>
        </div>
      </main>
    );
  }

  if (state.status === 'loading') {
    return (
      <main className="booked-runtime-shell booked-page-shell">
        <div className="booked-page-frame">
          <div className="booked-runtime-card">
          <div className="booked-runtime-eyebrow text-[var(--apple-blue)]">
            Tenant runtime
          </div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-[var(--apple-near-black)]">
            Loading tenant workspace
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
            Search-ready catalog, bookings, and integration visibility are being prepared for this
            tenant.
          </p>
          </div>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="booked-runtime-shell booked-page-shell">
        <div className="booked-page-frame">
          <div className="booked-runtime-card max-w-4xl border border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,247,247,0.98)_100%)] text-[var(--apple-near-black)]">
          <div className="booked-runtime-eyebrow text-rose-600">Tenant runtime</div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-[var(--apple-near-black)]">
            Tenant workspace needs attention
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
            {state.message}
          </p>
          </div>
        </div>
      </main>
    );
  }

  const { overview, bookings, integrations, billing, onboarding, team, catalog } = state;
  const selectionService = selectedCatalogItem ? toBookingReadyServiceItem(selectedCatalogItem) : null;
  const tenantMembershipRole = session?.membership?.role?.toLowerCase() ?? null;
  const canWriteCatalog = !!session?.session_token && (
    tenantMembershipRole === 'tenant_admin' || tenantMembershipRole === 'operator'
  );
  const roleFirstLoginHint = inviteContext?.role ?? tenantMembershipRole;

  return (
    <main className="booked-admin-shell booked-page-shell text-slate-950">
      <div className="booked-page-frame booked-page-stack">
        <section className="overflow-hidden rounded-[2rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(72,123,255,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.98))] p-6 text-[var(--apple-near-black)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apple-blue)]">
                Tenant search workspace
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--apple-near-black)] lg:text-4xl">
                {overview.tenant.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/66">
                Search, shortlist, booking data, and AI-assisted catalog import now live in one
                operator surface. Public discovery and tenant curation use the same result language,
                so services stay consistent from search to booking.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-black/72 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                  Runtime mode
                </div>
                <div className="mt-1 font-semibold text-[var(--apple-near-black)]">{overview.shell.current_role}</div>
                <div className="mt-1 text-xs text-black/54">
                  {overview.shell.read_only ? 'Preview access' : 'Live access'} • {overview.shell.deployment_mode}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                  Release
                </div>
                <div className="mt-1 font-semibold text-[var(--apple-near-black)]">{releaseLabel}</div>
                <div className="mt-1 text-xs text-black/54">Source {releaseVersion}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-black/62">
            <span className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5">
              Tenant: {overview.tenant.slug}
            </span>
            <span className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5">
              Status: {overview.tenant.status ?? 'unknown'}
            </span>
            <span className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5">
              Timezone: {overview.tenant.timezone ?? 'n/a'}
            </span>
            <span className="rounded-full border border-black/6 bg-white/72 px-3 py-1.5">
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
                { key: 'billing', label: 'Billing' },
                { key: 'team', label: 'Team' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPanel(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    panel === item.key
                      ? 'bg-[var(--apple-near-black)] text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]'
                      : 'border border-black/6 bg-white/72 text-black/72 hover:bg-white'
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
                    className="rounded-full border border-black/6 bg-white/72 px-4 py-2 text-sm font-semibold text-black/74 transition hover:bg-white"
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
                  <ShieldIcon className="h-4 w-4" />
                  Open tenant sign-in
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

              {revenueMetrics && (
                <article className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                        AI Revenue Engine · Last {revenueMetrics.period_days} days
                      </div>
                      <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
                        Revenue Capture
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">
                        {revenueMetrics.capture_rate_pct}% captured
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[1.2rem] border border-emerald-100 bg-white px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Bookings confirmed
                      </div>
                      <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                        {revenueMetrics.bookings_confirmed}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        of {revenueMetrics.sessions_started} sessions
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-emerald-100 bg-white px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Revenue captured
                      </div>
                      <div className="mt-1.5 text-3xl font-semibold tracking-tight text-emerald-700">
                        ${revenueMetrics.total_revenue_aud.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">AUD</div>
                    </div>
                    <div className="rounded-[1.2rem] border border-rose-100 bg-white px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-500">
                        Missed revenue
                      </div>
                      <div className="mt-1.5 text-3xl font-semibold tracking-tight text-rose-600">
                        ${revenueMetrics.missed_revenue_aud.toLocaleString('en-AU', { minimumFractionDigits: 0 })}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {revenueMetrics.missed_sessions} sessions lost
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-slate-100 bg-white px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Avg booking value
                      </div>
                      <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                        ${revenueMetrics.avg_booking_value_aud.toFixed(0)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">per booking</div>
                    </div>
                  </div>

                  {revenueMetrics.missed_revenue_aud > 0 && (
                    <div className="mt-4 rounded-[1rem] border border-rose-100 bg-rose-50 px-4 py-3">
                      <p className="text-xs text-rose-700">
                        <span className="font-semibold">
                          ${revenueMetrics.missed_revenue_aud.toLocaleString('en-AU', { minimumFractionDigits: 0 })} in potential revenue
                        </span>{' '}
                        walked away from {revenueMetrics.missed_sessions} incomplete sessions this month.
                        Improving your catalog completeness and response speed recovers this.
                      </p>
                    </div>
                  )}
                </article>
              )}

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

              <TenantOnboardingStatusCard onboarding={onboarding} />

              <TenantBusinessProfileCard
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                profilePending={profilePending}
                profileError={profileError}
                profileMessage={profileMessage}
                onSubmit={handleProfileSave}
              />

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
                    Tenant sign-in unlocks write access so imported fields can safely become part
                    of the tenant catalog used by public search and booking flows.
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
              <TenantAuthWorkspace
                tenantName={overview.tenant.name}
                tenantSlug={overview.tenant.slug}
                tenantRef={tenantRef}
                session={session}
                onboarding={onboarding}
                authMode={authMode}
                setAuthMode={setAuthMode}
                authPending={authPending}
                authError={authError}
                importMessage={importMessage}
                passwordUsername={passwordUsername}
                setPasswordUsername={setPasswordUsername}
                passwordValue={passwordValue}
                setPasswordValue={setPasswordValue}
                createAccountForm={createAccountForm}
                setCreateAccountForm={setCreateAccountForm}
                claimAccountForm={claimAccountForm}
                setClaimAccountForm={setClaimAccountForm}
                googleEnabled={Boolean(googleClientId)}
                googleReady={googleReady}
                googleButtonSlot={<div ref={googleButtonRef} />}
              onPromptGoogle={() => window.google?.accounts.id.prompt()}
              onPasswordSignIn={handlePasswordSignIn}
              onCreateAccount={handleCreateAccount}
              onClaimAccount={handleClaimAccount}
              tenantChoices={tenantChoices}
              onSelectTenantChoice={handleTenantChoiceSelection}
              onSignOut={handleSignOut}
              inviteContext={inviteContext}
            />

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
                  {session && !canWriteCatalog ? (
                    <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Your current role can review the tenant catalog, but only tenant admins and operators can import or publish catalog changes.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={importPending || !session || !canWriteCatalog}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
                      importPending || !session || !canWriteCatalog
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
                      {formatCatalogPrice({
                        amount: selectedCatalogItem.amount_aud,
                        currencyCode: selectedCatalogItem.currency_code,
                        displayPrice: selectedCatalogItem.display_price,
                      })}
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
                          Numeric price
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
                          Currency code
                        </div>
                        <input
                          value={catalogEditForm.currency_code}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, currency_code: event.target.value.toUpperCase() }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Display price
                        </div>
                        <input
                          value={catalogEditForm.display_price}
                          onChange={(event) =>
                            setCatalogEditForm((current) => ({ ...current, display_price: event.target.value }))
                          }
                          className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                          placeholder="260,000 VND / student / session"
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
                        disabled={catalogEditPending || catalogActionPending || !session || !canWriteCatalog}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session || !canWriteCatalog
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-slate-950 text-white'
                        }`}
                      >
                        {catalogEditPending ? 'Saving...' : 'Save draft'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogEditPending || catalogActionPending || !session || !canWriteCatalog}
                        onClick={() => void runCatalogStateAction('publish')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session || !canWriteCatalog
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {catalogActionPending ? 'Working...' : 'Publish to search'}
                      </button>
                      <button
                        type="button"
                        disabled={catalogEditPending || catalogActionPending || !session || !canWriteCatalog}
                        onClick={() => void runCatalogStateAction('archive')}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                          catalogEditPending || catalogActionPending || !session || !canWriteCatalog
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
                  Access posture
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Integration controls
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {integrations.access?.operator_note
                    || 'Integration monitoring is available here, while provider configuration changes remain admin-managed release controls.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    Role {String(roleFirstLoginHint || integrations.access?.current_role || 'tenant_preview').replace(/_/g, ' ')}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    Write mode {integrations.access?.write_mode?.replace(/_/g, ' ') || 'read only'}
                  </span>
                </div>
                {integrationError ? (
                  <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {integrationError}
                  </div>
                ) : null}
                {integrationMessage ? (
                  <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {integrationMessage}
                  </div>
                ) : null}
              </article>

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
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Provider status
                          </div>
                          <select
                            value={provider.status}
                            disabled={!integrations.access?.can_manage_integrations || integrationPendingProvider === provider.provider}
                            onChange={(event) =>
                              void handleIntegrationProviderUpdate(provider.provider, event.target.value, provider.sync_mode)
                            }
                            className="booked-form-input"
                          >
                            {(integrations.controls?.available_statuses || ['connected', 'paused']).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Sync mode
                          </div>
                          <select
                            value={provider.sync_mode}
                            disabled={!integrations.access?.can_manage_integrations || integrationPendingProvider === provider.provider}
                            onChange={(event) =>
                              void handleIntegrationProviderUpdate(provider.provider, provider.status, event.target.value)
                            }
                            className="booked-form-input"
                          >
                            {(integrations.controls?.available_sync_modes || ['read_only', 'write_back', 'bidirectional']).map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </label>
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

        {panel === 'billing' ? (
          <TenantBillingWorkspace
            billing={billing}
            sessionReady={!!session?.session_token}
            accountForm={billingAccountForm}
            setAccountForm={setBillingAccountForm}
            billingPending={billingPending}
            billingError={billingError}
            billingMessage={billingMessage}
            subscriptionPendingPlanCode={subscriptionPendingPlanCode}
            invoiceActionPendingId={invoiceActionPendingId}
            onSaveBillingAccount={handleBillingAccountSave}
            onSelectPlan={handlePlanSelection}
            onMarkInvoicePaid={handleMarkInvoicePaid}
            onDownloadReceipt={handleDownloadReceipt}
          />
        ) : null}

        {panel === 'team' ? (
          <TenantTeamWorkspace
            team={team}
            inviteForm={inviteMemberForm}
            setInviteForm={setInviteMemberForm}
            teamPending={teamPending}
            teamMessage={teamMessage}
            teamError={teamError}
            onInviteMember={handleInviteMember}
            onResendInvite={handleResendInvite}
            onUpdateMemberAccess={handleUpdateMemberAccess}
          />
        ) : null}
      </div>
    </main>
  );
}
