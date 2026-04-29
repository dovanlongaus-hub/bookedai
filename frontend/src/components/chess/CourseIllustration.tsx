import type { JSX } from 'react';

/*
 * Course-specific scene illustrations for the pricing tier cards.
 * Hand-coded SVG, ~180×120 viewBox, navy + gold + ivory palette.
 *
 * Variants:
 *   beginner-group     — multiple students + Lichess board + Zoom labels
 *   private-coaching   — single student + WGM coach 1-on-1 video call
 *   tournament-prep    — board + chess clock + small trophy
 *   elite-plus         — laptop + recording dot + WhatsApp + lightning
 */

export type CourseIllustrationVariant =
  | 'beginner-group'
  | 'private-coaching'
  | 'tournament-prep'
  | 'elite-plus';

interface CourseIllustrationProps {
  variant: CourseIllustrationVariant;
  className?: string;
  title?: string;
}

export function CourseIllustration({
  variant,
  className,
  title,
}: CourseIllustrationProps): JSX.Element {
  const wrapperClass = ['chess-course-illustration', className].filter(Boolean).join(' ');
  const titleId = `chess-course-${variant}-title`;
  const accessibleTitle = title ?? defaultTitle(variant);
  return (
    <svg
      className={wrapperClass}
      viewBox="0 0 180 120"
      role="img"
      aria-labelledby={titleId}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={titleId}>{accessibleTitle}</title>
      <defs>
        <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chess-navy-soft)" />
          <stop offset="100%" stopColor="var(--chess-navy-deep)" />
        </linearGradient>
      </defs>

      {/* Navy backdrop */}
      <rect width="180" height="120" rx="12" fill={`url(#bg-${variant})`} />

      {/* Subtle grid pattern */}
      <g opacity="0.08" fill="var(--chess-gold)">
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 9 }).map((__, col) => {
            if ((row + col) % 2 !== 0) return null;
            return (
              <rect
                key={`grid-${variant}-${row}-${col}`}
                x={col * 20}
                y={row * 20}
                width="20"
                height="20"
              />
            );
          }),
        )}
      </g>

      {variant === 'beginner-group' ? <BeginnerGroup /> : null}
      {variant === 'private-coaching' ? <PrivateCoaching /> : null}
      {variant === 'tournament-prep' ? <TournamentPrep /> : null}
      {variant === 'elite-plus' ? <ElitePlus /> : null}
    </svg>
  );
}

function defaultTitle(variant: CourseIllustrationVariant): string {
  switch (variant) {
    case 'beginner-group':
      return 'Beginner online group class with Lichess board and Zoom video';
    case 'private-coaching':
      return 'Private 1-on-1 coaching with WGM Mai Hưng over video';
    case 'tournament-prep':
      return 'Tournament preparation — chessboard, clock and trophy';
    case 'elite-plus':
      return 'Elite Plus — recorded sessions, WhatsApp access, priority scheduling';
  }
}

function BeginnerGroup(): JSX.Element {
  return (
    <g>
      {/* Mini chess board centred lower */}
      <g transform="translate(58 60)">
        <rect width="64" height="42" rx="3" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1" />
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 8 }).map((__, col) => {
            if ((row + col) % 2 !== 1) return null;
            return (
              <rect
                key={`bg-cell-${row}-${col}`}
                x={col * 8}
                y={row * 7}
                width="8"
                height="7"
                fill="var(--chess-navy)"
                opacity="0.85"
              />
            );
          }),
        )}
      </g>

      {/* Student avatar dots — five small circles around the board representing the cohort */}
      <g>
        {[
          { cx: 22, cy: 36 },
          { cx: 40, cy: 22 },
          { cx: 90, cy: 16 },
          { cx: 140, cy: 22 },
          { cx: 158, cy: 36 },
        ].map((p, idx) => (
          <g key={`avatar-${idx}`}>
            <circle cx={p.cx} cy={p.cy} r="9" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1.2" />
            <circle cx={p.cx} cy={p.cy - 2} r="3" fill="var(--chess-navy-deep)" />
            <path
              d={`M ${p.cx - 5} ${p.cy + 5} Q ${p.cx} ${p.cy + 1} ${p.cx + 5} ${p.cy + 5}`}
              fill="var(--chess-navy-deep)"
            />
          </g>
        ))}
      </g>

      {/* Label chip: Lichess + Zoom */}
      <g transform="translate(8 100)">
        <rect width="68" height="14" rx="7" fill="var(--chess-gold)" />
        <text
          x="34"
          y="10"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="7"
          fontWeight="700"
          fill="var(--chess-navy-deep)"
          letterSpacing="0.5"
        >
          LICHESS + ZOOM
        </text>
      </g>

      {/* Cohort indicator: small "× 8" badge */}
      <g transform="translate(150 100)">
        <rect width="22" height="14" rx="7" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1" />
        <text
          x="11"
          y="10"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="8"
          fontWeight="700"
          fill="var(--chess-navy-deep)"
        >
          ×8
        </text>
      </g>
    </g>
  );
}

function PrivateCoaching(): JSX.Element {
  return (
    <g>
      {/* Two video tiles side-by-side */}
      <g>
        {/* Coach tile (left) */}
        <rect x="14" y="16" width="68" height="50" rx="6" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1.2" />
        <circle cx="48" cy="36" r="10" fill="var(--chess-gold)" />
        <path d="M48 28 Q53 32 53 38 Q48 43 43 38 Q43 32 48 28 Z" fill="var(--chess-navy-deep)" />
        <path d="M30 56 Q48 46 66 56 L66 60 L30 60 Z" fill="var(--chess-navy)" />
        <text x="48" y="74" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="700" fill="var(--chess-gold)" letterSpacing="0.4">
          WGM MAI HƯNG
        </text>

        {/* Student tile (right) */}
        <rect x="98" y="16" width="68" height="50" rx="6" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1.2" />
        <circle cx="132" cy="36" r="9" fill="var(--chess-navy-deep)" />
        <path d="M132 30 Q136 34 136 38 Q132 42 128 38 Q128 34 132 30 Z" fill="var(--chess-paper)" />
        <path d="M116 56 Q132 47 148 56 L148 60 L116 60 Z" fill="var(--chess-navy)" />
        <text x="132" y="74" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6" fontWeight="700" fill="var(--chess-gold-light)" letterSpacing="0.4">
          STUDENT
        </text>
      </g>

      {/* Mini chessboard at bottom */}
      <g transform="translate(56 86)">
        <rect width="68" height="22" rx="2" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1" />
        {Array.from({ length: 3 }).map((_, row) =>
          Array.from({ length: 8 }).map((__, col) => {
            if ((row + col) % 2 !== 1) return null;
            return (
              <rect
                key={`pc-cell-${row}-${col}`}
                x={col * 8.5}
                y={row * 7.3}
                width="8.5"
                height="7.3"
                fill="var(--chess-navy)"
                opacity="0.85"
              />
            );
          }),
        )}
      </g>

      {/* "1-on-1" pill */}
      <g transform="translate(76 106)">
        <rect width="28" height="11" rx="5.5" fill="var(--chess-gold)" />
        <text x="14" y="8" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="var(--chess-navy-deep)" letterSpacing="0.3">
          1-ON-1
        </text>
      </g>
    </g>
  );
}

function TournamentPrep(): JSX.Element {
  return (
    <g>
      {/* Mid-game chessboard */}
      <g transform="translate(14 22)">
        <rect width="92" height="80" rx="3" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1" />
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((__, col) => (
            <rect
              key={`tp-cell-${row}-${col}`}
              x={col * 11.5}
              y={row * 10}
              width="11.5"
              height="10"
              fill={(row + col) % 2 === 0 ? 'var(--chess-paper)' : 'var(--chess-navy)'}
              opacity={(row + col) % 2 === 0 ? 1 : 0.85}
            />
          )),
        )}
        {/* A few pieces — gold dots indicating mid-game position */}
        <g fill="var(--chess-gold-deep)">
          <circle cx="11" cy="15" r="3" />
          <circle cx="34" cy="25" r="3" />
          <circle cx="57" cy="55" r="3.4" />
          <circle cx="80" cy="65" r="3" />
        </g>
        <g fill="var(--chess-navy-deep)">
          <circle cx="22" cy="65" r="3" />
          <circle cx="46" cy="45" r="3.4" />
          <circle cx="68" cy="35" r="3" />
        </g>
      </g>

      {/* Chess clock — top right */}
      <g transform="translate(116 22)">
        <rect width="48" height="28" rx="3" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1.2" />
        <rect x="2" y="4" width="20" height="20" rx="2" fill="var(--chess-navy)" />
        <rect x="26" y="4" width="20" height="20" rx="2" fill="var(--chess-gold)" />
        <text x="12" y="17" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="var(--chess-gold-light)">
          15:00
        </text>
        <text x="36" y="17" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="var(--chess-navy-deep)">
          14:30
        </text>
      </g>

      {/* Trophy — bottom right */}
      <g transform="translate(126 60)">
        <path d="M6 4h16v3h3v4a4 4 0 0 1-3.2 3.9C20.4 17 18.5 18.6 16 18.6s-4.4-1.6-5.8-3.7A4 4 0 0 1 7 11V7h-1V4z" fill="var(--chess-gold)" />
        <rect x="11" y="20" width="10" height="3" fill="var(--chess-gold-deep)" />
        <rect x="8" y="23" width="16" height="4" rx="1" fill="var(--chess-gold)" />
      </g>
    </g>
  );
}

function ElitePlus(): JSX.Element {
  return (
    <g>
      {/* Laptop */}
      <g transform="translate(30 22)">
        <rect width="100" height="60" rx="3" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1.4" />
        <rect x="6" y="6" width="88" height="48" rx="1.5" fill="var(--chess-navy)" />
        {/* Mini chess inside laptop */}
        <g transform="translate(20 14)">
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 6 }).map((__, col) => (
              <rect
                key={`el-cell-${row}-${col}`}
                x={col * 10}
                y={row * 8}
                width="10"
                height="8"
                fill={(row + col) % 2 === 0 ? 'var(--chess-paper)' : 'var(--chess-navy-soft)'}
                opacity="0.95"
              />
            )),
          )}
        </g>
        {/* Laptop base */}
        <path d="M-4 60 L104 60 L100 66 L0 66 Z" fill="var(--chess-gold-deep)" />
      </g>

      {/* Recording dot + label (top-left) */}
      <g transform="translate(10 14)">
        <circle cx="6" cy="6" r="4" fill="#d54040" />
        <circle cx="6" cy="6" r="4" fill="#d54040" opacity="0.4">
          <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="14" y="9" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="700" fill="var(--chess-gold-light)" letterSpacing="0.6">
          REC
        </text>
      </g>

      {/* WhatsApp speech bubble (top-right) */}
      <g transform="translate(132 12)">
        <path
          d="M16 4
             a14 14 0 1 1 -8 25.6
             L4 30
             L5.5 24.3
             A14 14 0 0 1 16 4
             Z"
          fill="var(--chess-gold)"
          opacity="0.95"
        />
        <text x="16" y="20" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="var(--chess-navy-deep)">
          ✓
        </text>
      </g>

      {/* Lightning bolt — priority */}
      <g transform="translate(8 86)">
        <path d="M10 0 L2 14 L8 14 L4 26 L18 10 L11 10 Z" fill="var(--chess-gold-light)" stroke="var(--chess-gold-deep)" strokeWidth="0.6" strokeLinejoin="round" />
        <text x="24" y="18" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="var(--chess-gold-light)" letterSpacing="0.4">
          PRIORITY
        </text>
      </g>

      {/* "Recorded" pill bottom right */}
      <g transform="translate(122 100)">
        <rect width="50" height="12" rx="6" fill="var(--chess-paper)" stroke="var(--chess-gold)" strokeWidth="1" />
        <text x="25" y="9" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6.5" fontWeight="700" fill="var(--chess-navy-deep)" letterSpacing="0.4">
          RECORDED
        </text>
      </g>
    </g>
  );
}
