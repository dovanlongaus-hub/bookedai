import { useMemo } from 'react';

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
  adminHref,
  teamMembers,
  teamSectionContent,
  tenantHref,
  trustItems,
  faqItems,
} from '../../components/landing/data';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent } from './homepageContent';
import { CallToActionSection } from '../../components/landing/sections/CallToActionSection';
import { ArchitectureInfographicSection } from '../../components/landing/sections/ArchitectureInfographicSection';
import { HeroSection } from '../../components/landing/sections/HeroSection';
import { HomepageBrandStatementSection } from '../../components/landing/sections/HomepageBrandStatementSection';
import { HomepageExecutiveBoardSection } from '../../components/landing/sections/HomepageExecutiveBoardSection';
import { HomepageOverviewSection } from '../../components/landing/sections/HomepageOverviewSection';
import { ImplementationSection } from '../../components/landing/sections/ImplementationSection';
import { PartnersSection } from '../../components/landing/sections/PartnersSection';
import { PricingSection } from '../../components/landing/sections/PricingSection';
import { ProductProofSection } from '../../components/landing/sections/ProductProofSection';
import { TeamSection } from '../../components/landing/sections/TeamSection';
import { TrustSection } from '../../components/landing/sections/TrustSection';

const homepageNavItems = [
  { id: 'hero', label: 'Overview' },
  { id: 'homepage-board', label: 'Platform' },
  { id: 'product-proof', label: 'Product Proof' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'trust', label: 'Trust' },
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

  function scrollToPricing() {
    if (typeof window === 'undefined') {
      return;
    }

    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          startTrialLabel="Start Product Trial"
          bookDemoLabel="Talk to Sales"
          compactMenuOnly
          utilityLinks={[
            { label: 'Live Product', href: productHref },
            { label: 'Enterprise Architecture', href: '#architecture' },
            { label: 'Roadmap', href: roadmapHref },
            { label: 'Tenant Workspace', href: tenantHref },
            { label: 'Admin Login', href: adminHref },
          ]}
        />

        <HomepageBrandStatementSection />
        <HeroSection
          content={heroContent}
          demo={demoContent}
          onStartTrial={openProductTrial}
          onBookDemo={scrollToLiveDemo}
          onSeePricing={scrollToPricing}
        />
        <HomepageExecutiveBoardSection />
        <ProductProofSection
          content={proofContent}
          items={proofItems}
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
        />
        <HomepageOverviewSection
          onStartTrial={openProductTrial}
          onBookDemo={() => openSalesContact('hero')}
        />
        <HomepageSearchExperience
          content={homepageSearchContent}
          sourcePath={sourcePath}
          initialQuery={null}
          initialQueryRequestId={0}
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
