import { useState } from 'react';

import { demoCtaHref } from './data';
import { LogoMark } from './ui/LogoMark';

type HeaderProps = {
  navItems: string[];
  onStartTrial: () => void;
};

export function Header({ navItems, onStartTrial }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 mx-auto w-full max-w-7xl px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
            <LogoMark />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-950">
            Booked<span className="text-slate-500">AI</span>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={demoCtaHref}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
          >
            Book a Demo
          </a>
          <button
            type="button"
            onClick={onStartTrial}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
          >
            Start Free Trial
          </button>
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.08)] transition hover:border-black/15 hover:bg-slate-50 md:hidden"
        >
          {isMobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <nav
        className="mt-4 hidden items-center gap-8 text-sm text-slate-600 md:flex"
        aria-label="Primary"
      >
        {navItems.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
            className="transition hover:text-slate-950"
          >
            {item}
          </a>
        ))}
      </nav>

      {isMobileMenuOpen ? (
        <div
          id="mobile-nav"
          className="mt-4 rounded-[1.75rem] border border-black/5 bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:hidden"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile primary">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={closeMobileMenu}
                className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-4 grid gap-3">
            <a
              href={demoCtaHref}
              onClick={closeMobileMenu}
              className="rounded-full border border-black/10 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
            >
              Book a Demo
            </a>
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                onStartTrial();
              }}
              className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
