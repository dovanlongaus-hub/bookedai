import type { HTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';

import { cx } from './utils';

const logoSources = {
  dark: '/branding/bookedai-revenue-engine-dark.svg',
  light: '/branding/bookedai-revenue-engine-light.svg',
  white: '/branding/bookedai-revenue-engine-white.svg',
  black: '/branding/bookedai-revenue-engine-black.svg',
  transparent: '/branding/bookedai-revenue-engine-transparent.svg',
  icon: '/branding/bookedai-revenue-engine-icon.svg',
} as const;

export function Logo({
  variant = 'dark',
  className,
  alt = 'BookedAI.au logo',
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  variant?: keyof typeof logoSources;
}) {
  return <img src={logoSources[variant]} alt={alt} className={className} {...props} />;
}

export function LogoIcon({
  className,
  alt = 'BookedAI.au logo icon',
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  return <img src={logoSources.icon} alt={alt} className={className} {...props} />;
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
