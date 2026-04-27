import { FormEvent, useEffect, useState } from 'react';

import {
  applyAdminMessageAction,
  applyAdminPortalSupportAction,
  createAdminTenantService,
  deleteAdminTenantService,
  deleteAdminPartner,
  deleteAdminService,
  claimAdminPendingHandoff,
  fetchAdminMessageDetail,
  fetchAdminMessaging,
  fetchAdminPendingHandoffs,
  releaseAdminPendingHandoff,
  downloadAdminServiceQualityExport,
  fetchAdminBookingDetail,
  fetchAdminDashboardData,
  fetchAdminTenantDetail,
  fetchAdminTenants,
  importAdminServicesFromWebsite,
  loginAdmin,
  saveAdminPartner,
  sendAdminConfirmationEmail,
  updateAdminTenantMember,
  updateAdminTenantProfile,
  updateAdminTenantService,
  uploadAdminImage,
} from './api';
import {
  AdminApiRoute,
  AdminBookingDetailResponse,
  AdminBookingRecord,
  AdminConfigEntry,
  AdminCustomerAgentHealthResponse,
  AdminMessagingDetailResponse,
  AdminMessagingItem,
  AdminOverviewResponse,
  AdminPendingHandoffsResponse,
  AdminServiceCatalogQualityCounts,
  AdminServiceMerchantItem,
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantProfileFormState,
  AdminTenantServiceFormState,
  PartnerFormState,
  PartnerProfileItem,
  ShadowDriftExample,
  ShadowDriftReference,
  ServiceImportFormState,
  emptyAdminTenantProfileForm,
  emptyAdminTenantServiceForm,
  emptyPartnerForm,
  emptyServiceImportForm,
} from './types';
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  clearStoredAdminSession,
  isStoredAdminSessionExpired,
  loadStoredAdminSession,
  persistAdminSession,
} from './session';

export function useAdminPageState(apiBaseUrl: string) {
  const [username, setUsername] = useState('info@bookedai.au');
  const [password, setPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [sessionExpiry, setSessionExpiry] = useState('');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [bookings, setBookings] = useState<AdminBookingRecord[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingDetailResponse | null>(null);
  const [configItems, setConfigItems] = useState<AdminConfigEntry[]>([]);
  const [apiRoutes, setApiRoutes] = useState<AdminApiRoute[]>([]);
  const [messagingItems, setMessagingItems] = useState<AdminMessagingItem[]>([]);
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<AdminMessagingDetailResponse | null>(null);
  const [customerAgentHealth, setCustomerAgentHealth] = useState<AdminCustomerAgentHealthResponse | null>(null);
  const [messagingActionMessage, setMessagingActionMessage] = useState('');
  const [messagingActionSubmittingKey, setMessagingActionSubmittingKey] = useState<string | null>(null);
  const [pendingHandoffs, setPendingHandoffs] = useState<AdminPendingHandoffsResponse | null>(null);
  const [pendingHandoffsLoading, setPendingHandoffsLoading] = useState(false);
  const [pendingHandoffsError, setPendingHandoffsError] = useState<string | null>(null);
  const [claimingHandoffConversationId, setClaimingHandoffConversationId] = useState<string | null>(
    null,
  );
  const [partners, setPartners] = useState<PartnerProfileItem[]>([]);
  const [importedServices, setImportedServices] = useState<AdminServiceMerchantItem[]>([]);
  const [tenants, setTenants] = useState<AdminTenantListItem[]>([]);
  const [selectedTenantRef, setSelectedTenantRef] = useState('');
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<AdminTenantDetailResponse | null>(null);
  const [tenantProfileForm, setTenantProfileForm] = useState<AdminTenantProfileFormState>(
    emptyAdminTenantProfileForm,
  );
  const [editingTenantServiceId, setEditingTenantServiceId] = useState<number | null>(null);
  const [tenantServiceForm, setTenantServiceForm] = useState<AdminTenantServiceFormState>(
    emptyAdminTenantServiceForm,
  );
  const [tenantMessage, setTenantMessage] = useState('');
  const [serviceQualityCounts, setServiceQualityCounts] =
    useState<AdminServiceCatalogQualityCounts | null>(null);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(emptyPartnerForm);
  const [serviceImportForm, setServiceImportForm] = useState<ServiceImportFormState>(
    emptyServiceImportForm,
  );
  const [partnerMessage, setPartnerMessage] = useState('');
  const [serviceMessage, setServiceMessage] = useState('');
  const [savingPartner, setSavingPartner] = useState(false);
  const [importingServices, setImportingServices] = useState(false);
  const [exportingServiceQuality, setExportingServiceQuality] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingTenantProfile, setSavingTenantProfile] = useState(false);
  const [savingTenantMemberEmail, setSavingTenantMemberEmail] = useState<string | null>(null);
  const [savingTenantService, setSavingTenantService] = useState(false);
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
  const [portalSupportActionMessage, setPortalSupportActionMessage] = useState('');
  const [portalSupportActionSubmittingId, setPortalSupportActionSubmittingId] = useState<number | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [bookingsViewEnabled, setBookingsViewEnabled] = useState(false);
  const [bookingsShadowStatus, setBookingsShadowStatus] = useState('disabled');
  const [bookingsShadowMatched, setBookingsShadowMatched] = useState(0);
  const [bookingsShadowMismatch, setBookingsShadowMismatch] = useState(0);
  const [bookingsShadowMissing, setBookingsShadowMissing] = useState(0);
  const [bookingsShadowPaymentStatusMismatch, setBookingsShadowPaymentStatusMismatch] = useState(0);
  const [bookingsShadowAmountMismatch, setBookingsShadowAmountMismatch] = useState(0);
  const [bookingsShadowMeetingStatusMismatch, setBookingsShadowMeetingStatusMismatch] = useState(0);
  const [bookingsShadowWorkflowStatusMismatch, setBookingsShadowWorkflowStatusMismatch] = useState(0);
  const [bookingsShadowEmailStatusMismatch, setBookingsShadowEmailStatusMismatch] = useState(0);
  const [bookingsShadowFieldParityMismatch, setBookingsShadowFieldParityMismatch] = useState(0);
  const [bookingsShadowTopDriftReferences, setBookingsShadowTopDriftReferences] = useState<
    ShadowDriftReference[]
  >([]);
  const [bookingsShadowRecentDriftExamples, setBookingsShadowRecentDriftExamples] = useState<
    ShadowDriftExample[]
  >([]);
  const [error, setError] = useState('');

  function resetAdminState() {
    setSessionToken('');
    setSessionExpiry('');
    setOverview(null);
    setBookings([]);
    setBookingsTotal(0);
    setSelectedBooking(null);
    setConfigItems([]);
    setApiRoutes([]);
    setMessagingItems([]);
    setSelectedMessageDetail(null);
    setCustomerAgentHealth(null);
    setMessagingActionMessage('');
    setMessagingActionSubmittingKey(null);
    setPartners([]);
    setImportedServices([]);
    setTenants([]);
    setSelectedTenantRef('');
    setSelectedTenantDetail(null);
    setTenantProfileForm(emptyAdminTenantProfileForm());
    setEditingTenantServiceId(null);
    setTenantServiceForm(emptyAdminTenantServiceForm());
    setTenantMessage('');
    setServiceQualityCounts(null);
    setEditingPartnerId(null);
    setPartnerForm(emptyPartnerForm());
    setServiceImportForm(emptyServiceImportForm());
    setPartnerMessage('');
    setServiceMessage('');
    setConfirmationMessage('');
    setPortalSupportActionMessage('');
    setConfirmNote('');
    setBookingsViewEnabled(false);
    setBookingsShadowStatus('disabled');
    setBookingsShadowMatched(0);
    setBookingsShadowMismatch(0);
    setBookingsShadowMissing(0);
    setBookingsShadowPaymentStatusMismatch(0);
    setBookingsShadowAmountMismatch(0);
    setBookingsShadowMeetingStatusMismatch(0);
    setBookingsShadowWorkflowStatusMismatch(0);
    setBookingsShadowEmailStatusMismatch(0);
    setBookingsShadowFieldParityMismatch(0);
    setBookingsShadowTopDriftReferences([]);
    setBookingsShadowRecentDriftExamples([]);
  }

  function expireAdminSession(message = ADMIN_SESSION_EXPIRED_MESSAGE) {
    clearStoredAdminSession();
    resetAdminState();
    setError(message);
  }

  function resolveErrorMessage(requestError: unknown, fallback: string) {
    return requestError instanceof Error ? requestError.message : fallback;
  }

  useEffect(() => {
    const savedSession = loadStoredAdminSession();
    if (savedSession.username) {
      setUsername(savedSession.username);
    }
    if (
      savedSession.token &&
      savedSession.expiresAt &&
      isStoredAdminSessionExpired(savedSession.expiresAt)
    ) {
      clearStoredAdminSession();
      setSessionExpiry('');
      setError(ADMIN_SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (savedSession.token) {
      setSessionToken(savedSession.token);
    }
    if (savedSession.expiresAt) {
      setSessionExpiry(savedSession.expiresAt);
    }
  }, []);

  useEffect(() => {
    if (sessionToken) {
      void loadDashboard();
    }
  }, [sessionToken]);

  function updateServiceImportForm<K extends keyof ServiceImportFormState>(
    field: K,
    value: ServiceImportFormState[K],
  ) {
    setServiceImportForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePartnerForm<K extends keyof PartnerFormState>(
    field: K,
    value: PartnerFormState[K],
  ) {
    setPartnerForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTenantProfileForm<K extends keyof AdminTenantProfileFormState>(
    field: K,
    value: AdminTenantProfileFormState[K],
  ) {
    setTenantProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTenantServiceForm<K extends keyof AdminTenantServiceFormState>(
    field: K,
    value: AdminTenantServiceFormState[K],
  ) {
    setTenantServiceForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyTenantDetail(detail: AdminTenantDetailResponse) {
    setSelectedTenantDetail(detail);
    setSelectedTenantRef(detail.tenant.slug);
    setTenantProfileForm({
      business_name: detail.tenant.name ?? '',
      industry: detail.tenant.industry ?? '',
      timezone: detail.tenant.timezone ?? '',
      locale: detail.tenant.locale ?? '',
      logo_url: detail.workspace.logo_url ?? '',
      hero_image_url: detail.workspace.hero_image_url ?? '',
      introduction_html: detail.workspace.introduction_html ?? '',
      guide_overview: detail.workspace.guides.overview ?? '',
      guide_experience: detail.workspace.guides.experience ?? '',
      guide_catalog: detail.workspace.guides.catalog ?? '',
      guide_plugin: detail.workspace.guides.plugin ?? '',
      guide_bookings: detail.workspace.guides.bookings ?? '',
      guide_integrations: detail.workspace.guides.integrations ?? '',
      guide_billing: detail.workspace.guides.billing ?? '',
      guide_team: detail.workspace.guides.team ?? '',
    });
  }

  async function loadTenantDetail(tenantRef: string) {
    const payload = await fetchAdminTenantDetail(apiBaseUrl, sessionToken, tenantRef);
    applyTenantDetail(payload);
  }

  function editTenantService(service: AdminServiceMerchantItem) {
    setEditingTenantServiceId(service.id);
    setTenantServiceForm({
      name: service.name ?? '',
      business_name: service.business_name ?? '',
      business_email: service.business_email ?? '',
      category: service.category ?? '',
      summary: service.summary ?? '',
      amount_aud: service.amount_aud == null ? '' : String(service.amount_aud),
      currency_code: service.currency_code ?? 'AUD',
      display_price: service.display_price ?? '',
      duration_minutes: service.duration_minutes == null ? '' : String(service.duration_minutes),
      venue_name: service.venue_name ?? '',
      location: service.location ?? '',
      map_url: service.map_url ?? '',
      booking_url: service.booking_url ?? '',
      image_url: service.image_url ?? '',
      source_url: service.source_url ?? '',
      tags: (service.tags ?? []).join(', '),
      featured: service.featured,
      publish_state:
        service.publish_state === 'published' || service.publish_state === 'archived'
          ? service.publish_state
          : 'draft',
    });
  }

  function buildTenantServicePayload(
    service: AdminServiceMerchantItem,
    publishState?: AdminTenantServiceFormState['publish_state'],
  ) {
    return {
      service_id: service.service_id,
      name: service.name ?? '',
      business_name: service.business_name ?? '',
      business_email: service.business_email ?? '',
      category: service.category ?? '',
      summary: service.summary ?? '',
      amount_aud: service.amount_aud,
      currency_code: service.currency_code ?? 'AUD',
      display_price: service.display_price ?? '',
      duration_minutes: service.duration_minutes,
      venue_name: service.venue_name ?? '',
      location: service.location ?? '',
      map_url: service.map_url ?? '',
      booking_url: service.booking_url ?? '',
      image_url: service.image_url ?? '',
      source_url: service.source_url ?? '',
      tags: service.tags ?? [],
      featured: service.featured,
      publish_state:
        publishState ??
        (service.publish_state === 'published' || service.publish_state === 'archived'
          ? service.publish_state
          : 'draft'),
    };
  }

  function resetTenantServiceForm() {
    setEditingTenantServiceId(null);
    setTenantServiceForm(emptyAdminTenantServiceForm());
  }

  async function loadBookingDetail(bookingReference: string) {
    const payload = await fetchAdminBookingDetail(apiBaseUrl, sessionToken, bookingReference);
    setSelectedBooking(payload);
  }

  async function loadMessageDetail(sourceKind: string, itemId: string) {
    const payload = await fetchAdminMessageDetail(apiBaseUrl, sessionToken, sourceKind, itemId);
    setSelectedMessageDetail(payload);
  }

  async function refreshPendingHandoffs() {
    if (!sessionToken) {
      return;
    }
    setPendingHandoffsLoading(true);
    setPendingHandoffsError(null);
    try {
      const payload = await fetchAdminPendingHandoffs(apiBaseUrl, sessionToken, 60, 72);
      setPendingHandoffs(payload);
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not load pending handoffs.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setPendingHandoffsError(message);
    } finally {
      setPendingHandoffsLoading(false);
    }
  }

  async function releasePendingHandoff(conversationId: string) {
    if (!sessionToken || !conversationId) {
      return;
    }
    setClaimingHandoffConversationId(conversationId);
    setPendingHandoffsError(null);
    try {
      await releaseAdminPendingHandoff(apiBaseUrl, sessionToken, conversationId);
      void refreshPendingHandoffs();
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not release this handoff.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setPendingHandoffsError(message);
    } finally {
      setClaimingHandoffConversationId(null);
    }
  }

  async function claimPendingHandoff(conversationId: string) {
    if (!sessionToken || !conversationId) {
      return;
    }
    setClaimingHandoffConversationId(conversationId);
    setPendingHandoffsError(null);
    try {
      const result = await claimAdminPendingHandoff(apiBaseUrl, sessionToken, conversationId);
      // Optimistic update: mark this row claimed locally so the queue hides it
      // on the next refresh and the button flips to "Claimed".
      setPendingHandoffs((current) => {
        if (!current) {
          return current;
        }
        const items = current.items.map((item) =>
          item.conversation_id === conversationId
            ? {
                ...item,
                claim_active: true,
                claimed_at: result.claimed_at,
                claimed_by: result.claimed_by,
              }
            : item,
        );
        return { ...current, items };
      });
      // Refresh from the server to drop claimed rows from the queue.
      void refreshPendingHandoffs();
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not claim this handoff.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setPendingHandoffsError(message);
    } finally {
      setClaimingHandoffConversationId(null);
    }
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

      const {
        overview: overviewPayload,
        bookings: bookingsPayload,
        config: configPayload,
        apiInventory: apiInventoryPayload,
        messaging: messagingPayload,
        customerAgentHealth: customerAgentHealthPayload,
        partners: partnersPayload,
        services: servicesPayload,
        serviceQuality: serviceQualityPayload,
        bookingsViewEnabled: nextBookingsViewEnabled,
        bookingsShadowStatus: nextBookingsShadowStatus,
        bookingsShadowMatched: nextBookingsShadowMatched,
        bookingsShadowMismatch: nextBookingsShadowMismatch,
        bookingsShadowMissing: nextBookingsShadowMissing,
        bookingsShadowPaymentStatusMismatch: nextBookingsShadowPaymentStatusMismatch,
        bookingsShadowAmountMismatch: nextBookingsShadowAmountMismatch,
        bookingsShadowMeetingStatusMismatch: nextBookingsShadowMeetingStatusMismatch,
        bookingsShadowWorkflowStatusMismatch: nextBookingsShadowWorkflowStatusMismatch,
        bookingsShadowEmailStatusMismatch: nextBookingsShadowEmailStatusMismatch,
        bookingsShadowFieldParityMismatch: nextBookingsShadowFieldParityMismatch,
        bookingsShadowTopDriftReferences: nextBookingsShadowTopDriftReferences,
        bookingsShadowRecentDriftExamples: nextBookingsShadowRecentDriftExamples,
      } = await fetchAdminDashboardData(apiBaseUrl, sessionToken, search);

      setOverview(overviewPayload);
      setBookings(bookingsPayload.items);
      setBookingsTotal(bookingsPayload.total);
      setConfigItems(configPayload.items);
      setApiRoutes(apiInventoryPayload.items);
      setMessagingItems(messagingPayload.items);
      setCustomerAgentHealth(customerAgentHealthPayload);
      setPartners(partnersPayload.items);
      setImportedServices(servicesPayload.items);
      setServiceQualityCounts(serviceQualityPayload.counts);
      setBookingsViewEnabled(nextBookingsViewEnabled);
      setBookingsShadowStatus(nextBookingsShadowStatus);
      setBookingsShadowMatched(nextBookingsShadowMatched);
      setBookingsShadowMismatch(nextBookingsShadowMismatch);
      setBookingsShadowMissing(nextBookingsShadowMissing);
      setBookingsShadowPaymentStatusMismatch(nextBookingsShadowPaymentStatusMismatch);
      setBookingsShadowAmountMismatch(nextBookingsShadowAmountMismatch);
      setBookingsShadowMeetingStatusMismatch(nextBookingsShadowMeetingStatusMismatch);
      setBookingsShadowWorkflowStatusMismatch(nextBookingsShadowWorkflowStatusMismatch);
      setBookingsShadowEmailStatusMismatch(nextBookingsShadowEmailStatusMismatch);
      setBookingsShadowFieldParityMismatch(nextBookingsShadowFieldParityMismatch);
      setBookingsShadowTopDriftReferences(nextBookingsShadowTopDriftReferences);
      setBookingsShadowRecentDriftExamples(nextBookingsShadowRecentDriftExamples);

      if (bookingsPayload.items.length > 0) {
        await loadBookingDetail(bookingsPayload.items[0].booking_reference);
      } else {
        setSelectedBooking(null);
      }

      if (messagingPayload.items.length > 0) {
        const firstItem = messagingPayload.items[0];
        await loadMessageDetail(firstItem.source_kind, firstItem.item_id);
      } else {
        setSelectedMessageDetail(null);
      }

      const tenantPayload = await fetchAdminTenants(apiBaseUrl, sessionToken);
      setTenants(tenantPayload.items);
      const nextTenantRef = selectedTenantRef || tenantPayload.items[0]?.slug;
      if (nextTenantRef) {
        await loadTenantDetail(nextTenantRef);
      } else {
        setSelectedTenantDetail(null);
      }
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not load admin dashboard.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function applyPortalSupportAction(
    requestId: number,
    action: 'reviewed' | 'escalated',
    note?: string | null,
  ) {
    if (!sessionToken) {
      return;
    }
    setPortalSupportActionSubmittingId(requestId);
    setPortalSupportActionMessage('');
    setError('');

    try {
      const response = await applyAdminPortalSupportAction(
        apiBaseUrl,
        sessionToken,
        requestId,
        action,
        note ?? null,
      );
      setPortalSupportActionMessage(response.message);
      await loadDashboard();
    } catch (requestError) {
      const message = resolveErrorMessage(
        requestError,
        'Could not update the portal support request.',
      );
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setPortalSupportActionSubmittingId(null);
    }
  }

  async function retryMessage(
    sourceKind: string,
    itemId: string,
    note?: string | null,
  ) {
    if (!sessionToken) {
      return;
    }
    const actionKey = `${sourceKind}:${itemId}:retry`;
    setMessagingActionSubmittingKey(actionKey);
    setMessagingActionMessage('');
    setError('');
    try {
      const response = await applyAdminMessageAction(
        apiBaseUrl,
        sessionToken,
        sourceKind,
        itemId,
        'retry',
        note ?? null,
      );
      setMessagingActionMessage(response.message);
      const messagingPayload = await fetchAdminMessaging(apiBaseUrl, sessionToken, 60);
      setMessagingItems(messagingPayload.items);
      await loadMessageDetail(sourceKind, itemId);
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not retry the message.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setMessagingActionSubmittingKey(null);
    }
  }

  async function markMessageManualFollowUp(
    sourceKind: string,
    itemId: string,
    note?: string | null,
  ) {
    if (!sessionToken) {
      return;
    }
    const actionKey = `${sourceKind}:${itemId}:manual`;
    setMessagingActionSubmittingKey(actionKey);
    setMessagingActionMessage('');
    setError('');
    try {
      const response = await applyAdminMessageAction(
        apiBaseUrl,
        sessionToken,
        sourceKind,
        itemId,
        'mark_manual_follow_up',
        note ?? null,
      );
      setMessagingActionMessage(response.message);
      const messagingPayload = await fetchAdminMessaging(apiBaseUrl, sessionToken, 60);
      setMessagingItems(messagingPayload.items);
      await loadMessageDetail(sourceKind, itemId);
    } catch (requestError) {
      const message = resolveErrorMessage(
        requestError,
        'Could not mark the message for manual follow-up.',
      );
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setMessagingActionSubmittingKey(null);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
      const payload = await loginAdmin(apiBaseUrl, username, password);
      persistAdminSession({
        token: payload.session_token,
        username: payload.username,
        expiresAt: payload.expires_at,
      });
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
    clearStoredAdminSession();
    resetAdminState();
    setError('');
  }

  async function sendConfirmationEmail() {
    if (!selectedBooking) {
      return;
    }
    setSendingConfirmation(true);
    setConfirmationMessage('');
    setError('');
    try {
      const payload = await sendAdminConfirmationEmail(
        apiBaseUrl,
        sessionToken,
        selectedBooking.booking.booking_reference,
        confirmNote.trim() || null,
      );
      setConfirmationMessage(payload.message);
      await loadDashboard();
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not send confirmation email.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
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
      const imagePayload = await uploadAdminImage(apiBaseUrl, file);
      setPartnerForm((current) => ({
        ...current,
        logo_url: kind === 'logo' ? imagePayload.url : current.logo_url,
        image_url: kind === 'image' ? imagePayload.url : current.image_url,
      }));
      setPartnerMessage(`${kind === 'logo' ? 'Logo' : 'Image'} uploaded successfully.`);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Image upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  async function uploadTenantAsset(file: File, kind: 'logo' | 'image') {
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingImage;
    setUploading(true);
    setError('');
    setTenantMessage('');

    try {
      const imagePayload = await uploadAdminImage(apiBaseUrl, file);
      setTenantProfileForm((current) => ({
        ...current,
        logo_url: kind === 'logo' ? imagePayload.url : current.logo_url,
        hero_image_url: kind === 'image' ? imagePayload.url : current.hero_image_url,
      }));
      setTenantMessage(
        `${kind === 'logo' ? 'Tenant logo' : 'Tenant hero image'} uploaded successfully.`,
      );
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Tenant image upload failed.'));
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
      const payload = await saveAdminPartner(
        apiBaseUrl,
        sessionToken,
        editingPartnerId,
        partnerForm,
      );
      setPartners(payload.items);
      setPartnerMessage(editingPartnerId ? 'Partner profile updated.' : 'Partner profile created.');
      resetPartnerForm();
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not save partner.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setSavingPartner(false);
    }
  }

  async function deletePartner(partnerId: number) {
    setError('');
    setPartnerMessage('');
    try {
      const payload = await deleteAdminPartner(apiBaseUrl, sessionToken, partnerId);
      setPartners(payload.items);
      if (editingPartnerId === partnerId) {
        resetPartnerForm();
      }
      setPartnerMessage('Partner profile deleted.');
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not delete partner.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    }
  }

  async function importServicesFromWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportingServices(true);
    setServiceMessage('');
    setError('');

    try {
      const payload = await importAdminServicesFromWebsite(
        apiBaseUrl,
        sessionToken,
        serviceImportForm,
      );
      setImportedServices(payload.items);
      setServiceMessage('Website scanned and services imported into the live catalog.');
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not import services from website.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setImportingServices(false);
    }
  }

  async function deleteImportedService(serviceRowId: number) {
    setError('');
    setServiceMessage('');

    try {
      const payload = await deleteAdminService(apiBaseUrl, sessionToken, serviceRowId);
      setImportedServices(payload.items);
      setServiceMessage('Imported service removed from the live catalog.');
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not delete imported service.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    }
  }

  async function exportServiceQualityReport() {
    if (!sessionToken || typeof window === 'undefined') {
      return;
    }

    setExportingServiceQuality(true);
    setError('');
    setServiceMessage('');

    try {
      const { blob, filename } = await downloadAdminServiceQualityExport(
        apiBaseUrl,
        sessionToken,
        { searchReady: false },
      );
      const objectUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
      setServiceMessage('Downloaded catalog quality report for non-search-ready records.');
    } catch (requestError) {
      const message = resolveErrorMessage(
        requestError,
        'Could not export the catalog quality report.',
      );
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setExportingServiceQuality(false);
    }
  }

  async function saveTenantProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantRef) {
      return;
    }

    setSavingTenantProfile(true);
    setTenantMessage('');
    setError('');

    try {
      const payload = await updateAdminTenantProfile(
        apiBaseUrl,
        sessionToken,
        selectedTenantRef,
        tenantProfileForm,
      );
      applyTenantDetail(payload);
      setTenants((current) =>
        current.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setTenantMessage('Tenant profile updated.');
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not update tenant profile.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setSavingTenantProfile(false);
    }
  }

  async function saveTenantMemberAccess(
    memberEmail: string,
    form: { full_name?: string | null; role?: string | null; status?: string | null },
  ) {
    if (!selectedTenantRef) {
      return;
    }

    setSavingTenantMemberEmail(memberEmail);
    setTenantMessage('');
    setError('');

    try {
      const payload = await updateAdminTenantMember(
        apiBaseUrl,
        sessionToken,
        selectedTenantRef,
        memberEmail,
        form,
      );
      applyTenantDetail(payload);
      setTenants((current) =>
        current.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setTenantMessage('Tenant member access updated.');
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not update tenant member access.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setSavingTenantMemberEmail(null);
    }
  }

  async function saveTenantService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantRef) {
      return;
    }

    setSavingTenantService(true);
    setTenantMessage('');
    setError('');

    try {
      const payload = editingTenantServiceId
        ? await updateAdminTenantService(
            apiBaseUrl,
            sessionToken,
            selectedTenantRef,
            editingTenantServiceId,
            {
              ...tenantServiceForm,
              amount_aud: tenantServiceForm.amount_aud ? Number(tenantServiceForm.amount_aud) : null,
              duration_minutes: tenantServiceForm.duration_minutes
                ? Number(tenantServiceForm.duration_minutes)
                : null,
              tags: tenantServiceForm.tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            },
          )
        : await createAdminTenantService(apiBaseUrl, sessionToken, selectedTenantRef, {
            ...tenantServiceForm,
            amount_aud: tenantServiceForm.amount_aud ? Number(tenantServiceForm.amount_aud) : null,
            duration_minutes: tenantServiceForm.duration_minutes
              ? Number(tenantServiceForm.duration_minutes)
              : null,
            tags: tenantServiceForm.tags
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          });
      await loadTenantDetail(payload.tenant.slug);
      setTenants((current) =>
        current.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setTenantMessage(editingTenantServiceId ? 'Tenant service updated.' : 'Tenant service created.');
      resetTenantServiceForm();
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not save tenant service.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setSavingTenantService(false);
    }
  }

  async function removeTenantService(serviceRowId: number) {
    if (!selectedTenantRef) {
      return;
    }

    setTenantMessage('');
    setError('');

    try {
      const payload = await deleteAdminTenantService(
        apiBaseUrl,
        sessionToken,
        selectedTenantRef,
        serviceRowId,
      );
      await loadTenantDetail(payload.tenant.slug);
      setTenants((current) =>
        current.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setTenantMessage('Tenant service deleted.');
      if (editingTenantServiceId === serviceRowId) {
        resetTenantServiceForm();
      }
    } catch (requestError) {
      const message = resolveErrorMessage(requestError, 'Could not delete tenant service.');
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    }
  }

  async function transitionTenantServiceState(
    service: AdminServiceMerchantItem,
    publishState: AdminTenantServiceFormState['publish_state'],
  ) {
    if (!selectedTenantRef) {
      return;
    }

    setSavingTenantService(true);
    setTenantMessage('');
    setError('');

    try {
      const payload = await updateAdminTenantService(
        apiBaseUrl,
        sessionToken,
        selectedTenantRef,
        service.id,
        buildTenantServicePayload(service, publishState),
      );
      await loadTenantDetail(payload.tenant.slug);
      setTenants((current) =>
        current.map((item) => (item.id === payload.tenant.id ? payload.tenant : item)),
      );
      setTenantMessage(
        publishState === 'published'
          ? 'Tenant service published.'
          : publishState === 'archived'
            ? 'Tenant service archived.'
            : 'Tenant service moved to draft.',
      );
      if (editingTenantServiceId === service.id) {
        setTenantServiceForm((current) => ({
          ...current,
          publish_state: publishState,
        }));
      }
    } catch (requestError) {
      const message = resolveErrorMessage(
        requestError,
        'Could not update tenant service state.',
      );
      if (message === ADMIN_SESSION_EXPIRED_MESSAGE) {
        expireAdminSession(message);
        return;
      }
      setError(message);
    } finally {
      setSavingTenantService(false);
    }
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    sessionToken,
    sessionExpiry,
    overview,
    bookings,
    bookingsTotal,
    selectedBooking,
    configItems,
    apiRoutes,
    messagingItems,
    selectedMessageDetail,
    customerAgentHealth,
    messagingActionMessage,
    messagingActionSubmittingKey,
    pendingHandoffs,
    pendingHandoffsLoading,
    pendingHandoffsError,
    refreshPendingHandoffs,
    claimPendingHandoff,
    releasePendingHandoff,
    claimingHandoffConversationId,
    partners,
    importedServices,
    tenants,
    selectedTenantRef,
    selectedTenantDetail,
    tenantProfileForm,
    tenantServiceForm,
    editingTenantServiceId,
    tenantMessage,
    serviceQualityCounts,
    editingPartnerId,
    partnerForm,
    serviceImportForm,
    partnerMessage,
    serviceMessage,
    savingPartner,
    importingServices,
    exportingServiceQuality,
    uploadingLogo,
    uploadingImage,
    savingTenantProfile,
    savingTenantMemberEmail,
    savingTenantService,
    searchQuery,
    setSearchQuery,
    industryFilter,
    setIndustryFilter,
    paymentFilter,
    setPaymentFilter,
    emailFilter,
    setEmailFilter,
    workflowFilter,
    setWorkflowFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    confirmNote,
    setConfirmNote,
    sendingConfirmation,
    confirmationMessage,
    portalSupportActionMessage,
    portalSupportActionSubmittingId,
    loggingIn,
    loadingDashboard,
    bookingsViewEnabled,
    bookingsShadowStatus,
    bookingsShadowMatched,
    bookingsShadowMismatch,
    bookingsShadowMissing,
    bookingsShadowPaymentStatusMismatch,
    bookingsShadowAmountMismatch,
    bookingsShadowMeetingStatusMismatch,
    bookingsShadowWorkflowStatusMismatch,
    bookingsShadowEmailStatusMismatch,
    bookingsShadowFieldParityMismatch,
    bookingsShadowTopDriftReferences,
    bookingsShadowRecentDriftExamples,
    error,
    updateServiceImportForm,
    updatePartnerForm,
    updateTenantProfileForm,
    updateTenantServiceForm,
    loadBookingDetail,
    loadMessageDetail,
    loadTenantDetail,
    loadDashboard,
    handleLogin,
    handleLogout,
    sendConfirmationEmail,
    applyPortalSupportAction,
    retryMessage,
    markMessageManualFollowUp,
    editPartner,
    resetPartnerForm,
    uploadPartnerAsset,
    uploadTenantAsset,
    savePartner,
    deletePartner,
    importServicesFromWebsite,
    deleteImportedService,
    exportServiceQualityReport,
    saveTenantProfile,
    saveTenantMemberAccess,
    editTenantService,
    transitionTenantServiceState,
    resetTenantServiceForm,
    saveTenantService,
    removeTenantService,
    setSelectedTenantRef,
  };
}
