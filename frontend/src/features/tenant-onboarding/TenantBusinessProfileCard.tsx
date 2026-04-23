import type { ChangeEvent, Dispatch, FormEventHandler, SetStateAction } from 'react';

import type { TenantSectionActivity } from '../../shared/contracts';
import { TenantSectionActivityCard } from '../tenant-shared/TenantSectionActivityCard';

type TenantBusinessProfileFormState = {
  business_name: string;
  industry: string;
  timezone: string;
  locale: string;
  operator_full_name: string;
  logo_url: string;
  hero_image_url: string;
  introduction_html: string;
  guide_overview: string;
  guide_experience: string;
  guide_catalog: string;
  guide_plugin: string;
  guide_bookings: string;
  guide_integrations: string;
  guide_billing: string;
  guide_team: string;
};

function sanitizeTenantHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function AssetPreview({
  label,
  imageUrl,
  placeholder,
}: {
  label: string;
  imageUrl: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
        {imageUrl.trim() ? (
          <img src={imageUrl} alt={label} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-slate-500">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export function TenantBusinessProfileCard({
  profileForm,
  setProfileForm,
  profilePending,
  profileError,
  profileMessage,
  onSubmit,
  onUploadAsset,
  uploadingAsset,
  canManageExperience,
  currentRoleLabel,
  activity,
}: {
  profileForm: TenantBusinessProfileFormState;
  setProfileForm: Dispatch<SetStateAction<TenantBusinessProfileFormState>>;
  profilePending: boolean;
  profileError: string | null;
  profileMessage: string | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUploadAsset: (kind: 'logo' | 'hero', file: File) => void;
  uploadingAsset: 'logo' | 'hero' | null;
  canManageExperience: boolean;
  currentRoleLabel?: string | null;
  activity: TenantSectionActivity;
}) {
  function handleAssetChange(kind: 'logo' | 'hero', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onUploadAsset(kind, file);
    event.target.value = '';
  }

  const guideFields = [
    ['guide_overview', 'Overview guide'],
    ['guide_experience', 'Experience guide'],
    ['guide_catalog', 'Catalog guide'],
    ['guide_plugin', 'Plugin guide'],
    ['guide_bookings', 'Bookings guide'],
    ['guide_integrations', 'Integrations guide'],
    ['guide_billing', 'Billing guide'],
    ['guide_team', 'Team guide'],
  ] as const;

  return (
    <article className="rounded-[1.85rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Tenant experience studio
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Enterprise workspace profile
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Control the tenant identity, editable introduction HTML, and section-by-section
            operating guidelines from one structured workspace.
          </p>
        </div>
        <div className="rounded-[1.1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {canManageExperience
            ? 'Updates save directly into the tenant workspace and can be refined without repo edits.'
            : `Current role${currentRoleLabel ? `: ${currentRoleLabel}` : ''}. Preview is available, but only tenant admins and operators can edit tenant identity or branding.`}
        </div>
      </div>

      <div className="mt-4">
        <TenantSectionActivityCard label="Experience audit" activity={activity} />
      </div>

      <form className="mt-6 space-y-6" onSubmit={onSubmit}>
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-950">Identity and ownership</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Business name
                </div>
                <input
                  value={profileForm.business_name}
                  disabled={!canManageExperience || profilePending}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, business_name: event.target.value }))
                  }
                  className="booked-form-input"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Operator name
                </div>
                <input
                  value={profileForm.operator_full_name}
                  disabled={!canManageExperience || profilePending}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, operator_full_name: event.target.value }))
                  }
                  className="booked-form-input"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Industry
                </div>
                <input
                  value={profileForm.industry}
                  disabled={!canManageExperience || profilePending}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, industry: event.target.value }))
                  }
                  className="booked-form-input"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Timezone
                </div>
                <input
                  value={profileForm.timezone}
                  disabled={!canManageExperience || profilePending}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, timezone: event.target.value }))
                  }
                  className="booked-form-input"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Locale
              </div>
              <input
                value={profileForm.locale}
                disabled={!canManageExperience || profilePending}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, locale: event.target.value }))
                }
                className="booked-form-input"
              />
            </label>
          </div>

          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-950">Brand assets</div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Logo URL
                  </div>
                  <input
                    value={profileForm.logo_url}
                    disabled={!canManageExperience || profilePending}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, logo_url: event.target.value }))
                    }
                    className="booked-form-input"
                    placeholder="https://upload.bookedai.au/images/..."
                  />
                </label>
                <label className={`inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold transition ${
                  !canManageExperience || profilePending
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canManageExperience || profilePending}
                    onChange={(event) => handleAssetChange('logo', event)}
                  />
                  {uploadingAsset === 'logo' ? 'Uploading logo...' : 'Upload logo'}
                </label>
                <AssetPreview
                  label="Logo preview"
                  imageUrl={profileForm.logo_url}
                  placeholder="Upload or paste a tenant logo URL."
                />
              </div>

              <div className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Hero image URL
                  </div>
                  <input
                    value={profileForm.hero_image_url}
                    disabled={!canManageExperience || profilePending}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, hero_image_url: event.target.value }))
                    }
                    className="booked-form-input"
                    placeholder="https://upload.bookedai.au/images/..."
                  />
                </label>
                <label className={`inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold transition ${
                  !canManageExperience || profilePending
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'cursor-pointer bg-white text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canManageExperience || profilePending}
                    onChange={(event) => handleAssetChange('hero', event)}
                  />
                  {uploadingAsset === 'hero' ? 'Uploading hero image...' : 'Upload hero image'}
                </label>
                <AssetPreview
                  label="Hero preview"
                  imageUrl={profileForm.hero_image_url}
                  placeholder="Upload or paste a hero image for the tenant workspace."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">Introduction HTML</div>
              <div className="text-xs text-slate-500">Safe HTML preview only</div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use editable HTML for the tenant introduction, highlights, service promise, or
              enterprise summary. Scripts are stripped from preview and save.
            </p>
            <textarea
              rows={14}
              value={profileForm.introduction_html}
              disabled={!canManageExperience || profilePending}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, introduction_html: event.target.value }))
              }
              className="mt-4 w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none focus:border-sky-300"
              placeholder="<h2>About this tenant</h2><p>...</p>"
            />
          </div>

          <div className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-5">
            <div className="text-sm font-semibold text-slate-950">Live preview</div>
            <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white">
              {profileForm.hero_image_url.trim() ? (
                <img
                  src={profileForm.hero_image_url}
                  alt="Tenant hero"
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  {profileForm.logo_url.trim() ? (
                    <img
                      src={profileForm.logo_url}
                      alt="Tenant logo"
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : null}
                  <div>
                    <div className="text-lg font-semibold text-slate-950">
                      {profileForm.business_name || 'Tenant name'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {profileForm.industry || 'Industry'}
                    </div>
                  </div>
                </div>
                <div
                  className="prose prose-slate max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeTenantHtml(profileForm.introduction_html || '<p>Add tenant introduction HTML to preview it here.</p>'),
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-950">Menu guidelines</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Each workspace section can carry its own operator guidance so the menu feels structured
            and the expected action is obvious at first glance.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {guideFields.map(([field, label]) => (
              <label key={field} className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </div>
                <textarea
                  rows={4}
                  value={profileForm[field]}
                  disabled={!canManageExperience || profilePending}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-sky-300"
                />
              </label>
            ))}
          </div>
        </section>

        {profileError ? (
          <div className="booked-alert-error">{profileError}</div>
        ) : null}
        {profileMessage ? (
          <div className="booked-alert-success">{profileMessage}</div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canManageExperience || profilePending || !profileForm.business_name.trim()}
            className={`booked-button ${
              !canManageExperience || profilePending || !profileForm.business_name.trim()
                ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500 shadow-none'
                : ''
            }`}
          >
            {profilePending ? 'Saving workspace profile...' : 'Save workspace profile'}
          </button>
          <div className="text-sm text-slate-500">
            Save updates identity, content, and section guidance in one tenant-facing flow.
          </div>
        </div>
      </form>
    </article>
  );
}

export type { TenantBusinessProfileFormState };
