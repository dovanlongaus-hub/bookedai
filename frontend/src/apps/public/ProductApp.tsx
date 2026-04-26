import {
  brandDescriptor,
  brandDomainLabel,
  brandHomeUrl,
  brandName,
  brandUploadedLogoPath,
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
import {
  BOOKEDAI_PUBLIC_TENANT_REF,
  createPublicAssistantRuntimeConfig,
} from '../../shared/runtime/publicAssistantRuntime';

export function ProductApp() {
  const bookingAssistantV1Enabled = isPublicBookingAssistantV1Enabled();
  const bookingAssistantV1LiveReadEnabled = isPublicBookingAssistantV1LiveReadEnabled();
  const productFlowLabel = !bookingAssistantV1Enabled
    ? 'Search preview'
    : bookingAssistantV1LiveReadEnabled
      ? 'Live booking flow'
      : 'Booking flow active';
  const productFlowDescription = !bookingAssistantV1Enabled
    ? 'Search and results are active. Booking confirmation will be enabled shortly.'
    : bookingAssistantV1LiveReadEnabled
      ? 'Search, shortlist, booking, and follow-up are all live in this product.'
      : 'Search, shortlist, and booking are all active on this product.';
  const productFlowSteps = ['Search', 'Match', 'Book', 'Follow-up'];
  const productRuntimeConfig = createPublicAssistantRuntimeConfig({
    channel: 'public_web',
    tenantRef: BOOKEDAI_PUBLIC_TENANT_REF,
    deploymentMode: 'standalone_app',
    widgetId: 'bookedai-product-live-flow',
    source: 'bookedai_product',
    medium: 'bookedai_owned_website',
    campaign: 'bookedai_product_live_flow',
    surface: 'bookedai_product_assistant',
  });

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
    const target = new URL('/register-interest', brandHomeUrl);
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
      <h1 className="sr-only">BookedAI live revenue flow</h1>
      <section className="relative flex min-h-[100svh] flex-col md:min-h-[100dvh]">
        <h2 className="sr-only">Search, shortlist, book, and follow up</h2>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_62%)] sm:h-40" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(237,242,249,0.9))]" />

        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.35rem)] sm:px-5 sm:pb-2 sm:pt-[calc(env(safe-area-inset-top)+0.8rem)] lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LogoMark
              src={brandUploadedLogoPath}
              alt={brandName}
              className="h-10 w-[9.5rem] max-w-[calc(100vw-11rem)] shrink-0 object-cover object-center sm:w-[10.75rem]"
            />
            <div className="min-w-0">
              <div className="line-clamp-1 text-[12px] font-semibold tracking-tight text-[var(--apple-near-black)] sm:text-sm">
                {brandName}
              </div>
              <div className="hidden text-[10px] text-black/48 sm:block">{productFlowLabel}</div>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="template-chip">Search to booking</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 sm:flex sm:px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">{productFlowLabel}</span>
            </div>

            <button
              type="button"
              onClick={openRegisterInterest}
              className="booked-button inline-flex h-8 shrink-0 items-center justify-center px-3 text-[10px] font-semibold sm:hidden"
            >
              Free Trial
            </button>

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
          <div className="mx-auto flex max-w-[32rem] flex-col gap-2 rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[var(--apple-near-black)]">
                {productFlowDescription}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {productFlowSteps.map((step) => (
                <span
                  key={step}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-3 pb-3 sm:px-5">
          <div className="mx-auto flex max-w-[32rem] flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[#dbeafe] bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(239,246,255,0.98)_100%)] px-4 py-3 shadow-[0_12px_32px_rgba(20,89,199,0.08)]">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                Ready to use BookedAI for your business?
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--apple-near-black)]">
                Start a free trial and get the full search-to-booking flow live on your website.
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

        <div className="relative z-10 flex justify-center px-0 pb-6 sm:px-3 sm:pb-8 lg:px-4">
          <div className="flex w-full max-w-full sm:max-w-[42rem] lg:max-w-[54rem] xl:max-w-[60rem]">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              layoutMode="product_app"
              runtimeConfig={productRuntimeConfig}
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
