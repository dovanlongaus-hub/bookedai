import React, { useCallback, useRef } from 'react';

export interface ProgramCardProgram {
  service_id: string;
  slug?: string;
  name: string;
  category?: string;
  summary?: string | null;
  duration_minutes?: number | null;
  amount_aud?: number | null;
  display_price?: string | null;
  image_url?: string | null;
  tags?: string[];
  featured?: boolean;
}

export interface ProgramCardProps {
  program: ProgramCardProgram;
  /** Called when user taps the card or its CTA button */
  onSelect: (program: ProgramCardProgram) => void;
  /** Optional locale to localize price/duration formatting */
  locale?: 'en' | 'vi';
  /** When true, render a more compact variant for chat-message embedding */
  compact?: boolean;
  testId?: string;
}

const COPY = {
  en: { featured: 'Featured', custom: 'Custom', minutes: 'min', book: 'Book this' },
  vi: { featured: 'Nổi bật', custom: 'Tuỳ chỉnh', minutes: 'phút', book: 'Đặt khoá này' },
} as const;

const FALLBACK_IMG = '/aimentor/programs/intro-to-ai.svg';

const ProgramCardImpl: React.FC<ProgramCardProps> = ({
  program,
  onSelect,
  locale = 'en',
  compact = false,
  testId,
}) => {
  const copy = COPY[locale];
  const fallbackTriedRef = useRef(false);
  const slugOrId = program.slug || program.service_id;
  const initialSrc = program.image_url || `/aimentor/programs/${slugOrId}.svg`;

  const handleSelect = useCallback(() => onSelect(program), [onSelect, program]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(program);
      }
    },
    [onSelect, program],
  );

  const handleImgError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    if (fallbackTriedRef.current) return;
    fallbackTriedRef.current = true;
    event.currentTarget.src = FALLBACK_IMG;
  }, []);

  const priceLabel = program.display_price
    ? program.display_price
    : program.amount_aud == null
      ? copy.custom
      : `$${program.amount_aud} AUD`;
  const durationLabel =
    program.duration_minutes != null ? `${program.duration_minutes} ${copy.minutes}` : null;

  const mediaStyle: React.CSSProperties = {
    aspectRatio: compact ? '16 / 9' : '16 / 10',
    width: '100%',
    objectFit: 'cover',
    display: 'block',
  };
  const bodyStyle: React.CSSProperties = { padding: compact ? '10px 12px' : '14px 16px' };

  return (
    <article
      className="aim-program-card"
      data-featured={program.featured ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <div style={{ position: 'relative' }}>
        <img
          className="aim-program-card__media"
          src={initialSrc}
          alt={program.name}
          loading="lazy"
          onError={handleImgError}
          style={mediaStyle}
        />
        {program.featured ? (
          <span
            className="aim-pill"
            style={{ position: 'absolute', top: 8, left: 8, background: 'var(--aim-amber)', color: 'var(--aim-ink)', fontSize: 11 }}
          >
            {copy.featured}
          </span>
        ) : null}
      </div>
      <div className="aim-program-card__body" style={bodyStyle}>
        <h3 style={{ margin: '0 0 4px', fontSize: compact ? 14 : 16, fontWeight: 600 }}>{program.name}</h3>
        {!compact && program.summary ? (
          <p
            style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--aim-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {program.summary}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--aim-muted)', marginBottom: 10 }}>
          {durationLabel ? <span>{durationLabel}</span> : null}
          <span>{priceLabel}</span>
        </div>
        <button
          type="button"
          className="aim-btn aim-btn-sm aim-btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(program);
          }}
        >
          {copy.book}
        </button>
      </div>
    </article>
  );
};

export const ProgramCard = React.memo(ProgramCardImpl);
