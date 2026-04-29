import type { ReactNode } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';

import {
  brandContactEmail,
  brandLinkedInHref,
  brandWhatsAppHref,
  brandXHref,
  privacyHref,
  productHref,
  roadmapHref,
  tenantHref,
  termsHref,
} from './data';
import { BrandLockup } from './ui/BrandLockup';
import { SignalPill } from './ui/SignalPill';
import {
  getReleaseBadgeLabel,
  getReleaseVersionLabel,
} from '../../shared/config/release';

type FooterProps = {
  onStartTrial: () => void;
  onBookDemo: () => void;
  startTrialLabel?: string;
  bookDemoLabel?: string;
  showBrandCopy?: boolean;
  compact?: boolean;
};

const FOOTER_BRAND_TAGLINE =
  'BookedAI · The AI Revenue Engine for service businesses';
const FOOTER_CONTACT_PHONE = '+61 455 301 335';

const FOOTER_COLUMNS: Array<{
  heading: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    heading: 'Product',
    links: [
      { label: 'Web app', href: productHref },
      { label: 'Roadmap', href: roadmapHref },
      { label: 'View live business example', href: tenantHref },
    ],
  },
  {
    heading: 'For business owners',
    links: [
      { label: 'Start a 30-day pilot', href: '/register-interest' },
      { label: 'Book a 10-min revenue demo', href: '/register-interest?source_section=footer' },
      { label: 'Get my booking page set up', href: '/register-interest?source_section=footer_launch_setup' },
    ],
  },
  {
    heading: 'For investors',
    links: [
      { label: 'See live customer proof', href: tenantHref },
      { label: 'Talk to a founder', href: `mailto:${brandContactEmail}` },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Docs', href: '/docs' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Status', href: '/status' },
      { label: 'Privacy', href: privacyHref },
      { label: 'Terms', href: termsHref },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
];

export function Footer({
  onStartTrial,
  onBookDemo,
  startTrialLabel = 'Start free',
  bookDemoLabel = 'Talk to a BookedAI human',
  showBrandCopy = true,
  compact = false,
}: FooterProps) {
  const releaseBadgeLabel = getReleaseBadgeLabel();
  const releaseVersionLabel = getReleaseVersionLabel();

  return (
    <footer className={`mx-auto w-full max-w-7xl px-6 lg:px-8 ${compact ? 'pb-8 pt-3' : 'pb-12 pt-6'}`}>
      <div className={`template-card overflow-hidden border border-black/6 bg-apple-light shadow-apple-sm ${compact ? 'px-4 py-5 sm:px-5' : 'px-6 py-8 lg:px-8'}`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex w-fit max-w-full shrink-0 items-center overflow-hidden rounded-apple-standard border border-black/6 bg-white px-3 py-2 shadow-apple-sm">
              <BrandLockup
                surface="light"
                showDescriptor={false}
                showEyebrow={false}
                className="items-center"
                logoClassName="booked-brand-image booked-brand-image--landing-footer max-w-[11rem] sm:max-w-[12rem]"
              />
            </div>
            {showBrandCopy && (
              <div className="min-w-0">
                <p className="template-body text-sm leading-7 text-apple-near-black">
                  {FOOTER_BRAND_TAGLINE}
                </p>
                <p className="mt-1 text-sm leading-6 text-black/60">
                  <a href={`mailto:${brandContactEmail}`} className="template-link transition hover:underline">
                    {brandContactEmail}
                  </a>
                  {' · '}
                  {FOOTER_CONTACT_PHONE}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <SignalPill variant="brand" className="max-w-full px-3 py-1 text-left leading-5">
                    {releaseBadgeLabel}
                  </SignalPill>
                  <span className="template-body text-black/55">{releaseVersionLabel}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <SocialLink href={brandWhatsAppHref} label="WhatsApp">
                    <WhatsAppIcon />
                  </SocialLink>
                  <SocialLink href={brandLinkedInHref} label="LinkedIn">
                    <LinkedInIcon />
                  </SocialLink>
                  <SocialLink href={brandXHref} label="X">
                    <XIcon />
                  </SocialLink>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                onClick={onStartTrial}
                className="booked-button inline-flex min-w-0 items-center justify-center gap-2 whitespace-normal px-4 py-2 text-center font-semibold"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                {startTrialLabel}
              </button>
              <button
                type="button"
                onClick={onBookDemo}
                className="booked-button-secondary inline-flex min-w-0 items-center justify-center gap-2 whitespace-normal px-4 py-2 text-center font-medium"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {bookDemoLabel}
              </button>
            </div>
          </div>

          <nav
            aria-label="Footer"
            className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-4 ${compact ? 'lg:gap-5' : ''}`}
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading} className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {column.heading}
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.label}`}>
                      <a
                        href={link.href}
                        className="template-link text-sm text-apple-near-black transition hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div
          className={`${compact ? 'mt-4 pt-4 text-xs' : 'mt-6 pt-6 text-sm'} flex flex-col gap-3 border-t border-black/8 text-black/60 md:flex-row md:items-center md:justify-between`}
        >
          <span className="template-body text-xs text-black/55">
            © {new Date().getFullYear()} BookedAI. All rights reserved.
          </span>
          <div className="flex flex-wrap gap-4">
            <a href={privacyHref} className="template-link break-words transition hover:underline">
              Privacy
            </a>
            <a href={termsHref} className="template-link break-words transition hover:underline">
              Terms
            </a>
            <a href="/accessibility" className="template-link break-words transition hover:underline">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

type SocialLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

function SocialLink({ href, label, children }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="booked-social-button"
    >
      {children}
    </a>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.63 15.05L2 22l5.1-1.33A10 10 0 1 0 12 2Zm0 18.18a8.12 8.12 0 0 1-4.14-1.13l-.3-.18-3.03.79.81-2.95-.19-.31A8.17 8.17 0 1 1 12 20.18Zm4.48-5.92c-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.57.13-.17.25-.65.81-.8.97-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.24-.74-.66-1.25-1.48-1.4-1.73-.15-.25-.02-.38.11-.5.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.38-.78-1.89-.21-.5-.42-.43-.57-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.13.17 1.76 2.69 4.27 3.77.6.26 1.07.42 1.43.54.6.19 1.15.16 1.58.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.3 6.94 1.97 1.97 0 0 0 5.25 3ZM20 12.68c0-3.46-1.85-5.07-4.32-5.07-1.99 0-2.88 1.1-3.38 1.87V8.5H8.94V20h3.36v-6.4c0-1.69.32-3.33 2.41-3.33 2.06 0 2.09 1.93 2.09 3.44V20H20v-7.32Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.08l-4.77-6.88L6.1 22H3l7.26-8.3L1 2h6.23l4.31 6.22L18.9 2Zm-1.07 18h1.69L6.31 3.89H4.5L17.83 20Z" />
    </svg>
  );
}
