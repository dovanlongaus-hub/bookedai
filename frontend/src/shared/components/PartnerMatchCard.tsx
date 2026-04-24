import type { PartnerMatchCardModel } from '../presenters/partnerMatch';

type PartnerMatchCardProps = {
  card: PartnerMatchCardModel;
  tone?: 'default' | 'selected';
  badge?: string | null;
  trailingLabel?: string | null;
  onClick?: () => void;
};

export function PartnerMatchCard({
  card,
  tone = 'default',
  badge = null,
  trailingLabel = null,
  onClick,
}: PartnerMatchCardProps) {
  const selected = tone === 'selected';
  const Container = onClick ? 'button' : 'article';

  return (
    <Container
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full rounded-[1.35rem] border p-4 text-left',
        selected
          ? 'border-[#d2e3fc] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] text-slate-950 shadow-[0_18px_42px_rgba(26,115,232,0.10)]'
          : 'border-[#e2e8f0] bg-white text-slate-950 shadow-[0_8px_24px_rgba(60,64,67,0.05)]',
        onClick ? 'transition hover:border-[#c6dafc] hover:shadow-[0_14px_32px_rgba(60,64,67,0.09)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3">
        {card.imageUrl ? (
          <div
            className="relative mt-1 shrink-0 overflow-hidden rounded-[1rem] border border-black/8 bg-slate-100"
            style={{ width: 72, height: 72 }}
          >
            <img
              src={card.imageUrl}
              alt={card.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className={`mt-1 flex shrink-0 items-center justify-center rounded-xl border text-[10px] font-bold uppercase tracking-widest ${
              selected ? 'border-[#d7e7ff] bg-white text-[#7aa8eb]' : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
            style={{ width: 72, height: 72 }}
          >
            {card.imageLabel ?? card.providerLabel?.slice(0, 2) ?? 'AI'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="truncate font-medium text-[#202124]">{card.providerLabel}</span>
            {card.sourceLabel ? <span className="truncate text-slate-400">• {card.sourceLabel}</span> : null}
            {trailingLabel ? (
              <span className="rounded-full border border-[#e5e9f0] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {trailingLabel}
              </span>
            ) : null}
            {badge ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${selected ? 'bg-[#1a73e8] text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                {badge}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className={`line-clamp-2 text-[20px] font-medium leading-6 ${selected ? 'text-[#174ea6]' : 'text-[#1a0dab]'}`}>
                {card.title}
              </div>
            </div>
            {card.bookingStatusLabel ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  selected ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {card.bookingStatusLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[12px] text-[#188038]">
            {card.locationLabel}
          </div>

          {card.explanation ? (
            <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-[#4d5156]">
              {card.explanation}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            {card.metricLine ? (
              <span className={`rounded-full px-2.5 py-1 font-semibold ${selected ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#3c4043]'}`}>
                {card.metricLine}
              </span>
            ) : null}
            {card.contactPhone ? (
              <span className="rounded-full border border-[#e5e9f0] bg-white px-2.5 py-1 font-medium text-[#5f6368]">
                {card.contactPhone}
              </span>
            ) : null}
            <span className="font-medium text-emerald-700">{card.nextStepLabel}</span>
          </div>

          {card.confidenceNotes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.confidenceNotes.slice(0, 3).map((note) => (
                <span
                  key={note}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    selected ? 'bg-white text-slate-600 ring-1 ring-[#dbe9ff]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {note}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
