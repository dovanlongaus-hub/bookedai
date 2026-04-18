import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  buildAssistantSourcePath,
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
  type PublicCtaAttribution,
} from '../../components/landing/attribution';
import { brandPreferredLogoPath, brandShortIconPath } from '../../components/landing/data';
import { SectionCard } from '../../components/landing/ui/SectionCard';
import { SectionShell } from '../../components/landing/ui/SectionShell';
import { SignalPill } from '../../components/landing/ui/SignalPill';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import {
  getHomepageContent,
  languageOptions,
  pitchDeckHref,
  type HomepageLocale,
} from './homepageContent';

const demoUrl = '/?demo=open';
const bookedAiLogoSrc = brandPreferredLogoPath;
const bookedAiShortIconSrc = brandShortIconPath;

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CompassIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
      <path d="m14.8 9.2-1.9 5.6-5.7 1.9 1.9-5.7 5.7-1.8Z" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" strokeWidth="1.8" />
      <path d="m5.5 8 6.5 5 6.5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandButtonMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <img src={bookedAiShortIconSrc} alt="" aria-hidden="true" className={`${className} object-contain`} />;
}

const streamedPreviewMessage =
  'I found three strong options. The best fit can take your preferred time, confirm availability, and move you straight to booking.';

const conversationChannels = [
  'Website chat',
  'Missed calls',
  'Email enquiries',
  'SMS follow-up',
  'Booking requests',
  'Lead recovery',
];

const capabilityCards = [
  {
    title: 'Streaming AI Replies',
    body: 'Respond to high-intent enquiries instantly with a guided next step instead of a dead-end form.',
  },
  {
    title: 'Lead Qualification',
    body: 'Capture service type, urgency, timing, and fit before your team needs to step in.',
  },
  {
    title: 'Booking Guidance',
    body: 'Turn natural-language questions into a shortlist, a recommendation, and a booking-ready path.',
  },
  {
    title: 'Follow-Up Recovery',
    body: 'Bring after-hours or missed conversations back into a live revenue flow automatically.',
  },
  {
    title: 'Multi-Channel Capture',
    body: 'Keep web, phone, email, and message-driven demand inside one commercial system.',
  },
  {
    title: 'Revenue Visibility',
    body: 'See which conversations become bookings, callbacks, payments, and recovered opportunities.',
  },
];

const integrationLogos = [
  'Google Calendar',
  'Stripe',
  'Twilio',
  'HubSpot',
  'Zapier',
  'WhatsApp',
  'Meta',
  'Gmail',
];

const outcomePanels = [
  {
    label: 'Qualified',
    title: 'More booking-ready conversations',
    body: 'BookedAI identifies intent early so teams spend less time on weak-fit enquiries.',
  },
  {
    label: 'Recovered',
    title: 'Fewer missed revenue moments',
    body: 'After-hours messages and missed calls stay in motion instead of going cold.',
  },
  {
    label: 'Visible',
    title: 'Clearer revenue attribution',
    body: 'Connect the conversation, the booking path, and the commercial outcome in one view.',
  },
];

export function PublicApp() {
  const [locale, setLocale] = useState<HomepageLocale>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuSectionId, setActiveMenuSectionId] = useState('pitchdeck');
  const [searchQuery, setSearchQuery] = useState('');
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [assistantEntryAttribution, setAssistantEntryAttribution] =
    useState<PublicCtaAttribution | null>(null);
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string | null>(null);
  const [assistantInitialQueryRequestId, setAssistantInitialQueryRequestId] = useState(0);
  const [streamedCharacters, setStreamedCharacters] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedLocale = window.localStorage.getItem('bookedai.homepage.locale');
    if (storedLocale === 'en' || storedLocale === 'vi') {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('bookedai.homepage.locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const content = useMemo(() => getHomepageContent(locale), [locale]);
  const hasStartedSearch = assistantInitialQueryRequestId > 0 && Boolean(assistantInitialQuery?.trim());
  const activeMenuSection =
    content.menuSections.find((section) => section.id === activeMenuSectionId) ?? content.menuSections[0];

  useEffect(() => {
    setActiveMenuSectionId((current) =>
      content.menuSections.some((section) => section.id === current)
        ? current
        : content.menuSections[0]?.id ?? 'pitchdeck',
    );
  }, [content.menuSections]);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (streamedCharacters >= streamedPreviewMessage.length) {
      timeoutId = window.setTimeout(() => {
        setStreamedCharacters(0);
      }, 1800);
      return () => window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      setStreamedCharacters((current) => current + 1);
    }, streamedCharacters === 0 ? 650 : 24);

    return () => window.clearTimeout(timeoutId);
  }, [streamedCharacters]);

  function startHomepageSearch(input: {
    source_section: PublicCtaAttribution['source_section'];
    source_cta: PublicCtaAttribution['source_cta'];
    source_detail?: string | null;
    initialQuery?: string | null;
  }) {
    const nextAttribution = buildPublicCtaAttribution({
      source_section: input.source_section,
      source_cta: input.source_cta,
      source_detail: input.source_detail,
    });

    dispatchPublicCtaAttribution(nextAttribution);
    setAssistantEntryAttribution(nextAttribution);
    setAssistantInitialQuery(input.initialQuery?.trim() ? input.initialQuery.trim() : null);
    setAssistantInitialQueryRequestId((current) => current + 1);
    setMenuOpen(false);
    setHeroCollapsed(
      typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
    );

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        document
          .getElementById('bookedai-search-assistant')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    startHomepageSearch({
      source_section: 'hero',
      source_cta: 'start_free_trial',
      source_detail: 'homepage_search',
      initialQuery: trimmedQuery,
    });
  }

  const streamedText = streamedPreviewMessage.slice(0, streamedCharacters);
  const isPreviewStreaming =
    streamedCharacters > 0 && streamedCharacters < streamedPreviewMessage.length;

  return (
    <main className="booked-public-shell bookedai-brand-shell min-h-screen overflow-x-clip text-white">
      <header
        className={`bookedai-shell-nav mx-3 mt-3 px-0 ${
          hasStartedSearch ? 'border-white/12' : 'border-white/8'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <a href="/" className="min-w-0 rounded-full">
            <BrandLockup
              logoSrc={bookedAiLogoSrc}
              compact={false}
              surface="dark"
              className="min-w-0"
              logoClassName="booked-brand-image h-[3rem] w-[10.5rem] sm:h-[3.5rem] sm:w-[12.5rem] lg:h-[3.85rem] lg:w-[13.75rem]"
              descriptorClassName="hidden"
              eyebrowClassName="hidden"
            />
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary">
              {content.navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/82 transition hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <button
              type="button"
              onClick={() =>
                startHomepageSearch({
                  source_section: 'header',
                  source_cta: 'start_free_trial',
                  source_detail: 'header_search',
                  initialQuery: searchQuery,
                })
              }
              className="hidden items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1020] shadow-[0_12px_30px_rgba(255,255,255,0.12)] transition hover:bg-[#eef4ff] sm:inline-flex"
            >
              <SearchIcon className="h-4 w-4" />
              {content.ui.searchButton}
            </button>

            <button
              type="button"
              aria-label={menuOpen ? content.ui.closeMenu : content.ui.openMenu}
              aria-expanded={menuOpen}
              aria-controls="bookedai-home-menu"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white transition hover:bg-white/14"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-[rgba(19,19,19,0.24)] backdrop-blur-[3px]"
          />
          <aside
            id="bookedai-home-menu"
            className="bookedai-mobile-sheet absolute inset-x-3 top-[4.7rem] max-h-[calc(100dvh-5.6rem)] overflow-y-auto p-4 text-white sm:inset-x-auto sm:right-6 sm:w-[min(92vw,24rem)] lg:right-8"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/56">
              {content.ui.menuTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-white/68">{content.ui.menuBody}</p>

            <div className="mt-4 grid gap-2">
              {content.navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <CompassIcon className="h-4 w-4 text-white/56" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>

            <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/52">
                  {content.ui.languageLabel}
                </span>
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as HomepageLocale)}
                  className="rounded-full border border-white/10 bg-[rgba(7,11,22,0.62)] px-3 py-2 text-sm font-medium text-white outline-none"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <nav className="mt-4 grid gap-2" aria-label="Homepage menu">
              {content.menuSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveMenuSectionId(section.id)}
                  className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 text-left text-sm font-medium transition ${
                    activeMenuSectionId === section.id
                      ? 'border-[rgba(79,140,255,0.26)] bg-[rgba(79,140,255,0.14)] text-[#9fc2ff]'
                      : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                  }`}
                >
                  <span>{section.title}</span>
                  <span className="text-base leading-none">{activeMenuSectionId === section.id ? '−' : '+'}</span>
                </button>
              ))}
            </nav>

            <article className="mt-4 rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/56">
                {activeMenuSection.eyebrow}
              </div>
              <h2 className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                {activeMenuSection.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/68">{activeMenuSection.body}</p>
              <div className="mt-3 grid gap-2">
                {activeMenuSection.points.map((point) => (
                  <div
                    key={point}
                    className="rounded-[0.95rem] border border-white/10 bg-[rgba(7,11,22,0.42)] px-3 py-3 text-sm leading-6 text-white/74"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </article>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  startHomepageSearch({
                    source_section: 'header',
                    source_cta: 'start_free_trial',
                    source_detail: 'menu_search',
                    initialQuery: searchQuery,
                  })
                }
                className="booked-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
              >
                <SearchIcon className="h-4 w-4" />
                {content.ui.searchButton}
              </button>
              <a
                href={demoUrl}
                className="booked-button-secondary inline-flex items-center justify-center gap-2 px-4 py-3 text-center text-sm font-medium"
              >
                <MailIcon className="h-4 w-4" />
                {content.ui.contactTeam}
              </a>
            </div>
          </aside>
        </div>
      ) : null}

      <SectionShell
        id="hero"
        className={`px-3 pb-10 sm:px-6 lg:px-8 ${hasStartedSearch ? 'pt-4' : 'pt-8 sm:pt-12 lg:pt-14'}`}
        contentClassName="public-hero-layout"
      >
        <SectionCard
          tone="dark"
          className="public-accent-panel rounded-[2rem] p-6 shadow-[0_30px_100px_rgba(2,6,23,0.28)] sm:p-8 lg:p-9"
        >
          <BrandLockup
            logoSrc={bookedAiLogoSrc}
            compact={false}
            surface="dark"
            className="min-w-0"
            logoClassName="booked-brand-image h-[3.25rem] w-[11rem] sm:h-[4rem] sm:w-[13.5rem]"
            descriptorClassName="hidden"
            eyebrowClassName="hidden"
          />

          <SignalPill
            variant="inverse"
            className="public-kicker mt-6 w-fit px-4 py-2 text-[11px]"
          >
            BookedAI.au Chat Revenue Platform
          </SignalPill>

          <h1 className="mt-5 max-w-[10.8ch] text-[2.35rem] font-semibold leading-[0.92] tracking-[-0.065em] text-white sm:max-w-[12ch] sm:text-[4rem] lg:text-[5.1rem]">
            The AI Revenue Engine that turns any kind of conversations into Your Revenue
          </h1>

          <p className="mt-6 max-w-[38rem] text-[0.98rem] leading-8 text-white/72 sm:text-[1.05rem]">
            BookedAI.au captures enquiries across chat, calls, forms, email, and follow-up, then
            guides them toward qualified next steps, bookings, and measurable revenue.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                startHomepageSearch({
                  source_section: 'hero',
                  source_cta: 'start_free_trial',
                  source_detail: 'hero_try_now',
                  initialQuery: searchQuery,
                })
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#8B5CF6_0%,#A78BFA_50%,#4F8CFF_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(139,92,246,0.24)] transition hover:scale-[1.01] sm:w-auto"
            >
              <BrandButtonMark className="h-5 w-5 rounded-full bg-white/18 p-0.5" />
              {content.ui.searchButton}
            </button>
            <a
              href={demoUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              <MailIcon className="h-4 w-4" />
              {content.ui.watchDemo}
            </a>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {conversationChannels.map((item) => (
              <span
                key={item}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-3 py-2 text-center text-[11px] font-medium tracking-[0.06em] text-white/78"
              >
                {item}
              </span>
            ))}
          </div>

          {!heroCollapsed && !hasStartedSearch ? (
            <form onSubmit={handleSearchSubmit} className="mt-8">
              <div className="public-search-panel rounded-[1.75rem] p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/34">
                      <SearchIcon className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={content.ui.searchPlaceholder}
                      className="bookedai-command-input h-[3.45rem] w-full pl-14 pr-5 text-[15px] outline-none ring-0 placeholder:text-white/46 sm:h-16 sm:text-[1rem]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#8B5CF6_0%,#A78BFA_44%,#4F8CFF_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(139,92,246,0.22)] sm:h-16 sm:px-7"
                  >
                    <BrandButtonMark className="h-5 w-5 rounded-full bg-white/12 p-0.5" />
                    {content.ui.searchButton}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {content.searchSuggestions.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => {
                        setSearchQuery(suggestion.query);
                        startHomepageSearch({
                          source_section: 'hero',
                          source_cta: 'start_free_trial',
                          source_detail: `suggestion_${suggestion.label.toLowerCase().replace(/\s+/g, '-')}`,
                          initialQuery: suggestion.query,
                        });
                      }}
                      className="inline-flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-medium text-white/82 transition hover:bg-white/12 sm:w-auto"
                    >
                      <SearchIcon className="h-3.5 w-3.5" />
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : !hasStartedSearch ? (
            <div className="mt-6 flex">
              <button
                type="button"
                onClick={() => setHeroCollapsed(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <BrandButtonMark className="h-5 w-5" />
                {content.ui.searchButton}
              </button>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          tone="dark"
          className="public-accent-panel relative rounded-[2rem] p-5 text-white shadow-[0_30px_100px_rgba(2,6,23,0.32)] sm:p-6 lg:p-7"
        >
          <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3),transparent_72%)] blur-3xl" />
          <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.24),transparent_72%)] blur-3xl" />

          <div className="relative rounded-[1.6rem] border border-white/10 bg-white/6 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4b5fd]">
                  Conversational UI preview
                </div>
                <div className="mt-2 max-w-xl text-xl font-semibold tracking-[-0.03em] text-white">
                  Streaming replies that move customers toward the next revenue step
                </div>
              </div>
              <div className="w-fit rounded-full border border-emerald-400/16 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                {content.ui.statusLive}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-[1.3rem] rounded-br-md bg-[linear-gradient(135deg,#8B5CF6_0%,#A78BFA_60%,#4F8CFF_100%)] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_50px_rgba(139,92,246,0.16)] sm:max-w-[82%]">
                  I missed your call earlier. Can I still book a consultation this week?
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <BrandButtonMark className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-[1.4rem] rounded-bl-md border border-white/10 bg-[rgba(8,12,24,0.76)] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/44">
                    Assistant reply
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/86">
                    {streamedCharacters === 0 ? (
                      <span className="animate-bookedai-typing inline-flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-white/50" />
                        <span className="h-2 w-2 rounded-full bg-white/50" />
                        <span className="h-2 w-2 rounded-full bg-white/50" />
                      </span>
                    ) : (
                      <>
                        {streamedText}
                        <span
                          className={`ml-1 inline-block h-4 w-0.5 bg-[#c4b5fd] align-[-2px] ${
                            isPreviewStreaming ? 'animate-bookedai-cursor' : ''
                          }`}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Intent', 'Booking enquiry'],
                  ['Status', 'Qualified live'],
                  ['Next step', 'Try now or book demo'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/44">
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </SectionShell>

      <section className={`px-3 sm:px-6 lg:px-8 ${hasStartedSearch ? 'pb-6' : 'pb-8 sm:pb-12'}`}>
        <HomepageSearchExperience
          content={content}
          sourcePath={
            assistantEntryAttribution ? buildAssistantSourcePath(assistantEntryAttribution) : '/homepage-search'
          }
          initialQuery={assistantInitialQuery}
          initialQueryRequestId={assistantInitialQueryRequestId}
        />
      </section>

      <SectionShell id="capabilities" className="px-3 public-section-rhythm sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <SignalPill
            variant="inverse"
            className="public-kicker px-4 py-2 text-[11px]"
          >
            AI capabilities
          </SignalPill>
          <h2 className="mt-4 text-[2.2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[3.2rem]">
            Built for conversations that should become bookings
          </h2>
          <p className="mt-4 text-base leading-8 text-white/68 sm:text-[1.02rem]">
            The interface stays conversational, but every reply is designed to reduce friction,
            clarify the next step, and protect revenue.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilityCards.map((card, index) => (
            <SectionCard
              key={card.title}
              tone="dark"
              className="public-accent-panel rounded-[1.6rem] p-6 transition duration-200 hover:-translate-y-0.5 lg:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/44">
                  Capability
                </div>
                <div className="public-kicker px-3 py-1 text-[10px]">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>
              <h3 className="mt-4 text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{card.body}</p>
            </SectionCard>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="integrations" className="px-3 public-section-rhythm sm:px-6 lg:px-8">
        <SectionCard tone="dark" className="public-accent-panel rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <SignalPill
                variant="inverse"
                className="public-kicker px-4 py-2 text-[11px]"
              >
                Integrations
              </SignalPill>
              <h2 className="mt-4 text-[2rem] font-semibold leading-[0.97] tracking-[-0.05em] text-white sm:text-[2.8rem]">
                Connect the conversation to the systems that close the loop
              </h2>
              <p className="mt-4 max-w-[34rem] text-sm leading-7 text-white/68 sm:text-[1rem]">
                BookedAI.au is designed to sit in front of your scheduling, messaging, payment,
                and follow-up stack so the handoff from question to booking stays clean.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {integrationLogos.map((item) => (
                <div
                  key={item}
                  className="flex min-h-[5.5rem] items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-center text-sm font-semibold text-white/82 grayscale transition hover:border-[rgba(139,92,246,0.24)] hover:bg-white/10 hover:text-white hover:grayscale-0"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </SectionShell>

      <SectionShell id="outcomes" className="px-3 public-section-rhythm sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {outcomePanels.map((panel) => (
            <SectionCard
              key={panel.title}
              tone="dark"
              className="public-accent-panel rounded-[1.7rem] p-6 transition duration-200 hover:-translate-y-0.5"
            >
              <div className="w-fit public-kicker px-3 py-1 text-[10px]">
                {panel.label}
              </div>
              <h3 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.03em] text-white">
                {panel.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{panel.body}</p>
            </SectionCard>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="final-cta" className="px-3 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20">
        <SectionCard
          tone="dark"
          className="public-accent-panel rounded-[2.2rem] bg-[linear-gradient(135deg,rgba(139,92,246,0.2)_0%,rgba(79,140,255,0.12)_42%,rgba(11,16,32,0.96)_100%)] px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="mx-auto max-w-3xl text-center">
            <SignalPill
              variant="inverse"
              className="public-kicker px-4 py-2 text-[11px]"
            >
              Try BookedAI.au
            </SignalPill>
            <h2 className="mt-4 text-[2.3rem] font-semibold leading-[0.96] tracking-[-0.05em] text-white sm:text-[3.4rem]">
              Start turning conversations into revenue
            </h2>
            <p className="mt-4 text-base leading-8 text-white/72 sm:text-[1.05rem]">
              See how BookedAI.au captures demand, qualifies intent, and moves customers toward
              the right next step without making your team chase every enquiry manually.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  startHomepageSearch({
                    source_section: 'footer',
                    source_cta: 'start_free_trial',
                    source_detail: 'final_cta_try_now',
                    initialQuery: searchQuery,
                  })
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0b1020] shadow-[0_18px_60px_rgba(255,255,255,0.12)] transition hover:bg-[#eef4ff] sm:w-auto"
              >
                <BrandButtonMark className="h-5 w-5 rounded-full bg-black/6 p-0.5" />
                {content.ui.searchButton}
              </button>
              <a
                href={demoUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/12 sm:w-auto"
              >
                <MailIcon className="h-4 w-4" />
                {content.ui.contactTeam}
              </a>
            </div>
          </div>
        </SectionCard>
      </SectionShell>

    </main>
  );
}
