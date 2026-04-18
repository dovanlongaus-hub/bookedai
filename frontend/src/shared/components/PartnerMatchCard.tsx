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
          ? 'border-[#9ec5ff] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] text-slate-950 shadow-[0_20px_44px_rgba(26,115,232,0.12)] ring-1 ring-[#dbe9ff]'
          : 'border-[#e2e8f0] bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]',
        onClick ? 'transition hover:-translate-y-0.5 hover:border-[#c9dafd] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(badge || trailingLabel) ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {badge ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'bg-[#1a73e8] text-white' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {badge}
            </span>
          ) : null}
          {trailingLabel ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'bg-white text-[#1a73e8]' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trailingLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        {card.imageUrl ? (
          <div
            className="relative shrink-0 overflow-hidden rounded-[1rem] border border-black/8 bg-slate-100"
            style={{ width: 76, height: 76 }}
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
            className={`flex shrink-0 items-center justify-center rounded-xl border text-[10px] font-bold uppercase tracking-widest ${
              selected ? 'border-[#d7e7ff] bg-white text-[#7aa8eb]' : 'border-slate-100 bg-slate-50 text-slate-300'
            }`}
            style={{ width: 76, height: 76 }}
          >
            {card.imageLabel ?? card.providerLabel?.slice(0, 2) ?? 'AI'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[15px] font-semibold leading-5">{card.title}</div>
              <div
                className={`mt-0.5 text-[11px] font-medium uppercase tracking-[0.13em] ${
                  selected ? 'text-[#4d7fca]' : 'text-slate-500'
                }`}
              >
                {card.providerLabel}
              </div>
            </div>
            {card.bookingUrl ? (
              <span
                className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  selected ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Book online
              </span>
            ) : null}
          </div>

          {card.metricLine ? (
            <div
              className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                selected ? 'bg-[#1a73e8] text-white' : 'bg-slate-950 text-white'
              }`}
            >
              {card.metricLine}
            </div>
          ) : null}

          <div className={`mt-2 flex items-center gap-1 text-[12px] ${selected ? 'text-slate-600' : 'text-slate-600'}`}>
            <svg className="shrink-0 opacity-60" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="line-clamp-1">{card.locationLabel}</span>
          </div>

          <div className={`mt-1.5 text-[11px] font-medium ${selected ? 'text-emerald-700' : 'text-emerald-700'}`}>
            {card.nextStepLabel}
          </div>
        </div>
      </div>

      {card.explanation ? (
        <p className={`mt-3 line-clamp-2 text-[12px] leading-5 ${selected ? 'text-slate-600' : 'text-slate-500'}`}>
          {card.explanation}
        </p>
      ) : null}

      {card.confidenceNotes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.confidenceNotes.slice(0, 3).map((note) => (
            <span
              key={note}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                selected ? 'bg-white text-slate-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {note}
            </span>
          ))}
        </div>
      ) : null}
    </Container>
  );
}
