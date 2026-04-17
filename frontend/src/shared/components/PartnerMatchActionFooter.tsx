import type { MouseEvent } from 'react';

import type { PartnerMatchActionFooterModel } from '../presenters/partnerMatch';

type PartnerMatchActionFooterProps = {
  model: PartnerMatchActionFooterModel;
  tone?: 'default' | 'selected';
  onActionClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function PartnerMatchActionFooter({
  model,
  tone = 'default',
  onActionClick,
}: PartnerMatchActionFooterProps) {
  const selected = tone === 'selected';

  return (
    <>
      {model.links.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {model.links.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              onClick={onActionClick}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                selected
                  ? 'border border-white/20 bg-white/10 text-white'
                  : link.tone === 'accent'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <div
        className={`mt-3 rounded-[1.1rem] px-3 py-2.5 ${
          selected ? 'bg-white/10' : 'bg-slate-50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'text-white/60' : 'text-slate-500'
              }`}
            >
              {model.title}
            </div>
            <div
              className={`mt-1 text-[11px] font-medium ${
                selected ? 'text-white' : 'text-slate-700'
              }`}
            >
              {model.detail}
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-2 text-[11px] font-semibold ${
              selected ? 'bg-white text-slate-950' : 'bg-slate-950 text-white shadow-sm'
            }`}
          >
            {model.statusLabel}
          </div>
        </div>
      </div>
    </>
  );
}
