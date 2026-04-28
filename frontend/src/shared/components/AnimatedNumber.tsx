/**
 * <AnimatedNumber> — tiny utility that smoothly tweens between numeric
 * values over a 220ms ease-out curve using `requestAnimationFrame`.
 *
 * Constraints:
 *   - No animation library; pure RAF + a cubic ease-out.
 *   - Respects `prefers-reduced-motion`: snaps directly to the new value.
 *   - SSR-safe: defers to a no-op when `window` is not defined.
 *   - Formatter is optional; defaults to locale-safe integer rendering.
 */
import { useEffect, useRef, useState } from 'react';

export type AnimatedNumberProps = {
  value: number;
  formatter?: (n: number) => string;
  durationMs?: number;
  className?: string;
};

const DEFAULT_DURATION_MS = 220;

const defaultFormatter = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-AU').format(Math.round(value));
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function AnimatedNumber({
  value,
  formatter = defaultFormatter,
  durationMs = DEFAULT_DURATION_MS,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplayValue(value);
      return;
    }

    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplayValue(value);
      return;
    }

    const safeValue = Number.isFinite(value) ? value : 0;
    fromRef.current = Number.isFinite(displayValue) ? displayValue : 0;
    startRef.current = null;

    const tick = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(1, elapsed / Math.max(1, durationMs));
      const eased = easeOutCubic(progress);
      const next = fromRef.current + (safeValue - fromRef.current) * eased;
      setDisplayValue(next);
      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // We deliberately depend only on the target `value` and `durationMs`
    // so that interrupting tweens always restart from the latest displayed
    // value (captured in `fromRef.current` at re-run time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return <span className={className}>{formatter(displayValue)}</span>;
}

export default AnimatedNumber;
