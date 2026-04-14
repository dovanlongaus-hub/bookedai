import { FormEvent, useEffect, useState } from 'react';

import { getApiBaseUrl } from '../shared/config/api';

type AdminMetricCard = {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

type AdminBookingRecord = {
  booking_reference: string;
  created_at: string;
  industry: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  service_id: string | null;
  requested_date: string | null;
  requested_time: string | null;
  timezone: string | null;
  amount_aud: number | null;
  payment_status: string | null;
  payment_url: string | null;
  email_status: string | null;
  workflow_status: string | null;
  notes: string | null;
};

type AdminTimelineEvent = {
  id: number;
  source: string;
  event_type: string;
  created_at: string;
  ai_intent: string | null;
  workflow_status: string | null;
  message_text: string | null;
  ai_reply: string | null;
  sender_name: string | null;
  sender_email: string | null;
  metadata: Record<string, unknown>;
};

type AdminOverviewResponse = {
  status: string;
  metrics: AdminMetricCard[];
  recent_bookings: AdminBookingRecord[];
  recent_events: AdminTimelineEvent[];
};

type AdminBookingsResponse = {
  status: string;
  total: number;
  items: AdminBookingRecord[];
};

type AdminBookingDetailResponse = {
  status: string;
  booking: AdminBookingRecord;
  events: AdminTimelineEvent[];
};

type AdminConfigEntry = {
  key: string;
  value: string;
  category: string;
  masked: boolean;
};

type AdminConfigResponse = {
  status: string;
  items: AdminConfigEntry[];
};

type AdminApiRoute = {
  path: string;
  methods: string[];
  protected: boolean;
};

type AdminApiInventoryResponse = {
  status: string;
  items: AdminApiRoute[];
};

type LoginResponse = {
  status: string;
  username: string;
  session_token: string;
  expires_at: string;
};

type EmailSendResponse = {
  status: string;
  message: string;
};

type PartnerProfileItem = {
  id: number;
  name: string;
  category: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
};

type PartnerProfileListResponse = {
  status: string;
  items: PartnerProfileItem[];
};

type AdminServiceMerchantItem = {
  id: number;
  service_id: string;
  business_name: string;
  business_email: string | null;
  name: string;
  category: string | null;
  summary: string | null;
  amount_aud: number | null;
  duration_minutes: number | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  image_url: string | null;
  source_url: string | null;
  tags: string[];
  featured: boolean;
  is_active: boolean;
  updated_at: string;
};

type AdminServiceMerchantListResponse = {
  status: string;
  items: AdminServiceMerchantItem[];
};

type UploadResponse = {
  filename: string;
  content_type: string;
  size: number;
  url: string;
  path: string;
};

type PartnerFormState = {
  name: string;
  category: string;
  website_url: string;
  description: string;
  logo_url: string;
  image_url: string;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
};

type ServiceImportFormState = {
  website_url: string;
  business_name: string;
  business_email: string;
  category: string;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCurrency(value: number | null) {
  if (value == null) {
    return 'Not set';
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(value);
}

function statusTone(value: string | null) {
  if (!value) {
    return 'bg-slate-100 text-slate-600';
  }
  if (value.includes('ready') || value.includes('triggered') || value.includes('sent')) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (value.includes('pending') || value.includes('follow')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (value.includes('error') || value.includes('unauthorized') || value.includes('failed')) {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-sky-100 text-sky-700';
}

function metricToneClass(tone: AdminMetricCard['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50';
    case 'warning':
      return 'border-amber-200 bg-amber-50';
    case 'danger':
      return 'border-rose-200 bg-rose-50';
    case 'info':
      return 'border-sky-200 bg-sky-50';
    default:
      return 'border-slate-200 bg-white';
  }
}

function emptyPartnerForm(): PartnerFormState {
  return {
    name: '',
    category: '',
    website_url: '',
    description: '',
    logo_url: '',
    image_url: '',
    featured: false,
    sort_order: 0,
    is_active: true,
  };
}

function emptyServiceImportForm(): ServiceImportFormState {
  return {
    website_url: '',
    business_name: '',
    business_email: '',
    category: '',
  };
}

export function AdminPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [username, setUsername] = useState('info@bookedai.au');
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [sessionExpiry, setSessionExpiry] = useState('');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [bookings, setBookings] = useState<AdminBookingRecord[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingDetailResponse | null>(
    null,
  );
  const [configItems, setConfigItems] = useState<AdminConfigEntry[]>([]);
  const [apiRoutes, setApiRoutes] = useState<AdminApiRoute[]>([]);
  const [partners, setPartners] = useState<PartnerProfileItem[]>([]);
  const [importedServices, setImportedServices] = useState<AdminServiceMerchantItem[]>([]);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(emptyPartnerForm);
  const [serviceImportForm, setServiceImportForm] = useState<ServiceImportFormState>(
    emptyServiceImportForm,
  );
  const [partnerMessage, setPartnerMessage] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [savingPartner, setSavingPartner] = useState(false);
  const [importingServices, setImportingServices] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedToken = window.localStorage.getItem('bookedai_admin_session');
    const savedUser = window.localStorage.getItem('bookedai_admin_username');
    const savedExpiry = window.localStorage.getItem('bookedai_admin_expires_at');
    if (savedToken) {
      setSessionToken(savedToken);
    }
    if (savedUser) {
      setUsername(savedUser);
    }
    if (savedExpiry) {
      setSessionExpiry(savedExpiry);
    }
  }, []);

  useEffect(() => {
    if (sessionToken) {
      void loadDashboard();
    }
  }, [sessionToken]);

  function authHeaders() {
    return {
      Authorization: `Bearer ${sessionToken}`,
    };
  }

  async function loadBookingDetail(bookingReference: string) {
    const response = await fetch(`${apiBaseUrl}/admin/bookings/${bookingReference}`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || 'Could not load booking detail.');
    }
    const payload = (await response.json()) as AdminBookingDetailResponse;
    setSelectedBooking(payload);
  }

  async function loadDashboard(query?: string) {
    if (!sessionToken) {
      return;
    }

    setLoadingDashboard(true);
    setError('');

    try {
      const search = new URLSearchParams();
      search.set('limit', '50');
      if ((query ?? searchQuery).trim()) {
        search.set('q', (query ?? searchQuery).trim());
      }
      if (paymentFilter) {
        search.set('payment_status', paymentFilter);
      }
      if (industryFilter) {
        search.set('industry', industryFilter);
      }
      if (emailFilter) {
        search.set('email_status', emailFilter);
      }
      if (workflowFilter) {
        search.set('workflow_status', workflowFilter);
      }
      if (dateFrom) {
        search.set('date_from', dateFrom);
      }
      if (dateTo) {
        search.set('date_to', dateTo);
      }

      const [
        overviewResponse,
        bookingsResponse,
        configResponse,
        apiInventoryResponse,
        partnersResponse,
        servicesResponse,
      ] =
        await Promise.all([
          fetch(`${apiBaseUrl}/admin/overview`, { headers: authHeaders() }),
          fetch(`${apiBaseUrl}/admin/bookings?${search.toString()}`, {
            headers: authHeaders(),
          }),
          fetch(`${apiBaseUrl}/admin/config`, { headers: authHeaders() }),
          fetch(`${apiBaseUrl}/admin/apis`, { headers: authHeaders() }),
          fetch(`${apiBaseUrl}/admin/partners`, { headers: authHeaders() }),
          fetch(`${apiBaseUrl}/admin/services`, { headers: authHeaders() }),
        ]);

      const responses = [
        overviewResponse,
        bookingsResponse,
        configResponse,
        apiInventoryResponse,
        partnersResponse,
        servicesResponse,
      ];

      for (const response of responses) {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.detail || 'Could not load admin dashboard.');
        }
      }

      const overviewPayload = (await overviewResponse.json()) as AdminOverviewResponse;
      const bookingsPayload = (await bookingsResponse.json()) as AdminBookingsResponse;
      const configPayload = (await configResponse.json()) as AdminConfigResponse;
      const apiInventoryPayload = (await apiInventoryResponse.json()) as AdminApiInventoryResponse;
      const partnersPayload = (await partnersResponse.json()) as PartnerProfileListResponse;
      const servicesPayload = (await servicesResponse.json()) as AdminServiceMerchantListResponse;

      setOverview(overviewPayload);
      setBookings(bookingsPayload.items);
      setBookingsTotal(bookingsPayload.total);
      setConfigItems(configPayload.items);
      setApiRoutes(apiInventoryPayload.items);
      setPartners(partnersPayload.items);
      setImportedServices(servicesPayload.items);

      if (bookingsPayload.items.length > 0) {
        await loadBookingDetail(bookingsPayload.items[0].booking_reference);
      } else {
        setSelectedBooking(null);
      }
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError('Could not load admin dashboard.');
      }
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || 'Login failed.');
      }

      const payload = (await response.json()) as LoginResponse;
      window.localStorage.setItem('bookedai_admin_session', payload.session_token);
      window.localStorage.setItem('bookedai_admin_username', payload.username);
      window.localStorage.setItem('bookedai_admin_expires_at', payload.expires_at);
      setSessionToken(payload.session_token);
      setSessionExpiry(payload.expires_at);
      setPassword('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed.');
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem('bookedai_admin_session');
    window.localStorage.removeItem('bookedai_admin_username');
    window.localStorage.removeItem('bookedai_admin_expires_at');
    setSessionToken('');
    setSessionExpiry('');
    setOverview(null);
    setBookings([]);
    setBookingsTotal(0);
    setSelectedBooking(null);
    setConfigItems([]);
    setApiRoutes([]);
    setPartners([]);
    setImportedServices([]);
    setEditingPartnerId(null);
    setPartnerForm(emptyPartnerForm());
    setServiceImportForm(emptyServiceImportForm());
    setPartnerMessage('');
    setServiceMessage('');
  }

  async function sendConfirmationEmail() {
    if (!selectedBooking) {
      return;
    }
    setSendingConfirmation(true);
    setConfirmationMessage('');
    setError('');
    try {
      const response = await fetch(
        `${apiBaseUrl}/admin/bookings/${selectedBooking.booking.booking_reference}/confirm-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({ note: confirmNote.trim() || null }),
        },
      );
      const payload = (await response.json().catch(() => null)) as EmailSendResponse | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(payload && 'detail' in payload ? payload.detail || 'Could not send confirmation email.' : 'Could not send confirmation email.');
      }
      setConfirmationMessage((payload as EmailSendResponse).message);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send confirmation email.');
    } finally {
      setSendingConfirmation(false);
    }
  }

  function editPartner(partner: PartnerProfileItem) {
    setEditingPartnerId(partner.id);
    setPartnerMessage('');
    setPartnerForm({
      name: partner.name,
      category: partner.category ?? '',
      website_url: partner.website_url ?? '',
      description: partner.description ?? '',
      logo_url: partner.logo_url ?? '',
      image_url: partner.image_url ?? '',
      featured: partner.featured,
      sort_order: partner.sort_order,
      is_active: partner.is_active,
    });
  }

  function resetPartnerForm() {
    setEditingPartnerId(null);
    setPartnerForm(emptyPartnerForm());
  }

  async function uploadPartnerAsset(file: File, kind: 'logo' | 'image') {
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingImage;
    setUploading(true);
    setError('');
    setPartnerMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBaseUrl}/uploads/images`, {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as UploadResponse | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(
          payload && 'detail' in payload ? payload.detail || 'Image upload failed.' : 'Image upload failed.',
        );
      }

      const imagePayload = payload as UploadResponse;
      setPartnerForm((current) => ({
        ...current,
        logo_url: kind === 'logo' ? imagePayload.url : current.logo_url,
        image_url: kind === 'image' ? imagePayload.url : current.image_url,
      }));
      setPartnerMessage(`${kind === 'logo' ? 'Logo' : 'Image'} uploaded successfully.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function savePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPartner(true);
    setError('');
    setPartnerMessage('');

    try {
      const endpoint = editingPartnerId
        ? `${apiBaseUrl}/admin/partners/${editingPartnerId}`
        : `${apiBaseUrl}/admin/partners`;
      const method = editingPartnerId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(partnerForm),
      });
      const payload = (await response.json().catch(() => null)) as PartnerProfileListResponse | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(
          payload && 'detail' in payload ? payload.detail || 'Could not save partner.' : 'Could not save partner.',
        );
      }

      setPartners((payload as PartnerProfileListResponse).items);
      setPartnerMessage(editingPartnerId ? 'Partner profile updated.' : 'Partner profile created.');
      resetPartnerForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save partner.');
    } finally {
      setSavingPartner(false);
    }
  }

  async function deletePartner(partnerId: number) {
    setError('');
    setPartnerMessage('');
    try {
      const response = await fetch(`${apiBaseUrl}/admin/partners/${partnerId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as PartnerProfileListResponse | { detail?: string } | null;
      if (!response.ok) {
        throw new Error(
          payload && 'detail' in payload ? payload.detail || 'Could not delete partner.' : 'Could not delete partner.',
        );
      }

      setPartners((payload as PartnerProfileListResponse).items);
      if (editingPartnerId === partnerId) {
        resetPartnerForm();
      }
      setPartnerMessage('Partner profile deleted.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete partner.');
    }
  }

  async function importServicesFromWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportingServices(true);
    setServiceMessage('');
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/admin/services/import-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(serviceImportForm),
      });
      const payload = (await response.json().catch(() => null)) as
        | AdminServiceMerchantListResponse
        | { detail?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          payload && 'detail' in payload
            ? payload.detail || 'Could not import services from website.'
            : 'Could not import services from website.',
        );
      }

      setImportedServices((payload as AdminServiceMerchantListResponse).items);
      setServiceMessage('Website scanned and services imported into the live catalog.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not import services from website.',
      );
    } finally {
      setImportingServices(false);
    }
  }

  async function deleteImportedService(serviceRowId: number) {
    setError('');
    setServiceMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/admin/services/${serviceRowId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as
        | AdminServiceMerchantListResponse
        | { detail?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          payload && 'detail' in payload
            ? payload.detail || 'Could not delete imported service.'
            : 'Could not delete imported service.',
        );
      }

      setImportedServices((payload as AdminServiceMerchantListResponse).items);
      setServiceMessage('Imported service removed from the live catalog.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not delete imported service.',
      );
    }
  }

  const configCategories = [...new Set(configItems.map((item) => item.category))];

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_45%,#e2e8f0_100%)] px-6 py-10 text-white lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                Admin Portal
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight">
                BookedAI operations dashboard for bookings, payment flow, and messaging
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                Sign in to review live booking references, payment readiness, workflow
                callbacks, inbox state, and integration configuration from one place.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  'Live booking feed with customer and service details',
                  'Payment and workflow states for each booking reference',
                  'Inbox and integration visibility without shell access',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-4 text-sm text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white p-8 text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Sign in
              </div>
              <h2 className="mt-4 text-2xl font-bold">Access admin.bookedai.au</h2>
              <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                <label className="block text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    placeholder="info@bookedai.au"
                    autoComplete="username"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-semibold text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!username || !password || loggingIn}
                  className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingIn ? 'Signing in...' : 'Sign in to admin'}
                </button>
              </form>
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                admin.bookedai.au
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                BookedAI admin dashboard
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Monitor bookings, payment readiness, workflow callbacks, inbox visibility,
                and live configuration from one dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                Signed in as {username}
                {sessionExpiry ? ` until ${formatDateTime(sessionExpiry)}` : ''}
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loadingDashboard}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingDashboard ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Log out
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overview?.metrics.map((metric) => (
              <article
                key={metric.label}
                className={`rounded-[1.5rem] border p-5 ${metricToneClass(metric.tone)}`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {metric.label}
                </div>
                <div className="mt-3 text-3xl font-bold text-slate-950">{metric.value}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Bookings and transactions</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {bookingsTotal} booking records currently available in the admin feed.
                  </p>
                </div>
                <form
                  className="flex gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void loadDashboard(searchQuery);
                  }}
                >
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by reference, customer, or email"
                    className="w-full min-w-[260px] rounded-full border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Search
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
                <select
                  value={industryFilter}
                  onChange={(event) => setIndustryFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                >
                  <option value="">All industries</option>
                  {Array.from(new Set(bookings.map((booking) => booking.industry).filter(Boolean))).map(
                    (industry) => (
                      <option key={industry} value={industry ?? ''}>
                        {industry}
                      </option>
                    ),
                  )}
                </select>
                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                >
                  <option value="">All payment states</option>
                  <option value="stripe_checkout_ready">Stripe ready</option>
                  <option value="payment_follow_up_required">Payment follow-up</option>
                </select>
                <select
                  value={emailFilter}
                  onChange={(event) => setEmailFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                >
                  <option value="">All email states</option>
                  <option value="sent">Sent</option>
                  <option value="pending_manual_followup">Pending follow-up</option>
                </select>
                <select
                  value={workflowFilter}
                  onChange={(event) => setWorkflowFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                >
                  <option value="">All workflow states</option>
                  <option value="triggered">Triggered</option>
                  <option value="processed_by_n8n">Processed by n8n</option>
                  <option value="unauthorized">Unauthorized</option>
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="grid grid-cols-[160px_1fr_1.1fr_1fr_120px_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <div>Reference</div>
                  <div>Industry</div>
                  <div>Customer</div>
                  <div>Service</div>
                  <div>Amount</div>
                  <div>Payment</div>
                </div>
                <div className="max-h-[620px] overflow-auto">
                  {bookings.map((booking) => (
                    <button
                      key={booking.booking_reference}
                      type="button"
                      onClick={() => void loadBookingDetail(booking.booking_reference)}
                      className="grid w-full grid-cols-[160px_1fr_1.1fr_1fr_120px_150px] gap-3 border-t border-slate-200 px-4 py-4 text-left text-sm transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-semibold text-slate-950">
                          {booking.booking_reference}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateTime(booking.created_at)}
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          {booking.industry || 'General'}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-950">
                          {booking.customer_name || 'Unknown customer'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.customer_email || 'No email'}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-950">
                          {booking.service_name || 'Unknown service'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {[booking.requested_date, booking.requested_time].filter(Boolean).join(' ')}
                        </div>
                      </div>
                      <div className="font-semibold text-slate-950">
                        {formatCurrency(booking.amount_aud)}
                      </div>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(booking.payment_status)}`}
                        >
                          {booking.payment_status || 'Unknown'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold">Recent system events</h2>
              <div className="mt-5 space-y-4">
                {overview?.recent_events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-950">
                        {event.event_type}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(event.created_at)}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                        {event.source}
                      </span>
                      {event.workflow_status ? (
                        <span
                          className={`rounded-full px-3 py-1 font-semibold ${statusTone(event.workflow_status)}`}
                        >
                          {event.workflow_status}
                        </span>
                      ) : null}
                    </div>
                    {event.message_text ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{event.message_text}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Live service catalog import</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Scan a real SME website once, extract services, prices, location, and
                    booking details, then make them available to the BookedAI agent.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {importedServices.length} imported services
                </div>
              </div>

              <form className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]" onSubmit={importServicesFromWebsite}>
                <input
                  type="url"
                  value={serviceImportForm.website_url}
                  onChange={(event) =>
                    setServiceImportForm((current) => ({
                      ...current,
                      website_url: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                  placeholder="Website URL or business name"
                  required
                />
                <input
                  type="text"
                  value={serviceImportForm.business_name}
                  onChange={(event) =>
                    setServiceImportForm((current) => ({
                      ...current,
                      business_name: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                  placeholder="Business name"
                />
                <input
                  type="email"
                  value={serviceImportForm.business_email}
                  onChange={(event) =>
                    setServiceImportForm((current) => ({
                      ...current,
                      business_email: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                  placeholder="Business email"
                />
                <input
                  type="text"
                  value={serviceImportForm.category}
                  onChange={(event) =>
                    setServiceImportForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                  placeholder="Category hint"
                />
                <button
                  type="submit"
                  disabled={importingServices || !serviceImportForm.website_url.trim()}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importingServices ? 'Importing...' : 'Find and import'}
                </button>
              </form>

              {serviceMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {serviceMessage}
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {importedServices.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{service.name}</h3>
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            {service.business_name}
                          </span>
                          {service.featured ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {[service.category, service.duration_minutes ? `${service.duration_minutes} min` : null]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                        {service.business_email ? (
                          <div className="mt-2 text-sm text-slate-500">{service.business_email}</div>
                        ) : null}
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {service.summary || 'No summary extracted yet.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                            {service.amount_aud == null
                              ? 'Price not extracted'
                              : formatCurrency(service.amount_aud)}
                          </span>
                          {service.location ? (
                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                              {service.location}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                            Synced {formatDateTime(service.updated_at)}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {service.source_url ? (
                            <a
                              href={service.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                            >
                              Source website
                            </a>
                          ) : null}
                          {service.booking_url ? (
                            <a
                              href={service.booking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                            >
                              Booking link
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void deleteImportedService(service.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {importedServices.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    No imported services yet. Paste a partner website or business name above
                    and BookedAI will discover the site, extract the services, and build the
                    first real service catalog from it.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Partners and customers</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload logos and hero images, then publish them directly to the public
                    website partner wall.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {partners.length} profiles
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={savePartner}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-slate-700">Business name</span>
                    <input
                      type="text"
                      value={partnerForm.name}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                      placeholder="Novo Print and Signs"
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-slate-700">Category</span>
                    <input
                      type="text"
                      value={partnerForm.category}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, category: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                      placeholder="Customer, Partner, Clinic, Salon"
                    />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-2 block font-semibold text-slate-700">Website URL</span>
                    <input
                      type="url"
                      value={partnerForm.website_url}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          website_url: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                      placeholder="https://example.com"
                    />
                  </label>
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-2 block font-semibold text-slate-700">Description</span>
                    <textarea
                      value={partnerForm.description}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                      placeholder="Short summary used on the public website."
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Logo upload</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Best for brand wall and compact listing
                        </div>
                      </div>
                      <label className="inline-flex cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadPartnerAsset(file, 'logo');
                            }
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      value={partnerForm.logo_url}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, logo_url: event.target.value }))
                      }
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      placeholder="https://upload.bookedai.au/images/..."
                    />
                    {partnerForm.logo_url ? (
                      <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white p-4">
                        <img
                          src={partnerForm.logo_url}
                          alt="Partner logo preview"
                          className="h-20 w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Hero image upload</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Best for featured card and public spotlight section
                        </div>
                      </div>
                      <label className="inline-flex cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        {uploadingImage ? 'Uploading...' : 'Upload image'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadPartnerAsset(file, 'image');
                            }
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      value={partnerForm.image_url}
                      onChange={(event) =>
                        setPartnerForm((current) => ({ ...current, image_url: event.target.value }))
                      }
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      placeholder="https://upload.bookedai.au/images/..."
                    />
                    {partnerForm.image_url ? (
                      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                        <img
                          src={partnerForm.image_url}
                          alt="Partner image preview"
                          className="h-32 w-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[120px_140px_1fr_1fr]">
                  <label className="block text-sm">
                    <span className="mb-2 block font-semibold text-slate-700">Sort order</span>
                    <input
                      type="number"
                      value={partnerForm.sort_order}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          sort_order: Number(event.target.value || 0),
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={partnerForm.featured}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          featured: event.target.checked,
                        }))
                      }
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={partnerForm.is_active}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          is_active: event.target.checked,
                        }))
                      }
                    />
                    Visible on website
                  </label>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetPartnerForm}
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={savingPartner || !partnerForm.name.trim()}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPartner
                        ? 'Saving...'
                        : editingPartnerId
                          ? 'Update profile'
                          : 'Create profile'}
                    </button>
                  </div>
                </div>
              </form>

              {partnerMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {partnerMessage}
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {partners.map((partner) => (
                  <article
                    key={partner.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {partner.logo_url || partner.image_url ? (
                            <img
                              src={partner.logo_url || partner.image_url || ''}
                              alt={partner.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-slate-400">No logo</div>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-950">{partner.name}</h3>
                            {partner.featured ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Featured
                              </span>
                            ) : null}
                            {!partner.is_active ? (
                              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {partner.category || 'No category'} · sort {partner.sort_order}
                          </div>
                          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                            {partner.description || 'No description yet.'}
                          </p>
                          {partner.website_url ? (
                            <a
                              href={partner.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                            >
                              Visit website
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => editPartner(partner)}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePartner(partner.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {partners.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    No partner profiles yet. Create the first one above and it will appear on
                    the public website section.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold">Selected booking</h2>
              {selectedBooking ? (
                <>
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Booking reference
                        </div>
                        <div className="mt-2 text-2xl font-bold text-slate-950">
                          {selectedBooking.booking.booking_reference}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.payment_status)}`}
                        >
                          {selectedBooking.booking.payment_status || 'No payment state'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.email_status)}`}
                        >
                          {selectedBooking.booking.email_status || 'No email state'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.workflow_status)}`}
                        >
                          {selectedBooking.booking.workflow_status || 'No workflow state'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Customer
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          <div className="font-semibold text-slate-950">
                            {selectedBooking.booking.customer_name || 'Unknown'}
                          </div>
                          <div>{selectedBooking.booking.customer_email || 'No email'}</div>
                          <div>{selectedBooking.booking.customer_phone || 'No phone'}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Booking
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          <div className="font-semibold text-slate-950">
                            {selectedBooking.booking.service_name || 'Unknown service'}
                          </div>
                          <div>{selectedBooking.booking.industry || 'General'}</div>
                          <div>
                            {[selectedBooking.booking.requested_date, selectedBooking.booking.requested_time]
                              .filter(Boolean)
                              .join(' ')}
                          </div>
                          <div>{selectedBooking.booking.timezone || 'No timezone'}</div>
                          <div>{formatCurrency(selectedBooking.booking.amount_aud)}</div>
                        </div>
                      </div>
                    </div>

                    {selectedBooking.booking.payment_url ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={selectedBooking.booking.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Open Stripe checkout
                        </a>
                        <button
                          type="button"
                          onClick={() => void sendConfirmationEmail()}
                          disabled={sendingConfirmation}
                          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {sendingConfirmation ? 'Sending confirmation...' : 'Send confirmation email'}
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <label className="block text-sm">
                        <span className="mb-2 block font-semibold text-slate-700">
                          Manual confirmation note
                        </span>
                        <textarea
                          value={confirmNote}
                          onChange={(event) => setConfirmNote(event.target.value)}
                          rows={4}
                          placeholder="Optional extra note to include in the manual confirmation email."
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                        />
                      </label>
                      {confirmationMessage ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {confirmationMessage}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedBooking.events.map((event) => (
                      <article
                        key={event.id}
                        className="rounded-[1.5rem] border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {event.event_type}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDateTime(event.created_at)}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {event.source}
                          </span>
                          {event.workflow_status ? (
                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${statusTone(event.workflow_status)}`}
                            >
                              {event.workflow_status}
                            </span>
                          ) : null}
                        </div>
                        {event.message_text ? (
                          <p className="mt-3 text-sm leading-6 text-slate-600">{event.message_text}</p>
                        ) : null}
                        {event.ai_reply ? (
                          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            {event.ai_reply}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Select a booking to inspect its full event timeline.</p>
              )}
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold">Email checks paused</h2>
              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                Email status and inbox checks are temporarily skipped so admin data can load
                reliably while the mail provider configuration is being fixed.
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold">Live configuration</h2>
              <div className="mt-5 space-y-5">
                {configCategories.map((category) => (
                  <div key={category} className="rounded-[1.5rem] border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {category}
                    </div>
                    <div className="divide-y divide-slate-200">
                      {configItems
                        .filter((item) => item.category === category)
                        .map((item) => (
                          <div
                            key={item.key}
                            className="grid grid-cols-[1fr_1.3fr_80px] gap-3 px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="font-semibold text-slate-950">{item.key}</div>
                            <div
                              className={`break-all ${item.masked ? 'select-none' : ''}`}
                              onCopy={
                                item.masked
                                  ? (event) => {
                                      event.preventDefault();
                                    }
                                  : undefined
                              }
                            >
                              {item.value || 'Not set'}
                            </div>
                            <div>{item.masked ? 'Protected' : 'Public'}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold">API inventory</h2>
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="grid grid-cols-[120px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <div>Methods</div>
                  <div>Path</div>
                  <div>Access</div>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {apiRoutes.map((route) => (
                    <div
                      key={`${route.methods.join(',')}-${route.path}`}
                      className="grid grid-cols-[120px_1fr_120px] gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-700"
                    >
                      <div className="font-semibold text-slate-950">
                        {route.methods.join(', ')}
                      </div>
                      <div className="break-all">{route.path}</div>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            route.protected
                              ? 'bg-slate-950 text-white'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {route.protected ? 'Protected' : 'Public'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
