import { useEffect, useMemo, useState } from 'react';

import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import type { PublicBookingAssistantRuntimeConfig } from '../../components/landing/assistant/publicBookingAssistantV1';
import { bookingAssistantContent } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';

const AI_MENTOR_PRO_TENANT_REF = 'ai-mentor-doer';

const aiMentorHostedRuntimeConfig: PublicBookingAssistantRuntimeConfig = {
  channel: 'public_web',
  tenantRef: AI_MENTOR_PRO_TENANT_REF,
  deploymentMode: 'standalone_app',
  widgetId: 'ai-mentor-pro-hosted-app',
  source: 'ai_mentor_pro_hosted_app',
  medium: 'hosted_product',
  campaign: 'ai_mentor_pro_hosted',
  surface: 'ai_mentor_pro_hosted_app',
};

const aiMentorEmbedRuntimeConfig: PublicBookingAssistantRuntimeConfig = {
  channel: 'embedded_widget',
  tenantRef: AI_MENTOR_PRO_TENANT_REF,
  deploymentMode: 'plugin_integrated',
  widgetId: 'ai-mentor-pro-plugin',
  source: 'ai_mentor_pro_plugin',
  medium: 'partner_website',
  campaign: 'ai_mentor_pro_embed',
  surface: 'ai_mentor_pro_partner_widget',
};

const quickPrompts = [
  'I want a 1-1 session to build my first AI app in one hour.',
  'Help me choose the right package to automate real work with AI.',
  'I want to turn my AI prototype into a real monetized product.',
  'I need a custom project-based mentoring package for my team.',
  'I want ongoing mentor and product operations support after launch.',
];

const packageCards = [
  {
    title: 'Private 1-1 - Your First AI App in 60 Minutes',
    price: 'USD $120',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
  },
  {
    title: 'Private 1-1 - AI That Executes for You',
    price: 'USD $600 / 5 hours',
    image: '/tenant-assets/ai-mentor/executes-for-you-5h.svg',
  },
  {
    title: 'Private 1-1 - Turn Your AI Into a Real Product',
    price: 'USD $1,200 / 10 hours',
    image: '/tenant-assets/ai-mentor/real-product-10h.svg',
  },
  {
    title: 'Private 1-1 - Project-Based AI Builder Mentoring',
    price: 'Custom pricing',
    image: '/tenant-assets/ai-mentor/project-based-builder.svg',
  },
  {
    title: 'Private 1-1 - Ongoing Mentor & Product Operations Support',
    price: 'Pricing on request',
    image: '/tenant-assets/ai-mentor/ongoing-ops-support.svg',
  },
  {
    title: 'Group Mentoring - Your First AI App in 60 Minutes',
    price: 'USD $50 / hour / person',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
  },
  {
    title: 'Group Mentoring - AI That Executes for You',
    price: 'USD $250 / 5 hours / person',
    image: '/tenant-assets/ai-mentor/executes-for-you-5h.svg',
  },
  {
    title: 'Group Mentoring - Turn Your AI Into a Real Product',
    price: 'USD $500 / 10 hours / person',
    image: '/tenant-assets/ai-mentor/real-product-10h.svg',
  },
  {
    title: 'Group Mentoring - Project-Based AI Builder Mentoring',
    price: 'Custom pricing',
    image: '/tenant-assets/ai-mentor/project-based-builder.svg',
  },
  {
    title: 'Group Mentoring - Ongoing Mentor & Product Operations Support',
    price: 'Pricing on request',
    image: '/tenant-assets/ai-mentor/ongoing-ops-support.svg',
  },
];

function parseQueryState() {
  if (typeof window === 'undefined') {
    return {
      embedMode: false,
      initialQuery: null as string | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const embedMode =
    params.get('embed') === '1' ||
    params.get('embed') === 'true' ||
    params.get('mode') === 'embed' ||
    window.location.pathname.startsWith('/partner/ai-mentor-pro/embed');
  const initialQuery = params.get('q')?.trim() || null;

  return { embedMode, initialQuery };
}

export function AIMentorProApp() {
  const queryState = useMemo(() => parseQueryState(), []);
  const [initialQuery, setInitialQuery] = useState<string | null>(queryState.initialQuery);
  const [initialQueryRequestId, setInitialQueryRequestId] = useState(queryState.initialQuery ? 1 : 0);

  useEffect(() => {
    document.title = queryState.embedMode
      ? 'AI Mentor Pro Widget | Powered by BookedAI'
      : 'AI Mentor Pro | Powered by BookedAI';
  }, [queryState.embedMode]);

  function triggerPrompt(prompt: string) {
    setInitialQuery(prompt);
    setInitialQueryRequestId((current) => current + 1);
  }

  if (queryState.embedMode) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#08111f_0%,#0b1728_100%)] p-0 text-white">
        <div className="flex min-h-screen items-stretch justify-center">
          <div className="flex w-full max-w-[30rem] flex-1 items-stretch">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              embedded
              hideCloseControl
              layoutMode="product_app"
              closeLabel="AI Mentor Pro"
              entrySourcePath="/partner/ai-mentor-pro/embed"
              initialQuery={initialQuery}
              initialQueryRequestId={initialQueryRequestId}
              runtimeConfig={aiMentorEmbedRuntimeConfig}
              onClose={() => {}}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8fb_0%,#edf6ff_42%,#f6fbff_100%)] text-[#0f172a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-7rem] h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute right-[-8rem] top-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoMark
              variant="icon"
              alt="AI Mentor Pro"
              className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[1rem] ring-1 ring-black/6"
            />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1459c7]">
                AI Mentor Pro x BookedAI
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">
                Convert AI to your DOER
              </div>
            </div>
          </div>

          <a
            href="https://bookedai.au/"
            className="rounded-full border border-black/8 bg-white/86 px-5 py-3 text-sm font-semibold text-[#0f172a] transition hover:border-[#1459c7] hover:text-[#1459c7]"
          >
            Powered by BookedAI
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_28px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1459c7]">
              Official SME plugin interface
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-[#0f172a] sm:text-5xl">
              Tenant-scoped AI mentoring search, booking, payment, and follow-up.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              This runtime turns <span className="font-semibold text-slate-900">AI Mentor Pro</span> into a
              BookedAI-powered SME surface. Visitors can chat, search the 10 AI mentoring offers, move into
              booking, trigger payment-ready handoff, and route the lead into email, CRM, and WhatsApp-aware
              operator flows from one tenant-scoped product.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => triggerPrompt(prompt)}
                  className="rounded-full border border-black/8 bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#1459c7] transition hover:border-[#1459c7] hover:bg-white"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'Chat + tenant-first search',
                'Booking + payment handoff',
                'Email / CRM / WhatsApp ready',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-black/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(239,246,255,0.95)_100%)] px-4 py-4 text-sm font-semibold text-[#0f172a]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 w-full items-stretch">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              embedded
              hideCloseControl
              layoutMode="product_app"
              closeLabel="AI Mentor Pro"
              entrySourcePath="/partner/ai-mentor-pro"
              initialQuery={initialQuery}
              initialQueryRequestId={initialQueryRequestId}
              runtimeConfig={aiMentorHostedRuntimeConfig}
              onClose={() => {}}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1459c7]">
                AI Mentor product line
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0f172a]">
                The 10 published packages now run through one BookedAI plugin surface.
              </h2>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              Group offers require minimum 5 students
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packageCards.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[1.5rem] border border-black/6 bg-[#f8fbff] shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#dbeafe]">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">{item.title}</div>
                  <div className="mt-2 text-sm font-semibold text-[#1459c7]">{item.price}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
