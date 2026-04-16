import { FormEvent } from 'react';

import { PartnerFormState, PartnerProfileItem } from './types';

type PartnersSectionProps = {
  partners: PartnerProfileItem[];
  editingPartnerId: number | null;
  partnerForm: PartnerFormState;
  partnerMessage: string;
  savingPartner: boolean;
  uploadingLogo: boolean;
  uploadingImage: boolean;
  onPartnerFormChange: <K extends keyof PartnerFormState>(
    field: K,
    value: PartnerFormState[K],
  ) => void;
  onEditPartner: (partner: PartnerProfileItem) => void;
  onResetPartner: () => void;
  onUploadPartnerAsset: (file: File, kind: 'logo' | 'image') => void;
  onSavePartner: (event: FormEvent<HTMLFormElement>) => void;
  onDeletePartner: (partnerId: number) => void;
};

export function PartnersSection({
  partners,
  editingPartnerId,
  partnerForm,
  partnerMessage,
  savingPartner,
  uploadingLogo,
  uploadingImage,
  onPartnerFormChange,
  onEditPartner,
  onResetPartner,
  onUploadPartnerAsset,
  onSavePartner,
  onDeletePartner,
}: PartnersSectionProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Partners and customers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload logos and hero images, then publish them directly to the public website
            partner wall.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {partners.length} profiles
        </div>
      </div>

      <form className="mt-5 space-y-4" onSubmit={onSavePartner}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block font-semibold text-slate-700">Business name</span>
            <input
              type="text"
              value={partnerForm.name}
              onChange={(event) => onPartnerFormChange('name', event.target.value)}
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
              onChange={(event) => onPartnerFormChange('category', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="Customer, Partner, Clinic, Salon"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-2 block font-semibold text-slate-700">Website URL</span>
            <input
              type="url"
              value={partnerForm.website_url}
              onChange={(event) => onPartnerFormChange('website_url', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="https://example.com"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-2 block font-semibold text-slate-700">Description</span>
            <textarea
              value={partnerForm.description}
              onChange={(event) => onPartnerFormChange('description', event.target.value)}
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
                      onUploadPartnerAsset(file, 'logo');
                    }
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            <input
              type="url"
              value={partnerForm.logo_url}
              onChange={(event) => onPartnerFormChange('logo_url', event.target.value)}
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
                      onUploadPartnerAsset(file, 'image');
                    }
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            <input
              type="url"
              value={partnerForm.image_url}
              onChange={(event) => onPartnerFormChange('image_url', event.target.value)}
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
                onPartnerFormChange('sort_order', Number(event.target.value || 0))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            />
          </label>
          <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={partnerForm.featured}
              onChange={(event) => onPartnerFormChange('featured', event.target.checked)}
            />
            Featured
          </label>
          <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={partnerForm.is_active}
              onChange={(event) => onPartnerFormChange('is_active', event.target.checked)}
            />
            Visible on website
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onResetPartner}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={savingPartner || !partnerForm.name.trim()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPartner ? 'Saving...' : editingPartnerId ? 'Update profile' : 'Create profile'}
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
                  onClick={() => onEditPartner(partner)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePartner(partner.id)}
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
            No partner profiles yet. Create the first one above and it will appear on the
            public website section.
          </div>
        ) : null}
      </div>
    </section>
  );
}
