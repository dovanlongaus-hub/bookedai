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
        'rounded-2xl border p-3.5 text-left w-full',
        selected
          ? 'border-emerald-300 bg-slate-950 text-white'
          : 'border-slate-200 bg-white text-slate-950',
        onClick ? 'transition hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top row: badges */}
      {(badge || trailingLabel) ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {badge ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'bg-white text-slate-950' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {badge}
            </span>
          ) : null}
          {trailingLabel ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trailingLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Main row: content + thumbnail */}
      <div className="flex items-start gap-3">
        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[14px] font-semibold leading-5">{card.title}</div>
              <div
                className={`mt-0.5 text-[11px] font-medium uppercase tracking-[0.13em] ${
                  selected ? 'text-white/65' : 'text-slate-500'
                }`}
              >
                {card.providerLabel}
              </div>
            </div>
            {card.bookingUrl ? (
              <span
                className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  selected ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Book online
              </span>
            ) : null}
          </div>

          {/* Key decision metrics: price + duration */}
          {card.metricLine ? (
            <div
              className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                selected ? 'bg-white/12 text-white' : 'bg-slate-950 text-white'
              }`}
            >
              {card.metricLine}
            </div>
          ) : null}

          {/* Location */}
          <div className={`mt-1.5 flex items-center gap-1 text-[12px] ${selected ? 'text-white/75' : 'text-slate-600'}`}>
            <svg className="shrink-0 opacity-60" width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 1.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 6a6 6 0 1110.89 3.477l3.817 3.816a.75.75 0 01-1.06 1.061l-3.817-3.816A6 6 0 012 6z" clipRule="evenodd" />
              <path d="M8 2a4 4 0 100 8A4 4 0 008 2z" />
            </svg>
            <svg className="shrink-0 opacity-60" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="line-clamp-1">{card.locationLabel}</span>
          </div>

          {/* Next step */}
          <div className={`mt-1 text-[11px] font-medium ${selected ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {card.nextStepLabel}
          </div>
        </div>

        {/* Compact thumbnail */}
        {card.imageUrl ? (
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-black/8 bg-slate-100" style={{ width: 68, height: 68 }}>
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
              selected ? 'border-white/10 bg-white/8 text-white/40' : 'border-slate-100 bg-slate-50 text-slate-300'
            }`}
            style={{ width: 68, height: 68 }}
          >
            {card.imageLabel ?? card.providerLabel?.slice(0, 2) ?? 'AI'}
          </div>
        )}
      </div>

      {/* Explanation (collapsible, brief) */}
      {card.explanation ? (
        <p className={`mt-2 line-clamp-2 text-[12px] leading-5 ${selected ? 'text-white/75' : 'text-slate-500'}`}>
          {card.explanation}
        </p>
      ) : null}

      {/* Confidence notes: decision-aid badges */}
      {card.confidenceNotes.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {card.confidenceNotes.slice(0, 3).map((note) => (
            <span
              key={note}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                selected ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600'
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
