import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from 'react';

/**
 * <AppleCTA> — single shared CTA primitive for BookedAI surfaces.
 *
 * Source of truth for visual style: `frontend/src/theme/minimal-bento-template.css`
 *   - .booked-button            (primary blue, 980px pill, ≥44px tall)
 *   - .booked-button-secondary  (light pill, ≥40px tall — bumped to 44 here)
 *
 * Rules enforced by this component (keep them in sync with the design system memo):
 *   - Zero arbitrary hex colors. Only existing tokens / classes from minimal-bento-template.css.
 *   - Touch target ≥ 44×44 px on every variant (Apple HIG).
 *   - Focus ring delegated to .booked-button[:focus-visible] in the base CSS.
 *   - Renders <a> when `href` is provided, <button> otherwise.
 *   - `disabled` and `loading` work on both renderings (anchor uses aria-disabled).
 */

export type AppleCTAIntent = 'primary' | 'secondary' | 'pill';
export type AppleCTATone = 'light' | 'dark';
export type AppleCTASize = 'md' | 'lg';

export type AppleCTAProps = {
  label: string;
  intent?: AppleCTAIntent;
  tone?: AppleCTATone;
  size?: AppleCTASize;
  href?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  analyticsId?: string;
  ariaLabel?: string;
  rightIcon?: ReactNode;
  leftIcon?: ReactNode;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel'];
  fullWidth?: boolean;
};

const BASE_CLASS: Record<AppleCTAIntent, string> = {
  primary: 'booked-button',
  secondary: 'booked-button-secondary',
  pill: 'booked-button-secondary',
};

const SIZE_CLASS: Record<AppleCTASize, string> = {
  md: 'text-[13px]',
  lg: 'px-5 py-3 text-[15px]',
};

const MIN_TOUCH_STYLE: CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
};

function Spinner() {
  // Pure-CSS spinner using --apple-blue stroke; no extra colors / no hex.
  return (
    <span
      aria-hidden="true"
      className="inline-block animate-spin"
      style={{
        width: '14px',
        height: '14px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '9999px',
      }}
    />
  );
}

export function AppleCTA(props: AppleCTAProps) {
  const {
    label,
    intent = 'primary',
    tone = 'light',
    size = 'md',
    href,
    onClick,
    disabled = false,
    loading = false,
    analyticsId,
    ariaLabel,
    rightIcon,
    leftIcon,
    className = '',
    type = 'button',
    target,
    rel,
    fullWidth = false,
  } = props;

  const isInert = disabled || loading;
  const toneClass =
    tone === 'dark' && intent !== 'primary' ? 'apple-button-secondary-dark' : '';
  const widthClass = fullWidth ? 'w-full' : '';
  const composed = [
    BASE_CLASS[intent],
    SIZE_CLASS[size],
    toneClass,
    widthClass,
    className,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const content = (
    <>
      {loading ? <Spinner /> : leftIcon}
      <span>{label}</span>
      {!loading && rightIcon ? rightIcon : null}
    </>
  );

  const sharedProps = {
    'data-analytics-id': analyticsId,
    'aria-label': ariaLabel ?? label,
    'aria-busy': loading || undefined,
    'aria-disabled': isInert || undefined,
    style: MIN_TOUCH_STYLE,
    className: composed,
  } as const;

  if (href) {
    return (
      <a
        {...sharedProps}
        href={isInert ? undefined : href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        onClick={(event) => {
          if (isInert) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        role="button"
        tabIndex={isInert ? -1 : 0}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...sharedProps}
      type={type}
      disabled={isInert}
      onClick={(event) => {
        if (isInert) {
          return;
        }
        onClick?.(event);
      }}
    >
      {content}
    </button>
  );
}

export default AppleCTA;
