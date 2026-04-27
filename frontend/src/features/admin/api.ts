import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
} from './session';
import {
  AdminDiscordHandoffResponse,
  AdminApiInventoryResponse,
  AdminBookingDetailResponse,
  AdminBookingsResponse,
  AdminConfigResponse,
  AdminCustomerAgentHealthResponse,
  AdminMessagingActionResponse,
  AdminMessagingDetailResponse,
  AdminMessagingListResponse,
  AdminOverviewResponse,
  AdminPortalSupportActionResponse,
  AdminServiceCatalogQualityResponse,
  AdminServiceMerchantListResponse,
  AdminTenantCatalogResponse,
  AdminTenantDetailResponse,
  AdminTenantListResponse,
  EmailSendResponse,
  LoginResponse,
  PartnerProfileListResponse,
  ShadowDriftExample,
  ShadowDriftReference,
  UploadResponse,
} from './types';

function isUnauthorizedResponse(response: Response) {
  return response.status === 401 || response.status === 403;
}

function parseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}

function parseNetworkErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    if (
      message.includes('load failed') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    ) {
      return 'Could not reach the BookedAI admin API. Refresh and try again.';
    }
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

async function parseJsonOrNull(response: Response) {
  return response.json().catch(() => null);
}

function toDisplayCategory(value: string | undefined) {
  if (!value) {
    return 'Unknown';
  }
  return value.replaceAll('_', ' ');
}

function parseDriftReferencesHeader(value: string | null): ShadowDriftReference[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex === -1) {
        return {
          label: item,
          bookingReference: item,
          category: 'unknown',
          note: 'Drift example captured from shadow diagnostics.',
        };
      }
      const bookingReference = item.slice(0, separatorIndex);
      const category = item.slice(separatorIndex + 1) || 'unknown';
      return {
        label: bookingReference,
        bookingReference,
        category,
        note: `Recent drift captured in category ${toDisplayCategory(category)}.`,
      };
    });
}

function parseRecentDriftExamplesHeader(value: string | null): ShadowDriftExample[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const bookingReference =
          typeof item.booking_reference === 'string' && item.booking_reference.trim()
            ? item.booking_reference.trim()
            : undefined;
        const category =
          typeof item.category === 'string' && item.category.trim()
            ? item.category.trim()
            : undefined;
        const note =
          typeof item.note === 'string' && item.note.trim()
            ? item.note.trim()
            : 'Shadow drift example captured from the admin diagnostics flow.';
        const observedAt =
          typeof item.observed_at === 'string' && item.observed_at.trim()
            ? item.observed_at.trim()
            : undefined;
        const legacyValue =
          item.legacy_value === '' || item.legacy_value === undefined ? undefined : item.legacy_value;
        const shadowValue =
          item.shadow_value === '' || item.shadow_value === undefined ? undefined : item.shadow_value;

        return {
          label: bookingReference ?? toDisplayCategory(category),
          bookingReference,
          category,
          observedAt,
          note,
          legacyValue:
            typeof legacyValue === 'string' ||
            typeof legacyValue === 'number' ||
            typeof legacyValue === 'boolean' ||
            legacyValue === null
              ? legacyValue
              : String(legacyValue),
          shadowValue:
            typeof shadowValue === 'string' ||
            typeof shadowValue === 'number' ||
            typeof shadowValue === 'boolean' ||
            shadowValue === null
              ? shadowValue
              : String(shadowValue),
        } satisfies ShadowDriftExample;
      })
      .filter((item) => item.bookingReference || item.category || item.note);
  } catch {
    return [];
  }
}

export function createAdminAuthHeaders(sessionToken: string) {
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

export async function fetchAdminBookingDetail(
  apiBaseUrl: string,
  sessionToken: string,
  bookingReference: string,
) {
  const response = await fetch(`${apiBaseUrl}/admin/bookings/${bookingReference}`, {
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminBookingDetailResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load booking detail.'));
  }
  return payload as AdminBookingDetailResponse;
}

export async function fetchAdminMessaging(
  apiBaseUrl: string,
  sessionToken: string,
  limit = 60,
) {
  const response = await fetch(`${apiBaseUrl}/admin/messaging?limit=${limit}`, {
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminMessagingListResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load messaging workspace.'));
  }
  return payload as AdminMessagingListResponse;
}

export async function fetchAdminCustomerAgentHealth(
  apiBaseUrl: string,
  sessionToken: string,
) {
  const response = await fetch(`${apiBaseUrl}/admin/customer-agent/health`, {
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminCustomerAgentHealthResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load customer agent health.'));
  }
  return payload as AdminCustomerAgentHealthResponse;
}

export async function fetchAdminMessageDetail(
  apiBaseUrl: string,
  sessionToken: string,
  sourceKind: string,
  itemId: string,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/messaging/${encodeURIComponent(sourceKind)}/${encodeURIComponent(itemId)}`,
    {
      headers: createAdminAuthHeaders(sessionToken),
    },
  );
  const payload = (await parseJsonOrNull(response)) as
    | AdminMessagingDetailResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load message detail.'));
  }
  return payload as AdminMessagingDetailResponse;
}

export async function applyAdminMessageAction(
  apiBaseUrl: string,
  sessionToken: string,
  sourceKind: string,
  itemId: string,
  action: 'retry' | 'mark_manual_follow_up',
  note?: string | null,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/messaging/${encodeURIComponent(sourceKind)}/${encodeURIComponent(itemId)}/${encodeURIComponent(action)}`,
    {
      method: 'POST',
      headers: {
        ...createAdminAuthHeaders(sessionToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: note ?? null,
      }),
    },
  );
  const payload = (await parseJsonOrNull(response)) as
    | AdminMessagingActionResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not update the message.'));
  }
  return payload as AdminMessagingActionResponse;
}

export async function fetchAdminDashboardData(
  apiBaseUrl: string,
  sessionToken: string,
  search: URLSearchParams,
) {
  const headers = createAdminAuthHeaders(sessionToken);
  const responses = await Promise.all([
    fetch(`${apiBaseUrl}/admin/overview`, { headers }),
    fetch(`${apiBaseUrl}/admin/bookings?${search.toString()}`, { headers }),
    fetch(`${apiBaseUrl}/admin/config`, { headers }),
    fetch(`${apiBaseUrl}/admin/apis`, { headers }),
    fetch(`${apiBaseUrl}/admin/partners`, { headers }),
    fetch(`${apiBaseUrl}/admin/services`, { headers }),
    fetch(`${apiBaseUrl}/admin/services/quality`, { headers }),
    fetch(`${apiBaseUrl}/admin/messaging?limit=60`, { headers }),
    fetch(`${apiBaseUrl}/admin/customer-agent/health`, { headers }),
  ]);

  const payloads = await Promise.all(responses.map((response) => parseJsonOrNull(response)));

  for (let index = 0; index < responses.length; index += 1) {
    if (!responses[index].ok) {
      if (isUnauthorizedResponse(responses[index])) {
        throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
      }
      throw new Error(parseErrorMessage(payloads[index], 'Could not load admin dashboard.'));
    }
  }

  return {
    overview: payloads[0] as AdminOverviewResponse,
    bookings: payloads[1] as AdminBookingsResponse,
    config: payloads[2] as AdminConfigResponse,
    apiInventory: payloads[3] as AdminApiInventoryResponse,
    partners: payloads[4] as PartnerProfileListResponse,
    services: payloads[5] as AdminServiceMerchantListResponse,
    serviceQuality: payloads[6] as AdminServiceCatalogQualityResponse,
    messaging: payloads[7] as AdminMessagingListResponse,
    customerAgentHealth: payloads[8] as AdminCustomerAgentHealthResponse,
    bookingsViewEnabled:
      responses[1].headers.get('X-BookedAI-Admin-Bookings-View') === 'enhanced',
    bookingsShadowStatus: responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow') ?? 'disabled',
    bookingsShadowMatched: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Matched') ?? '0',
    ),
    bookingsShadowMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Mismatch') ?? '0',
    ),
    bookingsShadowMissing: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Missing') ?? '0',
    ),
    bookingsShadowPaymentStatusMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Payment-Status-Mismatch') ?? '0',
    ),
    bookingsShadowAmountMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Amount-Mismatch') ?? '0',
    ),
    bookingsShadowMeetingStatusMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Meeting-Status-Mismatch') ?? '0',
    ),
    bookingsShadowWorkflowStatusMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Workflow-Status-Mismatch') ?? '0',
    ),
    bookingsShadowEmailStatusMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Email-Status-Mismatch') ?? '0',
    ),
    bookingsShadowFieldParityMismatch: Number(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Field-Parity-Mismatch') ?? '0',
    ),
    bookingsShadowTopDriftReferences: parseDriftReferencesHeader(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Top-Drift-References'),
    ),
    bookingsShadowRecentDriftExamples: parseRecentDriftExamplesHeader(
      responses[1].headers.get('X-BookedAI-Admin-Bookings-Shadow-Recent-Drift-Examples'),
    ),
  };
}

export async function downloadAdminServiceQualityExport(
  apiBaseUrl: string,
  sessionToken: string,
  filters: {
    searchReady?: boolean;
    qualityWarning?: string;
  } = {},
) {
  const search = new URLSearchParams();
  if (filters.searchReady !== undefined) {
    search.set('search_ready', String(filters.searchReady));
  }
  if (filters.qualityWarning?.trim()) {
    search.set('quality_warning', filters.qualityWarning.trim());
  }

  const url = `${apiBaseUrl}/admin/services/quality/export.csv${
    search.toString() ? `?${search.toString()}` : ''
  }`;
  const response = await fetch(url, {
    headers: createAdminAuthHeaders(sessionToken),
  });

  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    const payload = await parseJsonOrNull(response);
    throw new Error(parseErrorMessage(payload, 'Could not export service quality report.'));
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] ?? 'service-catalog-quality.csv',
  };
}

export async function loginAdmin(
  apiBaseUrl: string,
  username: string,
  password: string,
) {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch (error) {
    throw new Error(parseNetworkErrorMessage(error, 'Login failed.'));
  }
  const payload = (await parseJsonOrNull(response)) as LoginResponse | { detail?: string } | null;
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, 'Login failed.'));
  }
  return payload as LoginResponse;
}

export async function sendAdminConfirmationEmail(
  apiBaseUrl: string,
  sessionToken: string,
  bookingReference: string,
  note: string | null,
) {
  const response = await fetch(`${apiBaseUrl}/admin/bookings/${bookingReference}/confirm-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify({ note }),
  });
  const payload = (await parseJsonOrNull(response)) as EmailSendResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not send confirmation email.'));
  }
  return payload as EmailSendResponse;
}

export async function applyAdminPortalSupportAction(
  apiBaseUrl: string,
  sessionToken: string,
  requestId: number,
  action: 'reviewed' | 'escalated',
  note: string | null,
) {
  const response = await fetch(`${apiBaseUrl}/admin/portal-support/${requestId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify({ note }),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminPortalSupportActionResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not update portal support request.'));
  }
  return payload as AdminPortalSupportActionResponse;
}

export async function sendAdminDiscordHandoff(
  apiBaseUrl: string,
  sessionToken: string,
  payload: {
    title: string;
    summary: string;
    lane_label?: string;
    handoff_format?: string;
  },
) {
  const response = await fetch(`${apiBaseUrl}/admin/reliability/handoff/discord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await parseJsonOrNull(response)) as
    | AdminDiscordHandoffResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(responsePayload, 'Could not send Discord team update.'));
  }
  return responsePayload as AdminDiscordHandoffResponse;
}

export async function uploadAdminImage(
  apiBaseUrl: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBaseUrl}/uploads/images`, {
    method: 'POST',
    body: formData,
  });
  const payload = (await parseJsonOrNull(response)) as UploadResponse | { detail?: string } | null;
  if (!response.ok) {
    throw new Error(parseErrorMessage(payload, 'Image upload failed.'));
  }
  return payload as UploadResponse;
}

export async function saveAdminPartner(
  apiBaseUrl: string,
  sessionToken: string,
  editingPartnerId: number | null,
  partnerForm: unknown,
) {
  const endpoint = editingPartnerId
    ? `${apiBaseUrl}/admin/partners/${editingPartnerId}`
    : `${apiBaseUrl}/admin/partners`;
  const method = editingPartnerId ? 'PUT' : 'POST';

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify(partnerForm),
  });
  const payload = (await parseJsonOrNull(response)) as PartnerProfileListResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not save partner.'));
  }
  return payload as PartnerProfileListResponse;
}

export async function fetchAdminTenants(
  apiBaseUrl: string,
  sessionToken: string,
) {
  const response = await fetch(`${apiBaseUrl}/admin/tenants`, {
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as AdminTenantListResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load tenants.'));
  }
  return payload as AdminTenantListResponse;
}

export async function fetchAdminTenantDetail(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
) {
  const response = await fetch(`${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}`, {
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as AdminTenantDetailResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not load tenant detail.'));
  }
  return payload as AdminTenantDetailResponse;
}

export async function updateAdminTenantProfile(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
  form: unknown,
) {
  const response = await fetch(`${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify(form),
  });
  const payload = (await parseJsonOrNull(response)) as AdminTenantDetailResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not update tenant profile.'));
  }
  return payload as AdminTenantDetailResponse;
}

export async function updateAdminTenantMember(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
  memberEmail: string,
  form: unknown,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}/members/${encodeURIComponent(memberEmail)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...createAdminAuthHeaders(sessionToken),
      },
      body: JSON.stringify(form),
    },
  );
  const payload = (await parseJsonOrNull(response)) as AdminTenantDetailResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not update tenant member access.'));
  }
  return payload as AdminTenantDetailResponse;
}

export async function createAdminTenantService(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
  form: unknown,
) {
  const response = await fetch(`${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify(form),
  });
  const payload = (await parseJsonOrNull(response)) as AdminTenantCatalogResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not create tenant service.'));
  }
  return payload as AdminTenantCatalogResponse;
}

export async function updateAdminTenantService(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
  serviceRowId: number,
  form: unknown,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}/services/${serviceRowId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...createAdminAuthHeaders(sessionToken),
      },
      body: JSON.stringify(form),
    },
  );
  const payload = (await parseJsonOrNull(response)) as AdminTenantCatalogResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not update tenant service.'));
  }
  return payload as AdminTenantCatalogResponse;
}

export async function deleteAdminTenantService(
  apiBaseUrl: string,
  sessionToken: string,
  tenantRef: string,
  serviceRowId: number,
) {
  const response = await fetch(
    `${apiBaseUrl}/admin/tenants/${encodeURIComponent(tenantRef)}/services/${serviceRowId}`,
    {
      method: 'DELETE',
      headers: createAdminAuthHeaders(sessionToken),
    },
  );
  const payload = (await parseJsonOrNull(response)) as AdminTenantCatalogResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not delete tenant service.'));
  }
  return payload as AdminTenantCatalogResponse;
}

export async function deleteAdminPartner(
  apiBaseUrl: string,
  sessionToken: string,
  partnerId: number,
) {
  const response = await fetch(`${apiBaseUrl}/admin/partners/${partnerId}`, {
    method: 'DELETE',
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as PartnerProfileListResponse | { detail?: string } | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not delete partner.'));
  }
  return payload as PartnerProfileListResponse;
}

export async function importAdminServicesFromWebsite(
  apiBaseUrl: string,
  sessionToken: string,
  serviceImportForm: unknown,
) {
  const response = await fetch(`${apiBaseUrl}/admin/services/import-website`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createAdminAuthHeaders(sessionToken),
    },
    body: JSON.stringify(serviceImportForm),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminServiceMerchantListResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not import services from website.'));
  }
  return payload as AdminServiceMerchantListResponse;
}

export async function deleteAdminService(
  apiBaseUrl: string,
  sessionToken: string,
  serviceRowId: number,
) {
  const response = await fetch(`${apiBaseUrl}/admin/services/${serviceRowId}`, {
    method: 'DELETE',
    headers: createAdminAuthHeaders(sessionToken),
  });
  const payload = (await parseJsonOrNull(response)) as
    | AdminServiceMerchantListResponse
    | { detail?: string }
    | null;
  if (!response.ok) {
    if (isUnauthorizedResponse(response)) {
      throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE);
    }
    throw new Error(parseErrorMessage(payload, 'Could not delete imported service.'));
  }
  return payload as AdminServiceMerchantListResponse;
}
