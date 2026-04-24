import { FormEvent, useMemo, useState } from 'react';

import { Header } from '../../components/landing/Header';
import { productHref, roadmapHref } from '../../components/landing/data';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';

const homepageNavItems = [
  { id: 'hero', label: 'Search' },
  { id: 'bookedai-search-assistant', label: 'Results' },
  { id: 'roadmap', label: 'Roadmap', href: roadmapHref },
];

const suggestedSearches = [
  'Private swim coaching near Caringbah this weekend',
  'Premium haircut near Sydney CBD this afternoon',
  'Restaurant for tonight with live booking availability',
  'AI mentor session for startup growth this week',
];

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f9fc_0%,#ffffff_100%)] text-[#202124] xl:pl-[7rem]">
      <div className="relative z-10">
        <Header
          navItems={homepageNavItems}
          onStartTrial={openProductTrial}
          onBookDemo={openPitchDeck}
          startTrialLabel="Open Web App"
          bookDemoLabel="Open Pitch"
          compactMenuOnly
          utilityLinks={[
            { label: 'Search', href: '#hero' },
            { label: 'Roadmap', href: roadmapHref },
            { label: 'Video Demo', href: '/video-demo.html' },
          ]}
        />

        <section id="hero" className="mx-auto max-w-[1380px] px-4 pb-5 pt-4 sm:px-6 lg:px-8 lg:pb-7 lg:pt-6">
          <div className="rounded-[2rem] border border-[#e3e7ee] bg-white px-4 py-7 shadow-[0_24px_72px_rgba(60,64,67,0.08)] sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1a73e8]">
                Enterprise search workspace
              </div>
              <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-[#202124] sm:text-5xl lg:text-[4rem] lg:leading-[1.02]">
                Search, evaluate, and move into booking from one focused workspace.
              </h1>
              <p className="mx-auto mt-4 max-w-[46rem] text-sm leading-7 text-[#5f6368] sm:text-base">
                A quieter, higher-trust surface for service discovery. Search in natural language, review ranked matches instantly, and keep the BookedAI booking flow beside the results on desktop.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-5xl">
              <div className="rounded-[1.8rem] border border-[#dfe1e5] bg-white px-3 py-3 shadow-[0_8px_28px_rgba(60,64,67,0.12)] transition hover:shadow-[0_12px_34px_rgba(60,64,67,0.16)] sm:px-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] px-2 sm:px-3">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#1a73e8]" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
                    </svg>
                    <input
                      value={queryValue}
                      onChange={(event) => setQueryValue(event.target.value)}
                      placeholder="Search for a service, location, timing, or commercial need"
                      className="h-12 w-full border-0 bg-transparent text-[15px] text-[#202124] outline-none placeholder:text-[#80868b] sm:text-base"
                      aria-label="Search services"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:justify-end">
                    <button
                      type="submit"
                      className="rounded-full bg-[#1a73e8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1558b0]"
                    >
                      Run search
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div className="mx-auto mt-5 flex max-w-5xl flex-wrap justify-center gap-2.5">
              {suggestedSearches.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => runSearch(prompt)}
                  className="rounded-full border border-[#dfe1e5] bg-[#fbfdff] px-4 py-2 text-[12px] font-medium text-[#5f6368] transition hover:border-[#c6dafc] hover:bg-[#f8fbff] hover:text-[#1a73e8]"
                >
                  {prompt}
                </button>
              ))}
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
