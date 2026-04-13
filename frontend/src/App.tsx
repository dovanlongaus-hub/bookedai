import { useState } from 'react';

import {
  bookingAssistantContent,
  ctaContent,
  demoContent,
  flowSteps,
  heroContent,
  metrics,
  navItems,
  partnersSectionContent,
  pricingContent,
  problemCards,
  problemContent,
  proofContent,
  proofItems,
  solutionCards,
  solutionContent,
  teamMembers,
  teamSectionContent,
} from './components/landing/data';
import { Footer } from './components/landing/Footer';
import { Header } from './components/landing/Header';
import { AdminPage } from './components/AdminPage';
import { BookingAssistantDialog } from './components/landing/assistant/BookingAssistantDialog';
import { CallToActionSection } from './components/landing/sections/CallToActionSection';
import { BookingAssistantSection } from './components/landing/sections/BookingAssistantSection';
import { HeroSection } from './components/landing/sections/HeroSection';
import { PartnersSection } from './components/landing/sections/PartnersSection';
import { ProductProofSection } from './components/landing/sections/ProductProofSection';
import { PricingSection } from './components/landing/sections/PricingSection';
import { ProblemSection } from './components/landing/sections/ProblemSection';
import { SolutionSection } from './components/landing/sections/SolutionSection';
import { TeamSection } from './components/landing/sections/TeamSection';

function BookedAILandingPage() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f5f7] text-slate-950 [font-family:'Plus_Jakarta_Sans',system-ui,sans-serif]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.08),transparent_22%),linear-gradient(180deg,#ffffff_0%,#f5f5f7_38%,#eef2ff_100%)]"
      />

      <Header navItems={navItems} onStartTrial={() => setIsAssistantOpen(true)} />
      <section
        className="relative overflow-hidden border-y border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.98)_36%,rgba(255,255,255,0.96)_100%)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_55%)]"
        />
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
        <ProductProofSection content={proofContent} items={proofItems} />
        <BookingAssistantSection
          content={bookingAssistantContent}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />
      </section>
      <PartnersSection content={partnersSectionContent} />
      <TeamSection content={teamSectionContent} members={teamMembers} />
      <PricingSection
        content={pricingContent}
        metrics={metrics}
        onStartTrial={() => setIsAssistantOpen(true)}
      />
      <CallToActionSection
        content={ctaContent}
        onStartTrial={() => setIsAssistantOpen(true)}
      />
      <Footer />

      <button
        type="button"
        onClick={() => setIsAssistantOpen(true)}
        className="booking-widget fixed bottom-3 right-3 z-40 w-[calc(100%-1.5rem)] max-w-[18rem] overflow-hidden rounded-[1.5rem] border border-white/20 bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#0ea5e9_160%)] p-3 text-left text-white shadow-[0_20px_55px_rgba(15,23,42,0.28)] transition hover:scale-[1.01] sm:bottom-5 sm:right-5 sm:max-w-[22rem] sm:p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              <span className="booking-widget-dot h-2.5 w-2.5 rounded-full bg-emerald-300" />
              AI Booking Agent
            </div>
            <div className="mt-2 text-base font-bold tracking-tight sm:text-lg">
              Start a free trial chat
            </div>
            <p className="mt-1 text-xs leading-5 text-white/72 sm:text-sm sm:leading-6">
              Text or voice. Search services, capture the booking, and watch the
              workflow run live.
            </p>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 sm:text-xs">
            Open
          </div>
        </div>
      </button>

      <BookingAssistantDialog
        content={bookingAssistantContent}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </main>
  );
}

function App() {
  if (typeof window !== 'undefined') {
    const { hostname, pathname } = window.location;
    if (hostname === 'admin.bookedai.au' || pathname.startsWith('/admin')) {
      return <AdminPage />;
    }
  }

  return <BookedAILandingPage />;
}

export default App;
