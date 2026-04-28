import {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiV1 } from '../api/v1';
import type { AgentActivityStep } from '../api/v1';

type DrawerStatus = 'idle' | 'loading' | 'ready' | 'error';

type AgentActivityDrawerProps = {
  conversationId: string | null | undefined;
  tenantId?: string | null;
  tenantRef?: string | null;
  sessionToken?: string | null;
  /** Optional override for the default 50 step page size. */
  limit?: number;
  /** Optional override for the right-edge tab label. */
  tabLabel?: string;
};

const DEFAULT_LIMIT = 50;
const POLL_INTERVAL_MS = 2_500;

function isLiveStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }
  const normalized = status.toLowerCase();
  return normalized === 'in_flight' || normalized === 'queued';
}

function statusDotStyle(status: string | null | undefined): {
  background: string;
  borderColor: string;
} {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'done') {
    return {
      background: 'var(--apple-success)',
      borderColor: 'var(--apple-success)',
    };
  }
  if (normalized === 'attention') {
    return {
      background: 'var(--apple-warning)',
      borderColor: 'var(--apple-warning)',
    };
  }
  if (normalized === 'in_flight') {
    return {
      background: 'var(--apple-blue)',
      borderColor: 'var(--apple-blue)',
    };
  }
  // queued / null / unknown
  return {
    background: 'var(--apple-text-tertiary)',
    borderColor: 'var(--apple-text-tertiary)',
  };
}

function formatDuration(durationMs: number | null): string | null {
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs)) {
    return null;
  }
  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`;
  }
  const seconds = durationMs / 1_000;
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(seconds)}s`;
}

function formatEventType(eventType: string): string {
  if (!eventType) {
    return 'event';
  }
  return eventType.replace(/_/g, ' ');
}

/**
 * Wave 13-B — slash-command verb chip mapping.
 * Maps raw `context.intent_hint` values (forwarded from
 * `<SlashCommandMenu>`) to short, friendly labels surfaced next to the
 * event_type in the Agent Activity Drawer. Unknown verbs fall back to a
 * normalized title-case form so we never silently swallow a new intent.
 */
const INTENT_HINT_LABELS: Record<string, string> = {
  find_service: 'Find service',
  compare_services: 'Compare',
  book_service: 'Book',
  request_quote: 'Quote',
  open_portal: 'Open portal',
  help: 'Help',
};

function formatIntentHint(rawHint: string | null | undefined): string | null {
  if (!rawHint) {
    return null;
  }
  const trimmed = rawHint.trim();
  if (!trimmed) {
    return null;
  }
  const known = INTENT_HINT_LABELS[trimmed];
  if (known) {
    return known;
  }
  // Fallback: title-case the raw verb so e.g. `custom_intent` →
  // `Custom intent`. Keeps the chip useful when a tenant introduces a
  // new slash command before the frontend ships the mapping.
  return trimmed
    .replace(/_/g, ' ')
    .replace(/^(.)(.*)$/, (_, head: string, tail: string) => head.toUpperCase() + tail);
}

export function AgentActivityDrawer({
  conversationId,
  tenantId = null,
  tenantRef = null,
  sessionToken = null,
  limit = DEFAULT_LIMIT,
  tabLabel = 'See how BookedAI works',
}: AgentActivityDrawerProps) {
  const trimmedConversationId = (conversationId ?? '').trim();
  const hasConversation = trimmedConversationId.length > 0;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DrawerStatus>('idle');
  const [steps, setSteps] = useState<AgentActivityStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);

  const tabButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  const latestStatus: string | null = steps.length > 0 ? steps[steps.length - 1].workflow_status : null;
  const shouldPoll = open && isLiveStatus(latestStatus);

  const loadSteps = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!hasConversation) {
        return;
      }
      setStatus((current) => (current === 'ready' ? current : 'loading'));
      try {
        const response = await apiV1.getAgentActivity(trimmedConversationId, {
          limit,
          tenantId,
          tenantRef,
          sessionToken,
          signal,
        });
        if (signal?.aborted) {
          return;
        }
        setSteps(response.steps);
        setStatus('ready');
        setErrorMessage(null);
      } catch (error) {
        if (signal?.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Could not load agent activity.';
        setErrorMessage(message);
        setStatus('error');
      }
    },
    [hasConversation, trimmedConversationId, limit, tenantId, tenantRef, sessionToken],
  );

  // Initial load whenever the drawer is opened or the conversation id changes.
  useEffect(() => {
    if (!open || !hasConversation) {
      return;
    }
    const controller = new AbortController();
    void loadSteps(controller.signal);
    return () => {
      controller.abort();
    };
  }, [open, hasConversation, loadSteps]);

  // Auto-poll while the latest step is still queued/in_flight. Stops as soon
  // as the ledger settles, to avoid runaway requests on idle drawers.
  useEffect(() => {
    if (!shouldPoll) {
      return;
    }
    const controller = new AbortController();
    const interval = window.setInterval(() => {
      void loadSteps(controller.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [shouldPoll, loadSteps]);

  // Focus management — capture last active element on open, restore on close.
  useEffect(() => {
    if (open) {
      lastFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
      window.setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
      return;
    }
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [open]);

  // ESC to close + simple focus trap inside the drawer.
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const drawer = drawerRef.current;
      if (!drawer) {
        return;
      }
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((previous) => !previous);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleStepKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, stepId: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setExpandedStepId((current) => (current === stepId ? null : stepId));
      }
    },
    [],
  );

  const formattedSteps = useMemo(
    () =>
      steps.map((step) => ({
        ...step,
        durationLabel: formatDuration(step.duration_ms),
        humanEventType: formatEventType(step.event_type),
        statusStyles: statusDotStyle(step.workflow_status),
        intentHintLabel: formatIntentHint(step.user_intent_hint),
      })),
    [steps],
  );

  if (!hasConversation) {
    return null;
  }

  return (
    <>
      <button
        ref={tabButtonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={titleId}
        aria-label={`${tabLabel}. Opens the BookedAI agent activity drawer.`}
        className="fixed right-0 top-1/2 z-[60] -translate-y-1/2 origin-right -rotate-90 rounded-apple-standard rounded-bl-none rounded-br-none border border-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-apple-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        style={{
          background: 'var(--apple-near-black)',
          color: 'var(--apple-text-dark)',
          outlineColor: 'var(--apple-blue)',
        }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--apple-blue)' }}
          />
          {tabLabel}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-stretch justify-end"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleClose();
            }
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.34)' }}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="BookedAI agent activity"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative ml-auto flex h-full w-full flex-col md:w-[420px]"
            style={{
              background: 'var(--apple-near-black)',
              color: 'var(--apple-text-dark)',
              borderTopLeftRadius: 'var(--apple-radius-large)',
              borderBottomLeftRadius: 'var(--apple-radius-large)',
            }}
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--apple-text-dark-3)' }}>
                  Agent activity
                </div>
                <h2 id={titleId} className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                  How BookedAI is working
                </h2>
                <p id={descriptionId} className="mt-1 text-xs leading-5" style={{ color: 'var(--apple-text-dark-3)' }}>
                  Live ledger of every typed agent step in this conversation.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                aria-label="Close agent activity drawer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-apple-standard border border-white/10 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2"
                style={{
                  color: 'var(--apple-text-dark-2)',
                  outlineColor: 'var(--apple-blue)',
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {status === 'loading' && steps.length === 0 ? (
                <div className="px-2 py-6 text-sm" style={{ color: 'var(--apple-text-dark-3)' }}>
                  Loading agent steps…
                </div>
              ) : null}

              {status === 'error' ? (
                <div
                  role="alert"
                  className="rounded-apple-standard border border-white/10 px-3 py-3 text-sm"
                  style={{ color: 'var(--apple-warning)', background: 'rgba(255, 159, 10, 0.06)' }}
                >
                  {errorMessage ?? 'Could not load agent activity.'}
                </div>
              ) : null}

              {status === 'ready' && steps.length === 0 ? (
                <div className="px-2 py-6 text-sm" style={{ color: 'var(--apple-text-dark-3)' }}>
                  No agent steps recorded for this conversation yet.
                </div>
              ) : null}

              <ol className="flex flex-col gap-2">
                {formattedSteps.map((step, index) => {
                  const isExpanded = expandedStepId === step.id;
                  const evidenceJson = (() => {
                    try {
                      return JSON.stringify(step.evidence ?? {}, null, 2);
                    } catch {
                      return '{}';
                    }
                  })();
                  return (
                    <li
                      key={`${step.id}-${index}`}
                      className="rounded-apple-standard border border-white/10"
                      style={{ background: 'var(--apple-dark-2)' }}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedStepId((current) => (current === step.id ? null : step.id))
                        }
                        onKeyDown={(event) => handleStepKeyDown(event, step.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2"
                        style={{
                          color: 'var(--apple-text-dark)',
                          outlineColor: 'var(--apple-blue)',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="inline-block h-2 w-2 rounded-full border"
                          style={step.statusStyles}
                        />
                        <span className="flex-1 truncate font-medium tracking-[-0.01em]">
                          {step.humanEventType}
                        </span>
                        {step.intentHintLabel ? (
                          <span
                            data-testid="agent-step-intent-hint"
                            data-intent-hint={step.user_intent_hint ?? ''}
                            className="template-chip rounded-apple-micro px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: 'rgba(0, 122, 255, 0.18)',
                              color: 'var(--apple-text-dark)',
                            }}
                          >
                            {step.intentHintLabel}
                          </span>
                        ) : null}
                        {step.durationLabel ? (
                          <span
                            className="rounded-apple-micro px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--apple-text-dark-2)',
                            }}
                          >
                            {step.durationLabel}
                          </span>
                        ) : null}
                        <span
                          aria-hidden="true"
                          className="text-[11px]"
                          style={{ color: 'var(--apple-text-dark-3)' }}
                        >
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-white/10 px-3 py-3 text-xs">
                          {step.ai_intent ? (
                            <div className="mb-2">
                              <div
                                className="text-xs font-semibold uppercase tracking-[0.16em]"
                                style={{ color: 'var(--apple-text-dark-3)' }}
                              >
                                Intent
                              </div>
                              <div
                                className="mt-0.5 text-xs"
                                style={{ color: 'var(--apple-text-dark-2)' }}
                              >
                                {step.ai_intent}
                              </div>
                            </div>
                          ) : null}
                          {step.ai_reply ? (
                            <div className="mb-2">
                              <div
                                className="text-xs font-semibold uppercase tracking-[0.16em]"
                                style={{ color: 'var(--apple-text-dark-3)' }}
                              >
                                Reply preview
                              </div>
                              <div
                                className="mt-0.5 text-xs leading-5"
                                style={{ color: 'var(--apple-text-dark-2)' }}
                              >
                                {step.ai_reply}
                              </div>
                            </div>
                          ) : null}
                          <div
                            className="text-xs font-semibold uppercase tracking-[0.16em]"
                            style={{ color: 'var(--apple-text-dark-3)' }}
                          >
                            Evidence (PII-masked)
                          </div>
                          <pre
                            className="mt-1 max-h-64 overflow-auto rounded-apple-micro p-2 text-[11px] leading-5"
                            style={{
                              background: 'var(--apple-dark-1)',
                              color: 'var(--apple-text-dark-2)',
                              fontFamily: 'var(--apple-font-mono)',
                            }}
                          >
                            {evidenceJson}
                          </pre>
                          {step.created_at ? (
                            <div
                              className="mt-2 text-xs"
                              style={{ color: 'var(--apple-text-dark-3)' }}
                            >
                              {step.created_at}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>

            <footer
              className="border-t border-white/10 px-5 py-3 text-[11px]"
              style={{ color: 'var(--apple-text-dark-3)' }}
            >
              <span
                className="inline-flex items-center gap-2 rounded-apple-pill border border-white/10 px-2.5 py-1"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--apple-blue)' }}
                />
                Auditable in admin.bookedai.au · powered by conversation_events
              </span>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default AgentActivityDrawer;
