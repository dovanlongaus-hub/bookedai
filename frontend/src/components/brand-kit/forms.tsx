import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { GlassCard, Stack } from './foundations';
import { PrimaryButton } from './buttons';
import { cx } from './utils';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('bookedai-brand-input', props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx('bookedai-brand-textarea', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx('bookedai-brand-select', props.className)} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx('flex items-start gap-3 text-sm text-[var(--bookedai-text-secondary)]', className)}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Toggle({
  checked,
  className,
  children,
}: {
  checked: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx('inline-flex items-center gap-3', className)}>
      <span
        className={cx(
          'bookedai-brand-toggle relative inline-flex h-7 w-12 rounded-full border border-white/10 transition',
          checked ? 'bg-[var(--bookedai-primary-blue)]' : 'bg-white/8',
        )}
      >
        <span
          className={cx(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
      {children ? <span className="text-sm text-[var(--bookedai-text-secondary)]">{children}</span> : null}
    </div>
  );
}

export function DemoBookingForm() {
  return (
    <GlassCard className="max-w-2xl">
      <Stack>
        <Input placeholder="Your name" />
        <Input type="email" placeholder="Work email" />
        <Input placeholder="Business name" />
        <Textarea rows={4} placeholder="Tell us about your booking flow, missed calls, and follow-up gaps." />
        <PrimaryButton type="button">Schedule My Demo</PrimaryButton>
      </Stack>
    </GlassCard>
  );
}

export function EmailCaptureForm() {
  return (
    <GlassCard className="max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input type="email" placeholder="Enter your work email" className="sm:flex-1" />
        <PrimaryButton type="button">Get Revenue Demo</PrimaryButton>
      </div>
    </GlassCard>
  );
}
