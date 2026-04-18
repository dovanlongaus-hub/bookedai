import { useEffect, useState } from 'react';

import {
  buildAssistantSourcePath,
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
  type PublicCtaAttribution,
} from '../../components/landing/attribution';
import {
  bookingAssistantContent,
  ctaContent,
  faqItems,
  flowSteps,
  demoContent,
  heroContent,
  navItems,
  partnersSectionContent,
  problemCards,
  problemContent,
  proofContent,
  proofItems,
  solutionCards,
  solutionContent,
  trustItems,
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
import { ProductProofSection } from '../../components/landing/sections/ProductProofSection';
import { SolutionSection } from '../../components/landing/sections/SolutionSection';
import { TrustSection } from '../../components/landing/sections/TrustSection';

export function PublicApp() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [assistantEntryAttribution, setAssistantEntryAttribution] =
    useState<PublicCtaAttribution | null>(null);
  const [demoEntryAttribution, setDemoEntryAttribution] =
    useState<PublicCtaAttribution | null>(null);
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

  function openAssistant(input: {
    source_section: PublicCtaAttribution['source_section'];
    source_cta: PublicCtaAttribution['source_cta'];
    source_detail?: string | null;
  }) {
    const nextAttribution = buildPublicCtaAttribution(input);
    dispatchPublicCtaAttribution(nextAttribution);
    setAssistantEntryAttribution(nextAttribution);
    setIsAssistantOpen(true);
  }

  function openDemo(input: {
    source_section: PublicCtaAttribution['source_section'];
    source_cta: PublicCtaAttribution['source_cta'];
    source_detail?: string | null;
  }) {
    const nextAttribution = buildPublicCtaAttribution(input);
    dispatchPublicCtaAttribution(nextAttribution);
    setDemoEntryAttribution(nextAttribution);
    setIsDemoOpen(true);
  }

  return (
    <main className="booked-shell relative overflow-hidden">
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
              className="booked-button-secondary px-3 py-1 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <Header
        navItems={navItems}
        onStartTrial={() =>
          openAssistant({
            source_section: 'header',
            source_cta: 'start_free_trial',
          })}
        onBookDemo={() =>
          openDemo({
            source_section: 'header',
            source_cta: 'book_demo',
          })}
      />
      <section className="template-section relative overflow-hidden border-y border-black/5">
        <HeroSection
          content={heroContent}
          demo={demoContent}
          onStartTrial={() =>
            openAssistant({
              source_section: 'hero',
              source_cta: 'start_free_trial',
            })}
          onBookDemo={() =>
            openDemo({
              source_section: 'hero',
              source_cta: 'view_demo',
            })}
        />
        <ProblemSection content={problemContent} cards={problemCards} />
        <ProductProofSection content={proofContent} items={proofItems} />
        <SolutionSection
          content={solutionContent}
          cards={solutionCards}
          flowSteps={flowSteps}
        />
      </section>
      <BookingAssistantSection
        content={bookingAssistantContent}
        onOpenAssistant={() =>
          openAssistant({
            source_section: 'booking_assistant',
            source_cta: 'open_full_assistant',
          })}
      />
      <TrustSection items={trustItems} faqItems={faqItems} />
      <PartnersSection content={partnersSectionContent} />
      <PricingSection />
      <CallToActionSection
        content={ctaContent}
        onStartTrial={() =>
          openAssistant({
            source_section: 'call_to_action',
            source_cta: 'start_free_trial',
          })}
        onBookDemo={() =>
          openDemo({
            source_section: 'call_to_action',
            source_cta: 'book_demo',
          })}
      />
      <Footer
        onStartTrial={() =>
          openAssistant({
            source_section: 'footer',
            source_cta: 'start_free_trial',
          })}
        onBookDemo={() =>
          openDemo({
            source_section: 'footer',
            source_cta: 'book_demo',
          })}
      />

      <BookingAssistantDialog
        content={bookingAssistantContent}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        entrySourcePath={
          assistantEntryAttribution
            ? buildAssistantSourcePath(assistantEntryAttribution)
            : null
        }
      />
      <DemoBookingDialog
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        entryAttribution={demoEntryAttribution}
      />
    </main>
  );
}
