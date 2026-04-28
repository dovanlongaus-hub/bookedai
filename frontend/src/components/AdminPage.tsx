import { Suspense, lazy, useEffect, useState } from 'react';

import { AdminBookingsSection } from '../features/admin/bookings-section';
import { AdminDashboardHeader } from '../features/admin/dashboard-header';
import { AdminEmailStatusNote } from '../features/admin/email-status-note';
import { ApiInventorySection } from '../features/admin/api-inventory-section';
import { AuditActivitySection } from '../features/admin/audit-activity-section';
import { AdminLoginScreen } from '../features/admin/login-screen';
import { BillingSupportSummarySection } from '../features/admin/billing-support-summary-section';
import { IntegrationHealthSection } from '../features/admin/integration-health-section';
import { LiveConfigurationSection } from '../features/admin/live-configuration-section';
import { MessagingWorkspace } from '../features/admin/messaging-workspace';
import { PendingHandoffsSection } from '../features/admin/pending-handoffs-section';
import { WorkspaceSettingsSummarySection } from '../features/admin/workspace-settings-summary-section';
import { TenantManagementSection } from '../features/admin/tenant-management-section';
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
  overview: ['bookings', 'recent-events', 'selected-booking', 'portal-support'],
  tenants: ['tenant-directory'],
  'tenant-workspace': ['tenant-profile', 'tenant-team', 'tenant-services'],
  catalog: ['service-catalog', 'partners'],
  'billing-support': ['portal-support', 'selected-booking'],
  integrations: ['integrations-health', 'recent-events'],
  messaging: ['messaging-list', 'message-detail'],
  reliability: ['prompt5-preview', 'live-configuration', 'api-inventory'],
  'audit-activity': ['audit-events'],
  'platform-settings': ['live-configuration', 'api-inventory'],
};

function isWorkspaceId(value: string): value is AdminWorkspaceId {
  return (
    value === 'overview' ||
    value === 'tenants' ||
    value === 'tenant-workspace' ||
    value === 'catalog' ||
    value === 'billing-support' ||
    value === 'integrations' ||
    value === 'messaging' ||
    value === 'reliability' ||
    value === 'audit-activity' ||
    value === 'platform-settings'
  );
}

function parseAdminHash(hash: string): ParsedAdminHash {
  const normalizedHash = hash.replace(/^#/, '').trim();
  if (!normalizedHash) {
    return { workspace: 'overview', panel: null };
  }

  const [workspaceCandidate, panelCandidate] = normalizedHash.split(':');
  const normalizedWorkspace =
    workspaceCandidate === 'operations' ? 'overview' : workspaceCandidate;
  if (!isWorkspaceId(normalizedWorkspace)) {
    return { workspace: 'overview', panel: null };
  }

  if (!panelCandidate) {
    return { workspace: normalizedWorkspace, panel: null };
  }

  return {
    workspace: normalizedWorkspace,
    panel:
      workspacePanels[normalizedWorkspace].find((candidate) => candidate === panelCandidate) ??
      null,
  };
}

export function AdminPage() {
  const apiBaseUrl = getApiBaseUrl();
  const [reviewFocusKey, setReviewFocusKey] = useState('');
  const [reviewFocusSource, setReviewFocusSource] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<AdminWorkspaceId>(() => {
    if (typeof window === 'undefined') {
      return 'overview';
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
    if (nextWorkspace === 'messaging') {
      void refreshPendingHandoffs();
    }
  }

  useEffect(() => {
    if (activeWorkspace === 'messaging' && pendingHandoffs === null && !pendingHandoffsLoading) {
      void refreshPendingHandoffs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

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

      const topbarOffset = 112;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const nextScrollTop = Math.max(targetTop - topbarOffset, 0);
      window.scrollTo({ top: nextScrollTop, behavior: 'auto' });

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
    <main className="booked-admin-shell booked-admin-enterprise-shell">
      <div className="booked-admin-enterprise-frame">
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

        <div className="booked-admin-workspace-layout">
          <AdminWorkspaceNav
            activeWorkspace={activeWorkspace}
            apiBaseUrl={apiBaseUrl}
            onWorkspaceChange={changeWorkspace}
          />

          <div className="booked-admin-workspace-canvas">
            <AdminWorkspaceInsights
              activeWorkspace={activeWorkspace}
              activePanel={activePanel}
              bookingsTotal={bookingsTotal}
              shadowStatus={bookingsShadowStatus}
              tenantsCount={tenants.length}
              selectedTenantName={selectedTenantDetail?.tenant.name ?? null}
              selectedTenantMembersCount={selectedTenantDetail?.members.length ?? 0}
              selectedTenantServicesCount={selectedTenantDetail?.services.length ?? 0}
              portalSupportQueueCount={overview?.portal_support_queue?.length ?? 0}
              importedServicesCount={importedServices.length}
              partnersCount={partners.length}
              configItemsCount={configItems.length}
              apiRoutesCount={apiRoutes.length}
              messagingCount={messagingItems.length}
              messagingAttentionCount={messagingItems.filter((item) => item.needs_attention).length}
              selectedBookingReference={selectedBooking?.booking.booking_reference ?? null}
              selectedServiceId={selectedBooking?.booking.service_id ?? null}
              onPanelNavigate={changePanel}
            />

        {activeWorkspace === 'overview' ? (
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

        {activeWorkspace === 'tenants' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section id="tenant-directory" className="template-card p-6">
              <div className="template-kicker text-sm tracking-[0.14em]">Tenant directory</div>
              <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                Review tenant scope before opening the editable workspace
              </h2>
              <p className="template-body mt-2 max-w-3xl text-sm leading-7">
                This directory keeps search and selection separate from mutation. Pick the tenant
                you want to investigate, then jump into the dedicated workspace for branding,
                permissions, HTML content, and catalog changes.
              </p>

              <div className="mt-6 grid gap-3">
                {tenants.map((tenant) => {
                  const isActive = tenant.slug === selectedTenantRef;
                  return (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => {
                        setSelectedTenantRef(tenant.slug);
                        void loadTenantDetail(tenant.slug);
                      }}
                      className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                        isActive
                          ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
                          : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold">{tenant.name}</div>
                          <div
                            className={`mt-1 text-xs uppercase tracking-[0.16em] ${
                              isActive ? 'text-white/60' : 'text-slate-500'
                            }`}
                          >
                            {tenant.slug}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isActive ? 'bg-white text-slate-950' : 'bg-white text-slate-600'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </div>
                      <div
                        className={`mt-3 grid gap-2 text-sm ${
                          isActive ? 'text-white/75' : 'text-slate-600'
                        }`}
                      >
                        <div>{tenant.active_memberships} active members</div>
                        <div>
                          {tenant.published_services}/{tenant.total_services} published services
                        </div>
                        <div>{tenant.industry || 'Industry not set'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="template-card p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">Selected tenant</div>
                <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                  {selectedTenantDetail?.tenant.name ?? 'No tenant selected'}
                </h2>
                <p className="template-body mt-2 text-sm leading-7">
                  Use this right-hand summary to confirm status, ownership, and catalog posture
                  before opening the full tenant workspace.
                </p>
                <div className="mt-5 grid gap-3">
                  <InfoCard
                    label="Tenant status"
                    value={selectedTenantDetail?.tenant.status ?? 'Not selected'}
                  />
                  <InfoCard
                    label="Members"
                    value={
                      selectedTenantDetail
                        ? `${selectedTenantDetail.members.length} visible`
                        : 'No tenant loaded'
                    }
                  />
                  <InfoCard
                    label="Services"
                    value={
                      selectedTenantDetail
                        ? `${selectedTenantDetail.services.length} visible`
                        : 'No tenant loaded'
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => changeWorkspace('tenant-workspace')}
                  disabled={!selectedTenantDetail}
                  className="booked-button mt-5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open tenant workspace
                </button>
              </section>

              <section className="template-card p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">Operator guidance</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Search and select here first so tenant scope stays obvious before mutation.</p>
                  <p>
                    Move into Tenant Workspace only when you need to save identity, team, content,
                    or catalog changes.
                  </p>
                  <p>
                    Use Billing Support, Integrations, or Reliability if the issue is cross-tenant
                    before editing tenant-specific data.
                  </p>
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {activeWorkspace === 'tenant-workspace' ? (
          <TenantManagementSection
            tenants={tenants}
            selectedTenantRef={selectedTenantRef}
            selectedTenantDetail={selectedTenantDetail}
            tenantProfileForm={tenantProfileForm}
            tenantServiceForm={tenantServiceForm}
            editingTenantServiceId={editingTenantServiceId}
            tenantMessage={tenantMessage}
            savingTenantProfile={savingTenantProfile}
            savingTenantMemberEmail={savingTenantMemberEmail}
            savingTenantService={savingTenantService}
            uploadingLogo={uploadingLogo}
            uploadingImage={uploadingImage}
            onSelectTenant={(tenantRef) => {
              setSelectedTenantRef(tenantRef);
              void loadTenantDetail(tenantRef);
            }}
            onTenantProfileFormChange={updateTenantProfileForm}
            onTenantServiceFormChange={updateTenantServiceForm}
            onSaveTenantProfile={saveTenantProfile}
            onSaveTenantMemberAccess={(memberEmail, form) => {
              void saveTenantMemberAccess(memberEmail, form);
            }}
            onEditTenantService={editTenantService}
            onTransitionTenantServiceState={(service, publishState) => {
              void transitionTenantServiceState(service, publishState);
            }}
            onResetTenantServiceForm={resetTenantServiceForm}
            onSaveTenantService={saveTenantService}
            onDeleteTenantService={(serviceRowId) => {
              void removeTenantService(serviceRowId);
            }}
            onUploadTenantAsset={(file, kind) => {
              void uploadTenantAsset(file, kind);
            }}
          />
        ) : null}

        {activeWorkspace === 'catalog' ? (
          <section className="booked-page-grid">
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
          </section>
        ) : null}

        {activeWorkspace === 'billing-support' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <BillingSupportSummarySection
                items={overview?.portal_support_queue ?? []}
                selectedTenantName={selectedTenantDetail?.tenant.name ?? null}
                selectedBookingReference={selectedBooking?.booking.booking_reference ?? null}
              />

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

        {activeWorkspace === 'integrations' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <IntegrationHealthSection
                recentEvents={overview?.recent_events ?? []}
                queueItems={overview?.portal_support_queue ?? []}
                messagingItems={messagingItems}
                customerAgentHealth={customerAgentHealth}
                selectedTenantName={selectedTenantDetail?.tenant.name ?? null}
                selectedTenantRef={selectedTenantRef || null}
              />

              <div id="recent-events">
                <RecentEventsSection recentEvents={overview?.recent_events ?? []} />
              </div>
            </div>

            <aside className="space-y-6">
              <section className="template-card p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">Next moves</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Open Reliability when the issue looks like matching quality, prompt drift, or retry posture.</p>
                  <p>Open Platform Settings when the issue looks like env configuration or backend contract coverage.</p>
                  <p>Open Billing Support when the issue has already become a customer-facing payment or portal exception.</p>
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {activeWorkspace === 'messaging' ? (
          <>
            <PendingHandoffsSection
              data={pendingHandoffs}
              loading={pendingHandoffsLoading}
              errorMessage={pendingHandoffsError}
              onRefresh={() => {
                void refreshPendingHandoffs();
              }}
              onClaim={(conversationId) => {
                void claimPendingHandoff(conversationId);
              }}
              onRelease={(conversationId) => {
                void releasePendingHandoff(conversationId);
              }}
              claimingConversationId={claimingHandoffConversationId}
            />
            <MessagingWorkspace
              items={messagingItems}
              selectedDetail={selectedMessageDetail}
              selectedTenantRef={selectedTenantRef || null}
              selectedTenantName={selectedTenantDetail?.tenant.name ?? null}
              actionMessage={messagingActionMessage}
              actionSubmittingKey={messagingActionSubmittingKey}
              onSelectMessage={(sourceKind, itemId) => {
                void loadMessageDetail(sourceKind, itemId);
              }}
              onRetryMessage={(sourceKind, itemId, note) => {
                void retryMessage(sourceKind, itemId, note);
              }}
              onMarkManualFollowUp={(sourceKind, itemId, note) => {
                void markMessageManualFollowUp(sourceKind, itemId, note);
              }}
            />
          </>
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
              selectedTenantRef={selectedTenantRef || null}
              onPanelNavigate={changePanel}
            />
          </Suspense>
        ) : null}

        {activeWorkspace === 'audit-activity' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <AuditActivitySection
                recentEvents={overview?.recent_events ?? []}
                queueItems={overview?.portal_support_queue ?? []}
                selectedTenantName={selectedTenantDetail?.tenant.name ?? null}
                selectedBookingReference={selectedBooking?.booking.booking_reference ?? null}
              />
            </div>

            <aside className="space-y-6">
              <section className="template-card p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">Audit posture</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Use this lane to reconstruct what happened before escalating a tenant, billing, or reliability issue.</p>
                  <p>Recent communication, support queue state, and booking detail should stay readable without opening mutation forms first.</p>
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {activeWorkspace === 'platform-settings' ? (
          <section className="booked-page-grid xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <div id="live-configuration">
                <section className="template-card p-6">
                  <div className="template-kicker text-sm tracking-[0.14em]">
                    Platform settings
                  </div>
                  <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                    Admin-visible platform review surfaces
                  </h2>
                  <p className="template-body mt-2 max-w-3xl text-sm leading-7">
                    Keep environment and contract review explicit here so operators can sanity-check
                    platform posture without mixing these details into every other workspace.
                  </p>
                </section>
                <div className="mt-6">
                  <WorkspaceSettingsSummarySection selectedTenantDetail={selectedTenantDetail} />
                </div>
                <div className="mt-6">
                  <LiveConfigurationSection configItems={configItems} />
                </div>
              </div>

              <div id="api-inventory">
                <ApiInventorySection apiRoutes={apiRoutes} />
              </div>
            </div>

            <aside className="space-y-6">
              <section className="template-card p-6">
                <div className="template-kicker text-sm tracking-[0.14em]">Review order</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Check live configuration when provider behavior looks wrong or incomplete.</p>
                  <p>Check API inventory when a frontend or operator flow looks like contract drift.</p>
                  <p>Return to Reliability when the issue is confirmed to be runtime behavior rather than platform shape.</p>
                </div>
              </section>
            </aside>
          </section>
        ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({ label, value }: InfoCardProps) {
  return (
    <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </article>
  );
}
