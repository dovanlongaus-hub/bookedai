"use client";

import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeIn } from "@/components/ui/motion";
import { StatPill } from "@/components/ui/kpi-widgets";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const statPills = [
  { label: "Channels", value: "Search · Web · Call · Email" },
  { label: "Pricing", value: "Setup + Success Commission" },
  { label: "Focus", value: "Bookings + Revenue Visibility" },
];

const revenueCards = [
  { title: "Revenue Generated", value: "$18,420", detail: "+24.8% this month", tone: "text-brand-green" },
  { title: "Missed Revenue", value: "$2,160", detail: "12 missed opportunities", tone: "text-brand-amber" },
  { title: "Payment Status", value: "Paid", detail: "Booking confirmed · Deposit received", tone: "text-brand-green" },
  { title: "Top Source", value: "Google Search", detail: "38% of booked revenue", tone: "text-brand-blue" },
] as const;

export function HeroSection() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoMode, setLogoMode] = useState<"dark" | "light">("dark");

  return (
    <section id="hero" className="relative overflow-hidden section-y pt-28 sm:pt-32">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(11,16,32,0.72)] backdrop-blur-xl">
        <div className="container-brand flex items-center justify-between gap-4 py-4">
          <Logo variant={logoMode} className="max-w-[10.5rem] sm:max-w-[12.75rem]" />

          <nav className="hidden items-center gap-8 text-sm text-brand-muted lg:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => setLogoMode((current) => (current === "dark" ? "light" : "dark"))}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted transition hover:bg-white/10 hover:text-white"
            >
              {logoMode === "dark" ? "Light Logo" : "Dark Logo"}
            </button>
            <Button href="#pricing">Book a Demo</Button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-white/10 lg:hidden"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t border-white/10 bg-[rgba(11,16,32,0.94)] lg:hidden">
            <div className="container-brand py-4">
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-brand-text transition hover:bg-white/10"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLogoMode((current) => (current === "dark" ? "light" : "dark"))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-brand-text transition hover:bg-white/10"
                  >
                    {logoMode === "dark" ? "Switch to Light Logo" : "Switch to Dark Logo"}
                  </button>
                  <Button href="#pricing" className="w-full justify-center">
                    Book a Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="container-brand">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <FadeIn>
            <div>
              <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-brand-muted">
                AI Revenue Engine for Service Businesses
              </div>

              <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.96] tracking-tight sm:text-6xl xl:text-7xl">
                Turn Search, Calls, Emails, and Enquiries Into{" "}
                <span className="gradient-text">Revenue</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted sm:text-[1.15rem]">
                BookedAI.au captures demand across search, website, calls, email,
                and follow-up — then converts it into confirmed bookings and
                revenue automatically.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Button href="#pricing">Book a Demo</Button>
                <Button href="#how-it-works" variant="secondary">
                  See How It Works
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {statPills.map((item) => (
                  <StatPill key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <GlassCard className="relative overflow-hidden p-6 lg:p-7">
              <div className="absolute inset-x-8 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.18),transparent_70%)] blur-3xl" />
              <div className="relative grid gap-4 sm:grid-cols-2">
                {revenueCards.map((card) => (
                  <GlassCard key={card.title} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-brand-muted">
                        {card.title}
                      </div>
                      {card.title === "Payment Status" ? (
                        <span className="rounded-full bg-brand-green/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-green">
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className={`mt-2 text-3xl font-bold ${card.tone}`}>{card.value}</div>
                    <div className="mt-2 text-sm text-brand-muted">{card.detail}</div>
                  </GlassCard>
                ))}
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">Live activity</span>
                  <span className="text-brand-muted">Last 5 minutes</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-brand-muted">
                  <div className="flex items-center justify-between gap-4">
                    <span>Search enquiry qualified</span>
                    <span className="text-brand-green">Booked</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Missed call recovery sent</span>
                    <span className="text-brand-blue">In progress</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Email follow-up reopened lead</span>
                    <span className="text-brand-green">Converted</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
