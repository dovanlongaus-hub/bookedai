import type { ReactNode } from 'react';

import { SectionCard } from './SectionCard';

type FeatureCardProps = {
  title: string;
  body: string;
  index?: number;
  badge?: string;
  className?: string;
  eyebrow?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  tone?: 'base' | 'subtle' | 'dark' | 'ghost';
};

export function FeatureCard({
  title,
  body,
  index,
  badge,
  className,
  eyebrow,
  icon,
  footer,
  tone = 'subtle',
}: FeatureCardProps) {
  return (
    <SectionCard
      as="article"
      tone={tone}
      className={['flex h-full flex-col p-6 lg:p-7', className].filter(Boolean).join(' ')}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        {typeof index === 'number' ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-semibold text-white">
            {String(index + 1).padStart(2, '0')}
          </div>
        ) : icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-semibold text-white">
            {icon}
          </div>
        ) : (
          <div />
        )}
        {badge ? (
          <div className="rounded-full bg-black/6 px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
            {badge}
          </div>
        ) : null}
      </div>
      {eyebrow ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-[#1d1d1f]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-black/66">{body}</p>
      {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
    </SectionCard>
  );
}
