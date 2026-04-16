import {
  brandDescriptor,
  brandDomainLabel,
  brandHomeUrl,
  brandLogoPath,
  brandName,
  bookingAssistantContent,
} from '../../components/landing/data';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';

const productModes = [
  {
    title: 'Standalone app',
    body: 'Run product.bookedai.au as its own premium booking surface for demos and internal teams.',
  },
  {
    title: 'Embed widget',
    body: 'Drop the same booking flow into an SME website without changing the core experience.',
  },
  {
    title: 'Plugin / integration',
    body: 'Connect calendars, CRMs, payment, and workflow tools through a clean integration layer.',
  },
  {
    title: 'Mobile-ready',
    body: 'Keep the same assistant flow compact, fast, and usable on smaller screens later.',
  },
];

const problemCards = [
  {
    title: 'Slow reply loses leads',
    body: 'If no one answers fast, the customer moves on before the booking conversation starts.',
  },
  {
    title: 'Front desk gets overloaded',
    body: 'Staff repeat the same questions instead of focusing on high-value service and follow-up.',
  },
  {
    title: 'Conversion feels fragmented',
    body: 'Chat, booking, reminders, and handoff need one flow so revenue does not leak between steps.',
  },
];

const flowSteps = [
  {
    label: '1',
    title: 'Capture',
    body: 'Take the enquiry instantly from web, chat, or voice.',
  },
  {
    label: '2',
    title: 'Qualify',
    body: 'Ask only what is needed to understand fit, urgency, and intent.',
  },
  {
    label: '3',
    title: 'Match',
    body: 'Shortlist the right service, offer the right next step, and reduce back-and-forth.',
  },
  {
    label: '4',
    title: 'Book',
    body: 'Move cleanly into a booking-ready action with a simple handoff.',
  },
];

const deliveryNotes = [
  {
    title: 'Simple cost model',
    body: 'Start with one surface, then extend only when the SME is ready to scale.',
  },
  {
    title: 'Operational control',
    body: 'Keep visibility on the booking path, handoff, and follow-up instead of hiding the flow.',
  },
  {
    title: 'Future-proof shape',
    body: 'The same product structure can become a web app, an embed, a plugin, or a mobile shell.',
  },
];

export function ProductApp() {
  return (
    <main className="apple-public-shell apple-product-shell min-h-screen overflow-x-hidden">
      <header className="apple-product-band sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href={brandHomeUrl} className="flex min-w-0 items-center gap-3">
            <img
              src={brandLogoPath}
              alt={brandName}
              className="h-10 w-10 rounded-2xl border border-black/5 bg-white object-cover shadow-sm"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-slate-950">
                {brandName}
              </div>
              <div className="truncate text-xs text-slate-500">{brandDomainLabel}</div>
            </div>
          </a>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="apple-product-chip">Product surface</span>
            <span className="apple-product-chip">{brandDescriptor}</span>
          </div>

          <div className="flex items-center gap-2">
            <a href="#assistant" className="apple-button px-4 py-2 text-sm font-semibold">
              Try live assistant
            </a>
            <a
              href={brandHomeUrl}
              className="apple-button-secondary px-4 py-2 text-sm font-semibold"
            >
              Main site
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-14">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="apple-product-chip">product.bookedai.au</span>
            <span className="apple-product-chip">Booking flow first</span>
            <span className="apple-product-chip">SME ready</span>
          </div>

          <div className="space-y-4">
            <h1 className="apple-title max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              One booking engine, three surfaces.
            </h1>
            <p className="apple-body max-w-2xl text-base leading-7 sm:text-lg">
              {brandDescriptor} packaged as a standalone app, an embedded widget, and a
              plugin-ready integration path. The live assistant stays at the center of the
              product, while the shell stays flexible for future mobile use.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="#assistant" className="apple-button px-5 py-3 text-sm font-semibold">
              Open the live demo
            </a>
            <a
              href="#deployment"
              className="apple-button-secondary px-5 py-3 text-sm font-semibold"
            >
              See deployment modes
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {productModes.map((mode) => (
              <article key={mode.title} className="apple-product-card p-5">
                <div className="text-sm font-semibold tracking-tight text-slate-950">
                  {mode.title}
                </div>
                <p className="apple-body mt-2 text-sm leading-6">{mode.body}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="apple-product-card flex h-full flex-col justify-between gap-6 p-6 lg:p-7">
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Why this exists
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Keep the revenue flow simple from first reply to booked job.
            </h2>
            <p className="apple-body text-sm leading-6">
              The page should feel like a product surface, not a brochure. That means fast
              orientation, clear problem framing, a live assistant, and a path that can later
              expand into mobile or embedded delivery.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {problemCards.map((card) => (
              <div key={card.title} className="rounded-[20px] border border-black/5 bg-white p-4">
                <div className="text-sm font-semibold tracking-tight text-slate-950">
                  {card.title}
                </div>
                <p className="apple-body mt-1 text-sm leading-6">{card.body}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="apple-product-card overflow-hidden p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                Product flow
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Four steps, one clean booking outcome.
              </h2>
              <p className="apple-body text-sm leading-6 sm:text-base">
                The assistant should read like a simple operating system for SMEs: capture the
                enquiry, qualify it, match the right service, and convert it into a booking-ready
                action.
              </p>
            </div>
            <div className="text-sm font-medium text-slate-500">
              Built for fast reading, not long explanation.
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <article
                key={step.title}
                className="apple-product-flow-step relative overflow-hidden rounded-[24px] border border-black/5 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {step.label}
                  </div>
                  {index < flowSteps.length - 1 ? (
                    <div className="hidden h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent lg:block" />
                  ) : null}
                </div>
                <div className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                  {step.title}
                </div>
                <p className="apple-body mt-2 text-sm leading-6">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="assistant"
        className="mx-auto max-w-7xl scroll-mt-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      >
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Live assistant
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              The assistant is the product. Everything above frames the buying decision.
            </h2>
            <p className="apple-body text-sm leading-6 sm:text-base">
              Keep the interaction real, compact, and ready to book. This is the surface SME teams
              use to evaluate the value immediately.
            </p>
          </div>
        </div>

        <div className="apple-product-frame overflow-hidden">
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
      </section>

      <section id="deployment" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="apple-product-card p-6 sm:p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Deployment path
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Flexible enough to ship now and expand later.
            </h2>
            <p className="apple-body mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              Use the same product shape for a standalone site, embedded website widget, or a
              plugin/integration layer. That keeps the UX stable while the brand or packaging can
              evolve over time.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {deliveryNotes.slice(0, 3).map((note) => (
                <div key={note.title} className="rounded-[20px] border border-black/5 bg-white p-4">
                  <div className="text-sm font-semibold tracking-tight text-slate-950">
                    {note.title}
                  </div>
                  <p className="apple-body mt-1 text-sm leading-6">{note.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="apple-product-card flex flex-col justify-between gap-5 p-6 sm:p-7">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                Future direction
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                Ready for mobile, widget, and embedded application forms.
              </h3>
              <p className="apple-body text-sm leading-6">
                The product styling stays calm and compact so the same booking logic can later live
                inside an app shell, a mobile-first UI, or a customer website without a redesign.
              </p>
            </div>

            <div className="rounded-[24px] border border-black/5 bg-slate-950 p-5 text-white">
              <div className="text-sm font-semibold tracking-tight">Commercial framing</div>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Start with one surface, prove conversion, then expand the deployment model instead
                of overbuilding up front.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="apple-product-card flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Next step
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Review the flow, then book the right rollout shape for your SME.
            </h2>
            <p className="apple-body text-sm leading-6 sm:text-base">
              The product page now explains the problem, the solution, the demo, and the delivery
              model before the call to action appears.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="#assistant" className="apple-button px-5 py-3 text-sm font-semibold">
              Use the live assistant
            </a>
            <a
              href={brandHomeUrl}
              className="apple-button-secondary px-5 py-3 text-sm font-semibold"
            >
              Visit main site
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
