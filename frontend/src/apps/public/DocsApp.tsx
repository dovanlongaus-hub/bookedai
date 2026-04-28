/**
 * <DocsApp /> — public BookedAI developer documentation surface at `/docs`.
 *
 * Lane 7 P11 — developer-grade trust signal modeled after Stripe Docs.
 * Multi-tab content (Getting Started, Plugin Widget, API Reference,
 * Authentication & Security) with sticky sidebar (desktop) / top tab bar
 * (mobile), copy-able dark code blocks, and Apple token-only styling.
 *
 * Visual rules:
 *   - Zero arbitrary hex colors. Only canonical Apple tokens
 *     (`--apple-blue`, `--apple-near-black`, `--apple-paper-blue-100`, …)
 *     plus existing template-* / booked-* utility classes.
 *   - Mobile-first, ≥44px tap targets.
 *   - Animation: 220ms ease-out for tab transitions.
 *   - No new runtime dependencies.
 */

import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { Footer } from '../../components/landing/Footer';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { brandUploadedLogoPath } from '../../components/landing/data';

type TabId = 'getting-started' | 'plugin-widget' | 'api-reference' | 'auth-security';

type TabSpec = {
  id: TabId;
  label: string;
  blurb: string;
};

const TABS: ReadonlyArray<TabSpec> = [
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'Onboard a tenant via API + DNS in under 10 minutes.',
  },
  {
    id: 'plugin-widget',
    label: 'Plugin widget',
    blurb: 'Embed BookedAI search on your own website.',
  },
  {
    id: 'api-reference',
    label: 'API reference',
    blurb: 'Tenant, search, lead capture, booking, and webhook surfaces.',
  },
  {
    id: 'auth-security',
    label: 'Authentication & security',
    blurb: 'Portal tokens, admin auth, allow-lists, and AI guardrails.',
  },
];

function navigateApex() {
  if (typeof window !== 'undefined') {
    window.location.href = 'https://bookedai.au/';
  }
}

function navigateRegister() {
  if (typeof window !== 'undefined') {
    window.location.href = '/register-interest?source_section=docs';
  }
}

export function DocsApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => readInitialTab());
  const activeSpec = useMemo(() => TABS.find((tab) => tab.id === activeTab) ?? TABS[0], [activeTab]);

  const handleSelectTab = useCallback((next: TabId) => {
    setActiveTab(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.hash = `#${next}`;
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'var(--apple-light, #f6f8fc)',
        color: 'var(--apple-near-black, #172033)',
      }}
    >
      <header
        className="sticky top-0 z-30 border-b border-black/8 backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.86)' }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 rounded-xl">
            <LogoMark
              src={brandUploadedLogoPath}
              alt="BookedAI"
              className="h-9 w-[8.5rem] object-cover object-center sm:w-[9.5rem]"
            />
          </a>
          <div className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-paper-blue-navy-700,#31507b)] sm:block">
            Documentation
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/changelog"
              className="hidden rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--apple-near-black,#172033)] transition hover:border-[color:var(--apple-blue,#0071e3)] sm:inline-flex"
              style={{ minHeight: '44px', alignItems: 'center' }}
            >
              Changelog
            </a>
            <a
              href="/status"
              className="hidden rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--apple-near-black,#172033)] transition hover:border-[color:var(--apple-blue,#0071e3)] sm:inline-flex"
              style={{ minHeight: '44px', alignItems: 'center' }}
            >
              Status
            </a>
            <button
              type="button"
              onClick={navigateRegister}
              className="booked-button inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
              style={{ minHeight: '44px' }}
            >
              Talk to BookedAI
            </button>
          </div>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav
        aria-label="Documentation sections"
        className="sticky top-[60px] z-20 overflow-x-auto border-b border-black/8 bg-white/86 px-3 py-2 backdrop-blur-xl lg:hidden"
      >
        <ul className="flex min-w-full gap-2">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="rounded-full border px-4 py-2 text-sm font-semibold transition"
                  style={{
                    minHeight: '44px',
                    borderColor: isActive
                      ? 'var(--apple-blue, #0071e3)'
                      : 'rgba(0,0,0,0.08)',
                    background: isActive
                      ? 'var(--apple-paper-blue-100, #eef4ff)'
                      : 'var(--apple-white, #ffffff)',
                    color: isActive
                      ? 'var(--apple-paper-blue-navy-900, #0f3d7a)'
                      : 'var(--apple-near-black, #172033)',
                  }}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-12">
        {/* Desktop sidebar */}
        <aside
          aria-label="Documentation navigation"
          className="hidden lg:block"
        >
          <div
            className="sticky top-24 rounded-2xl border border-black/8 bg-white p-4 shadow-apple-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--apple-paper-blue-navy-700,#31507b)]">
              Sections
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition"
                      style={{
                        minHeight: '44px',
                        background: isActive
                          ? 'var(--apple-paper-blue-100, #eef4ff)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--apple-paper-blue-navy-900, #0f3d7a)'
                          : 'var(--apple-near-black, #172033)',
                        transition: 'background 220ms ease-out, color 220ms ease-out',
                      }}
                    >
                      <div>{tab.label}</div>
                      <div
                        className="mt-1 text-xs font-normal leading-5"
                        style={{ color: 'rgba(0,0,0,0.6)' }}
                      >
                        {tab.blurb}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div
              className="mt-5 rounded-xl border border-dashed p-3 text-xs leading-5"
              style={{
                borderColor: 'var(--apple-paper-blue-200, #dbe7fb)',
                background: 'var(--apple-paper-blue-50, #f8fbff)',
                color: 'var(--apple-paper-blue-navy-800, #2f3d4f)',
              }}
            >
              Need help? Email{' '}
              <a
                href="mailto:hello@bookedai.au"
                className="font-semibold underline"
                style={{ color: 'var(--apple-blue, #0071e3)' }}
              >
                hello@bookedai.au
              </a>
              {' '}for an API key.
            </div>
          </div>
        </aside>

        <article
          className="min-w-0"
          style={{ transition: 'opacity 220ms ease-out' }}
        >
          <div className="mb-6 flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-paper-blue-navy-700,#31507b)]">
              {activeSpec.label}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              {activeSpec.blurb}
            </h1>
          </div>

          <div className="docs-content max-w-[720px] text-[15px] leading-7" data-active-tab={activeTab}>
            {activeTab === 'getting-started' ? <GettingStarted /> : null}
            {activeTab === 'plugin-widget' ? <PluginWidget /> : null}
            {activeTab === 'api-reference' ? <ApiReference /> : null}
            {activeTab === 'auth-security' ? <AuthSecurity /> : null}
          </div>
        </article>
      </div>

      <Footer onStartTrial={navigateRegister} onBookDemo={navigateApex} />
    </main>
  );
}

function readInitialTab(): TabId {
  if (typeof window === 'undefined') {
    return 'getting-started';
  }
  const hash = window.location.hash.replace(/^#/, '').trim();
  const match = TABS.find((tab) => tab.id === hash);
  return match ? match.id : 'getting-started';
}

// ── Tab content ────────────────────────────────────────────────────────────

function GettingStarted() {
  return (
    <div className="flex flex-col gap-6">
      <p>
        BookedAI lets you onboard a new tenant entirely via API and DNS — no
        new front-end build required. The four steps below get you from a
        blank slate to a verified, branded tenant surface in under ten minutes.
      </p>

      <SectionHeading title="Step 1 — Get an API key" id="get-key" />
      <p>
        Email <code>hello@bookedai.au</code> from your work address. The
        BookedAI ops team mints a scoped key tied to your tenant slug. Keys
        rotate on request and never appear in source control.
      </p>

      <SectionHeading title="Step 2 — POST your partner-config" id="partner-config" />
      <p>
        A single POST seeds branding, capabilities, and channel preferences.
        Re-running the call is idempotent and treated as an update.
      </p>
      <CodeBlock
        language="bash"
        label="cURL"
        code={`curl -X POST https://bookedai.au/api/v1/admin/tenants/acme/partner-config \\
  -H "Authorization: Bearer $BOOKEDAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "branding": {
      "display_name": "Acme Studios",
      "accent_token": "apple-blue",
      "logo_url": "https://acme.example/logo.svg"
    },
    "capabilities": ["search", "booking", "portal"],
    "channels": ["web", "telegram"]
  }'`}
      />

      <SectionHeading title="Step 3 — Add the DNS CNAME" id="dns" />
      <p>
        Point your subdomain at the BookedAI apex. The router treats any{' '}
        <code>*.bookedai.au</code> host that is not in the well-known list as a
        tenant slug and renders the partner shell automatically.
      </p>
      <CodeBlock
        language="dns"
        label="DNS"
        code={`acme.bookedai.au.   3600   IN   CNAME   bookedai.au.`}
      />
      <p>
        No DNS access? Use the apex fallback path{' '}
        <code>/partner/{'{slug}'}</code> — it renders the same surface for
        local development and link sharing.
      </p>

      <SectionHeading title="Step 4 — Verify" id="verify" />
      <p>
        Confirm the tenant resolves over the public read API:
      </p>
      <CodeBlock
        language="bash"
        label="cURL"
        code={`curl https://bookedai.au/api/v1/public/tenants/acme/partner-config`}
      />
      <CodeBlock
        language="json"
        label="200 OK"
        code={`{
  "status": "ok",
  "data": {
    "tenant_slug": "acme",
    "branding": { "display_name": "Acme Studios", "accent_token": "apple-blue" },
    "capabilities": ["search", "booking", "portal"],
    "channels": ["web", "telegram"]
  }
}`}
      />
    </div>
  );
}

function PluginWidget() {
  return (
    <div className="flex flex-col gap-6">
      <p>
        Drop the BookedAI search experience into any website with two HTML
        tags. The widget renders the same agent layer that powers the live
        BookedAI tenants and emits structured events your analytics stack can
        capture.
      </p>

      <SectionHeading title="Install" id="install" />
      <CodeBlock
        language="html"
        label="HTML"
        code={`<script src="https://bookedai.au/widget/v1.js" defer></script>
<bookedai-search
  tenant="acme"
  theme="auto"
  accent="apple-blue"
></bookedai-search>`}
      />

      <SectionHeading title="Attribute reference" id="attributes" />
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <thead style={{ background: 'var(--apple-paper-blue-50, #f8fbff)' }}>
            <tr>
              <th className="px-4 py-3 font-semibold">Attribute</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['tenant', 'string', 'Tenant slug as registered in partner-config (required).'],
              ['theme', 'auto | light | dark', 'Surface tone — defaults to auto.'],
              ['accent', 'apple-blue | apple-paper-blue-300 | …', 'Accent token name; falls back to apple-blue.'],
              ['embedded', 'boolean', 'Hide the BookedAI brand chrome when embedded inside an existing site.'],
              ['product-url', 'string', 'Override the default product redirect after booking.'],
              ['api-base', 'string', 'Override the API base URL — useful for staging tenants.'],
            ].map(([attr, type, desc]) => (
              <tr key={attr} className="border-t border-black/8">
                <td className="px-4 py-3 font-mono text-[13px]">
                  <code>{attr}</code>
                </td>
                <td className="px-4 py-3 font-mono text-[13px]" style={{ color: 'rgba(0,0,0,0.6)' }}>
                  {type}
                </td>
                <td className="px-4 py-3">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeading title="Events" id="events" />
      <p>
        The widget dispatches two CustomEvents on the host element. Both
        bubble — listen on <code>document</code> if you load the widget
        dynamically.
      </p>
      <CodeBlock
        language="js"
        label="JavaScript"
        code={`document.addEventListener('bookedai:open', (event) => {
  console.log('Search opened', event.detail);
});

document.addEventListener('bookedai:booking', (event) => {
  // event.detail = { booking_reference, tenant_slug, service_name, … }
  fetch('/analytics/bookedai', {
    method: 'POST',
    body: JSON.stringify(event.detail),
  });
});`}
      />

      <SectionHeading title="Theming" id="theming" />
      <p>
        Override CSS custom properties on the host element to match your
        brand. The widget reads <code>--apple-blue</code>,{' '}
        <code>--apple-paper-blue-100</code>, and <code>--apple-near-black</code>{' '}
        from the surrounding document, so light tenants on dark pages should
        scope the overrides at the element level.
      </p>
      <CodeBlock
        language="css"
        label="CSS"
        code={`bookedai-search {
  --apple-blue: #0071e3;
  --apple-paper-blue-100: #eef4ff;
  --apple-near-black: #172033;
}`}
      />
    </div>
  );
}

function ApiReference() {
  return (
    <div className="flex flex-col gap-6">
      <p>
        BookedAI exposes a stable v1 surface under <code>/api/v1</code>. Every
        response wraps payloads in a{' '}
        <code>{'{ status, data | error }'}</code> envelope. Authenticated
        admin endpoints expect a Bearer token; public endpoints are
        rate-limited per IP.
      </p>

      <SectionHeading title="Multi-tenant" id="multi-tenant" />
      <EndpointRow
        method="GET"
        path="/api/v1/public/tenants/{slug}/partner-config"
        description="Public read for tenant branding, capabilities, and channels. Cached for 60 seconds."
      />

      <SectionHeading title="Search" id="search" />
      <EndpointRow
        method="POST"
        path="/api/v1/embed/search/candidates"
        description="Run a natural-language search and receive a ranked candidate set with location, price, and availability posture."
      />

      <SectionHeading title="Lead capture" id="leads" />
      <EndpointRow
        method="POST"
        path="/api/v1/embed/leads"
        description="Capture a lead from the embedded widget without creating a booking — useful for top-of-funnel forms."
      />

      <SectionHeading title="Booking flow" id="bookings" />
      <EndpointRow
        method="POST"
        path="/api/v1/leads"
        description="Convert a lead into a confirmed booking, returning a portal-ready booking reference."
      />
      <EndpointRow
        method="GET"
        path="/api/v1/portal/bookings/{ref}"
        description="Fetch booking detail and follow-up state for a portal access token."
      />

      <SectionHeading title="Webhooks" id="webhooks" />
      <EndpointRow
        method="POST"
        path="/api/v1/webhooks/stripe"
        description="Stripe checkout + subscription events. HMAC-signed via Stripe-Signature."
      />
      <EndpointRow
        method="POST"
        path="/api/v1/webhooks/whatsapp"
        description="Meta WhatsApp inbound messages. Verified via the Meta verify token + signature."
      />
      <EndpointRow
        method="POST"
        path="/api/v1/webhooks/telegram"
        description="Telegram bot updates. Verified via the secret token header."
      />

      <p
        className="rounded-2xl border p-4 text-sm leading-6"
        style={{
          borderColor: 'var(--apple-paper-blue-200, #dbe7fb)',
          background: 'var(--apple-paper-blue-50, #f8fbff)',
          color: 'var(--apple-paper-blue-navy-800, #2f3d4f)',
        }}
      >
        OpenAPI / Swagger schema is exposed at{' '}
        <code>/api/openapi.json</code>. Generated client SDKs are on the
        roadmap — track progress on the{' '}
        <a
          href="/changelog"
          className="font-semibold underline"
          style={{ color: 'var(--apple-blue, #0071e3)' }}
        >
          changelog
        </a>.
      </p>
    </div>
  );
}

function AuthSecurity() {
  return (
    <div className="flex flex-col gap-6">
      <p>
        BookedAI runs as a multi-tenant operating system. The security model
        is layered so a compromise of one surface (widget origin, portal
        link, admin browser) cannot reach another.
      </p>

      <SectionHeading title="Portal access tokens" id="portal-tokens" />
      <p>
        Customer portal links are signed with HMAC-SHA256 over a 32-byte
        random nonce, then delivered out-of-band by email. Tokens are
        single-use, short-lived (24h default), and bound to the booking
        reference and email recipient.
      </p>

      <SectionHeading title="Admin authentication" id="admin-auth" />
      <p>
        Admin operators authenticate with PBKDF2-HMAC-SHA256 (310k iterations)
        password hashes plus SSO Google OAuth. Sessions are stored in HTTP-only
        cookies with <code>Secure</code> + <code>SameSite=Lax</code>.
      </p>

      <SectionHeading title="Embed origin allow-list" id="embed-origins" />
      <p>
        Each tenant declares an allow-list of origins that may load the
        BookedAI widget. The widget refuses to render when{' '}
        <code>document.location.origin</code> is not on the list, and the
        backend rejects embed API calls whose <code>Origin</code> header is
        absent or unauthorized.
      </p>

      <SectionHeading title="AI guardrails" id="ai-guardrails" />
      <p>
        Three layers protect the AI agent layer in production:
      </p>
      <ul
        className="ml-5 list-disc space-y-2"
        style={{ color: 'var(--apple-near-black, #172033)' }}
      >
        <li>
          <strong>Catalog sanitize</strong> — only fields present in the
          tenant catalog are surfaced to the model; PII never enters the prompt.
        </li>
        <li>
          <strong>Rate limit</strong> — per-tenant + per-IP token bucket on
          all embed endpoints, with separate buckets for search and lead
          capture.
        </li>
        <li>
          <strong>Cost breaker</strong> — model spend caps per tenant per
          24h. Breaches automatically downgrade to the deterministic search
          path until a human intervenes.
        </li>
      </ul>

      <SectionHeading title="Status posture" id="status-posture" />
      <p>
        The live system status — including API, booking flow, webhooks, and
        widget — is published at{' '}
        <a
          href="/status"
          className="font-semibold underline"
          style={{ color: 'var(--apple-blue, #0071e3)' }}
        >
          /status
        </a>{' '}
        and refreshes every 30 seconds.
      </p>
    </div>
  );
}

// ── Shared building blocks ────────────────────────────────────────────────

function SectionHeading({ title, id }: { title: string; id: string }) {
  return (
    <h2
      id={id}
      className="mt-2 scroll-mt-24 text-xl font-semibold tracking-[-0.01em]"
      style={{ color: 'var(--apple-near-black, #172033)' }}
    >
      {title}
    </h2>
  );
}

function EndpointRow({
  method,
  path,
  description,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
}) {
  const methodToneToken =
    method === 'GET'
      ? 'var(--apple-paper-blue-100, #eef4ff)'
      : method === 'POST'
        ? 'var(--apple-success, #34c759)'
        : 'var(--apple-warning, #ff9f0a)';
  const methodTextToken =
    method === 'GET'
      ? 'var(--apple-paper-blue-navy-900, #0f3d7a)'
      : 'var(--apple-white, #ffffff)';
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-md px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em]"
          style={{
            background: methodToneToken,
            color: methodTextToken,
            minHeight: '24px',
          }}
        >
          {method}
        </span>
        <code className="font-mono text-sm" style={{ color: 'var(--apple-near-black, #172033)' }}>
          {path}
        </code>
      </div>
      <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(0,0,0,0.66)' }}>
        {description}
      </p>
    </div>
  );
}

function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, [code]);

  const lines = code.split('\n');

  return (
    <figure
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'var(--apple-near-black, #172033)',
        color: 'var(--apple-text-dark, #f5f5f7)',
      }}
    >
      <figcaption
        className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'var(--apple-text-dark-3, rgba(255,255,255,0.56))' }}
      >
        <span>{label ?? language}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] transition hover:bg-white/[0.12]"
          style={{
            minHeight: '32px',
            color: copied
              ? 'var(--apple-success, #34c759)'
              : 'var(--apple-text-dark, #f5f5f7)',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre
        className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-6"
        style={{ tabSize: 2 }}
      >
        <code>
          {lines.map((line, index) => (
            <CodeLine key={index} number={index + 1} line={line} />
          ))}
        </code>
      </pre>
    </figure>
  );
}

function CodeLine({ number, line }: { number: number; line: string }): ReactNode {
  return (
    <span className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
      <span
        aria-hidden="true"
        style={{ color: 'var(--apple-text-dark-3, rgba(255,255,255,0.56))' }}
      >
        {number}
      </span>
      <span style={{ whiteSpace: 'pre' }}>{line || ' '}</span>
    </span>
  );
}

export default DocsApp;
