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
    ? 'Chat, search, preview, booking, payment posture, calendar, CRM/email, and customer-care follow-up are connected in this product.'
    : bookingAssistantV1LiveReadEnabled
      ? 'Chat, search, preview, booking, payment posture, calendar, CRM/email, and customer-care follow-up are connected in this product.'
      : 'Chat, search, preview, booking, and follow-up are active on this product.';
  const productFlowSteps = ['Chat', 'Search', 'Preview', 'Book', 'Pay', 'Care'];
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
        <h2 className="sr-only">Chat, search, preview, book, pay, and follow up</h2>

        {/* Compact, mobile-first top bar — single primary action, thumb-zone safe. */}
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
              <div className="hidden text-xs text-black/48 sm:block">{productFlowLabel}</div>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="template-chip">Search to booking</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 sm:flex sm:px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700">{productFlowLabel}</span>
            </div>

            {/*
              Mobile primary CTA. Label aligned to the canonical CTA glossary
              (`Start a 30-day pilot`, Growth tier intent); the secondary back
              link keeps a 44×44 touch target. The internal `start_free_trial`
              attribution name is preserved for analytics continuity.
            */}
            <button
              type="button"
              onClick={openRegisterInterest}
              aria-label="Start free"
              className="booked-button inline-flex h-11 min-h-[44px] shrink-0 items-center justify-center px-3 text-[11px] font-semibold sm:hidden"
            >
              Start free
            </button>

            <a
              href={brandHomeUrl}
              aria-label="Back to main site"
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/6 bg-white/72 text-[14px] font-semibold text-[var(--apple-near-black)] transition hover:bg-white sm:hidden"
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
              Start a 30-day pilot
            </button>
          </div>
        </div>

        {/* Single condensed flow strip — replaces two prior banner blocks. */}
        <div className="relative z-10 px-3 pb-2 sm:px-5">
          <div className="mx-auto flex max-w-[32rem] flex-col gap-2 rounded-[1.25rem] border border-black/6 bg-white/72 px-4 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[var(--apple-near-black)]">
                {productFlowDescription}
              </div>
              <div className="mt-1 text-xs text-black/55">
                Ready to use BookedAI for your business? Start your free trial and run the full chat-to-booking-care flow on your own site.
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {productFlowSteps.map((step) => (
                <span
                  key={step}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  {step}
                </span>
              ))}
              <button
                type="button"
                onClick={openRegisterInterest}
                aria-label="Start a 30-day pilot"
                className="booked-button inline-flex h-9 min-h-[44px] w-full items-center justify-center px-3 text-[11px] font-semibold sm:w-auto"
              >
                Start a 30-day pilot
              </button>
            </div>
          </div>
        </div>

        {/*
          Mobile-friendly assistant surface. The container removes side padding
          on phones so the embedded composer can render edge-to-edge inside the
          thumb-zone, matching big-tech mobile booking surfaces.
        */}
        <div className="relative z-10 flex justify-center px-0 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:px-3 sm:pb-8 lg:px-4">
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
