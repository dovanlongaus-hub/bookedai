import { useMemo, useState } from 'react';

import { brandUploadedLogoPath, productHref, roadmapHref } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';

const suggestedSearches = [
  'Private swim coaching near Caringbah this weekend',
  'Premium haircut near Sydney CBD this afternoon',
  'Restaurant for tonight with live booking availability',
  'AI mentor session for startup growth this week',
];

const topMenuLinks = [
  { label: 'Chat', href: '#bookedai-search-assistant' },
  { label: 'Product', href: productHref },
  { label: 'Pitch', href: pitchDeckHref },
] as const;
const sidebarItems = [
  'Search',
  'Shortlist',
  'Booking',
  'Payment',
  'Follow-up',
] as const;
const flowCards = [
  {
    title: 'Chat',
    body: 'Describe the booking in plain language.',
  },
  {
    title: 'Match',
    body: 'BookedAI ranks options and asks for missing details.',
  },
  {
    title: 'Book',
    body: 'Confirm the match, then hand off payment and follow-up.',
  },
] as const;

export function PublicApp() {
  const homepageSearchContent = useMemo(() => getHomepageContent('en'), []);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState(0);
  const sourcePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/';

  function openProductTrial() {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = productHref;
  }

  function openPitchDeck() {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = pitchDeckHref;
  }

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setSubmittedQuery(trimmed);
    setSubmittedRequestId((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-[#202124]">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-[#e3e3e7] bg-[#f0f0f2] px-3 py-3 max-[1023px]:hidden">
          <div className="sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col">
            <a href="#hero" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#202124] transition hover:bg-white/70">
              <LogoMark
                src={brandUploadedLogoPath}
                alt="BookedAI"
                className="h-11 w-[10.5rem] max-w-full object-cover object-center"
              />
            </a>

            <div className="mt-4 space-y-1">
              {sidebarItems.map((item, index) => (
                <a
                  key={item}
                  href="#bookedai-search-assistant"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    index === 0
                      ? 'bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                      : 'text-[#5f6368] hover:bg-white/70 hover:text-[#202124]'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                  {item}
                </a>
              ))}
            </div>

            <div className="mt-auto rounded-2xl border border-[#dedee3] bg-white px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">bookedai.au</div>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                Chat first. Book next. Follow-up handled in one web workspace.
              </p>
              <button
                type="button"
                onClick={openProductTrial}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#111827] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
              >
                Open web app
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#e8e8ec] bg-[#f7f7f8]/86 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3">
              <a href="#hero" className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold text-[#202124] min-[1024px]:hidden">
                <LogoMark
                  src={brandUploadedLogoPath}
                  alt="BookedAI"
                  className="h-10 w-[9.5rem] max-w-[calc(100vw-7rem)] object-cover object-center sm:w-[10.5rem]"
                />
              </a>
              <nav className="flex items-center gap-1 max-[767px]:hidden">
                {topMenuLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-[#5f6368] transition hover:bg-white hover:text-[#202124]"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <a href={roadmapHref} className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-[#5f6368] transition hover:bg-white hover:text-[#202124] max-[639px]:hidden">
                  Roadmap
                </a>
                <button
                  type="button"
                  onClick={openProductTrial}
                  className="rounded-xl border border-[#dedee3] bg-white px-3 py-2 text-sm font-medium text-[#202124] transition hover:border-[#c9c9d1]"
                >
                  Open Web App
                </button>
                <button
                  type="button"
                  onClick={openPitchDeck}
                  className="hidden rounded-xl border border-[#dedee3] bg-white px-3 py-2 text-sm font-medium text-[#202124] transition hover:border-[#c9c9d1] sm:inline-flex"
                >
                  Pitch
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1380px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-12">
            <section id="hero" className="mx-auto max-w-[980px] text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#e3e3e7] bg-white px-3 py-1.5 text-xs font-semibold text-[#5f6368] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                bookedai.au public app
              </div>
              <h1 className="mx-auto mt-5 max-w-[12ch] text-[2.65rem] font-semibold leading-[0.96] tracking-[-0.055em] text-[#111827] sm:text-[4.5rem] lg:text-[5.2rem]">
                What can we book for you?
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-[1rem] leading-7 text-[#5f6368] sm:text-[1.1rem]">
                Ask naturally. BookedAI turns the chat into ranked options, captures the booking, and prepares payment, portal, and follow-up.
              </p>
              <div className="mx-auto mt-6 flex max-w-[860px] gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-x-visible sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {suggestedSearches.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => runSearch(prompt)}
                    className="max-w-[calc(100vw-2rem)] shrink-0 whitespace-normal rounded-2xl border border-[#dedee3] bg-white px-4 py-2.5 text-left text-[13px] font-medium text-[#4b5563] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#c9c9d1] hover:text-[#111827] sm:whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="mx-auto mt-5 grid max-w-[760px] gap-2 sm:grid-cols-3">
                {flowCards.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-[#e3e3e7] bg-white/72 px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-[#4b5563]">{item.body}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <HomepageSearchExperience
                content={homepageSearchContent}
                sourcePath={sourcePath}
                initialQuery={submittedQuery}
                initialQueryRequestId={submittedRequestId}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
