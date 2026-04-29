import type { JSX } from 'react';

type ChessPieceVariant = 'pawn' | 'king' | 'queen' | 'rook';

interface ChessPieceIllustrationProps {
  variant: ChessPieceVariant;
  className?: string;
}

/**
 * Hand-designed chess piece illustration shown on top of each pricing tier card.
 *
 * Each variant renders a 240x140 viewBox SVG with:
 *   - A subtle 8x4 gold-on-navy chess-board pattern as a decorative background
 *     (opacity ~0.15 so the foreground piece reads cleanly)
 *   - A gold silhouette of the named chess piece with a deeper navy outline
 *
 * Colours come from chess-tokens CSS variables so the illustration adapts if the
 * design system tunes the palette later.
 */
export function ChessPieceIllustration({
  variant,
  className,
}: ChessPieceIllustrationProps): JSX.Element {
  const wrapperClass = ['chess-piece-illustration', className].filter(Boolean).join(' ');
  const titleId = `chess-piece-${variant}-title`;
  return (
    <svg
      className={wrapperClass}
      viewBox="0 0 240 140"
      role="img"
      aria-labelledby={titleId}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{`Chess ${variant} illustration`}</title>
      <defs>
        <linearGradient id={`chess-bg-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--chess-navy)" />
          <stop offset="100%" stopColor="var(--chess-navy-deep)" />
        </linearGradient>
        <linearGradient id={`chess-piece-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chess-gold-light)" />
          <stop offset="100%" stopColor="var(--chess-gold)" />
        </linearGradient>
      </defs>

      {/* Navy gradient base */}
      <rect width="240" height="140" rx="14" fill={`url(#chess-bg-${variant})`} />

      {/* Decorative 8x4 chequerboard pattern at low opacity */}
      <g opacity="0.15">
        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 8 }).map((__, col) => {
            const isGold = (row + col) % 2 === 0;
            return (
              <rect
                key={`sq-${variant}-${row}-${col}`}
                x={col * 30}
                y={row * 35}
                width="30"
                height="35"
                fill={isGold ? 'var(--chess-gold)' : 'transparent'}
              />
            );
          }),
        )}
      </g>

      {/* Soft inner glow ring around the piece */}
      <ellipse cx="120" cy="115" rx="58" ry="6" fill="var(--chess-gold-deep)" opacity="0.35" />

      {/* Foreground piece — drawn centred at x=120 */}
      <g
        fill={`url(#chess-piece-${variant})`}
        stroke="var(--chess-navy-deep)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {variant === 'pawn' ? (
          <g>
            {/* Pawn head */}
            <circle cx="120" cy="42" r="13" />
            {/* Neck */}
            <rect x="115" y="52" width="10" height="6" rx="2" />
            {/* Body */}
            <path d="M104 64 Q120 58 136 64 L132 92 Q120 96 108 92 Z" />
            {/* Base */}
            <path d="M96 110 Q120 100 144 110 L148 120 L92 120 Z" />
          </g>
        ) : null}

        {variant === 'king' ? (
          <g>
            {/* Cross atop */}
            <rect x="117" y="20" width="6" height="14" rx="1" />
            <rect x="112" y="24" width="16" height="6" rx="1" />
            {/* Crown bowl */}
            <path d="M104 42 Q120 32 136 42 L138 56 L102 56 Z" />
            {/* Collar */}
            <rect x="98" y="56" width="44" height="6" rx="2" />
            {/* Body */}
            <path d="M96 64 Q120 58 144 64 L138 96 Q120 102 102 96 Z" />
            {/* Base */}
            <path d="M88 110 Q120 100 152 110 L156 120 L84 120 Z" />
          </g>
        ) : null}

        {variant === 'queen' ? (
          <g>
            {/* Five-point coronet */}
            <circle cx="106" cy="26" r="3.5" />
            <circle cx="113" cy="22" r="3.5" />
            <circle cx="120" cy="20" r="4" />
            <circle cx="127" cy="22" r="3.5" />
            <circle cx="134" cy="26" r="3.5" />
            <path d="M104 30 L116 44 L120 28 L124 44 L136 30 L138 50 L102 50 Z" />
            {/* Collar */}
            <rect x="98" y="50" width="44" height="6" rx="2" />
            {/* Body */}
            <path d="M96 58 Q120 52 144 58 L138 92 Q120 100 102 92 Z" />
            {/* Base */}
            <path d="M88 108 Q120 98 152 108 L156 120 L84 120 Z" />
          </g>
        ) : null}

        {variant === 'rook' ? (
          <g>
            {/* Crenellated top — three teeth + two gaps */}
            <path d="M96 22 H106 V32 H114 V22 H126 V32 H134 V22 H144 V42 H96 Z" />
            {/* Collar */}
            <rect x="100" y="42" width="40" height="6" rx="1" />
            {/* Body shaft */}
            <path d="M104 50 L136 50 L132 96 L108 96 Z" />
            {/* Base */}
            <path d="M92 110 L148 110 L152 120 L88 120 Z" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
