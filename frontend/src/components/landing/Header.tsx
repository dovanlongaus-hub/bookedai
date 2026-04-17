import { useState } from 'react';
import { roadmapHref, videoDemoHref } from './data';
import { LogoMark } from './ui/LogoMark';

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
      <div className="template-nav mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" className="flex min-w-0 max-w-[13rem] items-center sm:max-w-[16rem] lg:max-w-[17.5rem]">
          <LogoMark
            variant="light"
            className="booked-brand-image booked-brand-image--frameless booked-brand-image--landing-nav w-full"
          />
        </a>

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
            Start Free Trial
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
        className="template-nav hidden items-center justify-center gap-2 px-4 py-3 md:!flex"
        aria-label="Primary"
      >
        {navItems.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
            className="booked-nav-link"
          >
            {item}
          </a>
        ))}
      </nav>

      {isMobileMenuOpen ? (
        <div
          id="mobile-nav"
          className="template-nav m-4 rounded-[1.5rem] p-4 md:hidden"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile primary">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={closeMobileMenu}
                className="booked-menu-button justify-start rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                {item}
              </a>
            ))}
          </nav>

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
              Start Free Trial
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
