import { type HTMLAttributes, type ReactNode } from 'react';

import { cx } from './utils';

export const brandColorTokens = {
  bg: '#0B1020',
  bgSoft: '#121A2B',
  surface: '#182235',
  text: '#F8FAFC',
  muted: '#94A3B8',
  blue: '#4F8CFF',
  green: '#22C55E',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  red: '#EF4444',
  border: 'rgba(255,255,255,0.08)',
} as const;

const BRAND_ASSET_VERSION = '20260418-brand-system';
const BRAND_LOGO_LIGHT = `/branding/bookedai-logo-light.png?v=${BRAND_ASSET_VERSION}`;
const BRAND_LOGO_DARK = `/branding/bookedai-logo-dark-badge.png?v=${BRAND_ASSET_VERSION}`;
const BRAND_LOGO_BLACK = `/branding/bookedai-logo-black.png?v=${BRAND_ASSET_VERSION}`;
const BRAND_ICON = `/branding/bookedai-app-icon-1024.png?v=${BRAND_ASSET_VERSION}`;

export const brandLogoSources = {
  dark: BRAND_LOGO_DARK,
  light: BRAND_LOGO_LIGHT,
  monoWhite: BRAND_LOGO_DARK,
  monoBlack: BRAND_LOGO_BLACK,
  white: BRAND_LOGO_DARK,
  black: BRAND_LOGO_BLACK,
  transparent: BRAND_LOGO_LIGHT,
  icon: BRAND_ICON,
} as const;

export type BrandLogoVariant = 'dark' | 'light' | 'monoWhite' | 'monoBlack';

type LogoProps = {
  variant?: BrandLogoVariant | 'white' | 'black' | 'icon' | 'transparent';
  className?: string;
  showTagline?: boolean;
};

function normalizeVariant(variant: LogoProps['variant']): BrandLogoVariant | 'icon' | 'transparent' {
  if (variant === 'white') {
    return 'monoWhite';
  }

  if (variant === 'black') {
    return 'monoBlack';
  }

  return variant ?? 'dark';
}

export function Logo({
  variant = 'dark',
  className = '',
  showTagline = false,
}: LogoProps) {
  const normalizedVariant = normalizeVariant(variant);

  if (normalizedVariant === 'icon') {
    return (
      <div className={cx('inline-flex flex-col', className)}>
        <img
          src={brandLogoSources.icon}
          alt="BookedAI.au logo"
          className="h-auto w-[3.875rem]"
        />
        {showTagline ? (
          <span className="mt-1 text-xs uppercase tracking-[0.24em] text-brand-muted">
            The AI Revenue Engine
          </span>
        ) : null}
      </div>
    );
  }

  if (normalizedVariant === 'transparent') {
    return (
      <div className={cx('inline-flex flex-col', className)}>
        <img
          src={brandLogoSources.transparent}
          alt="BookedAI.au logo"
          className="h-auto w-[15rem]"
        />
        {showTagline ? (
          <span className="mt-1 text-xs uppercase tracking-[0.24em] text-brand-muted">
            The AI Revenue Engine
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cx('inline-flex flex-col', className)}>
      <img
        src={brandLogoSources[normalizedVariant]}
        alt="BookedAI.au logo"
        className="h-auto w-full max-w-[15rem]"
      />

      {showTagline ? (
        <span className="mt-1 text-xs uppercase tracking-[0.24em] text-brand-muted">
          The AI Revenue Engine
        </span>
      ) : null}
    </div>
  );
}

export function LogoIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <img
      src={brandLogoSources.icon}
      alt="BookedAI.au logo icon"
      className={cx(className)}
    />
  );
}

export function Eyebrow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cx('bookedai-brand-eyebrow', className)} {...props}>
      {children}
    </div>
  );
}

export function GradientText({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span className={cx('bookedai-gradient-text', className)} {...props}>
      {children}
    </span>
  );
}

export function BrandHeading({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2 className={cx('bookedai-brand-heading', className)} {...props}>
      {children}
    </h2>
  );
}
