import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { DemoBookingModal } from './demo/DemoBookingModal';
import { DemoBookingPanel } from './demo/DemoBookingPanel';
import { DemoChatStage } from './demo/DemoChatStage';
import { DemoFlowRail } from './demo/DemoFlowRail';
import { DemoFloatingCta } from './demo/DemoFloatingCta';
import { DemoHeader } from './demo/DemoHeader';
import { DemoResultsPanel } from './demo/DemoResultsPanel';
import type { DemoFlowStage } from './demo/types';
import { useDemoBookingExperience } from './demo/useDemoBookingExperience';

export function DemoLandingApp() {
  const experience = useDemoBookingExperience();
  const [floatingCtaOpen, setFloatingCtaOpen] = useState(false);
  const [floatingCtaDismissed, setFloatingCtaDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || floatingCtaDismissed) {
      return;
    }

    let opened = false;
    const openCta = () => {
      if (opened) {
        return;
      }
      opened = true;
      setFloatingCtaOpen(true);
    };

    const onScroll = () => {
      if (window.scrollY > 120) {
        openCta();
      }
    };

    const idleTimeout = window.setTimeout(openCta, 6000);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(idleTimeout);
      window.removeEventListener('scroll', onScroll);
    };
  }, [floatingCtaDismissed]);

  useEffect(() => {
    if (experience.searching || experience.results.length > 0 || experience.bookingModalOpen) {
      setFloatingCtaOpen(false);
    }
  }, [experience.bookingModalOpen, experience.results.length, experience.searching]);

  function closeFloatingCta() {
    setFloatingCtaOpen(false);
    setFloatingCtaDismissed(true);
  }

  function startBookingFromCta() {
    setFloatingCtaOpen(false);
    const composer = document.getElementById('demo-chat-composer');
    composer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (composer instanceof HTMLTextAreaElement) {
      composer.focus();
    }
  }

  function bookDemoFromCta() {
    setFloatingCtaOpen(false);
    window.open('mailto:info@bookedai.au?subject=BookedAI%20Demo', '_blank', 'noopener,noreferrer');
  }

  const flowStage: DemoFlowStage = experience.booking?.reportPreview
    ? 'report'
    : experience.booking
      ? 'booking'
      : experience.placement
        ? 'placement'
        : experience.results.length > 0
          ? 'results'
          : experience.assessment
            ? 'assessment'
            : 'chat';

  return (
    <main className="bookedai-saas-shell min-h-screen bg-[#0B0F1A] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#07111F_0%,#0B0F1A_42%,#0E1422_100%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(32,246,179,0.16),transparent_52%),radial-gradient(ellipse_at_72%_18%,rgba(0,209,255,0.12),transparent_44%)]"
        />
        <motion.div
          aria-hidden="true"
          className="bookedai-ambient-line"
          animate={{ opacity: [0.2, 0.65, 0.25], scaleX: [0.92, 1.04, 0.92] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="bookedai-cinematic-stage relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <DemoHeader stage={flowStage} />

          <div className="lg:hidden">
            <DemoFlowRail stage={flowStage} booking={experience.booking} compact />
          </div>

          <section className="grid w-full flex-1 gap-5 lg:grid-cols-[minmax(400px,0.42fr)_minmax(0,0.58fr)] 2xl:grid-cols-[270px_minmax(430px,0.42fr)_minmax(0,1fr)]">
            <aside className="hidden min-h-0 2xl:block">
              <div className="sticky top-6 grid gap-4">
                <DemoFlowRail stage={flowStage} booking={experience.booking} />
                <div className="bookedai-saas-glass rounded-[24px] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EFCE0]">Operator proof</div>
                  <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Full academy loop in one session
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">
                    Intake, assessment, placement, booking, payment posture, parent report, and portal continuity stay connected to the same customer context.
                  </div>
                  <div className="mt-5 grid gap-2 text-sm text-slate-300">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2">Tenant truth first</div>
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2">No fake paid state</div>
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.035] px-3 py-2">Portal-ready report preview</div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <DemoChatStage
                messages={experience.messages}
                draft={experience.draft}
                setDraft={experience.setDraft}
                onSubmit={() => void experience.submitSearch()}
                onPromptClick={(prompt) => void experience.submitSearch(prompt, { mode: 'new' })}
                onVoiceInput={experience.startVoiceInput}
                searching={experience.searching}
                assistantTyping={experience.assistantTyping}
                isAutoPlaying={experience.isAutoPlaying}
                voiceSupported={experience.voiceSupported}
                voiceListening={experience.voiceListening}
                assessment={experience.assessment}
                assessmentPending={experience.assessmentPending}
                assessmentError={experience.assessmentError}
                onAssessmentAnswer={(optionId) => void experience.answerAssessment(optionId)}
              />
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-rows-[minmax(0,1fr)_auto]">
              <div className="min-h-0 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-1 lg:[&::-webkit-scrollbar]:hidden lg:[-ms-overflow-style:none] lg:[scrollbar-width:none]">
                <DemoResultsPanel
                  results={experience.results}
                  warnings={experience.warnings}
                  bundleSuggestions={experience.bundleSuggestions}
                  selectedBundleIds={experience.selectedBundles.map((bundle) => bundle.id)}
                  placement={experience.placement}
                  assessmentComplete={Boolean(experience.placement)}
                  selectedServiceId={experience.selectedServiceId}
                  onSelect={experience.chooseService}
                  onToggleBundleSuggestion={experience.toggleBundleSuggestion}
                  searching={experience.searching}
                  searchError={experience.searchError}
                  mobileOpen={false}
                  onMobileToggle={() => undefined}
                  onBookNow={experience.openBookingModal}
                />
              </div>
              <DemoBookingPanel
                selectedService={experience.selectedService}
                selectedBundles={experience.selectedBundles}
                booking={experience.booking}
                placement={experience.placement}
                customerEmail={experience.customerEmail}
                customerPhone={experience.customerPhone}
                preferredSlot={experience.preferredSlot}
                onOpenModal={() => experience.openBookingModal()}
              />
            </div>
          </section>
        </motion.div>

        <DemoBookingModal
          open={experience.bookingModalOpen}
          step={experience.bookingModalStep}
          selectedService={experience.selectedService}
          booking={experience.booking}
          customerName={experience.customerName}
          setCustomerName={experience.setCustomerName}
          customerEmail={experience.customerEmail}
          setCustomerEmail={experience.setCustomerEmail}
          customerPhone={experience.customerPhone}
          setCustomerPhone={experience.setCustomerPhone}
          preferredSlot={experience.preferredSlot}
          setPreferredSlot={experience.setPreferredSlot}
          submitError={experience.submitError}
          submitting={experience.submitting}
          paymentProcessing={experience.paymentProcessing}
          onClose={experience.closeBookingModal}
          onConfirmDetails={() => void experience.submitBooking()}
          onConfirmPayment={() => void experience.confirmPaymentInline()}
        />

        <motion.div
          className="bookedai-depth-near"
          animate={{ y: [0, -6, 3, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
          <DemoFloatingCta
            open={floatingCtaOpen}
            onClose={closeFloatingCta}
            onStartBooking={startBookingFromCta}
            onBookDemo={bookDemoFromCta}
          />
        </motion.div>
      </div>
    </main>
  );
}
