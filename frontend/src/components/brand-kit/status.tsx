import type { ReactNode } from 'react';

import { GlassCard } from './foundations';
import { cx } from './utils';

export function StatusBadge({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx(`bookedai-status-badge bookedai-status-badge--${tone}`, className)}>
      {children}
    </span>
  );
}

export function ChannelBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('bookedai-channel-badge', className)}>{children}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bookedai-progress-track">
      <div className="bookedai-progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <GlassCard>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bookedai-text-secondary)]">{label}</div>
      <div className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[var(--bookedai-text-primary)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--bookedai-text-secondary)]">{detail}</div>
    </GlassCard>
  );
}

export function RevenueCard(props: { value: string; detail: string }) {
  return <StatCard label="Revenue generated" value={props.value} detail={props.detail} />;
}

export function MissedRevenueCard(props: { value: string; detail: string }) {
  return <StatCard label="Missed revenue" value={props.value} detail={props.detail} />;
}

export function ConversionCard(props: { value: string; detail: string }) {
  return <StatCard label="Conversion rate" value={props.value} detail={props.detail} />;
}

export function KPIGrid({ children }: { children: ReactNode }) {
  return <div className="bookedai-kpi-grid">{children}</div>;
}
