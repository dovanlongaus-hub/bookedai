import { FormEvent, Suspense, lazy, useEffect, useState } from 'react';

import { AdminBookingsSection } from '../features/admin/bookings-section';
import { AdminDashboardHeader } from '../features/admin/dashboard-header';
import { AdminEmailStatusNote } from '../features/admin/email-status-note';
import { AdminLoginScreen } from '../features/admin/login-screen';
import { RecentEventsSection } from '../features/admin/recent-events-section';
import { ServiceCatalogSection } from '../features/admin/service-catalog-section';
import { SelectedBookingPanel } from '../features/admin/selected-booking-panel';
import { PartnersSection } from '../features/admin/partners-section';
import { PortalSupportQueueSection } from '../features/admin/portal-support-queue-section';
import { AdminWorkspaceNav } from '../features/admin/workspace-nav';
import { AdminWorkspaceInsights } from '../features/admin/workspace-insights';
import { useAdminPageState } from '../features/admin/use-admin-page-state';
import { AdminWorkspaceId, AdminWorkspacePanelId } from '../features/admin/types';
import { getApiBaseUrl } from '../shared/config/api';

const ReliabilityWorkspace = lazy(async () => {
  const module = await import('../features/admin/reliability-workspace');
  return { default: module.ReliabilityWorkspace };
});

type ParsedAdminHash = {
  workspace: AdminWorkspaceId;
  panel: AdminWorkspacePanelId | null;
};

const workspacePanels: Record<AdminWorkspaceId, AdminWorkspacePanelId[]> = {
  operations: ['bookings', 'recent-events', 'selected-booking', 'portal-support'],
  catalog: ['service-catalog', 'partners'],
  reliability: ['prompt5-preview', 'live-configuration', 'api-inventory'],
};

function isWorkspaceId(value: string): value is AdminWorkspaceId {
  return value === 'operations' || value === 'catalog' || value === 'reliability';
}

function parseAdminHash(hash: string): ParsedAdminHash {
  const normalizedHash = hash.replace(/^#/, '').trim();
  if (!normalizedHash) {
    return { workspace: 'operations', panel: null };
  }

  const [workspaceCandidate, panelCandidate] = normalizedHash.split(':');
  if (!isWorkspaceId(workspaceCandidate)) {
    return { workspace: 'operations', panel: null };
  }

  if (!panelCandidate) {
    return { workspace: workspaceCandidate, panel: null };
  }

  return {
    workspace: workspaceCandidate,
    panel:
      workspacePanels[workspaceCandidate].find((candidate) => candidate === panelCandidate) ??
      null,
  };
}

export function AdminPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [reviewFocusKey, setReviewFocusKey] = useState('');
  const [reviewFocusSource, setReviewFocusSource] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspaceId>(() => {
    if (typeof window === 'undefined') {
      return 'operations';
    }
    return parseAdminHash(window.location.hash).workspace;
  });
  const [activePanel, setActivePanel] = useState<AdminWorkspacePanelId | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return parseAdminHash(window.location.hash).panel;
  });
  const {
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
  } = useAdminPageState(apiBaseUrl);

  async function openBookingDetailFromReview(
    bookingReference: string,
    source: string,
  ) {
    await loadBookingDetail(bookingReference);
    setReviewFocusSource(source);
    setReviewFocusKey(`${source}:${bookingReference}:${Date.now()}`);
  }

  function changeWorkspace(nextWorkspace: AdminWorkspaceId) {
    setActiveWorkspace(nextWorkspace);
    setActivePanel(null);
    if (typeof window !== 'undefined') {
      window.location.hash = nextWorkspace;
    }
  }

  function changePanel(nextPanel: AdminWorkspacePanelId) {
    if (!workspacePanels[activeWorkspace].includes(nextPanel)) {
      return;
    }
    setActivePanel(nextPanel);
    if (typeof window !== 'undefined') {
      window.location.hash = `${activeWorkspace}:${nextPanel}`;
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncWorkspaceFromHash() {
      const parsedHash = parseAdminHash(window.location.hash);
      setActiveWorkspace(parsedHash.workspace);
      setActivePanel(parsedHash.panel);
    }

    window.addEventListener('hashchange', syncWorkspaceFromHash);
    return () => {
      window.removeEventListener('hashchange', syncWorkspaceFromHash);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !activePanel) {
      return;
    }

    const panelId = activePanel;
    let cancelled = false;

    function focusActivePanel(attemptsRemaining: number) {
      if (cancelled) {
        return;
      }

      const target = window.document.getElementById(panelId);
      if (!target) {
        if (attemptsRemaining > 0) {
          window.setTimeout(() => focusActivePanel(attemptsRemaining - 1), 120);
        }
        return;
      }

      target.scrollIntoView({ behavior: 'auto', block: 'start' });

      if (target instanceof HTMLElement) {
        const ensureFocus = () => {
          if (cancelled) {
            return;
          }

          target.focus({ preventScroll: true });

          if (window.document.activeElement !== target && attemptsRemaining > 0) {
            window.setTimeout(() => focusActivePanel(attemptsRemaining - 1), 120);
          }
        };

        window.requestAnimationFrame(() => {
          if (!cancelled) {
            ensureFocus();
            window.setTimeout(ensureFocus, 120);
          }
        });
      }
    }

    focusActivePanel(4);

    return () => {
      cancelled = true;
    };
  }, [activePanel]);

  if (!sessionToken) {
    return (
      <AdminLoginScreen
        username={username}
        password={password}
        loggingIn={loggingIn}
        error={error}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="booked-admin-shell booked-page-shell">
      <div className="booked-page-frame booked-page-frame--wide booked-page-stack">
        <AdminDashboardHeader
          username={username}
          sessionExpiry={sessionExpiry}
          loadingDashboard={loadingDashboard}
          metrics={overview?.metrics ?? []}
          onRefresh={() => {
            void loadDashboard();
          }}
          onLogout={handleLogout}
        />

        <AdminWorkspaceNav
          activeWorkspace={activeWorkspace}
          apiBaseUrl={apiBaseUrl}
          onWorkspaceChange={changeWorkspace}
        />

        <AdminWorkspaceInsights
          activeWorkspace={activeWorkspace}
          activePanel={activePanel}
          bookingsTotal={bookingsTotal}
          shadowStatus={bookingsShadowStatus}
          portalSupportQueueCount={overview?.portal_support_queue?.length ?? 0}
          importedServicesCount={importedServices.length}
          partnersCount={partners.length}
          configItemsCount={configItems.length}
          apiRoutesCount={apiRoutes.length}
          selectedBookingReference={selectedBooking?.booking.booking_reference ?? null}
          selectedServiceId={selectedBooking?.booking.service_id ?? null}
          onPanelNavigate={changePanel}
        />

        {activeWorkspace === 'operations' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <div id="bookings">
                <AdminBookingsSection
                  bookings={bookings}
                  bookingsTotal={bookingsTotal}
                  searchQuery={searchQuery}
                  industryFilter={industryFilter}
                  paymentFilter={paymentFilter}
                  emailFilter={emailFilter}
                  workflowFilter={workflowFilter}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onSearchQueryChange={setSearchQuery}
                  onIndustryFilterChange={setIndustryFilter}
                  onPaymentFilterChange={setPaymentFilter}
                  onEmailFilterChange={setEmailFilter}
                  onWorkflowFilterChange={setWorkflowFilter}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                  onSubmitSearch={(event) => {
                    event.preventDefault();
                    void loadDashboard(searchQuery);
                  }}
                  onSelectBooking={(bookingReference) => {
                    setReviewFocusSource(null);
                    void loadBookingDetail(bookingReference);
                  }}
                  selectedBookingReference={selectedBooking?.booking.booking_reference ?? null}
                  enhancedViewEnabled={bookingsViewEnabled}
                  shadowStatus={bookingsShadowStatus}
                  shadowMatched={bookingsShadowMatched}
                  shadowMismatch={bookingsShadowMismatch}
                  shadowMissing={bookingsShadowMissing}
                  shadowPaymentStatusMismatch={bookingsShadowPaymentStatusMismatch}
                  shadowAmountMismatch={bookingsShadowAmountMismatch}
                  shadowMeetingStatusMismatch={bookingsShadowMeetingStatusMismatch}
                  shadowWorkflowStatusMismatch={bookingsShadowWorkflowStatusMismatch}
                  shadowEmailStatusMismatch={bookingsShadowEmailStatusMismatch}
                  shadowFieldParityMismatch={bookingsShadowFieldParityMismatch}
                  shadowTopDriftReferences={bookingsShadowTopDriftReferences}
                  shadowRecentDriftExamples={bookingsShadowRecentDriftExamples}
                  onSelectDriftBooking={(bookingReference) => {
                    void openBookingDetailFromReview(bookingReference, 'shadow review');
                  }}
                />
              </div>

              <div id="recent-events">
                <RecentEventsSection recentEvents={overview?.recent_events ?? []} />
              </div>

              <div id="portal-support">
                <PortalSupportQueueSection
                  items={overview?.portal_support_queue ?? []}
                  actionMessage={portalSupportActionMessage}
                  actionSubmittingId={portalSupportActionSubmittingId}
                  onSelectBooking={(bookingReference, source) => {
                    void openBookingDetailFromReview(bookingReference, source);
                  }}
                  onApplyAction={(requestId, action, note) => {
                    void applyPortalSupportAction(requestId, action, note);
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div id="selected-booking">
                <SelectedBookingPanel
                  selectedBooking={selectedBooking}
                  confirmNote={confirmNote}
                  confirmationMessage={confirmationMessage}
                  sendingConfirmation={sendingConfirmation}
                  onConfirmNoteChange={setConfirmNote}
                  onSendConfirmation={() => {
                    void sendConfirmationEmail();
                  }}
                  reviewFocusKey={reviewFocusKey}
                  reviewFocusSource={reviewFocusSource}
                />
              </div>

              <AdminEmailStatusNote />
            </div>
          </section>
        ) : null}

        {activeWorkspace === 'catalog' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <div id="service-catalog">
                <ServiceCatalogSection
                  serviceImportForm={serviceImportForm}
                  importedServices={importedServices}
                  serviceQualityCounts={serviceQualityCounts}
                  importingServices={importingServices}
                  exportingQualityReport={exportingServiceQuality}
                  serviceMessage={serviceMessage}
                  onServiceImportFormChange={updateServiceImportForm}
                  onSubmitImport={importServicesFromWebsite}
                  onDeleteImportedService={(serviceRowId) => {
                    void deleteImportedService(serviceRowId);
                  }}
                  onExportQualityReport={() => {
                    void exportServiceQualityReport();
                  }}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div id="partners">
                <PartnersSection
                  partners={partners}
                  editingPartnerId={editingPartnerId}
                  partnerForm={partnerForm}
                  partnerMessage={partnerMessage}
                  savingPartner={savingPartner}
                  uploadingLogo={uploadingLogo}
                  uploadingImage={uploadingImage}
                  onPartnerFormChange={updatePartnerForm}
                  onEditPartner={editPartner}
                  onResetPartner={resetPartnerForm}
                  onUploadPartnerAsset={(file, kind) => {
                    void uploadPartnerAsset(file, kind);
                  }}
                  onSavePartner={savePartner}
                  onDeletePartner={(partnerId) => {
                    void deletePartner(partnerId);
                  }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {activeWorkspace === 'reliability' ? (
          <Suspense
            fallback={
              <section className="template-card mt-6 p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">
                  Reliability workspace
                </div>
                <h2 className="template-title mt-3 text-xl font-semibold text-[#1d1d1f]">
                  Loading reliability triage module
                </h2>
                <p className="template-body mt-2 max-w-3xl text-sm leading-6">
                  Prompt 8 now ships reliability as a dedicated admin workspace module so the rest
                  of the admin shell can stay lighter during initial load.
                </p>
              </section>
            }
          >
            <ReliabilityWorkspace
              activePanel={activePanel}
              selectedServiceId={selectedBooking?.booking.service_id ?? null}
              configItems={configItems}
              apiRoutes={apiRoutes}
              apiBaseUrl={apiBaseUrl}
              sessionToken={sessionToken}
              onPanelNavigate={changePanel}
            />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
