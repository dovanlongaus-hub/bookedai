import { useEffect, useState } from 'react';
import { roadmapHref, videoDemoHref, type NavItem } from './data';
import { BrandLockup } from './ui/BrandLockup';
import { LogoMark } from './ui/LogoMark';
import { SignalPill } from './ui/SignalPill';

type HeaderProps = {
  navItems: Array<string | NavItem>;
  onStartTrial: () => void;
  onBookDemo: () => void;
  bookDemoLabel?: string;
  startTrialLabel?: string;
  utilityLinks?: Array<{ label: string; href: string }>;
  compactMenuOnly?: boolean;
};

function getNavItemModel(item: string | NavItem) {
  if (typeof item === 'string') {
    return {
      id: item.toLowerCase().replace(/\s+/g, '-'),
      label: item,
      href: undefined,
    };
  }

  return item;
}

function getCompactItemLabel(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes('how it works')) return 'How';
  if (normalized.includes('architecture')) return 'Arch';
  if (normalized.includes('ecosystem')) return 'Logos';
  if (normalized.includes('team')) return 'Team';
  if (normalized.includes('rollout')) return 'Launch';
  if (normalized.includes('pricing')) return 'Price';
  if (normalized.includes('proof')) return 'Proof';
  if (normalized.includes('roadmap')) return 'Map';
  if (normalized.includes('product trial')) return 'Trial';
  if (normalized.includes('tenant')) return 'Tenant';
  if (normalized.includes('sales')) return 'Sales';

  return label;
}

function MenuGlyph({ kind }: { kind: string }) {
  const classes = 'h-4 w-4';

  switch (kind) {
    case 'how':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'arch':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="4" y="5" width="6" height="6" rx="1.4" />
          <rect x="14" y="5" width="6" height="6" rx="1.4" />
          <rect x="9" y="14" width="6" height="6" rx="1.4" />
          <path d="M10 8h4M12 10v4" strokeLinecap="round" />
        </svg>
      );
    case 'logos':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 8h16M4 16h16M8 4v16M16 4v16" strokeLinecap="round" />
        </svg>
      );
    case 'team':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M4.5 18c.7-2.2 2.7-3.5 5-3.5s4.3 1.3 5 3.5M14.5 18c.45-1.54 1.7-2.53 3.5-2.8" strokeLinecap="round" />
        </svg>
      );
    case 'launch':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 18c3-1 6-4 7-7 1-3 3.5-5 5-5-1 1.5-2 4-5 5-3 1-6 4-7 7Z" strokeLinejoin="round" />
          <path d="M5 19h4" strokeLinecap="round" />
        </svg>
      );
    case 'price':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 4v16M16 7.5c0-1.4-1.57-2.5-3.5-2.5S9 6.1 9 7.5 10.57 10 12.5 10 16 11.1 16 12.5 14.43 15 12.5 15 9 13.9 9 12.5" strokeLinecap="round" />
        </svg>
      );
    case 'proof':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M7 12.5 10 15l7-7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case 'map':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m4 7 5-2 6 2 5-2v12l-5 2-6-2-5 2V7Z" strokeLinejoin="round" />
          <path d="M9 5v12M15 7v12" strokeLinecap="round" />
        </svg>
      );
    case 'trial':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case 'tenant':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 19V9l7-4 7 4v10H5Z" strokeLinejoin="round" />
          <path d="M9 19v-5h6v5" strokeLinejoin="round" />
        </svg>
      );
    case 'sales':
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 7h14v10H5z" rx="2" />
          <path d="m7 9 5 4 5-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={classes} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function getMenuGlyphKind(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes('how it works')) return 'how';
  if (normalized.includes('architecture')) return 'arch';
  if (normalized.includes('ecosystem')) return 'logos';
  if (normalized.includes('team')) return 'team';
  if (normalized.includes('rollout')) return 'launch';
  if (normalized.includes('pricing')) return 'price';
  if (normalized.includes('proof')) return 'proof';
  if (normalized.includes('roadmap')) return 'map';
  if (normalized.includes('product trial')) return 'trial';
  if (normalized.includes('tenant')) return 'tenant';
  if (normalized.includes('sales')) return 'sales';

  return 'proof';
}

export function Header({
  navItems,
  onStartTrial,
  onBookDemo,
  bookDemoLabel = 'Open Product Demo',
  startTrialLabel = 'Claim Free Setup',
  utilityLinks,
  compactMenuOnly = false,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const resolvedNavItems = navItems.map(getNavItemModel);
  const resolvedUtilityLinks =
    utilityLinks ?? [
        { label: 'Roadmap', href: roadmapHref },
        { label: 'Watch Demo', href: videoDemoHref },
      ];
  const workspaceAccessLinks = resolvedUtilityLinks.filter((link) =>
    link.label.toLowerCase().includes('login'),
  );
  const exploreLinks = resolvedUtilityLinks.filter(
    (link) => !link.label.toLowerCase().includes('login'),
  );
  const railLabelClass =
    'min-w-0 overflow-hidden text-left transition-all duration-300 max-w-0 -translate-x-2 opacity-0 group-hover:max-w-[11.5rem] group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:max-w-[11.5rem] group-focus-within:translate-x-0 group-focus-within:opacity-100';
  const railRowClass =
    'flex w-full items-center justify-center gap-3 rounded-[1.2rem] border border-transparent px-3 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-200 hover:bg-white/96 hover:text-slate-950 group-hover:justify-start group-focus-within:justify-start';

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen && !compactMenuOnly ? 'hidden' : '';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [compactMenuOnly, isMobileMenuOpen]);

  const menuToggleLabel = isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu';

  const menuToggleButton = (
    <button
      type="button"
      aria-expanded={isMobileMenuOpen}
      aria-controls="mobile-nav"
      aria-label={menuToggleLabel}
      onClick={() => setIsMobileMenuOpen((current) => !current)}
      className={[
        'booked-menu-button inline-flex items-center justify-center rounded-full text-sm font-semibold text-[#1d1d1f] transition-transform duration-200 hover:scale-[1.02]',
        compactMenuOnly
          ? 'h-14 w-14 border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,247,252,0.96)_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur'
          : 'h-10 px-4 md:!hidden',
      ].join(' ')}
    >
      <span
        className={[
          'flex flex-col gap-1.5',
          compactMenuOnly
            ? 'rounded-full border border-black/6 bg-white/82 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
            : '',
        ].join(' ')}
      >
        <span
          className={[
            'block h-0.5 rounded-full bg-current transition-transform duration-200',
            compactMenuOnly ? 'w-5.5' : 'w-5',
            isMobileMenuOpen ? 'translate-y-2 rotate-45' : '',
          ].join(' ')}
        />
        <span
          className={[
            'block h-0.5 rounded-full bg-current transition-opacity duration-200',
            compactMenuOnly ? 'w-4' : 'w-5',
            isMobileMenuOpen ? 'opacity-0' : '',
          ].join(' ')}
        />
        <span
          className={[
            'block h-0.5 rounded-full bg-current transition-transform duration-200',
            compactMenuOnly ? 'w-5.5' : 'w-5',
            isMobileMenuOpen ? '-translate-y-2 -rotate-45' : '',
          ].join(' ')}
        />
      </span>
    </button>
  );

  return (
    <header className={compactMenuOnly ? 'relative z-30 px-4 pt-4 sm:px-6' : 'sticky top-0 z-30 px-3 pt-3 sm:px-4'}>
      {compactMenuOnly ? (
        <>
          <aside className="group fixed left-4 top-4 bottom-4 z-40 hidden w-[5.5rem] flex-col overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,253,0.96)_100%)] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:flex hover:w-[16rem] focus-within:w-[16rem]">
            <div className="px-1">
              <div className="flex items-center justify-center rounded-full bg-slate-100/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:justify-start group-focus-within:justify-start">
                <span className={railLabelClass}>Navigate</span>
              </div>
            </div>

            <nav className="mt-4 flex flex-1 flex-col gap-1.5" aria-label="Homepage primary">
              {resolvedNavItems.map((navItem) => (
                <a
                  key={navItem.id}
                  href={navItem.href ?? `#${navItem.id}`}
                  title={navItem.label}
                  className={railRowClass}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#eef4fb] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <MenuGlyph kind={getMenuGlyphKind(navItem.label)} />
                  </span>
                  <span className={railLabelClass}>
                    <span className="block whitespace-nowrap text-sm font-semibold text-slate-900">
                      {navItem.label}
                    </span>
                  </span>
                </a>
              ))}
            </nav>

            <div className="mt-3 border-t border-slate-200/80 pt-3">
              <div className="flex flex-col gap-1.5">
                {resolvedUtilityLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    title={link.label}
                    className={railRowClass}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                      <MenuGlyph kind={getMenuGlyphKind(link.label)} />
                    </span>
                    <span className={railLabelClass}>
                      <span className="block whitespace-nowrap text-sm font-semibold text-slate-900">
                        {link.label}
                      </span>
                    </span>
                  </a>
                ))}

                <button
                  type="button"
                  onClick={onBookDemo}
                  className={`${railRowClass} bg-white/82`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#eef4fb] text-slate-700">
                    <MenuGlyph kind="sales" />
                  </span>
                  <span className={railLabelClass}>
                    <span className="block whitespace-nowrap text-sm font-semibold text-slate-900">
                      {bookDemoLabel}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onStartTrial}
                  className="mt-1 flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-[#1d1d1f] px-3 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition-all duration-200 hover:translate-y-[-1px] group-hover:justify-start group-focus-within:justify-start"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/10">
                    <MenuGlyph kind="trial" />
                  </span>
                  <span className={railLabelClass}>
                    <span className="block whitespace-nowrap text-sm font-semibold text-white">
                      {startTrialLabel}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </aside>

          <div className="mx-auto hidden w-full max-w-7xl xl:flex xl:justify-end">
            <div className="flex items-center gap-3 rounded-[1.55rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,253,0.96)_100%)] px-3 py-2.5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur">
              {exploreLinks.length > 0 ? (
                <div className="flex items-center gap-2 rounded-[1.25rem] bg-white/70 px-2.5 py-2">
                  <div className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Explore
                  </div>
                  <div className="flex items-center gap-1">
                    {exploreLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {workspaceAccessLinks.length > 0 ? (
                <div className="flex items-center gap-2 rounded-[1.25rem] border border-slate-200/80 bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <div className="px-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Workspace Access
                  </div>
                  <div className="flex items-center gap-1">
                    {workspaceAccessLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mx-0.5 h-8 w-px bg-slate-200/80" />

              <button
                type="button"
                onClick={onBookDemo}
                className="booked-button-secondary whitespace-nowrap px-4 py-2 text-sm font-semibold"
              >
                {bookDemoLabel}
              </button>
              <button
                type="button"
                onClick={onStartTrial}
                className="booked-button whitespace-nowrap px-4 py-2 text-sm font-semibold"
              >
                {startTrialLabel}
              </button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-7xl justify-end xl:hidden">
            {menuToggleButton}
          </div>

        </>
      ) : (
        <>
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
              {resolvedUtilityLinks.map((link) => (
                <a key={link.href} href={link.href} className="booked-nav-link">
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={onBookDemo}
                className="booked-button-secondary px-4 py-2 text-sm font-semibold"
              >
                {bookDemoLabel}
              </button>
              <button
                type="button"
                onClick={onStartTrial}
                className="booked-button px-4 py-2 text-sm font-semibold"
              >
                {startTrialLabel}
              </button>
            </div>

            {menuToggleButton}
          </div>

          <nav
            className="template-nav mx-auto hidden w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:!flex"
            aria-label="Primary"
          >
            <div className="flex flex-wrap items-center gap-2">
              {resolvedNavItems.map((navItem) => {
                return (
                  <a
                    key={navItem.id}
                    href={navItem.href ?? `#${navItem.id}`}
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
        </>
      )}

      {isMobileMenuOpen ? (
        <div>
          <button
            type="button"
            aria-label="Close mobile menu"
            onClick={closeMobileMenu}
            className={compactMenuOnly ? 'fixed inset-0 z-30 bg-transparent' : 'fixed inset-0 z-30 bg-[rgba(15,23,42,0.18)] backdrop-blur-[2px]'}
          />

          {compactMenuOnly ? (
            <div
              id="mobile-nav"
              className="absolute right-4 top-[4.8rem] z-40 w-[20.5rem] rounded-[1.75rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,255,0.98)_100%)] p-3 shadow-[0_22px_60px_rgba(15,23,42,0.16)] sm:right-6"
            >
              <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-black/6 bg-white/86 px-3 py-2.5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Quick menu
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">BookedAI</div>
                </div>
                <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                  Menu
                </div>
              </div>

              <nav className="mt-3 flex flex-col gap-2" aria-label="Homepage mobile primary">
                {resolvedNavItems.map((navItem) => {
                  return (
                    <a
                      key={navItem.id}
                      href={navItem.href ?? `#${navItem.id}`}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 rounded-[1.15rem] border border-black/6 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:text-slate-950"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#f3f7fb] text-slate-700">
                        <MenuGlyph kind={getMenuGlyphKind(navItem.label)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-950">{navItem.label}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                          Jump to this section
                        </span>
                      </span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-3 border-t border-slate-200/80 pt-3">
                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick actions
                </div>
                <div className="flex flex-col gap-2">
                  {resolvedUtilityLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-[1.15rem] border border-black/6 bg-[#f8fbff] px-3 py-3 text-left text-sm font-semibold text-slate-700"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white text-slate-700">
                      <MenuGlyph kind={getMenuGlyphKind(link.label)} />
                    </span>
                    <span className="block flex-1 text-sm font-semibold text-slate-900">{link.label}</span>
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onBookDemo();
                  }}
                  className="flex items-center gap-3 rounded-[1.15rem] border border-black/6 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#f8fafc] text-slate-700">
                    <MenuGlyph kind="sales" />
                  </span>
                  <span className="block flex-1 text-sm font-semibold text-slate-900">{bookDemoLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onStartTrial();
                  }}
                  className="mt-1 flex items-center gap-3 rounded-[1.2rem] bg-[#1d1d1f] px-3 py-3 text-left text-sm font-semibold text-white"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/10">
                    <MenuGlyph kind="trial" />
                  </span>
                  <span className="block flex-1 text-sm font-semibold text-white">{startTrialLabel}</span>
                </button>
                </div>
              </div>
            </div>
          ) : (
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
                  {resolvedUtilityLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="booked-button-secondary px-4 py-3 text-center text-sm font-semibold"
                    >
                      {link.label}
                    </a>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      onBookDemo();
                    }}
                    className="booked-button-secondary px-4 py-3 text-center text-sm font-semibold"
                  >
                    {bookDemoLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      onStartTrial();
                    }}
                    className="booked-button px-4 py-3 text-sm font-semibold"
                  >
                    {startTrialLabel}
                  </button>
                </div>
              </div>

              <nav className="mt-4 flex flex-col gap-2" aria-label="Mobile primary">
                {resolvedNavItems.map((navItem) => {
                  return (
                    <a
                      key={navItem.id}
                      href={navItem.href ?? `#${navItem.id}`}
                      onClick={closeMobileMenu}
                      className="booked-menu-button justify-start rounded-2xl px-4 py-3 text-sm font-semibold"
                    >
                      {navItem.label}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
