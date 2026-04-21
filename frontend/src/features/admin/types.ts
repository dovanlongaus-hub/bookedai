export type AdminMetricCard = {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

export type ShadowDriftReference = {
  label: string;
  bookingReference?: string;
  category?: string;
  note: string;
};

export type ShadowDriftExample = {
  label: string;
  bookingReference?: string;
  category?: string;
  observedAt?: string;
  note: string;
  legacyValue?: string | number | boolean | null;
  shadowValue?: string | number | boolean | null;
};

export type AdminBookingRecord = {
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

export type AdminTimelineEvent = {
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

export type AdminOverviewResponse = {
  status: string;
  metrics: AdminMetricCard[];
  recent_bookings: AdminBookingRecord[];
  recent_events: AdminTimelineEvent[];
  portal_support_queue: AdminPortalSupportQueueItem[];
};

export type AdminPortalSupportQueueItem = {
  queue_item_id: string;
  id: number;
  source_kind?: string | null;
  request_type: string;
  booking_reference?: string | null;
  booking_status?: string | null;
  service_name?: string | null;
  business_name?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  support_email?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  timezone?: string | null;
  customer_note?: string | null;
  created_at: string;
  outbox_event_id?: number | null;
  outbox_status?: string | null;
  outbox_available_at?: string | null;
  resolution_status?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  action_request_id?: number | null;
};

export type AdminPortalSupportActionResponse = {
  status: string;
  request_id: number;
  action: string;
  message: string;
};

export type AdminBookingsResponse = {
  status: string;
  total: number;
  items: AdminBookingRecord[];
};

export type AdminBookingDetailResponse = {
  status: string;
  booking: AdminBookingRecord;
  events: AdminTimelineEvent[];
};

export type AdminConfigEntry = {
  key: string;
  value: string;
  category: string;
  masked: boolean;
};

export type AdminConfigResponse = {
  status: string;
  items: AdminConfigEntry[];
};

export type AdminApiRoute = {
  path: string;
  methods: string[];
  protected: boolean;
};

export type AdminApiInventoryResponse = {
  status: string;
  items: AdminApiRoute[];
};

export type LoginResponse = {
  status: string;
  username: string;
  session_token: string;
  expires_at: string;
};

export type EmailSendResponse = {
  status: string;
  message: string;
};

export type AdminDiscordHandoffResponse = {
  status: string;
  message: string;
};

export type PartnerProfileItem = {
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

export type PartnerProfileListResponse = {
  status: string;
  items: PartnerProfileItem[];
};

export type AdminServiceMerchantItem = {
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
  is_search_ready: boolean;
  quality_warnings: string[];
  updated_at: string;
};

export type AdminServiceMerchantListResponse = {
  status: string;
  items: AdminServiceMerchantItem[];
};

export type AdminServiceCatalogQualityCounts = {
  total_records: number;
  search_ready_records: number;
  warning_records: number;
  inactive_records: number;
};

export type AdminServiceCatalogQualityResponse = {
  status: string;
  counts: AdminServiceCatalogQualityCounts;
  items: AdminServiceMerchantItem[];
};

export type UploadResponse = {
  filename: string;
  content_type: string;
  size: number;
  url: string;
  path: string;
};

export type PartnerFormState = {
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

export type ServiceImportFormState = {
  website_url: string;
  business_name: string;
  business_email: string;
  category: string;
};

export type AdminWorkspaceId = 'operations' | 'catalog' | 'reliability';

export type AdminWorkspacePanelId =
  | 'bookings'
  | 'recent-events'
  | 'selected-booking'
  | 'portal-support'
  | 'service-catalog'
  | 'partners'
  | 'prompt5-preview'
  | 'live-configuration'
  | 'api-inventory';

export function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatCurrency(value: number | null) {
  if (value == null) {
    return 'Not set';
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function statusTone(value: string | null) {
  if (!value) {
    return 'bg-[#f5f5f7] text-black/60';
  }
  if (value.includes('ready') || value.includes('triggered') || value.includes('sent')) {
    return 'bg-white text-[#0071e3]';
  }
  if (value.includes('pending') || value.includes('follow')) {
    return 'bg-[#f5f5f7] text-[#1d1d1f]';
  }
  if (value.includes('error') || value.includes('unauthorized') || value.includes('failed')) {
    return 'bg-[#1d1d1f] text-white';
  }
  return 'bg-white text-[#0071e3]';
}

export function metricToneClass(tone: AdminMetricCard['tone']) {
  switch (tone) {
    case 'success':
      return 'bg-[#f5f5f7]';
    case 'warning':
      return 'bg-[#f5f5f7]';
    case 'danger':
      return 'bg-[#1d1d1f] text-white';
    case 'info':
      return 'bg-white';
    default:
      return 'bg-white';
  }
}

export function emptyPartnerForm(): PartnerFormState {
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

export function emptyServiceImportForm(): ServiceImportFormState {
  return {
    website_url: '',
    business_name: '',
    business_email: '',
    category: '',
  };
}
