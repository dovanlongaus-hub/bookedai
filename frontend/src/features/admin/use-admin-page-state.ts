import { FormEvent, useEffect, useState } from 'react';

import {
  applyAdminPortalSupportAction,
  deleteAdminPartner,
  deleteAdminService,
  downloadAdminServiceQualityExport,
  fetchAdminBookingDetail,
  fetchAdminDashboardData,
  importAdminServicesFromWebsite,
  loginAdmin,
  saveAdminPartner,
  sendAdminConfirmationEmail,
  uploadAdminImage,
} from './api';
import {
  AdminApiRoute,
  AdminBookingDetailResponse,
  AdminBookingRecord,
  AdminConfigEntry,
  AdminOverviewResponse,
  AdminServiceCatalogQualityCounts,
  AdminServiceMerchantItem,
  PartnerFormState,
  PartnerProfileItem,
  ShadowDriftExample,
  ShadowDriftReference,
  ServiceImportFormState,
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
  const [partners, setPartners] = useState<PartnerProfileItem[]>([]);
  const [importedServices, setImportedServices] = useState<AdminServiceMerchantItem[]>([]);
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
    setPartners([]);
    setImportedServices([]);
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

  async function loadBookingDetail(bookingReference: string) {
    const payload = await fetchAdminBookingDetail(apiBaseUrl, sessionToken, bookingReference);
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

      const {
        overview: overviewPayload,
        bookings: bookingsPayload,
        config: configPayload,
        apiInventory: apiInventoryPayload,
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
    partners,
    importedServices,
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
    loadBookingDetail,
    loadDashboard,
    handleLogin,
    handleLogout,
    sendConfirmationEmail,
    applyPortalSupportAction,
    editPartner,
    resetPartnerForm,
    uploadPartnerAsset,
    savePartner,
    deletePartner,
    importServicesFromWebsite,
    deleteImportedService,
    exportServiceQualityReport,
  };
}
