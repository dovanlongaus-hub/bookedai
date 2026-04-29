import type { JSX, SVGProps } from 'react';

/*
 * Chess icon set — single-color glyphs sized for inline use (~20-24px).
 * All icons fill via `currentColor` so callers can color via CSS.
 *
 * Icons exported:
 *   IconKnight, IconKing, IconQueen, IconRook, IconPawn, IconBishop
 *   IconBoard, IconClock, IconTrophy, IconLichess, IconZoom, IconCertificate
 */

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  title?: string;
};

function svg(
  { size = 20, title, ...rest }: IconProps,
  inner: JSX.Element,
): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {inner}
    </svg>
  );
}

export function IconKnight(props: IconProps): JSX.Element {
  return svg(
    props,
    <path d="M14 3c-2.4 0-4.4 1.4-5.4 3.5L7 6c-.6 0-1 .4-1 1v2c0 .8.5 1.5 1.2 1.8L9 11l-1 2c-.6 1-.6 2.2.1 3l-2.1 4h12V12c0-1.5.5-3 1.4-4.2.4-.5.6-1.1.6-1.8 0-1.7-1.3-3-3-3h-3z" />,
  );
}

export function IconKing(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <path d="M11 2h2v3h3v2h-3v2.4c2.3.5 4 2.5 4 4.9 0 1.5-.7 2.9-1.9 3.7H8.9C7.7 17.2 7 15.8 7 14.3c0-2.4 1.7-4.4 4-4.9V7H8V5h3V2z" />
      <path d="M5 19h14v3H5z" />
    </g>,
  );
}

export function IconQueen(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <circle cx="5" cy="5" r="1.5" />
      <circle cx="9" cy="3.5" r="1.5" />
      <circle cx="12" cy="2.5" r="1.6" />
      <circle cx="15" cy="3.5" r="1.5" />
      <circle cx="19" cy="5" r="1.5" />
      <path d="M5 7l2 4 2-5 3 6 3-6 2 5 2-4 1 9c-1.5.8-3.5 1.3-6 1.3S5.5 16.8 4 16L5 7z" />
      <path d="M5 18h14v3H5z" />
    </g>,
  );
}

export function IconRook(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <path d="M5 3h3v2h2V3h4v2h2V3h3v5H5z" />
      <path d="M6 9h12l-1 9H7z" />
      <path d="M5 19h14v3H5z" />
    </g>,
  );
}

export function IconPawn(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <circle cx="12" cy="6" r="3" />
      <path d="M9 10h6l-1 8h-4z" />
      <path d="M6 19h12v3H6z" />
    </g>,
  );
}

export function IconBishop(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <path d="M12 2c1 1 1.6 1.8 1.6 2.6 0 .5-.2 1-.4 1.4 2.4 1.4 4 4 4 6.7 0 1.6-.6 3.2-1.8 4.3H8.6C7.4 16 6.8 14.4 6.8 12.7c0-2.7 1.6-5.3 4-6.7-.2-.4-.4-.9-.4-1.4 0-.8.6-1.6 1.6-2.6z" />
      <path d="M5 18h14v3H5z" />
      <path d="M10 9h4v1h-4z" />
    </g>,
  );
}

export function IconBoard(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <rect x="2" y="2" width="20" height="20" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g>
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 8 }).map((__, col) => {
            if ((row + col) % 2 !== 0) return null;
            return (
              <rect
                key={`b-${row}-${col}`}
                x={3 + col * 2.25}
                y={3 + row * 2.25}
                width="2.25"
                height="2.25"
              />
            );
          }),
        )}
      </g>
    </g>,
  );
}

export function IconClock(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <rect x="3" y="6" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6V4h-3v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10.2v2l1.4 1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="18" y="9" width="3" height="6" rx="0.6" />
      <circle cx="19.5" cy="6.5" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </g>,
  );
}

export function IconTrophy(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <path d="M7 3h10v2h3v3a4 4 0 0 1-3.2 3.9C16.4 14.1 14.5 16 12 16s-4.4-1.9-4.8-4.1A4 4 0 0 1 4 8V5h3V3zm0 4H5.5v1c0 1.1.7 2 1.7 2.4-.1-.4-.2-.8-.2-1.2V7zm10 0v2.2c0 .4-.1.8-.2 1.2 1-.4 1.7-1.3 1.7-2.4V7H17z" />
      <path d="M9 17h6v2h2v3H7v-3h2z" />
    </g>,
  );
}

export function IconLichess(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.12" />
      <path d="M9 6h2v9h6v2H9z" fill="currentColor" />
      <circle cx="16" cy="7" r="1.6" fill="currentColor" />
    </g>,
  );
}

export function IconZoom(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <rect x="2" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10l5-3v10l-5-3z" fill="currentColor" />
      <circle cx="9" cy="12" r="2.4" fill="currentColor" />
    </g>,
  );
}

export function IconCertificate(props: IconProps): JSX.Element {
  return svg(
    props,
    <g>
      <rect x="3" y="3" width="18" height="14" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.4" fill="currentColor" />
      <path d="M9.4 11.5l-1.4 4 4-1.5 4 1.5-1.4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 6h6v1H6zM6 8h4v1H6z" fill="currentColor" opacity="0.5" />
    </g>,
  );
}
