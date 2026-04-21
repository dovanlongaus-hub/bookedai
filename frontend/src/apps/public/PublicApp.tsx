import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import {
  ctaContent,
  demoContent,
  heroContent,
  implementationContent,
  partnersSectionContent,
  proofContent,
  proofItems,
  productHref,
  roadmapHref,
  teamMembers,
  teamSectionContent,
  tenantHref,
  trustItems,
  faqItems,
} from '../../components/landing/data';
import { CallToActionSection } from '../../components/landing/sections/CallToActionSection';
import { ArchitectureInfographicSection } from '../../components/landing/sections/ArchitectureInfographicSection';
import { HeroSection } from '../../components/landing/sections/HeroSection';
import { HomepageBrandStatementSection } from '../../components/landing/sections/HomepageBrandStatementSection';
import { HomepageOverviewSection } from '../../components/landing/sections/HomepageOverviewSection';
import { ImplementationSection } from '../../components/landing/sections/ImplementationSection';
import { PartnersSection } from '../../components/landing/sections/PartnersSection';
import { PricingSection } from '../../components/landing/sections/PricingSection';
import { ProductProofSection } from '../../components/landing/sections/ProductProofSection';
import { TeamSection } from '../../components/landing/sections/TeamSection';
import { TrustSection } from '../../components/landing/sections/TrustSection';

const homepageNavItems = [
  { id: 'product-proof', label: 'How It Works' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'partners', label: 'Ecosystem' },
  { id: 'team-members', label: 'Team' },
  { id: 'implementation', label: 'Rollout' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'trust', label: 'Proof' },
  { id: 'roadmap', label: 'Roadmap', href: roadmapHref },
];

export function PublicApp() {
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

  function scrollToPricing() {
    if (typeof window === 'undefined') {
      return;
    }

    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="booked-shell min-h-screen bg-[linear-gradient(180deg,#f5f7fb_0%,#eef3f7_42%,#f7fafc_100%)] text-[#1d1d1f]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_22%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0.45)_100%)]" />

      <div className="relative z-10">
        <Header
          navItems={homepageNavItems}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('header')}
          startTrialLabel="Start Product Trial"
          bookDemoLabel="Talk to Sales"
          compactMenuOnly
          utilityLinks={[
            { label: 'Product Trial', href: productHref },
            { label: 'Architecture', href: '#architecture' },
            { label: 'Roadmap', href: roadmapHref },
            { label: 'Tenant Login', href: tenantHref },
          ]}
        />

        <HomepageBrandStatementSection />
        <HeroSection
          content={heroContent}
          demo={demoContent}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
          onSeePricing={scrollToPricing}
        />
        <HomepageOverviewSection
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
        />
        <ProductProofSection
          content={proofContent}
          items={proofItems}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
        />
        <ArchitectureInfographicSection
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
        />
        <ImplementationSection content={implementationContent} />
        <TrustSection items={trustItems} faqItems={faqItems} />
        <PartnersSection
          content={partnersSectionContent}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('call_to_action')}
        />
        <TeamSection
          content={teamSectionContent}
          members={teamMembers}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('call_to_action')}
        />
        <PricingSection />
        <CallToActionSection
          content={ctaContent}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('call_to_action')}
        />
        <Footer
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('footer')}
          startTrialLabel="Start Product Trial"
          bookDemoLabel="Talk to Sales"
        />
      </div>
    </main>
  );
}
