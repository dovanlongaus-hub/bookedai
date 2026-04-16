import { useState } from 'react';
import { LogoMark } from './ui/LogoMark';
import { roadmapHref, videoDemoHref } from './data';

type HeaderProps = {
  navItems: string[];
  onStartTrial: () => void;
  onBookDemo: () => void;
};

export function Header({ navItems, onStartTrial, onBookDemo }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30">
      <div className="apple-glass-nav mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <LogoMark />
          </div>
          <div className="text-xl font-semibold tracking-[-0.03em] text-white">
            Booked<span className="text-white/70">AI</span>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={roadmapHref}
            className="text-xs text-white/82 transition hover:text-white"
          >
            Roadmap
          </a>
          <a
            href={videoDemoHref}
            className="text-xs text-white/82 transition hover:text-white"
          >
            Watch Demo
          </a>
          <button
            type="button"
            onClick={onBookDemo}
            className="apple-button-secondary border-white/24 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Book a Demo
          </button>
          <button
            type="button"
            onClick={onStartTrial}
            className="apple-button px-4 py-2 text-sm font-semibold"
          >
            Start Free Trial
          </button>
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 md:hidden"
        >
          {isMobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <nav
        className="apple-glass-nav hidden items-center justify-center gap-8 px-4 py-3 text-xs text-white/72 md:flex"
        aria-label="Primary"
      >
        {navItems.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
            className="transition hover:text-white"
          >
            {item}
          </a>
        ))}
      </nav>

      {isMobileMenuOpen ? (
        <div
          id="mobile-nav"
          className="apple-glass-nav m-4 rounded-[1.5rem] p-4 md:hidden"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile primary">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={closeMobileMenu}
                className="rounded-2xl bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/12"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-4 grid gap-3">
            <a
              href={roadmapHref}
              onClick={closeMobileMenu}
              className="apple-button-secondary border-white/24 px-4 py-3 text-center text-sm text-white hover:bg-white/10"
            >
              Roadmap
            </a>
            <a
              href={videoDemoHref}
              onClick={closeMobileMenu}
              className="apple-button-secondary border-white/24 px-4 py-3 text-center text-sm text-white hover:bg-white/10"
            >
              Watch Demo
            </a>
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                onBookDemo();
              }}
              className="apple-button-secondary border-white/24 px-4 py-3 text-center text-sm text-white hover:bg-white/10"
            >
              Book a Demo
            </button>
            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                onStartTrial();
              }}
              className="apple-button px-4 py-3 text-sm font-semibold"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
