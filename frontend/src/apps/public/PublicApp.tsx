import { FormEvent, useMemo, useState } from 'react';

import { Header } from '../../components/landing/Header';
import { productHref, roadmapHref } from '../../components/landing/data';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';

const homepageNavItems = [
  { id: 'hero', label: 'Workspace' },
  { id: 'bookedai-search-assistant', label: 'Results' },
  { id: 'roadmap', label: 'Roadmap', href: roadmapHref },
];

const suggestedSearches = [
  'Private swim coaching near Caringbah this weekend',
  'Premium haircut near Sydney CBD this afternoon',
  'Restaurant for tonight with live booking availability',
  'AI mentor session for startup growth this week',
];

const workspaceSignals = ['Search-first workspace', 'AI-guided booking'] as const;

export function PublicApp() {
  const homepageSearchContent = useMemo(() => getHomepageContent('en'), []);
  const [queryValue, setQueryValue] = useState('');
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

    setQueryValue(trimmed);
    setSubmittedQuery(trimmed);
    setSubmittedRequestId((current) => current + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(queryValue);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(26,115,232,0.10),transparent_22%),linear-gradient(180deg,#f6f8fc_0%,#ffffff_100%)] text-[#202124] xl:pl-[7rem]">
      <div className="relative z-10">
        <Header
          navItems={homepageNavItems}
          onStartTrial={openProductTrial}
          onBookDemo={openPitchDeck}
          startTrialLabel="Open Web App"
          bookDemoLabel="Open Pitch"
          compactMenuOnly
          utilityLinks={[
            { label: 'Workspace', href: '#hero' },
            { label: 'Roadmap', href: roadmapHref },
            { label: 'Video Demo', href: '/video-demo.html' },
          ]}
        />

        <section id="hero" className="mx-auto max-w-[1380px] px-4 pb-5 pt-4 sm:px-6 lg:px-8 lg:pb-6 lg:pt-6">
          <div className="rounded-[2rem] border border-[#e3e7ee] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,255,0.94)_100%)] px-4 py-5 shadow-[0_24px_72px_rgba(60,64,67,0.08)] sm:px-6 lg:px-8 lg:py-6">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1a73e8]">
                    BookedAI workspace
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#202124] sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
                    Search, refine, and continue booking in one calm workspace.
                  </h1>
                  <p className="mt-4 max-w-[44rem] text-sm leading-7 text-[#5f6368] sm:text-base">
                    Start with a natural-language request. BookedAI keeps the shortlist, follow-up questions, and booking flow together instead of sending people across separate landing sections.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-[22rem] lg:justify-end">
                  {workspaceSignals.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#d7e3f7] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#35507a] shadow-[0_8px_20px_rgba(60,64,67,0.05)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mx-auto mt-7 max-w-5xl">
                <div className="rounded-[2rem] border border-[#dfe6f2] bg-white/96 px-3 py-3 shadow-[0_18px_48px_rgba(60,64,67,0.12)] transition hover:shadow-[0_22px_56px_rgba(60,64,67,0.15)] sm:px-4 sm:py-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex min-w-0 items-start gap-3 rounded-[1.35rem] px-2 py-1 sm:px-3">
                      <svg viewBox="0 0 24 24" className="mt-3 h-5 w-5 shrink-0 text-[#1a73e8]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                        <circle cx="11" cy="11" r="6.5" />
                        <path d="m16 16 4.5 4.5" strokeLinecap="round" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <input
                          value={queryValue}
                          onChange={(event) => setQueryValue(event.target.value)}
                          placeholder="Ask for a service, place, date, or booking need"
                          className="h-12 w-full border-0 bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#80868b] sm:text-[1.02rem]"
                          aria-label="Search services"
                        />
                        <div className="mt-1 text-[12px] text-[#5f6368]">
                          Try area, timing, or one strong preference. BookedAI will ask for the missing details while searching.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] px-2 pt-3 sm:px-3">
                      <div className="flex flex-wrap gap-2">
                        {['Area', 'Timing', 'Preference'].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-[#e2e8f3] bg-[#fbfdff] px-3 py-1.5 text-[11px] font-medium text-[#5f6368]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="rounded-full bg-[#1a73e8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1558b0]"
                      >
                        Search now
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              <div className="mx-auto mt-4 flex max-w-5xl flex-wrap gap-2.5">
                {suggestedSearches.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => runSearch(prompt)}
                    className="rounded-full border border-[#dfe1e5] bg-[#fbfdff] px-4 py-2 text-left text-[12px] font-medium text-[#5f6368] transition hover:border-[#c6dafc] hover:bg-[#f8fbff] hover:text-[#1a73e8]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12">
          <HomepageSearchExperience
            content={homepageSearchContent}
            sourcePath={sourcePath}
            initialQuery={submittedQuery}
            initialQueryRequestId={submittedRequestId}
          />
        </section>
      </div>
    </main>
  );
}
