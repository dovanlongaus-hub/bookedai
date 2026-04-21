import {
  brandDescriptor,
  brandDomainLabel,
  brandHomeUrl,
  brandName,
  bookingAssistantContent,
} from '../../components/landing/data';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import { LogoMark } from '../../components/landing/ui/LogoMark';

export function ProductApp() {
  function openRegisterInterest() {
    if (typeof window === 'undefined') {
      return;
    }

    const attribution = buildPublicCtaAttribution({
      source_section: 'booking_assistant',
      source_cta: 'start_free_trial',
      source_detail: 'product_page_trial',
      source_flow_mode: 'guided',
    });
    const target = new URL('/register-interest', window.location.origin);
    target.searchParams.set('source_section', attribution.source_section);
    target.searchParams.set('source_cta', attribution.source_cta);
    target.searchParams.set('source_detail', attribution.source_detail ?? 'product_page_trial');
    target.searchParams.set('offer', 'launch10');
    target.searchParams.set('deployment', 'standalone_website');
    target.searchParams.set('setup', 'online');
    dispatchPublicCtaAttribution(attribution);
    window.location.href = `${target.pathname}${target.search}`;
  }

  return (
    <main className="booked-shell min-h-screen min-h-[100svh] overflow-x-hidden md:min-h-[100dvh]">
      <section className="relative flex h-full min-h-[100svh] flex-col overflow-hidden md:min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_62%)] sm:h-40" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(237,242,249,0.9))]" />

        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] sm:px-5 sm:pb-2 sm:pt-[calc(env(safe-area-inset-top)+0.9rem)] lg:px-6">
          <div className="hidden min-w-0 items-center gap-2 sm:flex sm:gap-3">
            <LogoMark
              variant="icon"
              alt={brandName}
              className="booked-brand-image booked-brand-image--soft h-8 w-8 shrink-0 rounded-[0.95rem] ring-1 ring-black/6 sm:h-9 sm:w-9"
            />
            <div className="min-w-0">
              <div className="line-clamp-1 text-[12px] font-semibold tracking-tight text-[var(--apple-near-black)] sm:text-sm">
                {brandName}
              </div>
              <div className="text-[10px] text-black/48">Live demand-to-booking flow</div>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="template-chip">Revenue-engine flow</span>
              <span className="template-chip">{brandDescriptor}</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-between gap-1.5 sm:flex-initial sm:justify-end">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 sm:px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">Live</span>
            </div>

            <a
              href={brandHomeUrl}
              aria-label="Back to main site"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/6 bg-white/72 text-[12px] font-semibold text-[var(--apple-near-black)] transition hover:bg-white sm:hidden"
            >
              ←
            </a>

            <a
              href={brandHomeUrl}
              className="booked-button-secondary hidden shrink-0 text-[11px] font-semibold sm:inline-flex sm:text-sm"
            >
              ← Home
            </a>
            <button
              type="button"
              onClick={openRegisterInterest}
              className="booked-button hidden shrink-0 text-[11px] font-semibold sm:inline-flex sm:text-sm"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        <div className="relative z-10 hidden px-3 pb-2 sm:block sm:px-5">
          <div className="template-nav mx-auto flex max-w-[32rem] items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/42">
                Product flow
              </div>
              <div className="line-clamp-1 text-[12px] font-semibold text-[var(--apple-near-black)]">
                Search chat stays visible while booking slides up only when needed.
              </div>
            </div>
            <div className="hidden rounded-full border border-black/6 bg-white/72 px-3 py-1 text-[10px] font-semibold text-black/56 sm:block">
              Mobile-ready
            </div>
          </div>
        </div>

        <div className="relative z-10 px-3 pb-3 sm:px-5">
          <div className="mx-auto flex max-w-[32rem] flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-black/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(239,246,255,0.96)_100%)] px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                Product CTA
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--apple-near-black)]">
                Like the live flow? Start the free setup path without leaving BookedAI.
              </div>
            </div>
            <button
              type="button"
              onClick={openRegisterInterest}
              className="booked-button w-full justify-center text-xs font-semibold sm:w-auto sm:text-sm"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 items-stretch justify-center px-0 pb-0 sm:px-3 sm:pb-3 lg:px-4 lg:pb-4">
          <div className="flex min-h-0 w-full max-w-[28rem] flex-1 items-stretch sm:max-w-[32rem] lg:max-w-[36rem] xl:max-w-[40rem]">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              layoutMode="product_app"
              closeLabel={brandDomainLabel}
              onClose={() => {
                window.location.href = brandHomeUrl;
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
