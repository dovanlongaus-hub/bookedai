import type { JSX } from 'react';

/*
 * Mai Hưng Chess Academy — self-designed brand mark.
 *
 * Two exports:
 *   <ChessLogoMark size={n} />     — square logomark (knight + crown + laurel)
 *   <ChessLogoLockup variant="..." /> — full lockup (mark + wordmark + tagline)
 *
 * Hand-coded SVG. Uses chess-tokens variables for navy/gold/ivory so the mark
 * inherits any palette tuning automatically. No external image deps.
 */

interface ChessLogoMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

export function ChessLogoMark({
  size = 56,
  className,
  title = 'Mai Hưng Chess Academy mark',
}: ChessLogoMarkProps): JSX.Element {
  const wrapperClass = ['chess-logo-mark', className].filter(Boolean).join(' ');
  return (
    <svg
      className={wrapperClass}
      viewBox="0 0 80 80"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="chess-logo-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="var(--chess-navy-soft)" />
          <stop offset="100%" stopColor="var(--chess-navy-deep)" />
        </radialGradient>
        <linearGradient id="chess-logo-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chess-gold-light)" />
          <stop offset="100%" stopColor="var(--chess-gold-deep)" />
        </linearGradient>
      </defs>

      {/* Outer navy disc with subtle gold edge */}
      <circle cx="40" cy="40" r="38" fill="url(#chess-logo-bg)" stroke="var(--chess-gold)" strokeWidth="1.4" />

      {/* Inner laurel wreath ring (two thin arcs + dotted hinge) */}
      <g
        fill="none"
        stroke="var(--chess-gold)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.85"
      >
        <path d="M14 40 Q14 18 40 14" />
        <path d="M66 40 Q66 18 40 14" />
        <path d="M14 40 Q14 62 40 66" />
        <path d="M66 40 Q66 62 40 66" />
      </g>

      {/* Decorative laurel leaves — small angled marks along the ring */}
      <g fill="var(--chess-gold)" opacity="0.85">
        <ellipse cx="22" cy="22" rx="2" ry="1" transform="rotate(-45 22 22)" />
        <ellipse cx="58" cy="22" rx="2" ry="1" transform="rotate(45 58 22)" />
        <ellipse cx="22" cy="58" rx="2" ry="1" transform="rotate(45 22 58)" />
        <ellipse cx="58" cy="58" rx="2" ry="1" transform="rotate(-45 58 58)" />
        <ellipse cx="14" cy="40" rx="2" ry="1" />
        <ellipse cx="66" cy="40" rx="2" ry="1" />
        <ellipse cx="40" cy="14" rx="1" ry="2" />
        <ellipse cx="40" cy="66" rx="1" ry="2" />
      </g>

      {/* Small crown above knight, between top of ring */}
      <g fill="url(#chess-logo-gold)" stroke="var(--chess-gold-deep)" strokeWidth="0.5" strokeLinejoin="round">
        <path d="M30 22 L34 18 L36 21 L40 16 L44 21 L46 18 L50 22 L48 26 L32 26 Z" />
        <circle cx="34" cy="18" r="0.9" />
        <circle cx="40" cy="16" r="1" />
        <circle cx="46" cy="18" r="0.9" />
      </g>

      {/* Stylized knight head silhouette — gold fill, navy outline */}
      <g
        fill="url(#chess-logo-gold)"
        stroke="var(--chess-navy-deep)"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Main knight head profile (mane + muzzle + cheek + neck) */}
        <path d="M30 60
                 L30 50
                 Q28 44 32 40
                 Q34 36 33 32
                 Q34 30 36 30
                 Q38 28 41 28
                 Q46 28 49 32
                 Q52 35 53 40
                 Q54 45 52 50
                 L52 60
                 Z" />
        {/* Mane crest behind ear */}
        <path d="M34 32
                 Q33 28 36 26
                 Q38 24 39 26
                 Q38 30 36 31 Z" />
      </g>

      {/* Knight eye (a single small navy dot for a confident silhouette) */}
      <circle cx="44" cy="38" r="0.9" fill="var(--chess-navy-deep)" />

      {/* Bridle accent — subtle gold strap along the muzzle */}
      <path
        d="M44 44 Q49 44 51 42"
        fill="none"
        stroke="var(--chess-navy-deep)"
        strokeWidth="0.6"
        opacity="0.6"
      />

      {/* Pedestal under the knight (squared base) */}
      <rect x="29" y="59" width="24" height="3" rx="0.6" fill="url(#chess-logo-gold)" stroke="var(--chess-navy-deep)" strokeWidth="0.5" />
    </svg>
  );
}

interface ChessLogoLockupProps {
  variant?: 'dark' | 'light';
  className?: string;
  size?: number;
}

/**
 * Brand lockup: ChessLogoMark + wordmark "Mai Hưng" (Playfair) + tagline
 * "Chess Academy" (Inter caps tracked). The colour scheme adapts to whether
 * the surrounding surface is dark (navy) or light (paper/ivory) via the
 * `variant` prop.
 */
export function ChessLogoLockup({
  variant = 'dark',
  className,
  size = 44,
}: ChessLogoLockupProps): JSX.Element {
  const wrapperClass = ['chess-logo-lockup', `chess-logo-lockup--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={wrapperClass} aria-hidden="false">
      <ChessLogoMark size={size} />
      <span className="chess-logo-lockup__text">
        <span className="chess-logo-lockup__wordmark">Mai Hưng</span>
        <span className="chess-logo-lockup__tagline">Chess Academy</span>
      </span>
    </span>
  );
}
