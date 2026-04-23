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
import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../shared/config/publicBookingAssistant';

export function ProductApp() {
  const bookingAssistantV1Enabled = isPublicBookingAssistantV1Enabled();
  const bookingAssistantV1LiveReadEnabled = isPublicBookingAssistantV1LiveReadEnabled();
  const productFlowLabel = !bookingAssistantV1Enabled
    ? 'BookedAI fallback mode'
    : bookingAssistantV1LiveReadEnabled
      ? 'BookedAI live booking flow'
      : 'BookedAI booking flow';
  const productFlowDescription = !bookingAssistantV1Enabled
    ? 'Search stays visible here, but confirmed booking writes still fall back to the legacy session path until the v1 runtime is fully active.'
    : bookingAssistantV1LiveReadEnabled
      ? 'Search, shortlist, trust checks, booking handoff, and follow-up are all aligned inside the visible BookedAI runtime.'
      : 'Booking capture already writes through the BookedAI v1 path while shortlist guidance stays on the safer transitional lane.';
  const productFlowSteps = ['Search', 'Match', 'Book', 'Follow-up'];

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

        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.35rem)] sm:px-5 sm:pb-2 sm:pt-[calc(env(safe-area-inset-top)+0.8rem)] lg:px-6">
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
                <div className="text-[10px] text-black/48">{productFlowLabel}</div>
              </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="template-chip">{productFlowLabel}</span>
              <span className="template-chip">Search to booking</span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-between gap-1.5 sm:flex-initial sm:justify-end">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 sm:px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">{productFlowLabel}</span>
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

        <div className="relative z-10 px-3 pb-2 sm:px-5">
          <div className="template-nav mx-auto flex max-w-[32rem] flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/42">
                BookedAI product flow
              </div>
              <div className="text-[12px] font-semibold text-[var(--apple-near-black)] sm:text-[13px]">
                {productFlowDescription}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">
              {productFlowSteps.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-black/6 bg-white/82 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/58"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden px-3 pb-3 sm:block sm:px-5">
          <div className="mx-auto flex max-w-[32rem] flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-black/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(239,246,255,0.96)_100%)] px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                BookedAI launch path
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--apple-near-black)]">
                If this flow matches your business, start the BookedAI setup path without leaving the product runtime.
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
          <div className="flex min-h-0 w-full max-w-full flex-1 items-stretch sm:max-w-[30rem] lg:max-w-[34rem] xl:max-w-[36rem]">
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
