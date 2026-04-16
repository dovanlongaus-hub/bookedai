import { FormEvent } from 'react';

import { AdminServiceMerchantItem, ServiceImportFormState, formatCurrency, formatDateTime } from './types';

type ServiceCatalogSectionProps = {
  serviceImportForm: ServiceImportFormState;
  importedServices: AdminServiceMerchantItem[];
  importingServices: boolean;
  serviceMessage: string;
  onServiceImportFormChange: <K extends keyof ServiceImportFormState>(
    field: K,
    value: ServiceImportFormState[K],
  ) => void;
  onSubmitImport: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteImportedService: (serviceRowId: number) => void;
};

export function ServiceCatalogSection({
  serviceImportForm,
  importedServices,
  importingServices,
  serviceMessage,
  onServiceImportFormChange,
  onSubmitImport,
  onDeleteImportedService,
}: ServiceCatalogSectionProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Live service catalog import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Scan a real SME website once, extract services, prices, location, and booking
            details, then make them available to the BookedAI agent.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          {importedServices.length} imported services
        </div>
      </div>

      <form
        className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
        onSubmit={onSubmitImport}
      >
        <input
          type="url"
          value={serviceImportForm.website_url}
          onChange={(event) => onServiceImportFormChange('website_url', event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          placeholder="Website URL or business name"
          required
        />
        <input
          type="text"
          value={serviceImportForm.business_name}
          onChange={(event) => onServiceImportFormChange('business_name', event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          placeholder="Business name"
        />
        <input
          type="email"
          value={serviceImportForm.business_email}
          onChange={(event) => onServiceImportFormChange('business_email', event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          placeholder="Business email"
        />
        <input
          type="text"
          value={serviceImportForm.category}
          onChange={(event) => onServiceImportFormChange('category', event.target.value)}
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
                  onClick={() => onDeleteImportedService(service.id)}
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
            No imported services yet. Paste a partner website or business name above and
            BookedAI will discover the site, extract the services, and build the first real
            service catalog from it.
          </div>
        ) : null}
      </div>
    </section>
  );
}
