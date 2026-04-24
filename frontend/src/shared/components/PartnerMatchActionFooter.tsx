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
      {model.links.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {model.links.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              onClick={onActionClick}
              className={`inline-flex items-center rounded-full px-3.5 py-2 text-[11px] font-semibold transition ${
                selected
                  ? link.tone === 'accent'
                    ? 'border border-[#cfe1ff] bg-[#1a73e8] text-white hover:bg-[#1558b0]'
                    : 'border border-[#cfe1ff] bg-white text-[#1a73e8] hover:bg-[#f8fbff]'
                  : link.tone === 'accent'
                    ? 'border border-[#cce0ff] bg-[#e8f0fe] text-[#1a73e8] hover:bg-[#dce9ff]'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <div
        className={`mt-3 rounded-[1rem] border px-3 py-3 ${
          selected ? 'border-[#d7e7ff] bg-white shadow-[0_10px_24px_rgba(26,115,232,0.08)]' : 'border-[#eef2f7] bg-[#fbfcfe]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'text-[#4d7fca]' : 'text-slate-500'
              }`}
            >
              {model.title}
            </div>
            <div
              className={`mt-1 text-[11px] leading-5 font-medium ${
                selected ? 'text-slate-700' : 'text-slate-700'
              }`}
            >
              {model.detail}
            </div>
            {model.contactPhone ? (
              <div className="mt-1 text-[11px] text-slate-500">
                Call: {model.contactPhone}
              </div>
            ) : null}
          </div>
          <div
            className={`rounded-full px-3 py-2 text-[11px] font-semibold ${
              selected ? 'bg-[#1a73e8] text-white' : 'bg-slate-950 text-white shadow-sm'
            }`}
          >
            {model.statusLabel}
          </div>
        </div>
      </div>
    </>
  );
}
