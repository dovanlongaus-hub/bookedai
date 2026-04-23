import type { Dispatch, FormEvent, SetStateAction } from 'react';

import type { TenantPluginInterfaceResponse } from '../../shared/contracts';
import { TenantSectionActivityCard } from '../tenant-shared/TenantSectionActivityCard';

export type TenantPluginFormState = {
  partner_name: string;
  partner_website_url: string;
  bookedai_host: string;
  embed_path: string;
  widget_script_path: string;
  tenant_ref: string;
  widget_id: string;
  accent_color: string;
  button_label: string;
  modal_title: string;
  headline: string;
  prompt: string;
  inline_target_selector: string;
  support_email: string;
  support_whatsapp: string;
  logo_url: string;
};

type TenantPluginWorkspaceProps = {
  plugin: TenantPluginInterfaceResponse;
  form: TenantPluginFormState;
  setForm: Dispatch<SetStateAction<TenantPluginFormState>>;
  sessionReady: boolean;
  pluginPending: boolean;
  pluginMessage: string | null;
  pluginError: string | null;
  copiedSnippetKey: string | null;
  onCopySnippet: (key: string, content: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function buildInlineSnippet(form: TenantPluginFormState) {
  return `<div
  id="${form.inline_target_selector.replace(/^#/, '')}"
  data-bookedai-widget
  data-mode="inline"
  data-target="${form.inline_target_selector}"
  data-host="${form.bookedai_host}"
  data-path="${form.embed_path}"
  data-tenant-ref="${form.tenant_ref}"
  data-accent="${form.accent_color}"
  data-title="${form.modal_title}"
  data-prompt="${form.prompt}"
  style="min-height: 760px;"
></div>

<script
  src="${form.bookedai_host.replace(/\/$/, '')}${form.widget_script_path}"
  defer
></script>`;
}

function buildModalSnippet(form: TenantPluginFormState) {
  return `<button
  type="button"
  data-bookedai-widget
  data-mode="modal"
  data-host="${form.bookedai_host}"
  data-path="${form.embed_path}"
  data-tenant-ref="${form.tenant_ref}"
  data-accent="${form.accent_color}"
  data-title="${form.modal_title}"
  data-prompt="${form.prompt}"
>
  ${form.button_label}
</button>

<script
  src="${form.bookedai_host.replace(/\/$/, '')}${form.widget_script_path}"
  defer
></script>`;
}

function buildIframeSnippet(form: TenantPluginFormState) {
  return `<iframe
  src="${form.bookedai_host.replace(/\/$/, '')}${form.embed_path}?embed=1&tenant_ref=${encodeURIComponent(form.tenant_ref)}"
  title="${form.modal_title}"
  loading="lazy"
  style="width:100%;min-height:760px;border:0;border-radius:24px;overflow:hidden;"
></iframe>`;
}

function SnippetCard(props: {
  title: string;
  description: string;
  snippet: string;
  snippetKey: string;
  copiedSnippetKey: string | null;
  onCopySnippet: (key: string, content: string) => void;
}) {
  const { title, description, snippet, snippetKey, copiedSnippetKey, onCopySnippet } = props;

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Snippet
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onCopySnippet(snippetKey, snippet)}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          {copiedSnippetKey === snippetKey ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-[1rem] bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        <code>{snippet}</code>
      </pre>
    </article>
  );
}

export function TenantPluginWorkspace({
  plugin,
  form,
  setForm,
  sessionReady,
  pluginPending,
  pluginMessage,
  pluginError,
  copiedSnippetKey,
  onCopySnippet,
  onSubmit,
}: TenantPluginWorkspaceProps) {
  const inlineSnippet = buildInlineSnippet(form);
  const modalSnippet = buildModalSnippet(form);
  const iframeSnippet = buildIframeSnippet(form);
  const canManagePlugin = Boolean(sessionReady && plugin.access?.can_manage_plugin);
  const tenantRefLocked = plugin.tenant?.slug || form.tenant_ref;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Official partner runtime
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Plugin and embed control center
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Save the exact partner-facing runtime configuration here, then copy the embed code for
            the partner website without editing repo files.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Website {plugin.experience.partner_website_url}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Runtime {plugin.runtime.embed_url}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Products {plugin.catalog_summary.published_product_count}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(plugin.features).map(([key, value]) => (
              <div
                key={key}
                className={`rounded-[1rem] border px-4 py-3 text-sm ${
                  value ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {key}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            {plugin.access?.operator_note || 'Preview mode only. Sign in with a tenant role that can manage plugin settings.'}
          </div>

          <div className="mt-5">
            <TenantSectionActivityCard label="Plugin audit" activity={plugin.activity} />
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Published products
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Catalog included in the plugin
          </h2>
          <div className="mt-5 space-y-3">
            {plugin.products.map((item) => (
              <div key={`${item.service_id || item.name}`} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.name || 'Service'}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {(item.category || 'Uncategorized')} • {item.display_price || 'Price on request'}
                    </div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                    {item.publish_state || 'draft'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="space-y-6">
        <form
          onSubmit={onSubmit}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Tenant-managed configuration
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Partner embed settings
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([
              ['partner_name', 'Partner name'],
              ['partner_website_url', 'Partner website'],
              ['bookedai_host', 'BookedAI host'],
              ['embed_path', 'Embed path'],
              ['widget_script_path', 'Widget script path'],
              ['tenant_ref', 'Tenant ref'],
              ['widget_id', 'Widget id'],
              ['accent_color', 'Accent color'],
              ['button_label', 'Button label'],
              ['modal_title', 'Modal title'],
              ['inline_target_selector', 'Inline target selector'],
              ['support_email', 'Support email'],
              ['support_whatsapp', 'Support WhatsApp'],
              ['logo_url', 'Logo URL'],
            ] as const).map(([field, label]) => (
              <label key={field} className="block">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </div>
                <input
                  value={field === 'tenant_ref' ? tenantRefLocked : form[field]}
                  disabled={field === 'tenant_ref' || !canManagePlugin || pluginPending}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Tenant ref is locked to this signed-in workspace so embeds always point to the current tenant only.
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Headline
              </div>
              <input
                value={form.headline}
                disabled={!canManagePlugin || pluginPending}
                onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))}
                className="h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Prompt
              </div>
              <textarea
                value={form.prompt}
                disabled={!canManagePlugin || pluginPending}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                rows={3}
                className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>
          </div>

          {pluginError ? (
            <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {pluginError}
            </div>
          ) : null}
          {pluginMessage ? (
            <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {pluginMessage}
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="submit"
              disabled={!canManagePlugin || pluginPending}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                !canManagePlugin || pluginPending
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-slate-950 text-white'
              }`}
            >
              {pluginPending ? 'Saving...' : 'Save plugin settings'}
            </button>
          </div>
        </form>

        <SnippetCard
          title="Inline widget"
          description="Render the full assistant directly inside a section of the partner website."
          snippet={inlineSnippet}
          snippetKey="inline"
          copiedSnippetKey={copiedSnippetKey}
          onCopySnippet={onCopySnippet}
        />

        <SnippetCard
          title="Modal button"
          description="Show a CTA button and open the BookedAI assistant in a popup."
          snippet={modalSnippet}
          snippetKey="modal"
          copiedSnippetKey={copiedSnippetKey}
          onCopySnippet={onCopySnippet}
        />

        <SnippetCard
          title="Iframe embed"
          description="Use a direct iframe when the partner wants a no-script integration path."
          snippet={iframeSnippet}
          snippetKey="iframe"
          copiedSnippetKey={copiedSnippetKey}
          onCopySnippet={onCopySnippet}
        />
      </div>
    </section>
  );
}
