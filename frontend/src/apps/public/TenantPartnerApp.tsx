import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  CreditCard,
  type LucideIcon,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import { bookingAssistantContent } from '../../components/landing/data';
import { AppleCTA } from '../../components/landing/ui/AppleCTA';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import {
  apiV1,
  type TenantPartnerConfig,
  type TenantPartnerCta,
} from '../../shared/api/v1';
import { ApiClientError } from '../../shared/api/client';
import { createPublicAssistantRuntimeConfig } from '../../shared/runtime/publicAssistantRuntime';

type TenantPartnerAppProps = {
  tenantSlug: string;
};

type LoadStatus = 'loading' | 'ready' | 'not_found' | 'error';

/**
 * Map a `TenantPartnerTrustSignal.icon` name (kebab/snake-case) to a small set
 * of approved lucide-react icons. Unknown names safely fall back to a neutral
 * check-circle icon. We keep the list small so the bundle stays light and so
 * the backend can extend it without front-end churn — but unknown icons still
 * render rather than throwing.
 */
const TRUST_ICON_MAP: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  badge_check: BadgeCheck,
  'shield-check': ShieldCheck,
  shield_check: ShieldCheck,
  shield: ShieldCheck,
  'check-circle': CheckCircle2,
  check_circle: CheckCircle2,
  check: CheckCircle2,
  sparkles: Sparkles,
  star: Star,
  zap: Zap,
  bolt: Zap,
  calendar: Calendar,
  'credit-card': CreditCard,
  credit_card: CreditCard,
  payment: CreditCard,
  mail: Mail,
  email: Mail,
  message: MessageCircle,
  chat: MessageCircle,
  phone: Phone,
  send: Send,
  telegram: Send,
};

function resolveTrustIcon(name: string): LucideIcon {
  const normalized = (name || '').trim().toLowerCase();
  return TRUST_ICON_MAP[normalized] ?? CheckCircle2;
}

const CAPABILITY_LABEL_MAP: Record<string, string> = {
  stripe: 'Stripe checkout',
  paypal: 'PayPal',
  telegram: 'Telegram channel',
  whatsapp: 'WhatsApp channel',
  email: 'Email confirmations',
  calendar: 'Calendar sync',
  google_calendar: 'Google Calendar',
  monthly_reminder: 'Auto monthly reminders',
  monthly_check_in: 'Auto monthly check-ins',
  feedback: 'Post-booking feedback',
  post_booking_feedback: 'Post-booking feedback',
  audit_ledger: 'Booking history',
  portal: 'Portal access tokens',
  portal_access: 'Portal access tokens',
  ai_search: 'AI search composer',
  catalog: 'Live catalog',
  payments: 'Payments',
};

function humanizeToken(token: string) {
  return token
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function capabilityLabel(capability: string) {
  const normalized = (capability || '').trim().toLowerCase();
  return CAPABILITY_LABEL_MAP[normalized] ?? humanizeToken(capability || '');
}

const PRODUCT_DEMO_URL = 'https://product.bookedai.au/';
const PORTAL_URL = 'https://portal.bookedai.au/';
const BOOK_DEMO_MAILTO = 'mailto:info@bookedai.au?subject=Revenue%20demo';
const BOOKEDAI_HOME = 'https://bookedai.au/';

type TenantAccentStyle = CSSProperties & { '--tenant-accent'?: string };

/**
 * Best-effort accent color guard. Accept either:
 *   - A CSS variable token (e.g. `var(--apple-blue)`)
 *   - A hex value (the backend is the source of truth, the frontend only
 *     forwards it through a single CSS custom property — no token pollution).
 * Anything else (or empty string) falls back to `var(--apple-blue)`.
 */
function safeAccent(value: string | undefined | null): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return 'var(--apple-blue)';
  }
  if (trimmed.startsWith('var(') || /^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }
  return 'var(--apple-blue)';
}

type CtaHandlerArgs = {
  cta: TenantPartnerCta;
  scrollToSearch: () => void;
};

function resolveCtaHref(args: CtaHandlerArgs): string | undefined {
  const { cta } = args;
  switch (cta.intent) {
    case 'open_search':
      return '#tenant-partner-search';
    case 'external':
      return cta.href;
    case 'run_demo':
      return PRODUCT_DEMO_URL;
    case 'book_demo':
      return BOOK_DEMO_MAILTO;
    case 'open_portal':
      return PORTAL_URL;
    default:
      return undefined;
  }
}

function getCtaTarget(cta: TenantPartnerCta): string | undefined {
  if (cta.intent === 'external' || cta.intent === 'run_demo' || cta.intent === 'open_portal') {
    return '_blank';
  }
  return undefined;
}

type FallbackKind = 'not_found' | 'error';

function PartnerFallback(props: { kind: FallbackKind; slug: string }) {
  const headline =
    props.kind === 'not_found'
      ? "We're getting this partner page ready."
      : "We hit a snag loading this partner page.";
  const body =
    props.kind === 'not_found'
      ? 'In the meantime, try the live BookedAI demo and explore the booking flow we run for every tenant.'
      : 'Refresh in a moment, or jump straight into the live BookedAI demo while we sort it out.';
  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:px-8 lg:py-16">
        <header className="flex items-center gap-3">
          <LogoMark
            variant="icon"
            alt="BookedAI"
            className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
          />
          <div>
            <div className="template-kicker">BookedAI partner · {props.slug}</div>
            <div className="text-xl font-semibold tracking-[-0.04em] text-apple-near-black">
              Powered by BookedAI
            </div>
          </div>
        </header>
        <section className="template-card p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-apple-near-black">
            {headline}
          </h1>
          <p className="mt-3 text-base leading-7 text-[color:var(--apple-text-secondary)]">
            {body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <AppleCTA label="Try the live BookedAI demo" intent="primary" href={PRODUCT_DEMO_URL} />
            <AppleCTA label="Visit bookedai.au" intent="secondary" href={BOOKEDAI_HOME} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PartnerLoadingShell(props: { slug: string }) {
  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black" aria-busy>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-[var(--apple-radius-comfortable)] bg-white ring-1 ring-black/5" />
            <div className="space-y-2">
              <div className="h-3 w-40 animate-pulse rounded-full bg-white" />
              <div className="h-5 w-64 animate-pulse rounded-full bg-white" />
            </div>
          </div>
        </header>
        <section className="template-card p-6 sm:p-8">
          <div className="h-3 w-48 animate-pulse rounded-full bg-white/80" />
          <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded-[var(--apple-radius-comfortable)] bg-white/80" />
          <div className="mt-3 h-10 w-full max-w-xl animate-pulse rounded-[var(--apple-radius-comfortable)] bg-white/80" />
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="h-11 w-44 animate-pulse rounded-full bg-white/80" />
            <div className="h-11 w-44 animate-pulse rounded-full bg-white/80" />
          </div>
        </section>
        <p className="sr-only">Loading partner page for {props.slug}…</p>
      </div>
    </main>
  );
}

type RenderCtaArgs = {
  cta: TenantPartnerCta;
  isPrimary: boolean;
  scrollToSearch: () => void;
};

function PartnerCtaButton({ cta, isPrimary, scrollToSearch }: RenderCtaArgs) {
  const href = resolveCtaHref({ cta, scrollToSearch });
  const target = getCtaTarget(cta);
  if (cta.intent === 'open_search') {
    return (
      <AppleCTA
        label={cta.label}
        intent={isPrimary ? 'primary' : 'secondary'}
        onClick={(event) => {
          event.preventDefault();
          scrollToSearch();
        }}
        href={href}
        ariaLabel={cta.label}
      />
    );
  }
  return (
    <AppleCTA
      label={cta.label}
      intent={isPrimary ? 'primary' : 'secondary'}
      href={href}
      target={target}
      ariaLabel={cta.label}
    />
  );
}

export function TenantPartnerApp({ tenantSlug }: TenantPartnerAppProps) {
  const slug = (tenantSlug || '').trim().toLowerCase();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [config, setConfig] = useState<TenantPartnerConfig | null>(null);
  const searchSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setStatus('not_found');
      setConfig(null);
      return () => {
        cancelled = true;
      };
    }
    setStatus('loading');
    apiV1
      .getTenantPartnerConfig(slug)
      .then((response) => {
        if (cancelled) {
          return;
        }
        if (!response || !response.active) {
          setConfig(null);
          setStatus('not_found');
          return;
        }
        setConfig(response);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setConfig(null);
          setStatus('not_found');
          return;
        }
        // eslint-disable-next-line no-console
        console.error('TenantPartnerApp config load failed', error);
        setConfig(null);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (config?.brand?.name) {
      document.title = `${config.brand.name} on BookedAI`;
    } else if (slug) {
      document.title = `${slug} · BookedAI partner`;
    }
  }, [config?.brand?.name, slug]);

  const scrollToSearch = useCallback(() => {
    const node = searchSectionRef.current;
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Defer focus until the smooth scroll has had a chance to start.
    window.setTimeout(() => {
      const focusable = node.querySelector<HTMLElement>(
        'input, textarea, [contenteditable="true"], [data-focus-target="search"]',
      );
      focusable?.focus();
    }, 280);
  }, []);

  const runtimeConfig = useMemo(() => {
    return createPublicAssistantRuntimeConfig({
      channel: 'public_web',
      tenantRef: slug,
      deploymentMode: 'standalone_app',
      widgetId: `tenant-partner-${slug}`,
      source: `tenant_partner_${slug}`,
      medium: 'partner_subdomain',
      campaign: `tenant_partner_${slug}_app`,
      surface: `tenant_partner_${slug}_app`,
    });
  }, [slug]);

  const accentStyle: TenantAccentStyle = useMemo(
    () => ({ '--tenant-accent': safeAccent(config?.brand?.accent_color) }),
    [config?.brand?.accent_color],
  );

  if (status === 'loading') {
    return <PartnerLoadingShell slug={slug} />;
  }
  if (status === 'not_found') {
    return <PartnerFallback kind="not_found" slug={slug} />;
  }
  if (status === 'error' || !config) {
    return <PartnerFallback kind="error" slug={slug} />;
  }

  const { brand, hero, capabilities, channels, features, trust_signals: trustSignals, footer_html: footerHtml } = config;

  const showTelegram = channels.telegram?.enabled === true && Boolean(channels.telegram?.bot_username);
  const showWhatsapp = channels.whatsapp?.enabled === true && Boolean(channels.whatsapp?.phone_number);
  const showAuditLedger = features.show_audit_ledger;

  return (
    <main
      className="min-h-screen bg-apple-light text-apple-near-black"
      style={accentStyle}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={`${brand.name} logo`}
                className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] object-contain ring-1 ring-black/5"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--apple-radius-comfortable)] bg-white text-sm font-semibold tracking-[-0.02em] text-apple-near-black ring-1 ring-black/5"
                style={{ color: 'var(--tenant-accent)' }}
              >
                {brand.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="template-kicker">
                {brand.tagline ? brand.tagline : `${brand.name} · BookedAI partner`}
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
                {brand.name} on BookedAI
              </div>
            </div>
          </div>

          <a
            href={BOOKEDAI_HOME}
            className="booked-button-secondary"
            aria-label="Visit BookedAI homepage"
          >
            Powered by BookedAI
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div className="template-card p-6 sm:p-8">
            <div
              className="inline-flex flex-wrap rounded-full border border-[var(--template-border)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--tenant-accent)' }}
            >
              {hero.kicker || `Live BookedAI business · ${brand.name}`}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-5xl">
              {hero.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--apple-text-secondary)] sm:text-lg">
              {hero.sub}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <PartnerCtaButton cta={hero.primary_cta} isPrimary scrollToSearch={scrollToSearch} />
              {hero.secondary_cta ? (
                <PartnerCtaButton
                  cta={hero.secondary_cta}
                  isPrimary={false}
                  scrollToSearch={scrollToSearch}
                />
              ) : null}
            </div>

            {capabilities.length > 0 ? (
              <div className="mt-7 flex flex-wrap gap-2" aria-label="Tenant capabilities">
                {capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="template-chip"
                    style={{ minHeight: '44px' }}
                  >
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: 'var(--tenant-accent)' }}
                    />
                    {capabilityLabel(capability)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div
            id="tenant-partner-search"
            ref={searchSectionRef}
            className="flex min-h-0 w-full items-stretch"
          >
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              embedded
              hideCloseControl
              layoutMode="product_app"
              closeLabel={`${brand.name} on BookedAI`}
              entrySourcePath={`/partner/${slug}`}
              runtimeConfig={runtimeConfig}
              onClose={() => {}}
            />
          </div>
        </section>

        {trustSignals.length > 0 ? (
          <section className="template-card p-6 sm:p-8">
            <div className="template-kicker">Why partners trust BookedAI</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
              Business-ready proof on every booking.
            </h2>
            <ul className="mt-6 grid gap-3 md:grid-cols-3" aria-label="Trust signals">
              {trustSignals.map((signal) => {
                const Icon = resolveTrustIcon(signal.icon);
                return (
                  <li
                    key={`${signal.label}-${signal.icon}`}
                    className="template-card-subtle flex items-start gap-3 p-5 text-sm leading-6 text-apple-near-black"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white ring-1 ring-black/5"
                      style={{ color: 'var(--tenant-accent)' }}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span>{signal.label}</span>
                  </li>
                );
              })}
            </ul>
            {showAuditLedger ? (
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[color:var(--apple-text-tertiary)]">
                Booking activity history visible to this business.
              </p>
            ) : null}
          </section>
        ) : null}

        {showTelegram || showWhatsapp || channels.email_support ? (
          <section className="template-card p-6 sm:p-8">
            <div className="template-kicker">Continue the conversation</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
              Pick the channel that suits you.
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {showTelegram && channels.telegram ? (
                <AppleCTA
                  label="Continue on Telegram"
                  intent="secondary"
                  href={`https://t.me/${encodeURIComponent(channels.telegram.bot_username)}?start=svc.${encodeURIComponent(slug)}`}
                  target="_blank"
                />
              ) : null}
              {showWhatsapp && channels.whatsapp ? (
                <AppleCTA
                  label="Continue on WhatsApp"
                  intent="secondary"
                  href={`https://wa.me/${encodeURIComponent(channels.whatsapp.phone_number.replace(/[^\d+]/g, ''))}?text=${encodeURIComponent(`Hi ${brand.name}, I'd like to book.`)}`}
                  target="_blank"
                />
              ) : null}
              {channels.email_support ? (
                <AppleCTA
                  label={`Email ${channels.email_support}`}
                  intent="secondary"
                  href={`mailto:${channels.email_support}`}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--apple-text-tertiary)]">
          <span>Live BookedAI business · powered by BookedAI</span>
          <a
            href={BOOKEDAI_HOME}
            className="hover:underline"
            style={{ color: 'var(--tenant-accent)' }}
            aria-label="Visit BookedAI homepage"
          >
            bookedai.au
          </a>
        </footer>

        {footerHtml ? (
          <div
            className="text-xs leading-6 text-[color:var(--apple-text-tertiary)]"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: footerHtml }}
          />
        ) : null}
      </div>
    </main>
  );
}

export default TenantPartnerApp;
