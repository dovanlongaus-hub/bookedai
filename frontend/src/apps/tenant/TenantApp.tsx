import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import { apiV1 } from '../../shared/api/v1';
import type {
  TenantAuthSessionResponse,
  TenantBillingResponse,
  TenantBookingsResponse,
  TenantCatalogCreateRequest,
  TenantCatalogImportRequest,
  TenantCatalogItem,
  TenantCatalogResponse,
  TenantIntegrationsResponse,
  TenantOnboardingResponse,
  TenantOverviewRecentBooking,
  TenantOverviewPriority,
  TenantOverviewResponse,
  TenantPluginInterfaceResponse,
  TenantRevenueMetrics,
  TenantTeamResponse,
} from '../../shared/contracts';
import { releaseLabel, releaseVersion } from '../../shared/config/release';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import {
  TenantAuthWorkspaceEmail,
  type TenantEmailCodeDeliveryState,
  type TenantAuthMode,
  type TenantClaimAccountFormState,
  type TenantCreateAccountFormState,
} from '../../features/tenant-auth/TenantAuthWorkspaceEmail';
import {
  TenantBusinessProfileCard,
  type TenantBusinessProfileFormState,
} from '../../features/tenant-onboarding/TenantBusinessProfileCard';
import { TenantOnboardingStatusCard } from '../../features/tenant-onboarding/TenantOnboardingStatusCard';
import { TenantActivationChecklistCard } from '../../features/tenant-onboarding/TenantActivationChecklistCard';
import { deriveTenantActivationState } from '../../features/tenant-onboarding/tenantActivation';
import {
  TenantBillingWorkspace,
  type TenantBillingAccountFormState,
} from '../../features/tenant-billing/TenantBillingWorkspace';
import {
  TenantTeamWorkspace,
  type TenantInviteMemberFormState,
} from '../../features/tenant-team/TenantTeamWorkspace';
import {
  TenantPluginWorkspace,
  type TenantPluginFormState,
} from '../../features/tenant-plugin/TenantPluginWorkspace';
import { TenantSectionActivityCard } from '../../features/tenant-shared/TenantSectionActivityCard';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';
import { getApiBaseUrl } from '../../shared/config/api';

type TenantPanel = 'overview' | 'experience' | 'catalog' | 'plugin' | 'bookings' | 'integrations' | 'billing' | 'team';
type CatalogStatusFilter = 'all' | 'search-ready' | 'needs-review' | 'inactive';

type TenantLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      overview: TenantOverviewResponse;
      bookings: TenantBookingsResponse;
      plugin: TenantPluginInterfaceResponse;
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

type AdminReturnContext = {
  investigationHref: string;
  scopeHref: string | null;
  scopeLabel: string;
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
const GOOGLE_TENANT_AUTH_CONFIG_MESSAGE =
  'Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment and `GOOGLE_OAUTH_CLIENT_ID` in the backend to enable tenant Google login.';

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
    || hash === 'experience'
    || hash === 'plugin'
    || hash === 'integrations'
    || hash === 'billing'
    || hash === 'team'
  ) {
    return hash;
  }

  return 'overview';
}

function resolveAdminReturnContext(tenantSlug: string | null): AdminReturnContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get('admin_return') !== '1') {
    return null;
  }

  const scope = url.searchParams.get('admin_scope')?.trim() || '';
  const scopeLabel = url.searchParams.get('admin_scope_label')?.trim() || 'Admin workspace';
  const safeScopeHref = scope.startsWith('/admin') ? scope : null;
  const investigationHref = tenantSlug
    ? `/admin/tenants?tenant=${encodeURIComponent(tenantSlug)}`
    : '/admin/tenants';

  return {
    investigationHref,
    scopeHref: safeScopeHref,
    scopeLabel,
  };
}

function resolveGoogleButtonText(authMode: TenantAuthMode): 'signin_with' | 'signup_with' | 'continue_with' {
  if (authMode === 'create') {
    return 'signup_with';
  }
  if (authMode === 'claim') {
    return 'continue_with';
  }
  return 'signin_with';
}

function syncPanelHash(panel: TenantPanel) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = panel === 'overview' ? '' : panel;
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function stripHtmlPreview(value: string | null | undefined) {
  return (value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function formatAud(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function deriveBookingSignalLabel(booking: TenantOverviewRecentBooking) {
  const status = (booking.status || '').toLowerCase();
  const paymentState = (booking.payment_dependency_state || '').toLowerCase();

  if (paymentState.includes('follow_up')) {
    return 'Payment follow-up';
  }
  if (paymentState.includes('checkout_ready')) {
    return 'Checkout ready';
  }
  if (['confirmed', 'scheduled', 'active', 'captured', 'completed', 'paid'].includes(status)) {
    return 'Confirmed bookings';
  }
  if (['pending_confirmation', 'pending', 'unverified'].includes(status)) {
    return 'Pending confirmation';
  }
  if (status) {
    return status.replace(/_/g, ' ');
  }
  return 'Unclassified activity';
}

function deriveSourceContribution(overview: TenantOverviewResponse) {
  const sourceBuckets = new Map<string, number>();
  for (const booking of overview.recent_bookings) {
    const key = deriveBookingSignalLabel(booking);
    sourceBuckets.set(key, (sourceBuckets.get(key) ?? 0) + 1);
  }
  return Array.from(sourceBuckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function derivePaidRevenueAud(billing: TenantBillingResponse, revenueMetrics: TenantRevenueMetrics | null) {
  if (revenueMetrics) {
    return revenueMetrics.total_revenue_aud;
  }
  return billing.invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount_aud, 0);
}

function deriveOutstandingRevenueAud(billing: TenantBillingResponse) {
  return billing.invoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + invoice.amount_aud, 0);
}

function buildRevenueProofNarrative(
  overview: TenantOverviewResponse,
  billing: TenantBillingResponse,
  revenueMetrics: TenantRevenueMetrics | null,
) {
  const openInvoices = billing.invoice_summary.open_invoices;
  const paidInvoices = billing.invoice_summary.paid_invoices;
  const attentionCount = overview.integration_snapshot.attention_count + overview.summary.lifecycle_attention_count;
  const paidRevenueAud = derivePaidRevenueAud(billing, revenueMetrics);

  if (!revenueMetrics && paidRevenueAud <= 0 && openInvoices <= 0) {
    return 'BookedAI is still collecting enough tenant activity to generate a stronger monthly value story. Finish activation, billing, and publish posture first.';
  }

  return `BookedAI helped capture ${revenueMetrics?.sessions_started ?? overview.recent_bookings.length} sessions, convert ${revenueMetrics?.bookings_confirmed ?? overview.recent_bookings.length} bookings, and surface ${formatAud(paidRevenueAud)} in revenue${revenueMetrics ? ` over the last ${revenueMetrics.period_days} days` : ' from the current tenant billing and booking posture'}. ${openInvoices > 0 ? `${openInvoices} invoice item(s) still need follow-up. ` : ''}${paidInvoices > 0 ? `${paidInvoices} invoice item(s) are already marked paid. ` : ''}${attentionCount > 0 ? `${attentionCount} operational attention signal(s) still need review.` : 'Operational attention signals are currently under control.'}`;
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
        label: 'Open a new tenant workspace',
        status: 'pending',
        description: 'Start from the shared gateway and let Google or password setup create the workspace owner path.',
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
      'Sign in to an existing tenant or open a new workspace from this shared gateway.',
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

function roleLabel(value: string | null | undefined) {
  return (value || 'tenant_preview')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildTenantPermissionMatrix() {
  return [
    {
      capability: 'Experience studio',
      detail: 'Edit tenant branding, hero image, HTML introduction, and section guidance.',
      roles: ['tenant_admin', 'operator'],
    },
    {
      capability: 'Catalog import and draft edits',
      detail: 'Create new draft services, run website import, edit draft fields, and publish search-ready rows.',
      roles: ['tenant_admin', 'operator'],
    },
    {
      capability: 'Plugin and integrations',
      detail: 'Update widget configuration and provider posture from the tenant workspace.',
      roles: ['tenant_admin', 'operator'],
    },
    {
      capability: 'Billing controls',
      detail: 'Manage billing email, plan controls, and finance-facing Stripe actions.',
      roles: ['tenant_admin', 'finance_manager'],
    },
    {
      capability: 'Team administration',
      detail: 'Invite members, change roles, and control workspace access.',
      roles: ['tenant_admin'],
    },
    {
      capability: 'Workspace visibility',
      detail: 'Review overview, bookings, catalog state, and workspace guidance.',
      roles: ['tenant_admin', 'operator', 'finance_manager'],
    },
  ];
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
  const googleInitializedRef = useRef(false);
  const googleAuthContextRef = useRef({
    authMode: 'sign-in' as TenantAuthMode,
    businessName: '',
    industry: '',
    isGateway: false,
    tenantRef: null as string | null,
  });
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
  const [emailSignInValue, setEmailSignInValue] = useState('');
  const [emailCodeValue, setEmailCodeValue] = useState('');
  const [emailCodeDelivery, setEmailCodeDelivery] = useState<TenantEmailCodeDeliveryState | null>(null);
  const [createAccountForm, setCreateAccountForm] = useState<TenantCreateAccountFormState>({
    business_name: '',
    full_name: '',
    email: '',
    industry: '',
  });
  const [claimAccountForm, setClaimAccountForm] = useState<TenantClaimAccountFormState>({
    full_name: inviteContext?.full_name || '',
    email: inviteContext?.email || '',
  });
  const [profileForm, setProfileForm] = useState<TenantBusinessProfileFormState>({
    business_name: '',
    industry: '',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    operator_full_name: '',
    logo_url: '',
    hero_image_url: '',
    introduction_html: '',
    guide_overview: '',
    guide_experience: '',
    guide_catalog: '',
    guide_plugin: '',
    guide_bookings: '',
    guide_integrations: '',
    guide_billing: '',
    guide_team: '',
  });
  const [profilePending, setProfilePending] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploadingProfileAsset, setUploadingProfileAsset] = useState<'logo' | 'hero' | null>(null);
  const [pluginForm, setPluginForm] = useState<TenantPluginFormState>({
    partner_name: '',
    partner_website_url: '',
    bookedai_host: 'https://product.bookedai.au',
    embed_path: '',
    widget_script_path: '/partner-plugins/ai-mentor-pro-widget.js',
    tenant_ref: '',
    widget_id: '',
    accent_color: '#1f7a6b',
    button_label: '',
    modal_title: '',
    headline: '',
    prompt: '',
    inline_target_selector: '#bookedai-partner-widget',
    support_email: '',
    support_whatsapp: '',
    logo_url: '',
  });
  const [pluginPending, setPluginPending] = useState(false);
  const [pluginMessage, setPluginMessage] = useState<string | null>(null);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [copiedSnippetKey, setCopiedSnippetKey] = useState<string | null>(null);
  const [billingAccountForm, setBillingAccountForm] = useState<TenantBillingAccountFormState>({
    billing_email: '',
    merchant_mode: 'test',
  });
  const [billingPending, setBillingPending] = useState(false);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscriptionPendingPlanCode, setSubscriptionPendingPlanCode] = useState<string | null>(null);
  const [billingPortalPending, setBillingPortalPending] = useState(false);
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
  const [catalogCreatePending, setCatalogCreatePending] = useState(false);
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
  const tenantMembershipRole = session?.membership?.role?.toLowerCase() ?? null;
  const scopedTenantRef = session?.membership?.tenant_slug ?? session?.tenant?.slug ?? tenantRef;
  const adminReturnContext = useMemo(() => resolveAdminReturnContext(scopedTenantRef), [scopedTenantRef]);
  const canWriteCatalog = !!session?.session_token && (
    tenantMembershipRole === 'tenant_admin' || tenantMembershipRole === 'operator'
  );
  const canManageExperience = !!session?.session_token && (
    tenantMembershipRole === 'tenant_admin' || tenantMembershipRole === 'operator'
  );
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
      const nextTenantRef = scopedTenantRef;
      try {
        const [overviewEnvelope, bookingsEnvelope, pluginEnvelope, integrationsEnvelope, billingEnvelope, onboardingEnvelope, teamEnvelope, catalogEnvelope] =
          await Promise.all([
            apiV1.getTenantOverview(nextTenantRef),
            apiV1.getTenantBookings(nextTenantRef),
            apiV1.getTenantPluginInterface(nextTenantRef, session?.session_token ?? null),
            apiV1.getTenantIntegrations(nextTenantRef, session?.session_token ?? null),
            apiV1.getTenantBilling(nextTenantRef, session?.session_token ?? null),
            apiV1.getTenantOnboarding(nextTenantRef, session?.session_token ?? null),
            apiV1.getTenantTeam(nextTenantRef, session?.session_token ?? null),
            apiV1.getTenantCatalog(nextTenantRef, session?.session_token ?? null),
          ]);

        if (cancelled) {
          return;
        }

        if (
          overviewEnvelope.status !== 'ok' ||
          bookingsEnvelope.status !== 'ok' ||
          pluginEnvelope.status !== 'ok' ||
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
          plugin: pluginEnvelope.data,
          integrations: integrationsEnvelope.data,
          billing: billingEnvelope.data,
          onboarding: onboardingEnvelope.data,
          team: teamEnvelope.data,
          catalog: catalogEnvelope.data,
        });

        apiV1
          .getTenantRevenueMetrics(nextTenantRef, session?.session_token ?? null)
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
          logo_url: overviewEnvelope.data.workspace.logo_url || current.logo_url,
          hero_image_url: overviewEnvelope.data.workspace.hero_image_url || current.hero_image_url,
          introduction_html: overviewEnvelope.data.workspace.introduction_html || current.introduction_html,
          guide_overview: overviewEnvelope.data.workspace.guides.overview || current.guide_overview,
          guide_experience: overviewEnvelope.data.workspace.guides.experience || current.guide_experience,
          guide_catalog: overviewEnvelope.data.workspace.guides.catalog || current.guide_catalog,
          guide_plugin: overviewEnvelope.data.workspace.guides.plugin || current.guide_plugin,
          guide_bookings: overviewEnvelope.data.workspace.guides.bookings || current.guide_bookings,
          guide_integrations: overviewEnvelope.data.workspace.guides.integrations || current.guide_integrations,
          guide_billing: overviewEnvelope.data.workspace.guides.billing || current.guide_billing,
          guide_team: overviewEnvelope.data.workspace.guides.team || current.guide_team,
        }));
        setImportForm((current) => ({
          ...current,
          business_name: current.business_name || overviewEnvelope.data.tenant.name || '',
          business_email: current.business_email || session?.user.email || '',
        }));
        setPluginForm({
          partner_name: pluginEnvelope.data.experience.partner_name || '',
          partner_website_url: pluginEnvelope.data.experience.partner_website_url || '',
          bookedai_host: pluginEnvelope.data.experience.bookedai_host || 'https://product.bookedai.au',
          embed_path: pluginEnvelope.data.experience.embed_path || '',
          widget_script_path: pluginEnvelope.data.experience.widget_script_path || '',
          tenant_ref: pluginEnvelope.data.experience.tenant_ref || '',
          widget_id: pluginEnvelope.data.experience.widget_id || '',
          accent_color: pluginEnvelope.data.experience.accent_color || '#1f7a6b',
          button_label: pluginEnvelope.data.experience.button_label || '',
          modal_title: pluginEnvelope.data.experience.modal_title || '',
          headline: pluginEnvelope.data.experience.headline || '',
          prompt: pluginEnvelope.data.experience.prompt || '',
          inline_target_selector: pluginEnvelope.data.experience.inline_target_selector || '#bookedai-partner-widget',
          support_email: pluginEnvelope.data.experience.support_email || '',
          support_whatsapp: pluginEnvelope.data.experience.support_whatsapp || '',
          logo_url: pluginEnvelope.data.experience.logo_url || '',
        });
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
  }, [isGateway, scopedTenantRef, session?.session_token, session?.user.email]);

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

    if (!googleInitializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          const authContext = googleAuthContextRef.current;
          const idToken = response.credential?.trim();
          if (!idToken) {
            setAuthError('Google sign-in did not return a usable credential.');
            return;
          }

          setAuthPending(true);
          setAuthError(null);
          setTenantChoices([]);
          setLastGoogleCredential(idToken);

          const googleAuthIntent = authContext.tenantRef
            ? authContext.authMode === 'claim'
              ? 'create'
              : 'sign-in'
            : 'create';

          void apiV1
            .tenantGoogleAuth({
              id_token: idToken,
              tenant_ref: authContext.tenantRef,
              auth_intent: googleAuthIntent,
              business_name: authContext.isGateway ? authContext.businessName : null,
              industry: authContext.isGateway ? authContext.industry || null : null,
            })
            .then((envelope) => {
              if (envelope.status !== 'ok') {
                throw new Error('Tenant authentication could not be established.');
              }

              return completeTenantAuth(
                envelope.data,
                authContext.isGateway
                  ? 'Google account connected. Redirecting into your tenant workspace now.'
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
      googleInitializedRef.current = true;
    }

    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: resolveGoogleButtonText(authMode),
      width: 280,
    });
  }, [
    authMode,
    createAccountForm.business_name,
    createAccountForm.industry,
    googleClientId,
    googleReady,
  ]);

  useEffect(() => {
    googleAuthContextRef.current = {
      authMode,
      businessName: createAccountForm.business_name.trim(),
      industry: createAccountForm.industry.trim(),
      isGateway,
      tenantRef,
    };
  }, [
    authMode,
    createAccountForm.business_name,
    createAccountForm.industry,
    isGateway,
    tenantRef,
  ]);

  function handleAuthModeChange(nextAuthMode: TenantAuthMode | ((current: TenantAuthMode) => TenantAuthMode)) {
    setAuthMode((current) => {
      const resolvedMode =
        typeof nextAuthMode === 'function' ? nextAuthMode(current) : nextAuthMode;
      if (resolvedMode !== current) {
        setAuthError(null);
        setTenantChoices([]);
        setLastGoogleCredential(null);
        setEmailCodeDelivery(null);
        setEmailCodeValue('');
      }
      return resolvedMode;
    });
  }

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
    const nextTenantRef =
      nextSession?.membership?.tenant_slug
      ?? nextSession?.tenant?.slug
      ?? tenantRef;
    const [overviewEnvelope, bookingsEnvelope, pluginEnvelope, integrationsEnvelope, billingEnvelope, onboardingEnvelope, teamEnvelope, catalogEnvelope] = await Promise.all([
      apiV1.getTenantOverview(nextTenantRef),
      apiV1.getTenantBookings(nextTenantRef),
      apiV1.getTenantPluginInterface(nextTenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantIntegrations(nextTenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantBilling(nextTenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantOnboarding(nextTenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantTeam(nextTenantRef, nextSession?.session_token ?? null),
      apiV1.getTenantCatalog(nextTenantRef, nextSession?.session_token ?? null),
    ]);

    if (
      overviewEnvelope.status !== 'ok' ||
      bookingsEnvelope.status !== 'ok' ||
      pluginEnvelope.status !== 'ok' ||
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
      plugin: pluginEnvelope.data,
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
    setEmailCodeDelivery(null);
    setEmailCodeValue('');
    setAuthError(null);
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

  function handlePromptGoogle() {
    setAuthError(null);
    if (!googleClientId) {
      setAuthError(GOOGLE_TENANT_AUTH_CONFIG_MESSAGE);
      return;
    }
    if (!googleReady || !window.google?.accounts.id) {
      setAuthError('Google sign-in is still loading. Please try again in a moment.');
      return;
    }
    window.google.accounts.id.prompt();
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
          tenantRef: scopedTenantRef,
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
    setTenantChoices([]);
    setLastGoogleCredential(null);
    setEmailCodeDelivery(null);
    setEmailCodeValue('');
    setImportMessage('Tenant session cleared. Preview remains available, but AI import is locked.');
    if (!isGateway) {
      void refreshTenantWorkspace(null).catch(() => {
        // Keep current state if preview refresh fails after sign-out.
      });
    }
  }

  async function handleRequestEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestEmail =
      authMode === 'create'
        ? createAccountForm.email.trim()
        : authMode === 'claim'
          ? claimAccountForm.email.trim()
          : emailSignInValue.trim();
    if (!requestEmail) {
      setAuthError('Enter the tenant email before requesting a verification code.');
      return;
    }
    if (authMode === 'create' && !createAccountForm.business_name.trim()) {
      setAuthError('Enter the business name before requesting the setup code.');
      return;
    }
    if (authMode === 'claim' && !tenantRef) {
      setAuthError('Open the tenant workspace first before accepting the invite.');
      return;
    }
    setAuthPending(true);
    setAuthError(null);
    setEmailCodeValue('');

    try {
      const envelope = await apiV1.tenantEmailCodeRequest({
        email: requestEmail,
        tenant_ref: tenantRef,
        auth_intent: authMode,
        business_name: authMode === 'create' ? createAccountForm.business_name.trim() || null : null,
        full_name:
          authMode === 'create'
            ? createAccountForm.full_name.trim() || null
            : authMode === 'claim'
              ? claimAccountForm.full_name.trim() || null
              : null,
        industry: authMode === 'create' ? createAccountForm.industry.trim() || null : null,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant verification code could not be requested.');
      }

      setEmailCodeDelivery({
        email: envelope.data.email,
        auth_intent: envelope.data.auth_intent,
        tenant_slug: envelope.data.tenant_slug,
        tenant_name: envelope.data.tenant_name,
        code_last4: envelope.data.delivery.code_last4,
        expires_in_minutes: envelope.data.delivery.expires_in_minutes,
        operator_note: envelope.data.delivery.operator_note,
      });
      setImportMessage(
        authMode === 'create'
          ? 'Setup code sent. Verify it to create the tenant workspace.'
          : authMode === 'claim'
            ? 'Invite code sent. Verify it to activate tenant access.'
            : 'Login code sent. Verify it to continue into the tenant workspace.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant email-code request failed.';
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

  async function handleVerifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestEmail =
      authMode === 'create'
        ? createAccountForm.email.trim()
        : authMode === 'claim'
          ? claimAccountForm.email.trim()
          : emailSignInValue.trim();
    if (!requestEmail || !emailCodeValue.trim()) {
      setAuthError('Enter the tenant email and the verification code.');
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    try {
      const envelope = await apiV1.tenantEmailCodeVerify({
        email: requestEmail,
        code: emailCodeValue.trim(),
        tenant_ref: tenantRef,
        auth_intent: authMode,
        business_name: authMode === 'create' ? createAccountForm.business_name.trim() || null : null,
        full_name:
          authMode === 'create'
            ? createAccountForm.full_name.trim() || null
            : authMode === 'claim'
              ? claimAccountForm.full_name.trim() || null
              : null,
        industry: authMode === 'create' ? createAccountForm.industry.trim() || null : null,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant verification could not be completed.');
      }

      setEmailCodeValue('');
      setEmailCodeDelivery(null);
      await completeTenantAuth(
        envelope.data,
        authMode === 'create'
          ? 'Tenant account created. Redirecting into your workspace now.'
          : authMode === 'claim'
            ? 'Tenant workspace claimed. Write access is now enabled for this tenant.'
            : isGateway
              ? 'Tenant account connected. Redirecting to your tenant workspace now.'
              : 'Tenant account connected. Catalog import and tenant write access are now enabled.',
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant email-code verification failed.';
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
    if (!canManageExperience) {
      setProfileError('Only tenant admins and operators can update tenant branding, introduction HTML, or workspace guidance.');
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
          logo_url: profileForm.logo_url.trim() || null,
          hero_image_url: profileForm.hero_image_url.trim() || null,
          introduction_html: profileForm.introduction_html.trim() || null,
          guide_overview: profileForm.guide_overview.trim() || null,
          guide_experience: profileForm.guide_experience.trim() || null,
          guide_catalog: profileForm.guide_catalog.trim() || null,
          guide_plugin: profileForm.guide_plugin.trim() || null,
          guide_bookings: profileForm.guide_bookings.trim() || null,
          guide_integrations: profileForm.guide_integrations.trim() || null,
          guide_billing: profileForm.guide_billing.trim() || null,
          guide_team: profileForm.guide_team.trim() || null,
        },
        {
          tenantRef: scopedTenantRef,
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

  async function handleProfileAssetUpload(kind: 'logo' | 'hero', file: File) {
    if (!canManageExperience) {
      setProfileError('Only tenant admins and operators can upload tenant branding assets.');
      return;
    }

    setUploadingProfileAsset(kind);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${getApiBaseUrl()}/uploads/images`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as { url?: string; detail?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.detail || 'Image upload failed.');
      }

      setProfileForm((current) => ({
        ...current,
        logo_url: kind === 'logo' ? payload.url || '' : current.logo_url,
        hero_image_url: kind === 'hero' ? payload.url || '' : current.hero_image_url,
      }));
      setProfileMessage(kind === 'logo' ? 'Logo uploaded. Save to persist the workspace profile.' : 'Hero image uploaded. Save to persist the workspace profile.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploadingProfileAsset(null);
    }
  }

  async function handlePluginSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.session_token) {
      setPluginError('Sign in with a tenant account before updating plugin interface settings.');
      return;
    }

    setPluginPending(true);
    setPluginError(null);
    setPluginMessage(null);

    try {
      const envelope = await apiV1.updateTenantPluginInterface(
        {
          partner_name: pluginForm.partner_name.trim() || null,
          partner_website_url: pluginForm.partner_website_url.trim() || null,
          bookedai_host: pluginForm.bookedai_host.trim() || null,
          embed_path: pluginForm.embed_path.trim() || null,
          widget_script_path: pluginForm.widget_script_path.trim() || null,
          tenant_ref: scopedTenantRef || pluginForm.tenant_ref.trim() || null,
          widget_id: pluginForm.widget_id.trim() || null,
          accent_color: pluginForm.accent_color.trim() || null,
          button_label: pluginForm.button_label.trim() || null,
          modal_title: pluginForm.modal_title.trim() || null,
          headline: pluginForm.headline.trim() || null,
          prompt: pluginForm.prompt.trim() || null,
          inline_target_selector: pluginForm.inline_target_selector.trim() || null,
          support_email: pluginForm.support_email.trim() || null,
          support_whatsapp: pluginForm.support_whatsapp.trim() || null,
          logo_url: pluginForm.logo_url.trim() || null,
        },
        {
          tenantRef: scopedTenantRef,
          sessionToken: session.session_token,
        },
      );

      if (envelope.status !== 'ok') {
        throw new Error('Tenant plugin interface did not return a refreshed state.');
      }

      setState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              plugin: envelope.data,
            }
          : current,
      );
      setPluginMessage('Partner plugin settings saved. Copy snippets below to update the partner website.');
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Tenant plugin interface update failed.';
      const apiError = error as ApiClientError | undefined;
      const bodyMessage =
        typeof apiError?.body === 'object' &&
        apiError?.body &&
        'error' in apiError.body &&
        typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
          ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
          : null;

      setPluginError(bodyMessage ?? fallbackMessage);
    } finally {
      setPluginPending(false);
    }
  }

  function handleCopySnippet(key: string, content: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setPluginError('Clipboard access is not available in this browser.');
      return;
    }

    void navigator.clipboard.writeText(content).then(() => {
      setCopiedSnippetKey(key);
      setTimeout(() => setCopiedSnippetKey((current) => (current === key ? null : current)), 1800);
    }).catch(() => {
      setPluginError('Could not copy the snippet automatically. Select and copy it manually.');
    });
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
          tenantRef: scopedTenantRef,
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
      const nextMode: 'trial' | 'activate' = billing.collection.has_active_subscription
        ? 'activate'
        : 'trial';
      const request = {
        package_code: planCode,
        mode: nextMode,
      };
      const envelope = billing.self_serve.can_start_stripe_checkout
        ? await apiV1.createTenantBillingCheckoutSession(request, {
            tenantRef: scopedTenantRef,
            sessionToken: session.session_token,
          })
        : await apiV1.updateTenantSubscription(request, {
            tenantRef: scopedTenantRef,
            sessionToken: session.session_token,
          });

      if (envelope.status !== 'ok') {
        throw new Error('Tenant package update did not return a refreshed workspace state.');
      }

      const selectedPackageLabel =
        billing.plans.find((plan) => plan.code === planCode)?.label ?? planCode;
      if (billing.self_serve.can_start_stripe_checkout && envelope.data.checkout_url) {
        setBillingMessage(`Redirecting to Stripe Checkout for ${selectedPackageLabel}.`);
        window.location.assign(envelope.data.checkout_url);
        return;
      }
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

  async function handleOpenBillingPortal() {
    if (!session?.session_token) {
      setBillingError('Sign in with a tenant account before opening the Stripe billing portal.');
      return;
    }

    setBillingPortalPending(true);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const envelope = await apiV1.createTenantBillingPortalSession({
        tenantRef: scopedTenantRef,
        sessionToken: session.session_token,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Stripe billing portal did not return a usable redirect.');
      }

      if (!envelope.data.portal_url) {
        throw new Error('Stripe billing portal did not return a usable redirect.');
      }

      setBillingMessage('Opening Stripe billing portal...');
      window.location.assign(envelope.data.portal_url);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Stripe billing portal could not be opened.';
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
      setBillingPortalPending(false);
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
          tenantRef: scopedTenantRef,
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
      const invoice = billing.invoices.find((item) => item.id === invoiceId);
      const externalReceiptUrl = invoice?.receipt_url ?? invoice?.hosted_invoice_url;
      if (externalReceiptUrl) {
        window.open(externalReceiptUrl, '_blank', 'noopener,noreferrer');
        setBillingMessage(`Opened receipt for ${invoice?.invoice_number ?? invoiceId} in Stripe.`);
        return;
      }

      const envelope = await apiV1.getTenantBillingInvoiceReceipt(
        invoiceId,
        {
          tenantRef: scopedTenantRef,
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
          tenantRef: scopedTenantRef,
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
          tenantRef: scopedTenantRef,
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
          tenantRef: scopedTenantRef,
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
          tenantRef: scopedTenantRef,
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
          tenantRef: scopedTenantRef,
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

  async function handleCatalogCreate() {
    if (!session?.session_token) {
      setCatalogEditError('Sign in with a tenant account before creating catalog drafts.');
      return;
    }
    if (!canWriteCatalog) {
      setCatalogEditError('Your current tenant role can review catalog data but cannot create or publish catalog rows.');
      return;
    }

    setCatalogCreatePending(true);
    setCatalogEditError(null);
    setCatalogEditMessage(null);

    try {
      const request: TenantCatalogCreateRequest = {
        business_name: profileForm.business_name.trim() || overview.tenant.name,
        name: 'New service draft',
        category: importForm.category?.trim() || null,
      };
      const envelope = await apiV1.createTenantCatalogService(request, {
        tenantRef: scopedTenantRef,
        sessionToken: session.session_token,
      });

      if (envelope.status !== 'ok') {
        throw new Error('Catalog draft creation did not return a refreshed catalog snapshot.');
      }

      const previousServiceIds = new Set(catalog.items.map((item) => item.service_id));
      applyCatalogSnapshot(envelope.data);
      const createdItem = envelope.data.items.find((item) => !previousServiceIds.has(item.service_id));
      if (createdItem) {
        setSelectedCatalogServiceId(createdItem.service_id);
      }
      setCatalogEditMessage('A new draft service is ready. Fill in the booking-critical details, then save or publish it.');
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : 'Catalog draft creation failed.';
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
      setCatalogCreatePending(false);
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
              tenantRef: scopedTenantRef,
              sessionToken: session.session_token,
            })
          : await apiV1.archiveTenantCatalogService(selectedCatalogItem.service_id, {
              tenantRef: scopedTenantRef,
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
          <section className="overflow-hidden rounded-[2.25rem] border border-sky-100 bg-[radial-gradient(circle_at_top_left,rgba(72,123,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] p-6 text-[var(--apple-near-black)] shadow-[0_28px_80px_rgba(15,23,42,0.10)] lg:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apple-blue)] shadow-[0_10px_24px_rgba(59,130,246,0.10)] backdrop-blur">
                  Shared tenant gateway
                </div>
                <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--apple-near-black)] lg:text-[2.8rem] lg:leading-[1.02]">
                  One polished sign-in flow for every tenant workspace
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-black/66">
                  Create a new tenant, continue with Google, or return to an existing workspace
                  from one canonical entry point at `tenant.bookedai.au`.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {[
                    'Google-first access',
                    'Shared tenant gateway',
                    'Automatic workspace routing',
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-sky-200 bg-white/82 px-3.5 py-1.5 text-xs font-semibold text-sky-800 shadow-[0_8px_20px_rgba(59,130,246,0.08)] backdrop-blur"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 text-sm text-black/72 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-black/6 bg-white/78 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                    Entry point
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-[var(--apple-near-black)]">
                    tenant.bookedai.au
                  </div>
                  <div className="mt-2 text-xs leading-5 text-black/54">
                    Shared tenant sign-in, Google access, and workspace creation
                  </div>
                </div>
                <div className="rounded-[1.35rem] border border-black/6 bg-white/78 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                    Release
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-[var(--apple-near-black)]">{releaseLabel}</div>
                  <div className="mt-2 text-xs leading-5 text-black/54">Source {releaseVersion}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-6">
              <article className="rounded-[1.85rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.07)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Gateway flow
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  One tenant entry point, three clean paths
                </h2>
                <div className="mt-5 grid gap-3">
                  {[
                    'Existing tenants can return with Google-first sign-in or password fallback.',
                    'New tenants can create the workspace from the same gateway without switching surfaces.',
                    'After authentication, BookedAI routes each operator into the correct tenant automatically.',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.2rem] border border-slate-200 bg-white/88 px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.85rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.07)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  After sign-in
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Straight into the right workspace
                </h2>
                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-sm leading-6 text-slate-600">
                    Successful authentication lands on `/tenant/&lt;slug&gt;`, so operators move from the
                    shared gateway into overview, catalog, bookings, integrations, and billing
                    without a second login step.
                  </p>
                </div>
              </article>
            </div>

            <TenantAuthWorkspaceEmail
              tenantName="BookedAI Tenant Gateway"
              tenantSlug="tenant.bookedai.au"
              tenantRef={null}
              session={session}
              onboarding={gatewayOnboarding}
              authMode={authMode}
              setAuthMode={handleAuthModeChange}
              authPending={authPending}
              authError={authError}
              importMessage={importMessage}
              emailSignInValue={emailSignInValue}
              setEmailSignInValue={setEmailSignInValue}
              emailCodeValue={emailCodeValue}
              setEmailCodeValue={setEmailCodeValue}
              emailCodeDelivery={emailCodeDelivery}
              createAccountForm={createAccountForm}
              setCreateAccountForm={setCreateAccountForm}
              claimAccountForm={claimAccountForm}
              setClaimAccountForm={setClaimAccountForm}
              googleEnabled={Boolean(googleClientId)}
              googleReady={googleReady}
              googleButtonSlot={<div ref={googleButtonRef} />}
              onPromptGoogle={handlePromptGoogle}
              onRequestEmailCode={handleRequestEmailCode}
              onVerifyEmailCode={handleVerifyEmailCode}
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

  const { overview, bookings, plugin, integrations, billing, onboarding, team, catalog } = state;
  const selectionService = selectedCatalogItem ? toBookingReadyServiceItem(selectedCatalogItem) : null;
  const permissionMatrix = useMemo(buildTenantPermissionMatrix, []);
  const roleFirstLoginHint = inviteContext?.role ?? tenantMembershipRole;
  const tenantPanels: Array<{
    key: TenantPanel;
    label: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'Executive summary, priorities, and health.',
      icon: <SparkIcon className="h-4 w-4" />,
    },
    {
      key: 'experience',
      label: 'Experience Studio',
      description: 'Branding, intro HTML, and workspace guidance.',
      icon: <ShieldIcon className="h-4 w-4" />,
    },
    {
      key: 'catalog',
      label: 'Catalog',
      description: 'Service input, review, and publish control.',
      icon: <SearchIcon className="h-4 w-4" />,
    },
    {
      key: 'plugin',
      label: 'Plugin',
      description: 'Embed runtime and partner integration snippets.',
      icon: <LinkIcon className="h-4 w-4" />,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      description: 'Booking queue, status, and payment dependency.',
      icon: <CalendarIcon className="h-4 w-4" />,
    },
    {
      key: 'integrations',
      label: 'Integrations',
      description: 'Provider posture, alerts, and retry signals.',
      icon: <DatabaseIcon className="h-4 w-4" />,
    },
    {
      key: 'billing',
      label: 'Billing',
      description: 'Commercial readiness, invoices, and plans.',
      icon: <SparkIcon className="h-4 w-4" />,
    },
    {
      key: 'team',
      label: 'Team',
      description: 'Members, roles, and access governance.',
      icon: <ShieldIcon className="h-4 w-4" />,
    },
  ];
  const activePanelMeta = tenantPanels.find((item) => item.key === panel) ?? tenantPanels[0];
  const activePanelGuide = overview.workspace.guides[panel === 'experience' ? 'experience' : panel];
  const introPreview = stripHtmlPreview(overview.workspace.introduction_html);
  const activationState = useMemo(
    () => deriveTenantActivationState({ session, onboarding, overview }),
    [session, onboarding, overview],
  );
  const outstandingRevenueAud = useMemo(() => deriveOutstandingRevenueAud(billing), [billing]);
  const paidRevenueAud = useMemo(() => derivePaidRevenueAud(billing, revenueMetrics), [billing, revenueMetrics]);
  const sourceContribution = useMemo(() => deriveSourceContribution(overview), [overview]);
  const revenueProofNarrative = useMemo(
    () => buildRevenueProofNarrative(overview, billing, revenueMetrics),
    [overview, billing, revenueMetrics],
  );

  return (
    <main className="booked-admin-shell booked-page-shell text-slate-950">
      <div className="booked-page-frame booked-page-stack">
        <section className="overflow-hidden rounded-[2rem] border border-black/6 bg-[radial-gradient(circle_at_top_left,rgba(72,123,255,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.98))] p-6 text-[var(--apple-near-black)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="max-w-4xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--apple-blue)]">
                Tenant enterprise workspace
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--apple-near-black)] lg:text-4xl">
                {overview.tenant.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-black/66">
                A structured enterprise surface for tenant operations: profile content, catalog,
                bookings, integrations, billing, team control, and plugin readiness all sit behind
                one role-aware workspace.
              </p>
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
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-black/6 bg-white/78 p-4 backdrop-blur">
                <div className="flex items-start gap-4">
                  {overview.workspace.logo_url ? (
                    <img
                      src={overview.workspace.logo_url}
                      alt={`${overview.tenant.name} logo`}
                      className="h-14 w-14 rounded-[1rem] border border-slate-200 bg-white object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42">
                      Active section
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[var(--apple-near-black)]">
                      {activePanelMeta.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-black/62">
                      {activePanelMeta.description}
                    </p>
                  </div>
                </div>
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
              {session ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                    Connected as {session.user.full_name || session.user.email}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-full border border-black/6 bg-white/72 px-4 py-2 text-sm font-semibold text-black/74 transition hover:bg-white"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPanel('overview')}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-300 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-white"
                >
                  <ShieldIcon className="h-4 w-4" />
                  Open tenant sign-in
                </button>
              )}
            </div>
          </div>
        </section>

        {adminReturnContext ? (
          <section className="rounded-[1.75rem] border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(224,242,254,0.92))] p-5 shadow-[0_16px_40px_rgba(14,116,144,0.10)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Admin support return link
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-950">
                  This tenant runtime was opened from an admin support investigation.
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Use these links to jump back to the same admin investigation context without losing the tenant you are currently reviewing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={adminReturnContext.investigationHref}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Return to tenant investigation
                </a>
                {adminReturnContext.scopeHref ? (
                  <a
                    href={adminReturnContext.scopeHref}
                    className="rounded-full border border-sky-300 bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Return to {adminReturnContext.scopeLabel}
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <TenantActivationChecklistCard
          activation={activationState}
          action={
            activationState.actionPanel ? (
              <button
                type="button"
                onClick={() => setPanel(activationState.actionPanel ?? 'overview')}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                {activationState.actionLabel}
              </button>
            ) : !session ? (
              <button
                type="button"
                onClick={() => setPanel('overview')}
                className="rounded-full border border-sky-300 bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {activationState.actionLabel}
              </button>
            ) : null
          }
        />

        <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Workspace menu
              </div>
              <div className="mt-4 space-y-2">
                {tenantPanels.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPanel(item.key)}
                    className={`flex w-full items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-left transition ${
                      panel === item.key
                        ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span className={`mt-0.5 ${panel === item.key ? 'text-white' : 'text-slate-500'}`}>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${panel === item.key ? 'text-white/78' : 'text-slate-500'}`}>
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Section guideline
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                {activePanelMeta.label}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {activePanelGuide}
              </p>
            </article>

            {(overview.workspace.hero_image_url || introPreview) ? (
              <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                {overview.workspace.hero_image_url ? (
                  <img
                    src={overview.workspace.hero_image_url}
                    alt={`${overview.tenant.name} hero`}
                    className="h-40 w-full object-cover"
                  />
                ) : null}
                <div className="p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Tenant introduction
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {introPreview || 'Use Experience Studio to add an enterprise introduction for this tenant.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPanel('experience')}
                    className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Open Experience Studio
                  </button>
                </div>
              </article>
            ) : null}
          </aside>

          <div className="space-y-6">
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

              <article className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                      Revenue proof loop
                    </div>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">
                      Monthly value board
                    </h2>
                  </div>
                  {revenueMetrics ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">
                        {revenueMetrics.capture_rate_pct}% captured
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">{revenueProofNarrative}</p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                  <div className="rounded-[1.2rem] border border-emerald-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Leads captured
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                      {overview.summary.total_leads}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{overview.summary.active_leads} active</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-emerald-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Bookings created
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                      {revenueMetrics?.bookings_confirmed ?? bookings.status_summary.active + bookings.status_summary.completed}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">booking proof</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-emerald-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Paid revenue
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-emerald-700">
                      {formatAud(paidRevenueAud)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">captured value</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-amber-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Outstanding revenue
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-amber-700">
                      {formatAud(outstandingRevenueAud)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">open invoice posture</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-sky-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Source contribution
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                      {sourceContribution[0]?.[1] ?? overview.recent_bookings.length}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{sourceContribution[0]?.[0] ?? 'No dominant source yet'}</div>
                  </div>
                  <div className="rounded-[1.2rem] border border-rose-100 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Follow-up and CRM
                    </div>
                    <div className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                      {overview.summary.lifecycle_attention_count + overview.integration_snapshot.attention_count}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">attention signals</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Revenue proof narrative
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {revenueMetrics || paidRevenueAud > 0 || outstandingRevenueAud > 0
                        ? `BookedAI is turning tenant activity into commercial proof: ${revenueMetrics?.sessions_started ?? overview.recent_bookings.length} captured sessions, ${revenueMetrics?.bookings_confirmed ?? bookings.status_summary.active + bookings.status_summary.completed} confirmed bookings, ${formatAud(paidRevenueAud)} paid revenue, and ${formatAud(outstandingRevenueAud)} still recoverable through billing follow-up.`
                        : 'BookedAI is still building the first revenue proof sample for this tenant. Finish tenant activation, publish one offer, and attach billing posture to unlock stronger monthly reporting.'}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Top source signals
                    </div>
                    <div className="mt-3 space-y-2">
                      {sourceContribution.length ? sourceContribution.map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span>{label}</span>
                          <span className="font-semibold text-slate-950">{value}</span>
                        </div>
                      )) : (
                        <div className="rounded-full border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                          Source contribution will appear after more booking activity lands. For now, BookedAI is still collecting enough signals to identify the strongest booking or payment path.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {revenueMetrics && revenueMetrics.missed_revenue_aud > 0 && (
                  <div className="mt-4 rounded-[1rem] border border-rose-100 bg-rose-50 px-4 py-3">
                    <p className="text-xs text-rose-700">
                      <span className="font-semibold">{formatAud(revenueMetrics.missed_revenue_aud)} in potential revenue</span>{' '}
                      walked away from {revenueMetrics.missed_sessions} incomplete sessions in this period. Improving publish posture, response speed, and billing follow-through is the fastest recovery lever.
                    </p>
                  </div>
                )}
              </article>

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

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Experience studio
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Tenant brand and content
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel('experience')}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    Open studio
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Keep identity, imagery, and introduction content current so the tenant workspace
                  reads like a professional enterprise surface after login.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Logo
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {profileForm.logo_url.trim() ? 'Configured' : 'Missing'}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Hero image
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {profileForm.hero_image_url.trim() ? 'Configured' : 'Missing'}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Intro content
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {profileForm.introduction_html.trim() ? 'HTML ready' : 'Not added'}
                    </div>
                  </div>
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
                    Tenant sign-in unlocks write access so imported fields can safely become part
                    of the tenant catalog used by public search and booking flows.
                  </p>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {panel === 'experience' ? (
          <section className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Workspace guidance
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Manage the tenant presentation layer
                </h2>
                <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                  <p>
                    This studio is where tenant operators keep branding, introduction copy, and
                    section guidance aligned with the real business.
                  </p>
                  <p>
                    Image upload is direct, HTML intro content can be updated without repo access,
                    and the save action writes the content back into tenant-managed settings.
                  </p>
                </div>
              </article>

              <TenantOnboardingStatusCard
                onboarding={onboarding}
                eyebrow="Profile readiness"
                title="Experience completion"
                compact
              />

              <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                {profileForm.hero_image_url.trim() ? (
                  <img
                    src={profileForm.hero_image_url}
                    alt={`${overview.tenant.name} hero`}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-500">
                    Add a hero image to give the tenant workspace a stronger enterprise identity.
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    {profileForm.logo_url.trim() ? (
                      <img
                        src={profileForm.logo_url}
                        alt={`${overview.tenant.name} logo`}
                        className="h-14 w-14 rounded-[1rem] border border-slate-200 object-cover"
                      />
                    ) : null}
                    <div>
                      <div className="text-lg font-semibold text-slate-950">{overview.tenant.name}</div>
                      <div className="text-sm text-slate-500">{overview.tenant.industry || 'Industry not set'}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {introPreview || 'Add HTML introduction content to explain the tenant offering, positioning, and enterprise promise.'}
                  </p>
                </div>
              </article>
            </div>

            <TenantBusinessProfileCard
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              profilePending={profilePending}
              profileError={profileError}
              profileMessage={profileMessage}
              onSubmit={handleProfileSave}
              onUploadAsset={handleProfileAssetUpload}
              uploadingAsset={uploadingProfileAsset}
              canManageExperience={canManageExperience}
              currentRoleLabel={roleLabel(roleFirstLoginHint)}
              activity={overview.workspace.activity}
            />
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
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCatalogCreate()}
                      disabled={catalogCreatePending || !session || !canWriteCatalog}
                      className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                        catalogCreatePending || !session || !canWriteCatalog
                          ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                          : 'bg-slate-950 text-white hover:bg-slate-800'
                      }`}
                    >
                      {catalogCreatePending ? 'Creating draft...' : 'New service draft'}
                    </button>
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
              <TenantAuthWorkspaceEmail
                tenantName={overview.tenant.name}
                tenantSlug={overview.tenant.slug}
                tenantRef={tenantRef}
                session={session}
                onboarding={onboarding}
                authMode={authMode}
                setAuthMode={handleAuthModeChange}
                authPending={authPending}
                authError={authError}
                importMessage={importMessage}
                emailSignInValue={emailSignInValue}
                setEmailSignInValue={setEmailSignInValue}
                emailCodeValue={emailCodeValue}
                setEmailCodeValue={setEmailCodeValue}
                emailCodeDelivery={emailCodeDelivery}
                createAccountForm={createAccountForm}
                setCreateAccountForm={setCreateAccountForm}
                claimAccountForm={claimAccountForm}
                setClaimAccountForm={setClaimAccountForm}
                googleEnabled={Boolean(googleClientId)}
                googleReady={googleReady}
                googleButtonSlot={<div ref={googleButtonRef} />}
                onPromptGoogle={handlePromptGoogle}
                onRequestEmailCode={handleRequestEmailCode}
                onVerifyEmailCode={handleVerifyEmailCode}
                tenantChoices={tenantChoices}
                onSelectTenantChoice={handleTenantChoiceSelection}
                onSignOut={handleSignOut}
                inviteContext={inviteContext}
              />

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Permission guide
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    Current role: {roleLabel(tenantMembershipRole)}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Catalog creation, import, save, publish, plugin edits, and integrations are reserved for tenant admins and operators. Finance managers keep billing authority without changing catalog or workspace presentation.
                  </div>
                </div>

                <article className="mt-6 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Catalog workflow
                  </div>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <p>Create a draft first when the service does not exist yet.</p>
                    <p>Save the draft after entering booking-critical fields such as name, summary, price, location, image, and booking URL.</p>
                    <p>Publish only when warnings are cleared and the service is genuinely ready for public search.</p>
                  </div>
                </article>

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

        {panel === 'plugin' ? (
          <TenantPluginWorkspace
            plugin={plugin}
            form={pluginForm}
            setForm={setPluginForm}
            sessionReady={!!session?.session_token}
            pluginPending={pluginPending}
            pluginMessage={pluginMessage}
            pluginError={pluginError}
            copiedSnippetKey={copiedSnippetKey}
            onCopySnippet={handleCopySnippet}
            onSubmit={handlePluginSave}
          />
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
                <div className="mt-4">
                  <TenantSectionActivityCard label="Integration audit" activity={integrations.activity} />
                </div>
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
                      {!integrations.access?.can_manage_integrations ? (
                        <div className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                          Access denied for editing provider posture in this session. Restricted roles stay read-only here even though monitoring remains available.
                        </div>
                      ) : null}
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
            billingPortalPending={billingPortalPending}
            invoiceActionPendingId={invoiceActionPendingId}
            onSaveBillingAccount={handleBillingAccountSave}
            onSelectPlan={handlePlanSelection}
            onOpenBillingPortal={handleOpenBillingPortal}
            onMarkInvoicePaid={handleMarkInvoicePaid}
            onDownloadReceipt={handleDownloadReceipt}
          />
        ) : null}

        {panel === 'team' ? (
          <section className="space-y-6">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Enterprise access map
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Tenant permission matrix
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    Each lane below maps the real workspace authority model so tenant operators know who can edit experience content, who owns commercial controls, and where admin-only escalation still applies.
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  Signed in as <span className="font-semibold text-slate-950">{roleLabel(team.access.current_role)}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {permissionMatrix.map((entry) => {
                  const activeForCurrentRole = entry.roles.includes(team.access.current_role);
                  return (
                    <article
                      key={entry.capability}
                      className={`rounded-[1.25rem] border px-4 py-4 ${
                        activeForCurrentRole
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{entry.capability}</div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            activeForCurrentRole
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          {activeForCurrentRole ? 'Current role can manage' : 'Restricted'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{entry.detail}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.roles.map((role) => (
                          <span
                            key={`${entry.capability}-${role}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>

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
          </section>
        ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
