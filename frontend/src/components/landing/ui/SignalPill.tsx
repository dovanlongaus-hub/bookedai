import type { ReactNode } from 'react';

type SignalPillProps = {
  children: ReactNode;
  className?: string;
  variant?: 'chip' | 'brand' | 'inverse' | 'soft';
};

const variantClasses: Record<NonNullable<SignalPillProps['variant']>, string> = {
  chip: 'template-chip',
  brand: 'booked-pill',
  inverse: 'rounded-full border border-white/12 bg-white/8 text-white/84',
  soft: 'rounded-full border border-black/6 bg-white/88 text-[#1d1d1f] shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
};

export function SignalPill({
  children,
  className,
  variant = 'chip',
}: SignalPillProps) {
  const classes = [variantClasses[variant], className].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
