"use client";

import { FormEvent, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Proof", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const utilityLinks = ["Built for service businesses", "Website, calls, chat, and follow-up"] as const;

const popularCategories = [
  "Plumbers",
  "Dental clinics",
  "Hair salons",
  "Electricians",
  "Swim schools",
  "Restaurants",
  "Coaches",
  "Mechanics",
] as const;

const trustPoints = ["Capture more enquiries", "Reduce drop-off", "Move faster to booking"] as const;
const PRODUCT_URL = "https://product.bookedai.au/";

export function HeroSection() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [serviceArea, setServiceArea] = useState("");
  const [businessType, setBusinessType] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextBusinessType = businessType.trim() || "Service business";
    const nextServiceArea = serviceArea.trim() || "Sydney";
    setBusinessType(nextBusinessType);
    setServiceArea(nextServiceArea);

    const params = new URLSearchParams({
      q: `${nextBusinessType} in ${nextServiceArea}`,
      source: "homepage",
    });
    window.location.href = `${PRODUCT_URL}?${params.toString()}`;
  }

  return (
    <section id="hero" className="relative overflow-hidden pb-20 sm:pb-24">
      <div className="border-b border-slate-200 bg-white/95">
        <div className="container-brand flex flex-wrap items-center justify-between gap-3 py-3 text-[11px] font-medium text-slate-500 sm:text-xs">
          {utilityLinks.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_26%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.18),transparent_24%),linear-gradient(180deg,#102654_0%,#17367a_44%,#2958c8_100%)] text-white">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="absolute left-[-10%] top-24 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute right-[10%] top-16 h-24 w-24 rounded-[2rem] border border-white/10" />
        <div className="absolute left-[18%] top-24 h-2 w-28 rounded-full bg-white/10" />
        <div className="absolute right-[24%] top-36 h-2 w-20 rounded-full bg-white/10" />

        <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(16,38,84,0.72)] backdrop-blur-xl">
          <div className="container-brand flex items-center justify-between gap-4 py-4">
            <Logo variant="dark" className="max-w-[10.5rem] sm:max-w-[12.75rem]" />

            <nav className="hidden items-center gap-8 text-sm text-white/78 lg:flex">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <Button href="#pricing" className="bg-white px-6 text-[#2048a3] shadow-none hover:opacity-100">
                View Pricing
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 lg:hidden"
            >
              {isMobileMenuOpen ? "Close" : "Menu"}
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div className="border-t border-white/10 bg-[rgba(21,49,110,0.94)] lg:hidden">
              <div className="container-brand py-4">
                <div className="flex flex-col gap-3">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      {item.label}
                    </a>
                  ))}
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Button href="#pricing" className="w-full justify-center bg-white text-[#2048a3] shadow-none sm:col-span-2">
                      View Pricing
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="container-brand relative z-10 flex flex-col items-center px-4 pb-28 pt-16 text-center sm:pb-32 sm:pt-24">
          <FadeIn className="w-full">
            <div className="mx-auto max-w-6xl">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 shadow-[0_10px_22px_rgba(15,23,42,0.12)] backdrop-blur">
                The AI revenue engine for service businesses
              </div>
              <h1 className="mx-auto mt-8 max-w-5xl text-4xl font-medium leading-[1.03] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.5rem]">
                Turn more website visitors, calls, and enquiries into confirmed bookings.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-[15px] leading-7 text-white/82 sm:text-lg sm:leading-8">
                BookedAI.au helps service businesses capture demand, guide customers to the right service,
                and move them from first contact to booking with less drop-off.
              </p>

              <form
                onSubmit={handleSearchSubmit}
                className="mx-auto mt-12 max-w-5xl rounded-[2.2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_26px_60px_rgba(17,24,39,0.24)] backdrop-blur sm:p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto] md:items-center">
                  <label className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 px-4 py-4 text-left">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M12 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Service area</div>
                      <input
                        value={serviceArea}
                        onChange={(event) => setServiceArea(event.target.value)}
                        placeholder="Sydney or your main suburb"
                        className="mt-1 w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 px-4 py-4 text-left">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="11" cy="11" r="6" />
                      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Business type</div>
                      <input
                        value={businessType}
                        onChange={(event) => setBusinessType(event.target.value)}
                        placeholder="Plumber, salon, swim school, clinic..."
                        className="mt-1 w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex h-full min-h-[3.75rem] items-center justify-center rounded-[1.35rem] bg-[oklch(0.58_0.2_258)] px-8 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.25)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[oklch(0.54_0.2_258)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#17367a]"
                  >
                    See plans for your business
                  </button>
                </div>
              </form>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-white/84">
                {trustPoints.map((item) => (
                  <span key={item} className="rounded-full border border-white/14 bg-white/10 px-4 py-2 backdrop-blur-sm">
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-14">
                <div className="text-sm font-medium text-white/88">Built for service businesses like</div>
                <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3">
                  {popularCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setBusinessType(category)}
                      className="rounded-full border border-white/14 bg-white/14 px-5 py-3 text-sm font-medium text-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#17367a]"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
                <Button href="#how-it-works" variant="secondary" className="border-white/20 bg-white/10 px-6 text-white hover:bg-white/15">
                  See how it works
                </Button>
                <Button href="https://product.bookedai.au/?source=homepage" className="bg-white px-6 text-[#2048a3] shadow-none hover:opacity-100">
                  Start in product
                </Button>
              </div>
            </div>
          </FadeIn>

          <div className="pointer-events-none absolute inset-x-0 bottom-[-10rem] h-[14rem] rounded-[50%] bg-white" />
        </div>
      </div>
    </section>
  );
}
