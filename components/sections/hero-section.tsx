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
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const utilityLinks = [
  "Search-led homepage",
  "Local business discovery",
] as const;

const popularCategories = [
  "Plumbers",
  "Massage Therapists",
  "Hairdressers",
  "Electricians",
  "Restaurants",
  "Dentists",
  "Cafes",
  "Mechanics",
  "Builders",
  "Fish & Chips",
] as const;

export function HeroSection() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [whereValue, setWhereValue] = useState("");
  const [queryValue, setQueryValue] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = [queryValue.trim(), whereValue.trim()].filter(Boolean).join(" near ");
    const target = document.getElementById("how-it-works");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!queryValue && !whereValue) {
      setQueryValue("Find a local business");
    } else if (nextQuery) {
      setQueryValue(nextQuery);
    }
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

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#2f55f5_0%,#4e74ff_60%,#5f81ff_100%)] text-white">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="absolute left-[-10%] top-24 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute right-[10%] top-16 h-24 w-24 rounded-[2rem] border border-white/10" />
        <div className="absolute left-[18%] top-24 h-2 w-28 rounded-full bg-white/10" />
        <div className="absolute right-[24%] top-36 h-2 w-20 rounded-full bg-white/10" />

        <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(47,85,245,0.72)] backdrop-blur-xl">
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
            <Button href="#pricing" className="bg-white px-6 text-[#2f55f5] shadow-none hover:opacity-100">
              View Packages
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
            <div className="border-t border-white/10 bg-[rgba(47,85,245,0.94)] lg:hidden">
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
                    <Button href="#pricing" className="w-full justify-center bg-white text-[#2f55f5] shadow-none sm:col-span-2">
                      View Packages
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="container-brand relative z-10 flex flex-col items-center px-4 pb-28 pt-16 text-center sm:pb-32 sm:pt-24">
          <FadeIn className="w-full">
            <div className="mx-auto max-w-5xl">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                Local business discovery
              </div>
              <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-medium leading-[1.08] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.25rem]">
                Discover local businesses
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-white/78 sm:text-lg">
                Search, compare, and move toward the next step faster.
              </p>

              <form
                onSubmit={handleSearchSubmit}
                className="mx-auto mt-12 max-w-4xl rounded-[2rem] bg-white p-3 shadow-[0_18px_44px_rgba(17,24,39,0.22)] sm:p-4"
              >
                <div className="grid gap-3 md:grid-cols-[0.9fr_1.55fr_auto] md:items-center">
                  <label className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 px-4 py-4 text-left">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M12 20s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <input
                      value={whereValue}
                      onChange={(event) => setWhereValue(event.target.value)}
                      placeholder="Where"
                      className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 px-4 py-4 text-left">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="11" cy="11" r="6" />
                      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                    </svg>
                    <input
                      value={queryValue}
                      onChange={(event) => setQueryValue(event.target.value)}
                      placeholder="Search for a business..."
                      className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <button
                    type="submit"
                    className="inline-flex h-full min-h-[3.75rem] items-center justify-center rounded-[1.35rem] bg-[#e8f0fe] px-8 text-sm font-semibold text-[#3563f6] transition hover:bg-[#dfe9fd]"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-14">
                <div className="text-sm font-medium text-white/88">Popular industries</div>
                <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3">
                  {popularCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setQueryValue(category)}
                      className="rounded-full border border-white/14 bg-white/14 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/22"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
                <Button href="#how-it-works" variant="secondary" className="border-white/20 bg-white/10 px-6 text-white hover:bg-white/15">
                  Learn More
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
