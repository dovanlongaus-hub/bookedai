import { DashboardPreviewSection } from "@/components/sections/dashboard-preview-section";
import { FinalCTASection } from "@/components/sections/final-cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { TrustBar } from "@/components/sections/trust-bar";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="min-h-screen bg-bg text-textPrimary">
      <div className="pointer-events-none fixed inset-0 bg-heroGlow opacity-100" />
      <div className="pointer-events-none fixed inset-0 bg-greenGlow opacity-70" />

      <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/72 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-container items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Logo variant="dark" className="h-10 w-auto sm:h-11" />
          <div className="hidden items-center gap-6 md:flex">
            <a className="text-sm font-medium text-textSecondary transition hover:text-textPrimary" href="#dashboard">
              Revenue Dashboard
            </a>
            <a className="text-sm font-medium text-textSecondary transition hover:text-textPrimary" href="#pricing">
              Pricing
            </a>
            <a className="text-sm font-medium text-textSecondary transition hover:text-textPrimary" href="#final-cta">
              Book Demo
            </a>
          </div>
          <Button size="sm">Schedule My Demo</Button>
        </div>
      </header>

      <HeroSection />
      <TrustBar />
      <DashboardPreviewSection />
      <PricingSection />
      <FinalCTASection />
    </main>
  );
}
