import { FormEvent, type ReactNode, useEffect, useState } from 'react';

import {
  formatCurrency,
  formatDateTime,
} from './types';
import type {
  AdminServiceMerchantItem,
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantProfileFormState,
  AdminTenantServiceFormState,
} from './types';

type MemberDraft = {
  full_name: string;
  role: string;
  status: string;
};

type TenantManagementSectionProps = {
  tenants: AdminTenantListItem[];
  selectedTenantRef: string;
  selectedTenantDetail: AdminTenantDetailResponse | null;
  tenantProfileForm: AdminTenantProfileFormState;
  tenantServiceForm: AdminTenantServiceFormState;
  editingTenantServiceId: number | null;
  tenantMessage: string;
  savingTenantProfile: boolean;
  savingTenantMemberEmail: string | null;
  savingTenantService: boolean;
  uploadingLogo: boolean;
  uploadingImage: boolean;
  onSelectTenant: (tenantRef: string) => void;
  onTenantProfileFormChange: <K extends keyof AdminTenantProfileFormState>(
    field: K,
    value: AdminTenantProfileFormState[K],
  ) => void;
  onTenantServiceFormChange: <K extends keyof AdminTenantServiceFormState>(
    field: K,
    value: AdminTenantServiceFormState[K],
  ) => void;
  onSaveTenantProfile: (event: FormEvent<HTMLFormElement>) => void;
  onSaveTenantMemberAccess: (
    memberEmail: string,
    form: { full_name?: string | null; role?: string | null; status?: string | null },
  ) => void;
  onEditTenantService: (service: AdminServiceMerchantItem) => void;
  onTransitionTenantServiceState: (
    service: AdminServiceMerchantItem,
    publishState: AdminTenantServiceFormState['publish_state'],
  ) => void;
  onResetTenantServiceForm: () => void;
  onSaveTenantService: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteTenantService: (serviceRowId: number) => void;
  onUploadTenantAsset: (file: File, kind: 'logo' | 'image') => void;
};

const roleOptions = ['tenant_admin', 'finance_manager', 'operator'];
const statusOptions = ['active', 'invited', 'disabled'];

export function TenantManagementSection({
  tenants,
  selectedTenantRef,
  selectedTenantDetail,
  tenantProfileForm,
  tenantServiceForm,
  editingTenantServiceId,
  tenantMessage,
  savingTenantProfile,
  savingTenantMemberEmail,
  savingTenantService,
  uploadingLogo,
  uploadingImage,
  onSelectTenant,
  onTenantProfileFormChange,
  onTenantServiceFormChange,
  onSaveTenantProfile,
  onSaveTenantMemberAccess,
  onEditTenantService,
  onTransitionTenantServiceState,
  onResetTenantServiceForm,
  onSaveTenantService,
  onDeleteTenantService,
  onUploadTenantAsset,
}: TenantManagementSectionProps) {
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});
  const [pendingDeleteServiceId, setPendingDeleteServiceId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedTenantDetail) {
      setMemberDrafts({});
      setPendingDeleteServiceId(null);
      return;
    }

    const nextDrafts: Record<string, MemberDraft> = {};
    for (const member of selectedTenantDetail.members) {
      nextDrafts[member.email] = {
        full_name: member.full_name ?? '',
        role: member.role,
        status: member.status,
      };
    }
    setMemberDrafts(nextDrafts);
  }, [selectedTenantDetail]);

  const publishGuardrails = buildTenantServicePublishGuardrails(tenantServiceForm);
  const publishBlocked =
    tenantServiceForm.publish_state === 'published' &&
    publishGuardrails.length > 0;
  const saveBlocked = !tenantServiceForm.name.trim() || publishBlocked;

  return (
    <section className="booked-page-grid xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside id="tenant-directory" className="template-card p-6">
        <div className="template-kicker text-sm tracking-[0.14em]">Tenant directory</div>
        <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
          Enterprise tenant workspace
        </h2>
        <p className="template-body mt-2 text-sm leading-7">
          Pick a tenant to manage identity, HTML introduction, team permissions, and
          tenant-scoped products or services from one internal workspace.
        </p>

        <div className="mt-6 space-y-3">
          {tenants.map((tenant) => {
            const isActive = tenant.slug === selectedTenantRef;
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onSelectTenant(tenant.slug)}
                className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                  isActive
                    ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{tenant.name}</div>
                    <div className={`mt-1 text-xs uppercase tracking-[0.16em] ${isActive ? 'text-white/60' : 'text-slate-500'}`}>
                      {tenant.slug}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-white text-slate-950' : 'bg-white text-slate-600'}`}>
                    {tenant.status}
                  </span>
                </div>
                <div className={`mt-3 grid gap-2 text-sm ${isActive ? 'text-white/75' : 'text-slate-600'}`}>
                  <div>{tenant.active_memberships} active members</div>
                  <div>{tenant.published_services}/{tenant.total_services} published services</div>
                  <div>{tenant.industry || 'Industry not set'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="space-y-6">
        <section id="tenant-profile" className="template-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="template-kicker text-sm tracking-[0.14em]">Tenant workspace</div>
              <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                {selectedTenantDetail?.tenant.name ?? 'Select a tenant'}
              </h2>
              <p className="template-body mt-2 max-w-3xl text-sm leading-7">
                Keep tenant identity, content, and ownership aligned here before touching
                products, pricing, or rollout controls.
              </p>
            </div>
            {tenantMessage ? (
              <div className="booked-note-surface px-4 py-3 text-sm text-black/70">{tenantMessage}</div>
            ) : null}
          </div>

          {selectedTenantDetail ? (
            <form className="mt-6 space-y-6" onSubmit={onSaveTenantProfile}>
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard label="Tenant status" value={selectedTenantDetail.tenant.status} />
                <SummaryCard
                  label="Active members"
                  value={String(selectedTenantDetail.tenant.active_memberships)}
                />
                <SummaryCard
                  label="Published services"
                  value={`${selectedTenantDetail.tenant.published_services}/${selectedTenantDetail.tenant.total_services}`}
                />
                <SummaryCard
                  label="Last update"
                  value={
                    selectedTenantDetail.tenant.updated_at
                      ? formatDateTime(selectedTenantDetail.tenant.updated_at)
                      : 'Not available'
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Business name">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.business_name}
                    onChange={(event) => onTenantProfileFormChange('business_name', event.target.value)}
                  />
                </Field>
                <Field label="Industry">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.industry}
                    onChange={(event) => onTenantProfileFormChange('industry', event.target.value)}
                  />
                </Field>
                <Field label="Timezone">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.timezone}
                    onChange={(event) => onTenantProfileFormChange('timezone', event.target.value)}
                  />
                </Field>
                <Field label="Locale">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.locale}
                    onChange={(event) => onTenantProfileFormChange('locale', event.target.value)}
                  />
                </Field>
                <Field label="Logo URL">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.logo_url}
                    onChange={(event) => onTenantProfileFormChange('logo_url', event.target.value)}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Hero image URL">
                  <input
                    className="booked-field"
                    value={tenantProfileForm.hero_image_url}
                    onChange={(event) => onTenantProfileFormChange('hero_image_url', event.target.value)}
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-3">
                <UploadButton
                  label={uploadingLogo ? 'Uploading logo...' : 'Upload logo'}
                  disabled={uploadingLogo}
                  onChange={(file) => onUploadTenantAsset(file, 'logo')}
                />
                <UploadButton
                  label={uploadingImage ? 'Uploading hero...' : 'Upload hero image'}
                  disabled={uploadingImage}
                  onChange={(file) => onUploadTenantAsset(file, 'image')}
                />
              </div>

              <Field label="Introduction HTML">
                <textarea
                  className="booked-field min-h-40"
                  value={tenantProfileForm.introduction_html}
                  onChange={(event) =>
                    onTenantProfileFormChange('introduction_html', event.target.value)
                  }
                  placeholder="<p>Tenant introduction...</p>"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <GuideField label="Overview guide" value={tenantProfileForm.guide_overview} onChange={(value) => onTenantProfileFormChange('guide_overview', value)} />
                <GuideField label="Experience guide" value={tenantProfileForm.guide_experience} onChange={(value) => onTenantProfileFormChange('guide_experience', value)} />
                <GuideField label="Catalog guide" value={tenantProfileForm.guide_catalog} onChange={(value) => onTenantProfileFormChange('guide_catalog', value)} />
                <GuideField label="Plugin guide" value={tenantProfileForm.guide_plugin} onChange={(value) => onTenantProfileFormChange('guide_plugin', value)} />
                <GuideField label="Bookings guide" value={tenantProfileForm.guide_bookings} onChange={(value) => onTenantProfileFormChange('guide_bookings', value)} />
                <GuideField label="Integrations guide" value={tenantProfileForm.guide_integrations} onChange={(value) => onTenantProfileFormChange('guide_integrations', value)} />
                <GuideField label="Billing guide" value={tenantProfileForm.guide_billing} onChange={(value) => onTenantProfileFormChange('guide_billing', value)} />
                <GuideField label="Team guide" value={tenantProfileForm.guide_team} onChange={(value) => onTenantProfileFormChange('guide_team', value)} />
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  HTML preview guidance
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Keep the tenant introduction clean and presentation-safe. Scripts are not
                  intended here; use simple headings, paragraphs, emphasis, and lists.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <GuideCallout
                    title="Identity"
                    body="Update name, timezone, locale, logo, and hero first so downstream content has the right tenant context."
                  />
                  <GuideCallout
                    title="Content"
                    body="Use HTML intro for customer-facing presentation copy, and the guide fields for operator-facing admin instructions."
                  />
                  <GuideCallout
                    title="Governance"
                    body="Save profile changes before moving on to role changes or service publishing so audit history stays easy to follow."
                  />
                </div>
                {tenantProfileForm.introduction_html ? (
                  <div
                    className="mt-4 rounded-[1rem] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"
                    dangerouslySetInnerHTML={{ __html: tenantProfileForm.introduction_html }}
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savingTenantProfile}
                  className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingTenantProfile ? 'Saving tenant...' : 'Save tenant workspace'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Select a tenant from the directory to open the enterprise admin workspace.
            </div>
          )}
        </section>

        {selectedTenantDetail ? (
          <>
            <section id="tenant-team" className="template-card p-6">
              <div className="template-kicker text-sm tracking-[0.14em]">Permissions</div>
              <h3 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                Tenant team and role controls
              </h3>
              <p className="template-body mt-2 text-sm leading-7">
                Change ownership carefully. Use least privilege when moving billing, content, or
                product responsibility.
              </p>

              <div className="mt-6 space-y-4">
                {selectedTenantDetail.members.map((member) => {
                  const draft = memberDrafts[member.email] ?? {
                    full_name: member.full_name ?? '',
                    role: member.role,
                    status: member.status,
                  };
                  return (
                    <div key={member.email} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_180px_160px_auto]">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{member.email}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {member.auth_provider || 'manual access'} • joined{' '}
                            {member.created_at ? formatDateTime(member.created_at) : 'unknown'}
                          </div>
                          <input
                            className="booked-field mt-3"
                            value={draft.full_name}
                            onChange={(event) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.email]: { ...draft, full_name: event.target.value },
                              }))
                            }
                            placeholder="Full name"
                          />
                        </div>
                        <Field label="Role">
                          <select
                            className="booked-field"
                            value={draft.role}
                            onChange={(event) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.email]: { ...draft, role: event.target.value },
                              }))
                            }
                          >
                            {roleOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Status">
                          <select
                            className="booked-field"
                            value={draft.status}
                            onChange={(event) =>
                              setMemberDrafts((current) => ({
                                ...current,
                                [member.email]: { ...draft, status: event.target.value },
                              }))
                            }
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              onSaveTenantMemberAccess(member.email, {
                                full_name: draft.full_name,
                                role: draft.role,
                                status: draft.status,
                              })
                            }
                            disabled={savingTenantMemberEmail === member.email}
                            className="booked-button-secondary w-full disabled:opacity-60"
                          >
                            {savingTenantMemberEmail === member.email ? 'Saving...' : 'Save access'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section id="tenant-services" className="template-card p-6">
              <div className="template-kicker text-sm tracking-[0.14em]">Tenant catalog</div>
              <h3 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
                Products and services
              </h3>
              <p className="template-body mt-2 text-sm leading-7">
                Edit tenant-scoped product rows directly here. Publish only when booking-critical
                fields are complete.
              </p>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
                <div className="space-y-4">
                  {selectedTenantDetail.services.length ? (
                    selectedTenantDetail.services.map((service) => (
                      <div key={service.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-slate-950">
                                {service.name}
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                {service.publish_state || 'draft'}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {service.category || 'Uncategorized'} •{' '}
                              {service.display_price || formatCurrency(service.amount_aud)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Updated {formatDateTime(service.updated_at)}
                            </div>
                            {service.summary ? (
                              <p className="mt-3 text-sm leading-6 text-slate-600">
                                {service.summary}
                              </p>
                            ) : null}
                            {service.quality_warnings.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {service.quality_warnings.map((warning) => (
                                  <span key={warning} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                    {humanizeGuardrailWarning(warning)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                Publish-ready
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {service.publish_state !== 'published' ? (
                              <button
                                type="button"
                                className="booked-button-secondary"
                                disabled={
                                  savingTenantService || service.quality_warnings.length > 0
                                }
                                onClick={() =>
                                  onTransitionTenantServiceState(service, 'published')
                                }
                              >
                                Publish
                              </button>
                            ) : null}
                            {service.publish_state !== 'archived' ? (
                              <button
                                type="button"
                                className="booked-button-secondary"
                                disabled={savingTenantService}
                                onClick={() =>
                                  onTransitionTenantServiceState(service, 'archived')
                                }
                              >
                                Archive
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="booked-button-secondary"
                              onClick={() => onEditTenantService(service)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="booked-button-secondary"
                              disabled={
                                savingTenantService ||
                                (service.publish_state ?? 'draft') === 'published'
                              }
                              onClick={() => {
                                if (pendingDeleteServiceId === service.id) {
                                  setPendingDeleteServiceId(null);
                                  onDeleteTenantService(service.id);
                                  return;
                                }
                                setPendingDeleteServiceId(service.id);
                              }}
                            >
                              {pendingDeleteServiceId === service.id
                                ? 'Confirm delete'
                                : 'Delete'}
                            </button>
                          </div>
                        </div>
                        {(service.publish_state ?? 'draft') === 'published' ? (
                          <div className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                            Archive this service before deleting it so customer-facing entries are
                            taken out of circulation safely.
                          </div>
                        ) : null}
                        {pendingDeleteServiceId === service.id ? (
                          <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900">
                            Confirm delete again to permanently remove this tenant service.
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                      This tenant does not have any products or services yet. Use the form on the
                      right to create the first tenant-scoped record.
                    </div>
                  )}
                </div>

                <form className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5" onSubmit={onSaveTenantService}>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {editingTenantServiceId ? 'Edit tenant service' : 'New tenant service'}
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Field label="Name">
                      <input className="booked-field" required value={tenantServiceForm.name} onChange={(event) => onTenantServiceFormChange('name', event.target.value)} />
                    </Field>
                    <Field label="Business name">
                      <input className="booked-field" value={tenantServiceForm.business_name} onChange={(event) => onTenantServiceFormChange('business_name', event.target.value)} />
                    </Field>
                    <Field label="Business email">
                      <input className="booked-field" value={tenantServiceForm.business_email} onChange={(event) => onTenantServiceFormChange('business_email', event.target.value)} />
                    </Field>
                    <Field label="Category">
                      <input className="booked-field" value={tenantServiceForm.category} onChange={(event) => onTenantServiceFormChange('category', event.target.value)} />
                    </Field>
                    <Field label="Summary">
                      <textarea className="booked-field min-h-28" value={tenantServiceForm.summary} onChange={(event) => onTenantServiceFormChange('summary', event.target.value)} />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Amount AUD">
                        <input className="booked-field" value={tenantServiceForm.amount_aud} onChange={(event) => onTenantServiceFormChange('amount_aud', event.target.value)} inputMode="decimal" />
                      </Field>
                      <Field label="Display price">
                        <input className="booked-field" value={tenantServiceForm.display_price} onChange={(event) => onTenantServiceFormChange('display_price', event.target.value)} />
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Duration minutes">
                        <input className="booked-field" value={tenantServiceForm.duration_minutes} onChange={(event) => onTenantServiceFormChange('duration_minutes', event.target.value)} inputMode="numeric" />
                      </Field>
                      <Field label="Publish state">
                        <select className="booked-field" value={tenantServiceForm.publish_state} onChange={(event) => onTenantServiceFormChange('publish_state', event.target.value as AdminTenantServiceFormState['publish_state'])}>
                          <option value="draft">draft</option>
                          <option value="published">published</option>
                          <option value="archived">archived</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Venue name">
                      <input className="booked-field" value={tenantServiceForm.venue_name} onChange={(event) => onTenantServiceFormChange('venue_name', event.target.value)} />
                    </Field>
                    <Field label="Location">
                      <input className="booked-field" value={tenantServiceForm.location} onChange={(event) => onTenantServiceFormChange('location', event.target.value)} />
                    </Field>
                    <Field label="Booking URL">
                      <input className="booked-field" value={tenantServiceForm.booking_url} onChange={(event) => onTenantServiceFormChange('booking_url', event.target.value)} />
                    </Field>
                    <Field label="Image URL">
                      <input className="booked-field" value={tenantServiceForm.image_url} onChange={(event) => onTenantServiceFormChange('image_url', event.target.value)} />
                    </Field>
                    <Field label="Source URL">
                      <input className="booked-field" value={tenantServiceForm.source_url} onChange={(event) => onTenantServiceFormChange('source_url', event.target.value)} />
                    </Field>
                    <Field label="Tags">
                      <input className="booked-field" value={tenantServiceForm.tags} onChange={(event) => onTenantServiceFormChange('tags', event.target.value)} placeholder="tag1, tag2" />
                    </Field>
                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={tenantServiceForm.featured}
                        onChange={(event) => onTenantServiceFormChange('featured', event.target.checked)}
                      />
                      Featured service
                    </label>
                  </div>

                  {tenantServiceForm.publish_state === 'published' ? (
                    <div className={`mt-4 rounded-[1rem] border px-4 py-3 text-sm ${
                      publishGuardrails.length
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}>
                      <div className="font-semibold">
                        {publishGuardrails.length
                          ? 'Publish guardrails still need attention'
                          : 'This service is ready to publish from admin'}
                      </div>
                      <div className="mt-1 leading-6">
                        {publishGuardrails.length
                          ? 'Complete the booking-critical fields below before publishing.'
                          : 'Category, location, and price are present, so publish can proceed.'}
                      </div>
                      {publishGuardrails.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {publishGuardrails.map((warning) => (
                            <span
                              key={warning}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900"
                            >
                              {warning}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingTenantService || saveBlocked}
                      className="booked-button disabled:opacity-60"
                    >
                      {savingTenantService
                        ? 'Saving service...'
                        : editingTenantServiceId
                          ? 'Save service'
                          : 'Create service'}
                    </button>
                    <button type="button" className="booked-button-secondary" onClick={onResetTenantServiceForm}>
                      Reset form
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-950">{value}</div>
    </article>
  );
}

function GuideCallout({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1rem] border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}

function buildTenantServicePublishGuardrails(form: AdminTenantServiceFormState) {
  const warnings: string[] = [];
  if (!form.category.trim()) {
    warnings.push('Category is required');
  }
  if (!form.location.trim()) {
    warnings.push('Location is required');
  }
  const amount = Number(form.amount_aud);
  const hasNumericPrice = Number.isFinite(amount) && amount > 0;
  if (!hasNumericPrice && !form.display_price.trim()) {
    warnings.push('Price or display price is required');
  }
  return warnings;
}

function humanizeGuardrailWarning(value: string) {
  return value
    .replace(/^missing_/, 'missing ')
    .replace(/^unknown_/, 'unknown ')
    .replace(/_/g, ' ');
}

function GuideField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea className="booked-field min-h-28" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function UploadButton({
  label,
  disabled,
  onChange,
}: {
  label: string;
  disabled: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <label className={`booked-button-secondary cursor-pointer ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="file"
        className="hidden"
        disabled={disabled}
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onChange(file);
          }
          event.target.value = '';
        }}
      />
      {label}
    </label>
  );
}
