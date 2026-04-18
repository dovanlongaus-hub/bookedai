import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from './utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cx('bookedai-button-primary', className)} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cx('bookedai-button-secondary', className)} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cx('bookedai-button-ghost', className)} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ className, children, ...props }: ButtonProps) {
  return (
    <button className={cx('bookedai-icon-button', className)} {...props}>
      {children}
    </button>
  );
}

export function CTAButtonGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}
