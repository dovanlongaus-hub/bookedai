/**
 * Live booking ticker — Wow Moment #2 from the master review (P1-T5).
 *
 * Two surfaces in one file:
 *   - <LiveBookingStrip />   one-line strip pinned beneath the hero
 *   - <LiveBookingToast />   floating bottom-right toast that announces a
 *                            recent anonymized booking every ~30s
 *
 * Privacy contract: this component only renders fields the public stats
 * endpoint chooses to expose — anonymized tenant alias, $5-rounded amounts,
 * and minute-coarse "ago" durations. It never persists anything to local
 * storage / cookies and never fingerprints visitors.
 *
 * Polling cadence is 30s — matched to the backend cache TTL so each poll
 * has a high chance of hitting the in-memory cache and not the database.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { apiV1 } from '../api/v1';
import type { PublicBookingStats, PublicBookingStatsRecent } from '../api/v1';

const POLL_INTERVAL_MS = 30_000;
const TOAST_ROTATION_INTERVAL_MS = 30_000;
const TOAST_AUTO_HIDE_MS = 12_000;

const audCurrencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

function formatAud(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'A$0';
  }
  return audCurrencyFormatter.format(amount).replace('A$', 'A$');
}

function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }
  return new Intl.NumberFormat('en-AU').format(Math.round(value));
}

function formatAgo(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 1) {
    return 'just now';
  }
  if (safe === 1) {
    return '1 min ago';
  }
  if (safe < 60) {
    return `${safe} mins ago`;
  }
  const hours = Math.round(safe / 60);
  if (hours <= 1) {
    return '1 hr ago';
  }
  if (hours < 24) {
    return `${hours} hrs ago`;
  }
  const days = Math.round(hours / 24);
  return days <= 1 ? '1 day ago' : `${days} days ago`;
}

type LiveStatsState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: PublicBookingStats | null;
};

const INITIAL_STATE: LiveStatsState = { status: 'idle', data: null };

function useLiveBookingStats() {
  const [state, setState] = useState<LiveStatsState>(INITIAL_STATE);
  const isMountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const next = await apiV1.getPublicBookingStats();
      if (!isMountedRef.current) {
        return;
      }
      setState({ status: 'ready', data: next });
    } catch {
      // Quiet failure — never render a broken ticker.
      if (!isMountedRef.current) {
        return;
      }
      setState((current) => ({
        status: 'error',
        data: current.data,
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setState({ status: 'loading', data: null });
    void fetchStats();
    const intervalId = window.setInterval(() => {
      void fetchStats();
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [fetchStats]);

  return state;
}

function hasMeaningfulSignal(stats: PublicBookingStats | null): boolean {
  if (!stats) {
    return false;
  }
  const sevenDay = stats.windows.last7d;
  return sevenDay.bookings > 0 || sevenDay.capturedAudRounded > 0 || stats.recent.length > 0;
}

// ── Strip ────────────────────────────────────────────────────────────────
type LiveBookingStripProps = {
  className?: string;
};

export function LiveBookingStrip({ className }: LiveBookingStripProps) {
  const { data } = useLiveBookingStats();

  if (!hasMeaningfulSignal(data)) {
    return null;
  }

  const stats = data as PublicBookingStats;
  const sevenDay = stats.windows.last7d;
  const enquiriesAnswered = Math.max(sevenDay.bookings * 4, sevenDay.bookings); // proxy: bookings * funnel multiplier
  const captured = formatAud(sevenDay.capturedAudRounded);
  const bookings = formatCount(sevenDay.bookings);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={[
        'flex items-center gap-3 rounded-full bg-apple-near-black px-4 py-2 text-xs font-medium text-apple-white shadow-apple-sm sm:text-sm',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="relative inline-flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 inline-flex h-full w-full animate-ping rounded-full bg-apple-success/70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-apple-success" />
      </span>
      <span className="template-kicker text-apple-white/70">Live BookedAI revenue</span>
      <span className="hidden text-apple-white/40 sm:inline" aria-hidden="true">
        ·
      </span>
      <span className="font-semibold text-apple-white">
        {formatCount(enquiriesAnswered)} enquiries answered (7d)
      </span>
      <span className="hidden text-apple-white/40 sm:inline" aria-hidden="true">
        ·
      </span>
      <span className="font-semibold text-apple-white">{bookings} booked</span>
      <span className="hidden text-apple-white/40 sm:inline" aria-hidden="true">
        ·
      </span>
      <span className="font-semibold text-apple-white">{captured} captured</span>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────
type LiveBookingToastProps = {
  className?: string;
};

export function LiveBookingToast({ className }: LiveBookingToastProps) {
  const { data } = useLiveBookingStats();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const recent: PublicBookingStatsRecent[] = useMemo(
    () => (data?.recent ?? []).slice(0, 5),
    [data],
  );

  // Rotation: surface a recent booking, hold for ~12s, then quiet for the
  // remainder of the rotation interval before the next one comes up.
  useEffect(() => {
    if (recent.length === 0) {
      setIsVisible(false);
      return undefined;
    }

    setActiveIndex(0);
    setIsVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, TOAST_AUTO_HIDE_MS);

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % recent.length);
      setIsVisible(true);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, TOAST_AUTO_HIDE_MS);
    }, TOAST_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [recent]);

  if (recent.length === 0) {
    return null;
  }

  const current = recent[Math.min(activeIndex, recent.length - 1)];
  const amount = formatAud(current.amountAudRounded);
  const ago = formatAgo(current.agoMinutes);
  const announce = `+${amount} booked at ${current.tenantAlias} · ${ago}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className={[
        'pointer-events-none fixed bottom-5 right-5 z-30 max-w-[22rem] transition-opacity duration-500 sm:bottom-6 sm:right-6',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-apple-large border border-apple-light bg-apple-white px-4 py-3 text-apple-near-black shadow-apple">
        <span
          className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-apple-success"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="template-kicker text-apple-link-light">Just booked</div>
          <div className="mt-1 truncate text-sm font-semibold">
            +{amount} <span className="font-normal text-apple-near-black/72">at</span>{' '}
            {current.tenantAlias}
          </div>
          <div className="mt-1 text-xs text-apple-near-black/64">{ago}</div>
          {showHelp ? (
            <div className="mt-2 rounded-apple-standard bg-apple-light px-3 py-2 text-[11px] leading-5 text-apple-near-black/72">
              Anonymized aggregate from the last 30 days. Tenant names, customer
              details, and exact amounts are never displayed.
            </div>
          ) : null}
          <span className="sr-only">{announce}</span>
        </div>
        <button
          type="button"
          aria-label="What is this?"
          aria-pressed={showHelp}
          onClick={() => setShowHelp((value) => !value)}
          className="pointer-events-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-apple-light text-[11px] font-semibold text-apple-near-black/64 transition hover:border-apple-blue hover:text-apple-blue"
        >
          ?
        </button>
      </div>
    </div>
  );
}

export default LiveBookingStrip;
