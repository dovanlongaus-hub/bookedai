import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Grid2X2,
  LayoutDashboard,
  LogIn,
  Mail,
  Map,
  MonitorPlay,
  Network,
  PlusCircle,
  Rocket,
  Users,
} from 'lucide-react';
import { demoAppHref, googleLoginHref, productHref, roadmapHref, type NavItem } from './data';
import { AppleCTA } from './ui/AppleCTA';
import { BrandLockup } from './ui/BrandLockup';
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
  const iconMap = {
    how: Clock3,
    arch: Network,
    logos: Grid2X2,
    team: Users,
    launch: Rocket,
    price: DollarSign,
    proof: CheckCircle2,
    map: Map,
    trial: PlusCircle,
    tenant: Building2,
    sales: Mail,
    product: LayoutDashboard,
    demo: MonitorPlay,
    login: LogIn,
  } as const;
  const Icon = iconMap[kind as keyof typeof iconMap] ?? CheckCircle2;

  return <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />;
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
  if (normalized.includes('product')) return 'product';
  if (normalized.includes('demo')) return 'demo';
  if (normalized.includes('login') || normalized.includes('workspace access')) return 'login';
  if (normalized.includes('product trial')) return 'trial';
  if (normalized.includes('tenant')) return 'tenant';
  if (normalized.includes('sales')) return 'sales';

  return 'proof';
}

export function Header({
  navItems,
  onStartTrial,
  onBookDemo,
  bookDemoLabel = 'Watch live demo',
  startTrialLabel = 'Start free',
  utilityLinks,
  compactMenuOnly = false,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const resolvedNavItems = navItems.map(getNavItemModel);
  const resolvedUtilityLinks =
    utilityLinks ?? [
        { label: 'Product', href: productHref },
        { label: 'Live Demo', href: demoAppHref },
        { label: 'Tenant Login', href: googleLoginHref },
        { label: 'Roadmap', href: roadmapHref },
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
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    if (isMobileMenuOpen) {
      const focusTimer = window.setTimeout(() => {
        drawerFirstLinkRef.current?.focus();
      }, 60);
      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        if (typeof document !== 'undefined' && document.activeElement !== menuToggleRef.current) {
          menuToggleRef.current?.focus();
        }
      };
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [compactMenuOnly, isMobileMenuOpen]);

  const menuToggleLabel = isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu';

  const menuToggleButton = (
    <button
      type="button"
      ref={menuToggleRef}
      aria-expanded={isMobileMenuOpen}
      aria-controls={compactMenuOnly ? 'mobile-nav' : 'header-mobile-drawer'}
      aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      onClick={() => setIsMobileMenuOpen((current) => !current)}
      className={[
        'booked-menu-button inline-flex items-center justify-center rounded-full text-sm font-semibold text-apple-near-black transition-transform duration-200 hover:scale-[1.02] motion-reduce:transition-none',
        compactMenuOnly
          ? 'h-14 w-14 border border-white/80 bg-white/95 shadow-apple backdrop-blur'
          : 'h-11 min-w-[44px] px-3 lg:hidden',
      ].join(' ')}
    >
      <span
        className={[
          'flex flex-col gap-1.5',
          compactMenuOnly
            ? 'rounded-full border border-black/6 bg-white/82 px-3 py-3 shadow-apple-sm'
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
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-[1.35rem] border border-white/80 bg-apple-light/95 px-3 py-2 shadow-apple backdrop-blur xl:hidden">
            <a
              href="/"
              onClick={closeMobileMenu}
              className="min-w-0 rounded-[1.2rem] border border-black/6 bg-white px-2.5 py-2 shadow-apple-sm"
            >
              <BrandLockup
                compact
                surface="light"
                className="min-w-0"
                logoClassName="booked-brand-image booked-brand-image--landing-nav max-w-[10.5rem] sm:max-w-[11.5rem]"
                descriptorClassName="hidden"
                eyebrowClassName="hidden"
              />
            </a>

            <div className="flex items-center gap-2">
              {exploreLinks.slice(0, 2).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
                >
                  {link.label}
                </a>
              ))}
              {menuToggleButton}
            </div>
          </div>

          <aside className="group fixed left-4 top-4 bottom-4 z-40 hidden w-[5rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/75 bg-apple-light/95 p-2.5 shadow-apple backdrop-blur xl:flex hover:w-[14rem] focus-within:w-[14rem]">
            <div className="px-1">
              <div className="flex items-center justify-center rounded-full bg-slate-100/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:justify-start group-focus-within:justify-start">
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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-apple-light text-slate-700">
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
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white text-slate-700 shadow-apple-sm">
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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-apple-light text-slate-700">
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
                  className="mt-1 flex w-full items-center justify-center gap-3 rounded-apple-standard bg-apple-near-black px-3 py-3 text-sm font-semibold text-white shadow-apple transition-all duration-200 hover:translate-y-[-1px] group-hover:justify-start group-focus-within:justify-start"
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
            <div className="flex items-center gap-3 rounded-[1.55rem] border border-white/80 bg-apple-light/95 px-3 py-2.5 shadow-apple backdrop-blur">
              {exploreLinks.length > 0 ? (
                <div className="flex items-center gap-2 rounded-[1.25rem] bg-white/70 px-2.5 py-2">
                  <div className="px-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                <div className="flex items-center gap-2 rounded-[1.25rem] border border-slate-200/80 bg-white px-2.5 py-2 shadow-apple-sm">
                  <div className="px-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Workspace Access
                  </div>
                  <div className="flex items-center gap-1">
                    {workspaceAccessLinks.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-apple-sm"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mx-0.5 h-8 w-px bg-slate-200/80" />

              <AppleCTA
                label={bookDemoLabel}
                intent="secondary"
                onClick={onBookDemo}
                analyticsId="header_compact_book_demo"
                className="whitespace-nowrap"
              />
              <AppleCTA
                label={startTrialLabel}
                intent="primary"
                onClick={onStartTrial}
                analyticsId="header_compact_start_trial"
                className="whitespace-nowrap"
              />
            </div>
          </div>

        </>
      ) : (
        <>
          <div className="template-nav mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-6">
            <a
              href="/"
              onClick={closeMobileMenu}
              className="min-w-0 max-w-[calc(100vw-7.5rem)] rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-2.5 py-2 shadow-apple-sm sm:max-w-none lg:rounded-[1.5rem] lg:px-3"
            >
              <BrandLockup
                compact
                surface="dark"
                className="min-w-0"
                logoClassName="booked-brand-image booked-brand-image--landing-nav max-w-[10.75rem] opacity-95 sm:max-w-[11rem] lg:max-w-[14.5rem]"
                descriptorClassName="hidden lg:inline"
                eyebrowClassName="hidden lg:inline-flex"
              />
            </a>

            <div className="hidden items-center gap-2 xl:!flex">
              <SignalPill
                variant="inverse"
                className="px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/78"
              >
                Live in production
              </SignalPill>
            </div>

            <div className="hidden items-center gap-3 lg:!flex">
              {resolvedUtilityLinks.map((link) => (
                <a key={link.href} href={link.href} className="booked-nav-link">
                  {link.label}
                </a>
              ))}
              <AppleCTA
                label={startTrialLabel}
                intent="primary"
                onClick={onStartTrial}
                analyticsId="header_start_trial"
              />
            </div>

            {menuToggleButton}
          </div>

          <nav
            className="template-nav mx-auto hidden w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:!flex"
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
                  className="px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/70"
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
            aria-label="Close menu"
            onClick={closeMobileMenu}
            className={compactMenuOnly ? 'fixed inset-0 z-30 bg-transparent' : 'fixed inset-0 z-30 bg-apple-near-black/20 backdrop-blur-[2px]'}
          />

          {compactMenuOnly ? (
            <div
              id="mobile-nav"
              className="absolute right-4 top-[4.8rem] z-40 w-[20.5rem] rounded-[1.75rem] border border-white/80 bg-apple-light/98 p-3 shadow-apple sm:right-6"
            >
              <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-black/6 bg-white/86 px-3 py-2.5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
                      className="flex items-center gap-3 rounded-[1.15rem] border border-black/6 bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 shadow-apple-sm transition hover:-translate-y-0.5 hover:text-slate-950"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-apple-light text-slate-700">
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
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Quick actions
                </div>
                <div className="flex flex-col gap-2">
                  {resolvedUtilityLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-[1.15rem] border border-black/6 bg-apple-light px-3 py-3 text-left text-sm font-semibold text-slate-700"
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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-apple-light text-slate-700">
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
                  className="mt-1 flex items-center gap-3 rounded-apple-standard bg-apple-near-black px-3 py-3 text-left text-sm font-semibold text-white"
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
              id="header-mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="template-nav fixed inset-y-0 right-0 z-40 flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto bg-apple-light p-4 shadow-apple animate-[slideInFromRight_220ms_ease-out] motion-reduce:animate-none"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
              }}
            >
              <div className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-black/6 bg-white/95 p-3">
                <BrandLockup
                  compact
                  surface="light"
                  className="max-w-[12rem]"
                  logoClassName="max-w-[10rem]"
                  descriptorClassName="hidden"
                  eyebrowClassName="hidden"
                />
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                  className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border border-black/6 bg-apple-light px-3 text-sm font-semibold text-apple-near-black transition hover:bg-white"
                >
                  Close
                </button>
              </div>

              <nav className="flex flex-col gap-1.5" aria-label="Mobile primary">
                {resolvedNavItems.map((navItem, index) => {
                  return (
                    <a
                      key={navItem.id}
                      ref={index === 0 ? drawerFirstLinkRef : undefined}
                      href={navItem.href ?? `#${navItem.id}`}
                      onClick={closeMobileMenu}
                      className="booked-menu-button min-h-[44px] justify-start rounded-2xl px-4 py-3 text-sm font-semibold"
                    >
                      {navItem.label}
                    </a>
                  );
                })}
              </nav>

              <div className="mt-auto grid gap-2 border-t border-black/5 pt-4">
                {resolvedUtilityLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="booked-button-secondary min-h-[44px] px-4 py-3 text-center text-sm font-semibold"
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
                  className="booked-button-secondary min-h-[44px] px-4 py-3 text-center text-sm font-semibold"
                >
                  {bookDemoLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onStartTrial();
                  }}
                  className="booked-button min-h-[44px] px-4 py-3 text-sm font-semibold"
                >
                  {startTrialLabel}
                </button>
                <div className="mt-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
                  BookedAI
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
