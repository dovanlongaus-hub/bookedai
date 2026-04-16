import { useEffect, useState } from 'react';

import {
  bookingAssistantContent,
  ctaContent,
  demoContent,
  flowSteps,
  heroContent,
  navItems,
  partnersSectionContent,
  problemCards,
  problemContent,
  proofContent,
  proofItems,
  solutionCards,
  solutionContent,
  teamMembers,
  teamSectionContent,
  videoDemoContent,
} from '../../components/landing/data';
import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import { DemoBookingDialog } from '../../components/landing/DemoBookingDialog';
import { BookingAssistantSection } from '../../components/landing/sections/BookingAssistantSection';
import { CallToActionSection } from '../../components/landing/sections/CallToActionSection';
import { HeroSection } from '../../components/landing/sections/HeroSection';
import { PartnersSection } from '../../components/landing/sections/PartnersSection';
import { PricingSection } from '../../components/landing/sections/PricingSection';
import { ProblemSection } from '../../components/landing/sections/ProblemSection';
import { ProductFlowShowcaseSection } from '../../components/landing/sections/ProductFlowShowcaseSection';
import { ProductProofSection } from '../../components/landing/sections/ProductProofSection';
import { SolutionSection } from '../../components/landing/sections/SolutionSection';
import { TeamSection } from '../../components/landing/sections/TeamSection';
import { VideoDemoSection } from '../../components/landing/sections/VideoDemoSection';

export function PublicApp() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [bookingBanner, setBookingBanner] = useState<{
    tone: 'success' | 'neutral';
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const bookingStatus = url.searchParams.get('booking');
    const pricingStatus = url.searchParams.get('pricing');
    const reference = url.searchParams.get('ref');
    const pricingPlan = url.searchParams.get('plan');
    const assistantMode = url.searchParams.get('assistant');
    const demoMode = url.searchParams.get('demo');

    if (assistantMode === 'open') {
      setIsAssistantOpen(true);
      url.searchParams.delete('assistant');
    }

    if (demoMode === 'open') {
      setIsDemoOpen(true);
      url.searchParams.delete('demo');
    }

    if (bookingStatus === 'success') {
      setBookingBanner({
        tone: 'success',
        title: 'Payment complete',
        body: reference
          ? `Booking ${reference} has been sent through payment, confirmation, and workflow handoff.`
          : 'Your booking has been sent through payment, confirmation, and workflow handoff.',
      });
    } else if (bookingStatus === 'cancelled') {
      setBookingBanner({
        tone: 'neutral',
        title: 'Payment not completed yet',
        body: reference
          ? `Booking ${reference} is still saved. You can reopen the booking flow and continue when ready.`
          : 'Your booking is still saved. You can reopen the booking flow and continue when ready.',
      });
    } else if (pricingStatus === 'success') {
      setBookingBanner({
        tone: 'success',
        title: 'Plan booking complete',
        body: reference
          ? `${pricingPlan ? `${pricingPlan} plan` : 'Your plan'} ${reference} is confirmed. Stripe is complete and your onboarding email plus calendar flow are already in motion.`
          : 'Your plan is confirmed. Stripe is complete and your onboarding email plus calendar flow are already in motion.',
      });
    } else if (pricingStatus === 'cancelled') {
      setBookingBanner({
        tone: 'neutral',
        title: 'Plan payment not completed yet',
        body: reference
          ? `Your plan booking ${reference} is still saved. You can reopen pricing and continue payment when ready.`
          : 'Your plan booking is still saved. You can reopen pricing and continue payment when ready.',
      });
    } else {
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    url.searchParams.delete('booking');
    url.searchParams.delete('pricing');
    url.searchParams.delete('plan');
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="apple-public-shell relative overflow-hidden">
      {bookingBanner ? (
        <div className="sticky top-0 z-50 border-b border-black/10 bg-[#f5f5f7]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div
            className={`mx-auto flex max-w-7xl items-start justify-between gap-3 rounded-[1.5rem] px-4 py-3 ${
              bookingBanner.tone === 'success'
                ? 'bg-white text-[#1d1d1f] shadow-[rgba(0,0,0,0.12)_0_12px_36px]'
                : 'bg-white text-[#1d1d1f] shadow-[rgba(0,0,0,0.12)_0_12px_36px]'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{bookingBanner.title}</div>
              <div className="mt-1 text-sm leading-6 opacity-80">{bookingBanner.body}</div>
            </div>
            <button
              type="button"
              onClick={() => setBookingBanner(null)}
              className="apple-button-secondary px-3 py-1 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <Header
        navItems={navItems}
        onStartTrial={() => setIsAssistantOpen(true)}
        onBookDemo={() => setIsDemoOpen(true)}
      />
      <section className="apple-section-light relative overflow-hidden border-y border-black/5">
        <HeroSection
          content={heroContent}
          demo={demoContent}
          onStartTrial={() => setIsAssistantOpen(true)}
        />
        <ProblemSection content={problemContent} cards={problemCards} />
        <SolutionSection
          content={solutionContent}
          cards={solutionCards}
          flowSteps={flowSteps}
        />
        <ProductFlowShowcaseSection demo={demoContent} />
        <ProductProofSection content={proofContent} items={proofItems} />
        <VideoDemoSection content={videoDemoContent} />
        <BookingAssistantSection
          content={bookingAssistantContent}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />
      </section>
      <PartnersSection content={partnersSectionContent} />
      <TeamSection content={teamSectionContent} members={teamMembers} />
      <PricingSection />
      <CallToActionSection
        content={ctaContent}
        onStartTrial={() => setIsAssistantOpen(true)}
        onBookDemo={() => setIsDemoOpen(true)}
      />
      <Footer
        onStartTrial={() => setIsAssistantOpen(true)}
        onBookDemo={() => setIsDemoOpen(true)}
      />

      {!isAssistantOpen ? (
        <button
          type="button"
          onClick={() => setIsAssistantOpen(true)}
          className="apple-floating-widget booking-widget fixed bottom-3 right-3 z-40 w-[calc(100%-1.5rem)] max-w-[18rem] overflow-hidden rounded-[1.75rem] border border-white/10 p-3 text-left transition hover:scale-[1.01] sm:bottom-5 sm:right-5 sm:max-w-[22rem] sm:p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2997ff]">
                <span className="booking-widget-dot h-2.5 w-2.5 rounded-full bg-[#2997ff]" />
                AI Booking Agent
              </div>
              <div className="mt-2 text-base font-semibold tracking-[-0.03em] sm:text-lg">
                Start a free trial chat
              </div>
              <p className="mt-1 text-xs leading-5 text-white/72 sm:text-sm sm:leading-6">
                Text or voice. Search services, capture the booking, and watch the
                workflow run live.
              </p>
            </div>
            <div className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold text-white/80 sm:text-xs">
              Open
            </div>
          </div>
        </button>
      ) : null}

      <BookingAssistantDialog
        content={bookingAssistantContent}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
      <DemoBookingDialog
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </main>
  );
}
