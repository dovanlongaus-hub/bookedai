/**
 * <ChangelogApp /> — public BookedAI changelog at `/changelog`.
 *
 * Lane 7 P11 — reverse-chronological release notes modeled after
 * Vercel's changelog. Initial entries hard-coded; future entries should be
 * appended to ENTRIES below (most recent first). Each entry exposes a date
 * header, headline, summary, and bulleted highlights.
 *
 * Visual rules:
 *   - Zero arbitrary hex colors. Apple tokens only.
 *   - Mobile-first; ≥44px tap targets; max-width 720px main column.
 *   - 220ms ease-out hover/transition.
 *   - No new runtime dependencies.
 */

import { Footer } from '../../components/landing/Footer';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { brandUploadedLogoPath } from '../../components/landing/data';

type ChangelogEntry = {
  date: string;
  dateLabel: string;
  headline: string;
  bullets: ReadonlyArray<string>;
  attachmentLabel?: string;
};

const ENTRIES: ReadonlyArray<ChangelogEntry> = [
  {
    date: '2026-04-28',
    dateLabel: '28 April 2026',
    headline:
      'Wave 1–11 ultra review + multi-tenant API + plugin widget + sandbox',
    bullets: [
      '18 new endpoints — Stripe webhook, portal token, partner-config, embed bypass, sandbox.',
      '6 new components — AppleCTA, AgentActivityDrawer, LiveBookingTicker, TenantPartnerApp, SandboxApp, <bookedai-search>.',
      '7 investor pitch slides — TAM, defensibility, unit economics, live evidence, competitive map, why now, revenue milestones.',
      'Magic-moment sandbox at /sandbox — 4-stage onboarding (vertical → dashboard → first booking → save workspace).',
      'AI guardrails — catalog sanitize, per-tenant rate limit, daily cost breaker.',
      'Multi-tenant API — onboard a new tenant via API + DNS in 10 minutes.',
    ],
    attachmentLabel: 'See /docs and /sandbox',
  },
  {
    date: '2026-04-26',
    dateLabel: '26 April 2026',
    headline: 'Phase 17 stabilization',
    bullets: [
      'Full booking journey end-to-end from search to portal return.',
      'Stripe checkout + portal handoff verified across live tenants.',
      'Lifecycle ops dashboard exposes manual-review actions for support staff.',
    ],
  },
  {
    date: '2026-04-22',
    dateLabel: '22 April 2026',
    headline: 'Apple design system unification',
    bullets: [
      'Single source of truth for tokens — minimal-bento-template.css.',
      'Banned arbitrary hex usage across all public surfaces.',
      'Consolidated AppleCTA primitive replaces ad-hoc button styling.',
    ],
  },
];

function navigateApex() {
  if (typeof window !== 'undefined') {
    window.location.href = 'https://bookedai.au/';
  }
}

function navigateRegister() {
  if (typeof window !== 'undefined') {
    window.location.href = '/register-interest?source_section=changelog';
  }
}

export function ChangelogApp() {
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
            Changelog
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/docs"
              className="hidden rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[color:var(--apple-near-black,#172033)] transition hover:border-[color:var(--apple-blue,#0071e3)] sm:inline-flex"
              style={{ minHeight: '44px', alignItems: 'center' }}
            >
              Docs
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

      <section className="mx-auto max-w-[1200px] px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="max-w-[720px]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-paper-blue-navy-700,#31507b)]">
            Release notes
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            BookedAI changelog
          </h1>
          <p
            className="mt-3 text-base leading-7"
            style={{ color: 'rgba(0,0,0,0.66)' }}
          >
            What we shipped, week by week. The most recent entries appear
            first; everything older is preserved for audit.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="/changelog.rss"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[color:var(--apple-blue,#0071e3)]"
              style={{ minHeight: '36px', color: 'var(--apple-near-black, #172033)' }}
              aria-label="Subscribe to changelog via RSS"
            >
              Subscribe via RSS
            </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold transition hover:border-[color:var(--apple-blue,#0071e3)]"
              style={{ minHeight: '36px', color: 'var(--apple-near-black, #172033)' }}
            >
              Read the docs
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
        <ol className="max-w-[960px]">
          {ENTRIES.map((entry, index) => (
            <li
              key={entry.date}
              className="grid gap-4 border-t border-black/8 py-8 first:border-t-0 first:pt-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-8"
              data-changelog-entry={entry.date}
            >
              <div className="flex flex-col gap-1 sm:sticky sm:top-24 sm:self-start">
                <time
                  dateTime={entry.date}
                  className="text-sm font-semibold tracking-[-0.005em]"
                  style={{ color: 'var(--apple-paper-blue-navy-900, #0f3d7a)' }}
                >
                  {entry.dateLabel}
                </time>
                <div
                  className="text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(0,0,0,0.5)' }}
                >
                  Release {String(ENTRIES.length - index).padStart(2, '0')}
                </div>
              </div>
              <article className="min-w-0 max-w-[720px]">
                <h2 className="text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
                  {entry.headline}
                </h2>
                <ul className="mt-4 flex flex-col gap-2 text-[15px] leading-7">
                  {entry.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: 'var(--apple-blue, #0071e3)' }}
                      />
                      <span style={{ color: 'rgba(0,0,0,0.78)' }}>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {entry.attachmentLabel ? (
                  <div
                    className="mt-5 inline-flex rounded-xl border px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: 'var(--apple-paper-blue-200, #dbe7fb)',
                      background: 'var(--apple-paper-blue-50, #f8fbff)',
                      color: 'var(--apple-paper-blue-navy-800, #2f3d4f)',
                    }}
                  >
                    {entry.attachmentLabel}
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      </section>

      <Footer onStartTrial={navigateRegister} onBookDemo={navigateApex} />
    </main>
  );
}

export default ChangelogApp;
