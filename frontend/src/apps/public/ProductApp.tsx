import {
  brandDescriptor,
  brandDomainLabel,
  brandHomeUrl,
  brandName,
  bookingAssistantContent,
} from '../../components/landing/data';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import { LogoMark } from '../../components/landing/ui/LogoMark';

export function ProductApp() {
  return (
    <main className="booked-shell booked-product-shell bookedai-brand-shell min-h-screen min-h-[100svh] overflow-x-hidden md:min-h-[100dvh]">
      <section className="relative flex h-full min-h-[100svh] flex-col overflow-hidden md:min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_62%)] sm:h-40" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(219,234,254,0.75))]" />

        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] sm:px-5 sm:pb-2 sm:pt-[calc(env(safe-area-inset-top)+0.9rem)] lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LogoMark
              variant="icon"
              alt={brandName}
              className="booked-brand-image booked-brand-image--soft h-8 w-8 shrink-0 rounded-[0.95rem] ring-1 ring-white/10 sm:h-9 sm:w-9"
            />
            <div className="min-w-0">
              <div className="line-clamp-1 text-[12px] font-semibold tracking-tight text-white sm:text-sm">
                {brandName}
              </div>
              <div className="text-[10px] text-white/55">Live demand-to-booking flow</div>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              <span className="template-chip">Revenue-engine flow</span>
              <span className="template-chip">{brandDescriptor}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/12 px-2 py-1 sm:px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-semibold text-emerald-100">Live</span>
            </div>

            <a
              href={brandHomeUrl}
              aria-label="Back to main site"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[12px] font-semibold text-white transition hover:bg-white/14 sm:hidden"
            >
              ←
            </a>

            <a
              href={brandHomeUrl}
              className="booked-button-secondary hidden shrink-0 px-3 py-1.5 text-[11px] font-semibold sm:inline-flex sm:px-4 sm:py-2 sm:text-sm"
            >
              ← Home
            </a>
          </div>
        </div>

        <div className="relative z-10 hidden px-3 pb-2 sm:block sm:px-5">
          <div className="bookedai-shell-nav mx-auto flex max-w-[32rem] items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/56">
                Product flow
              </div>
              <div className="line-clamp-1 text-[12px] font-semibold text-white">
                Search chat stays visible while booking slides up only when needed.
              </div>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[10px] font-semibold text-white/68 sm:block">
              Mobile-ready
            </div>
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
