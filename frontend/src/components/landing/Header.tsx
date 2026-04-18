import { useEffect, useState } from 'react';
import { roadmapHref, videoDemoHref, type NavItem } from './data';
import { BrandLockup } from './ui/BrandLockup';
import { SignalPill } from './ui/SignalPill';

type HeaderProps = {
  navItems: Array<string | NavItem>;
  onStartTrial: () => void;
  onBookDemo: () => void;
};

function getNavItemModel(item: string | NavItem) {
  if (typeof item === 'string') {
    return {
      id: item.toLowerCase().replace(/\s+/g, '-'),
      label: item,
    };
  }

  return item;
}

export function Header({ navItems, onStartTrial, onBookDemo }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div className="template-nav mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-6">
        <a
          href="/"
          onClick={closeMobileMenu}
          className="min-w-0 max-w-[calc(100vw-7.5rem)] rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-2.5 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.14)] sm:max-w-none lg:rounded-[1.5rem] lg:px-3"
        >
          <BrandLockup
            compact
            surface="dark"
            className="min-w-0"
            logoClassName="booked-brand-image booked-brand-image--landing-nav w-full max-w-[10.75rem] opacity-95 sm:max-w-[11rem] lg:max-w-[14.5rem]"
            descriptorClassName="hidden lg:inline"
            eyebrowClassName="hidden lg:inline-flex"
          />
        </a>

        <div className="hidden items-center gap-2 xl:!flex">
          <SignalPill
            variant="inverse"
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/78"
          >
            Startup-grade rollout
          </SignalPill>
        </div>

        <div className="hidden items-center gap-3 md:!flex">
          <a
            href={roadmapHref}
            className="booked-nav-link"
          >
            Roadmap
          </a>
          <a
            href={videoDemoHref}
            className="booked-nav-link"
          >
            Watch Demo
          </a>
          <button
            type="button"
            onClick={onBookDemo}
            className="booked-button-secondary px-4 py-2 text-sm font-semibold"
          >
            Book a Demo
          </button>
          <button
            type="button"
            onClick={onStartTrial}
            className="booked-button px-4 py-2 text-sm font-semibold"
          >
            Try Now
          </button>
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="booked-menu-button inline-flex h-10 px-4 text-sm font-semibold md:!hidden"
        >
          {isMobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <nav
        className="template-nav mx-auto hidden w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:!flex"
        aria-label="Primary"
      >
        <div className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const navItem = getNavItemModel(item);

            return (
              <a
                key={navItem.id}
                href={`#${navItem.id}`}
                className="booked-nav-link"
              >
                {navItem.label}
              </a>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {['Live assistant', 'Booking-ready proof'].map((item) => (
            <SignalPill
              key={item}
              variant="inverse"
              className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70"
            >
              {item}
            </SignalPill>
          ))}
        </div>
      </nav>

      {isMobileMenuOpen ? (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Close mobile menu"
            onClick={closeMobileMenu}
            className="fixed inset-0 z-30 bg-[rgba(15,23,42,0.18)] backdrop-blur-[2px]"
          />

          <div
            id="mobile-nav"
            className="template-nav fixed inset-x-3 top-[5.35rem] z-40 mx-auto max-h-[calc(100vh-6.5rem)] w-auto overflow-y-auto rounded-[1.8rem] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
          >
            <div className="rounded-[1.4rem] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(245,248,255,0.96)_100%)] p-4">
              <div className="flex items-start justify-between gap-3">
                <BrandLockup
                  compact
                  surface="light"
                  className="max-w-[17rem]"
                  logoClassName="max-w-[11rem]"
                  descriptorClassName="text-sm leading-6 text-black/66"
                  eyebrowClassName="px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
                />
                <div className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/56">
                  Mobile nav
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <a
                  href={roadmapHref}
                  onClick={closeMobileMenu}
                  className="booked-button-secondary px-4 py-3 text-center text-sm font-semibold"
                >
                  Roadmap
                </a>
                <a
                  href={videoDemoHref}
                  onClick={closeMobileMenu}
                  className="booked-button-secondary px-4 py-3 text-center text-sm font-semibold"
                >
                  Watch Demo
                </a>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onBookDemo();
                  }}
                  className="booked-button-secondary px-4 py-3 text-center text-sm font-semibold"
                >
                  Book a Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onStartTrial();
                  }}
                  className="booked-button px-4 py-3 text-sm font-semibold"
                >
                  Try Now
                </button>
              </div>
            </div>

            <nav className="mt-4 flex flex-col gap-2" aria-label="Mobile primary">
              {navItems.map((item) => {
                const navItem = getNavItemModel(item);

                return (
                <a
                  key={navItem.id}
                  href={`#${navItem.id}`}
                  onClick={closeMobileMenu}
                  className="booked-menu-button justify-start rounded-2xl px-4 py-3 text-sm font-semibold"
                >
                  {navItem.label}
                </a>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
