import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from './utils';

type BaseProps = {
  className?: string;
  children: ReactNode;
};

export function Container({ className, children }: BaseProps) {
  return <div className={cx('bookedai-brand-container', className)}>{children}</div>;
}

export function Section({ className, children }: BaseProps) {
  return <section className={cx('bookedai-brand-section', className)}>{children}</section>;
}

export function Grid({
  className,
  children,
  ...props
}: BaseProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('grid gap-6', className)} {...props}>
      {children}
    </div>
  );
}

export function Stack({
  className,
  children,
  ...props
}: BaseProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex flex-col gap-4', className)} {...props}>
      {children}
    </div>
  );
}

export function Surface({ className, children }: BaseProps) {
  return <div className={cx('bookedai-brand-surface p-6', className)}>{children}</div>;
}

export function GlassCard({ className, children }: BaseProps) {
  return <div className={cx('bookedai-glass-card p-6', className)}>{children}</div>;
}

export function GradientBorderCard({ className, children }: BaseProps) {
  return <div className={cx('bookedai-gradient-border-card p-6', className)}>{children}</div>;
}
