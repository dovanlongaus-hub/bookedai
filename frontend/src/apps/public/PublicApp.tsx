import { useMemo } from 'react';

import { Header } from '../../components/landing/Header';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import { productHref, roadmapHref, adminHref, tenantHref } from '../../components/landing/data';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { SignalPill } from '../../components/landing/ui/SignalPill';
const homepageNavItems = [
  { id: 'hero', label: 'Overview' },
  { id: 'bookedai-search-assistant', label: 'Live Search' },
  { id: 'roadmap', label: 'Roadmap', href: roadmapHref },
];

export function PublicApp() {
  const homepageSearchContent = useMemo(() => getHomepageContent('en'), []);
  const sourcePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/';

  function openSalesContact(sourceSection: 'header' | 'hero' | 'call_to_action' | 'footer') {
    if (typeof window === 'undefined') {
      return;
    }

    const attribution = buildPublicCtaAttribution({
      source_section: sourceSection,
      source_cta: 'start_free_trial',
      source_detail: 'register-interest-route',
    });
    const target = new URL('/register-interest', window.location.origin);
    target.searchParams.set('source_section', attribution.source_section);
    target.searchParams.set('source_cta', attribution.source_cta);
    if (attribution.source_detail) {
      target.searchParams.set('source_detail', attribution.source_detail);
    }

    dispatchPublicCtaAttribution(attribution);
    window.location.href = `${target.pathname}${target.search}`;
  }

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

  function scrollToLiveDemo() {
    if (typeof window === 'undefined') {
      return;
    }

    document.getElementById('bookedai-search-assistant')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="booked-shell min-h-screen bg-[linear-gradient(180deg,#f4f8fc_0%,#edf3f8_20%,#f7fafc_46%,#eef5fa_72%,#fbfdff_100%)] text-[#1d1d1f] xl:pl-[7rem]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_20%),radial-gradient(circle_at_82%_10%,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.05),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.44)_0%,rgba(255,255,255,0.06)_32%,rgba(255,255,255,0.5)_100%)]" />

      <div className="relative z-10">
        <Header
          navItems={homepageNavItems}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('header')}
          startTrialLabel="Open Web App"
          bookDemoLabel="Talk to Sales"
          compactMenuOnly
          utilityLinks={[
            { label: 'Language: EN', href: '#hero' },
            { label: 'Pitch', href: pitchDeckHref },
            { label: 'Video Demo', href: '/video-demo.html' },
          ]}
        />

        <section id="hero" className="mx-auto w-full max-w-7xl px-4 pb-2 pt-3 sm:px-6 lg:px-8 lg:pb-3 lg:pt-5">
          <div className="group relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-[#07111f] px-4 py-5 shadow-[0_24px_90px_rgba(15,23,42,0.18)] sm:px-7 sm:py-7 lg:px-10 lg:py-8">
            <div
              className="absolute inset-0 scale-[1.02] bg-cover bg-center opacity-78 transition-transform duration-[1800ms] ease-out will-change-transform group-hover:scale-[1.06]"
              style={{ backgroundImage: "url('/branding/bookedai-marketplace-strategy-bg.jpg')" }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.24)_0%,rgba(7,17,31,0.68)_32%,rgba(7,17,31,0.88)_100%)]"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(249,115,22,0.24),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(59,130,246,0.16),transparent_28%)]"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-6xl text-center">
              <SignalPill className="mx-auto w-fit border border-[#d9e7f6] bg-white px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
                SME services marketplace direction
              </SignalPill>

              <div className="mt-4 flex justify-center">
                <BrandLockup
                  surface="dark"
                  className="items-center"
                  logoClassName="booked-brand-image max-w-[14rem] sm:max-w-[18rem]"
                  descriptorClassName="hidden"
                  eyebrowClassName="hidden"
                />
              </div>

              <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.065em] text-white sm:text-5xl lg:text-6xl">
                One chat-first surface for discovering, comparing, and booking SME business services.
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/78 sm:text-base lg:text-lg">
                Discover, compare, and move into booking through one chat-first workspace designed for enterprise-grade SME service search.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={openProductTrial}
                  className="rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Open Web App
                </button>
                <button
                  type="button"
                  onClick={scrollToLiveDemo}
                  className="rounded-full border border-white/22 bg-white/12 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  See Live Search
                </button>
                <button
                  type="button"
                  onClick={openPitchDeck}
                  className="rounded-full border border-cyan-200/30 bg-cyan-300/14 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5"
                >
                  Open Pitch Deck
                </button>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/68 sm:text-[11px]">
                {['Search-first discovery', 'Booking-ready workflow', 'Enterprise UI shell'].map((item) => (
                  <span key={item} className="rounded-full border border-white/14 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <HomepageSearchExperience
          content={homepageSearchContent}
          sourcePath={sourcePath}
          initialQuery={null}
          initialQueryRequestId={0}
        />
      </div>
    </main>
  );
}
