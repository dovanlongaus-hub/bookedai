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

const BRAND_ASSET_VERSION = '20260421-branding-suite';
const BRAND_UPLOADED_LOGO = '/branding/optimized/bookedai-logo-uploaded-420.webp';
const BRAND_LOGO_LIGHT = BRAND_UPLOADED_LOGO;
const BRAND_LOGO_DARK = BRAND_UPLOADED_LOGO;
const BRAND_LOGO_BLACK = BRAND_UPLOADED_LOGO;
const BRAND_LOGO_TRANSPARENT = BRAND_UPLOADED_LOGO;
const BRAND_ICON = `/branding/bookedai-app-icon-1024.png?v=${BRAND_ASSET_VERSION}`;

export const brandLogoSources = {
  dark: BRAND_LOGO_DARK,
  light: BRAND_LOGO_LIGHT,
  monoWhite: BRAND_LOGO_DARK,
  monoBlack: BRAND_LOGO_BLACK,
  white: BRAND_LOGO_DARK,
  black: BRAND_LOGO_BLACK,
  transparent: BRAND_LOGO_TRANSPARENT,
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
  showTagline: _showTagline = false,
}: LogoProps) {
  const normalizedVariant = normalizeVariant(variant);
  const imageClassName =
    normalizedVariant === 'dark'
      ? 'rounded-[1rem] bg-white px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
      : '';

  if (normalizedVariant === 'icon') {
    return (
      <div className={cx('inline-flex flex-col', className)}>
        <img
          src={brandLogoSources.icon}
          alt="BookedAI.au logo"
          className="h-auto w-[3.875rem]"
        />
      </div>
    );
  }

  if (normalizedVariant === 'transparent') {
    return (
      <div className={cx('inline-flex flex-col', className)}>
        <img
          src={brandLogoSources.transparent}
          alt="BookedAI.au logo"
          className={cx('h-auto w-[15rem]', imageClassName)}
        />
      </div>
    );
  }

  return (
    <div className={cx('inline-flex flex-col', className)}>
      <img
        src={brandLogoSources[normalizedVariant]}
        alt="BookedAI.au logo"
        className={cx('h-auto w-full max-w-[15rem]', imageClassName)}
      />
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
