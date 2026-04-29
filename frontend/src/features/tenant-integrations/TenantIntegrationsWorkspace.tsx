import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import { apiV1 } from '../../shared/api/v1';
import type {
  TenantIntegrationsState,
  TenantZohoService,
  ZohoTestResult,
} from '../../shared/api/v1';
import type { TenantAuthSessionResponse } from '../../shared/contracts';

type StoredTenantSession = TenantAuthSessionResponse;

type TenantIntegrationsWorkspaceProps = {
  session: StoredTenantSession | null;
};

type ServiceCopy = {
  title: string;
  shortLabel: string;
  scopeNote: string;
  fallbackProvider: string;
};

const SERVICE_COPY: Record<TenantZohoService, ServiceCopy> = {
  calendar: {
    title: 'Zoho Calendar',
    shortLabel: 'Zoho Calendar',
    scopeNote:
      'BookedAI will read and write your Zoho Calendar events for class bookings, reschedules, and cancellations.',
    fallbackProvider: 'platform-wide Zoho',
  },
  crm: {
    title: 'Zoho CRM',
    shortLabel: 'Zoho CRM',
    scopeNote:
      'BookedAI will create and update Contacts and Deals in your Zoho CRM as customers book and pay.',
    fallbackProvider: 'platform-wide Zoho',
  },
};

const REDIRECT_URI_PRODUCTION = 'https://bookedai.au/api/v1/integrations/zoho/oauth/callback';
const REDIRECT_URI_LOCALHOST = 'http://localhost:8000/api/v1/integrations/zoho/oauth/callback';
const SETUP_DOCS_HREF = 'https://bookedai.au/docs/integrations/zoho';

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  try {
    const then = new Date(value);
    if (Number.isNaN(then.getTime())) {
      return value;
    }
    const diffMs = Date.now() - then.getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    const diffHour = Math.round(diffMin / 60);
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    const diffDay = Math.round(diffHour / 24);
    if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(then);
  } catch {
    return value;
  }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    return err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message || fallback;
  }
  return fallback;
}

export function TenantIntegrationsWorkspace({ session }: TenantIntegrationsWorkspaceProps) {
  const sessionToken = session?.session_token ?? null;

  const [data, setData] = useState<TenantIntegrationsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const [pendingService, setPendingService] = useState<TenantZohoService | null>(null);
  const [waitingService, setWaitingService] = useState<TenantZohoService | null>(null);
  const [testResults, setTestResults] = useState<
    Partial<Record<TenantZohoService, { state: 'idle' | 'pending' | 'done' | 'error'; result?: ZohoTestResult; message?: string }>>
  >({});
  const [confirmDisconnect, setConfirmDisconnect] = useState<TenantZohoService | null>(null);

  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccDirty, setCcDirty] = useState(false);
  const [ccInputValue, setCcInputValue] = useState('');
  const [ccInputError, setCcInputError] = useState<string | null>(null);
  const [ccSavePending, setCcSavePending] = useState(false);
  const [ccSaveMessage, setCcSaveMessage] = useState<string | null>(null);
  const [ccSaveError, setCcSaveError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const pollDeadlineRef = useRef<number | null>(null);

  const refreshIntegrations = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!sessionToken) {
        setLoading(false);
        return;
      }
      if (!options?.silent) {
        setErrorMessage(null);
      }
      try {
        const envelope = await apiV1.tenantGetIntegrations(sessionToken);
        if (envelope.status !== 'ok') {
          setErrorMessage('Could not load Zoho integration state. Please retry shortly.');
          return;
        }
        setData(envelope.data);
        setCcEmails(envelope.data.cc_emails ?? []);
        setCcDirty(false);
      } catch (err) {
        setErrorMessage(extractErrorMessage(err, 'Could not load Zoho integration state. Please retry shortly.'));
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [sessionToken],
  );

  // Initial load
  useEffect(() => {
    void refreshIntegrations();
  }, [refreshIntegrations]);

  // OAuth return hash detection
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash || '';
    let connectedService: TenantZohoService | null = null;
    if (hash.includes('connected=zoho_calendar')) {
      connectedService = 'calendar';
    } else if (hash.includes('connected=zoho_crm')) {
      connectedService = 'crm';
    }
    if (!connectedService) {
      return;
    }
    setFlashMessage(`${SERVICE_COPY[connectedService].title} connected successfully.`);
    setWaitingService(null);
    // Strip ?connected param from hash; preserve panel anchor
    try {
      const url = new URL(window.location.href);
      url.hash = 'integrations';
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // best-effort
    }
    void refreshIntegrations({ silent: true });
  }, [refreshIntegrations]);

  // Refresh when window regains focus while we're waiting on an OAuth tab
  useEffect(() => {
    if (typeof window === 'undefined' || !waitingService) {
      return;
    }
    function handleFocus() {
      void refreshIntegrations({ silent: true });
    }
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [waitingService, refreshIntegrations]);

  // Stop polling when this service becomes connected
  useEffect(() => {
    if (!waitingService || !data) {
      return;
    }
    const connected =
      waitingService === 'calendar' ? data.zoho_calendar.connected : data.zoho_crm.connected;
    if (connected) {
      setWaitingService(null);
      setFlashMessage(`${SERVICE_COPY[waitingService].title} connected successfully.`);
    }
  }, [waitingService, data]);

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  // Poll while waiting for OAuth callback
  useEffect(() => {
    if (!waitingService) {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      pollDeadlineRef.current = null;
      return;
    }
    pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;

    const tick = async () => {
      if (!waitingService) return;
      if (pollDeadlineRef.current && Date.now() > pollDeadlineRef.current) {
        setWaitingService(null);
        setErrorMessage(
          `Did not detect a successful Zoho authorization within 5 minutes. Try connecting ${SERVICE_COPY[waitingService].title} again.`,
        );
        return;
      }
      await refreshIntegrations({ silent: true });
      if (waitingService) {
        pollTimerRef.current = window.setTimeout(() => {
          void tick();
        }, POLL_INTERVAL_MS);
      }
    };

    pollTimerRef.current = window.setTimeout(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingService]);

  const operatorEmail = data?.operator_email ?? session?.user?.email ?? '';

  const handleConnect = useCallback(
    async (service: TenantZohoService) => {
      if (!sessionToken) {
        setErrorMessage('Sign back in to connect Zoho.');
        return;
      }
      setPendingService(service);
      setErrorMessage(null);
      setFlashMessage(null);
      try {
        const envelope = await apiV1.tenantGetZohoAuthorizeUrl(sessionToken, service);
        if (envelope.status !== 'ok') {
          setErrorMessage(`Could not start ${SERVICE_COPY[service].title} authorization.`);
          return;
        }
        const authorizeUrl = envelope.data.authorize_url;
        if (typeof window !== 'undefined' && authorizeUrl) {
          window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
        }
        setWaitingService(service);
      } catch (err) {
        setErrorMessage(
          extractErrorMessage(err, `Could not start ${SERVICE_COPY[service].title} authorization.`),
        );
      } finally {
        setPendingService(null);
      }
    },
    [sessionToken],
  );

  const handleTest = useCallback(
    async (service: TenantZohoService) => {
      if (!sessionToken) return;
      setTestResults((current) => ({ ...current, [service]: { state: 'pending' } }));
      try {
        const envelope = await apiV1.tenantTestZoho(sessionToken, service);
        if (envelope.status !== 'ok') {
          setTestResults((current) => ({
            ...current,
            [service]: { state: 'error', message: 'Test failed.' },
          }));
          return;
        }
        setTestResults((current) => ({
          ...current,
          [service]: { state: 'done', result: envelope.data },
        }));
      } catch (err) {
        setTestResults((current) => ({
          ...current,
          [service]: {
            state: 'error',
            message: extractErrorMessage(err, 'Test failed.'),
          },
        }));
      }
    },
    [sessionToken],
  );

  const handleDisconnect = useCallback(
    async (service: TenantZohoService) => {
      if (!sessionToken) return;
      setPendingService(service);
      setErrorMessage(null);
      try {
        const envelope = await apiV1.tenantDisconnectZoho(sessionToken, service);
        if (envelope.status !== 'ok') {
          setErrorMessage(`Could not disconnect ${SERVICE_COPY[service].title}.`);
          return;
        }
        setFlashMessage(`${SERVICE_COPY[service].title} disconnected.`);
        setConfirmDisconnect(null);
        setTestResults((current) => ({ ...current, [service]: { state: 'idle' } }));
        await refreshIntegrations({ silent: true });
      } catch (err) {
        setErrorMessage(
          extractErrorMessage(err, `Could not disconnect ${SERVICE_COPY[service].title}.`),
        );
      } finally {
        setPendingService(null);
      }
    },
    [sessionToken, refreshIntegrations],
  );

  const handleAddCcEmail = useCallback(() => {
    const candidate = ccInputValue.trim().toLowerCase();
    if (!candidate) {
      setCcInputError('Enter an email address before adding.');
      return;
    }
    if (!EMAIL_PATTERN.test(candidate)) {
      setCcInputError('That does not look like a valid email address.');
      return;
    }
    if (ccEmails.some((existing) => existing.toLowerCase() === candidate)) {
      setCcInputError('That email is already on the CC list.');
      return;
    }
    if (operatorEmail && operatorEmail.toLowerCase() === candidate) {
      setCcInputError('The operator email is always CC-d automatically.');
      return;
    }
    setCcEmails((current) => [...current, candidate]);
    setCcDirty(true);
    setCcInputValue('');
    setCcInputError(null);
    setCcSaveMessage(null);
    setCcSaveError(null);
  }, [ccInputValue, ccEmails, operatorEmail]);

  const handleRemoveCcEmail = useCallback((email: string) => {
    setCcEmails((current) => current.filter((value) => value !== email));
    setCcDirty(true);
    setCcSaveMessage(null);
    setCcSaveError(null);
  }, []);

  const handleSaveCcEmails = useCallback(async () => {
    if (!sessionToken) return;
    setCcSavePending(true);
    setCcSaveMessage(null);
    setCcSaveError(null);
    try {
      const envelope = await apiV1.tenantUpdateCcEmails(sessionToken, ccEmails);
      if (envelope.status !== 'ok') {
        setCcSaveError('Could not save CC emails. Please retry shortly.');
        return;
      }
      setCcEmails(envelope.data.cc_emails ?? []);
      setCcDirty(false);
      setCcSaveMessage('CC email list saved.');
    } catch (err) {
      setCcSaveError(extractErrorMessage(err, 'Could not save CC emails. Please retry shortly.'));
    } finally {
      setCcSavePending(false);
    }
  }, [sessionToken, ccEmails]);

  const handleCopy = useCallback((key: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1500);
    });
  }, []);

  const handleCcEmailFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleAddCcEmail();
    },
    [handleAddCcEmail],
  );

  const renderConnectionCard = useCallback(
    (service: TenantZohoService) => {
      const copy = SERVICE_COPY[service];
      const connectionData =
        data == null
          ? null
          : service === 'calendar'
            ? data.zoho_calendar
            : data.zoho_crm;
      const connected = connectionData?.connected ?? false;
      const isPending = pendingService === service;
      const isWaiting = waitingService === service;
      const testState = testResults[service];
      const showConfirm = confirmDisconnect === service;

      return (
        <article
          key={service}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {service === 'calendar' ? 'Calendar provider' : 'CRM provider'}
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{copy.title}</h3>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                connected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {connected && connectionData ? (
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              {connectionData.connected_by_user_email ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Connected by
                  </dt>
                  <dd className="mt-1 break-all text-slate-900">
                    {connectionData.connected_by_user_email}
                  </dd>
                </div>
              ) : null}
              {connectionData.connected_at ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Connected
                  </dt>
                  <dd className="mt-1 text-slate-900">
                    {formatRelativeTime(connectionData.connected_at)}
                  </dd>
                </div>
              ) : null}
              {service === 'calendar' && 'calendar_uid' in connectionData && connectionData.calendar_uid ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Calendar UID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                    {connectionData.calendar_uid}
                  </dd>
                </div>
              ) : null}
              {service === 'calendar' && 'accounts_base_url' in connectionData && connectionData.accounts_base_url ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Accounts base
                  </dt>
                  <dd className="mt-1 break-all text-xs text-slate-900">
                    {connectionData.accounts_base_url}
                  </dd>
                </div>
              ) : null}
              {service === 'crm' && 'api_base_url' in connectionData && connectionData.api_base_url ? (
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    API base
                  </dt>
                  <dd className="mt-1 break-all text-xs text-slate-900">
                    {connectionData.api_base_url}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">{copy.scopeNote}</p>
          )}

          {isWaiting ? (
            <div className="mt-5 rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              Waiting for Zoho authorization. Complete the consent screen in the new tab; this card
              will refresh automatically.
            </div>
          ) : null}

          {testState?.state === 'pending' ? (
            <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Testing {copy.title} connection...
            </div>
          ) : null}

          {testState?.state === 'done' && testState.result ? (
            <div
              className={`mt-5 rounded-[1rem] border px-4 py-3 text-sm leading-6 ${
                testState.result.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {testState.result.ok
                ? `Connection healthy in ${testState.result.latency_ms} ms.`
                : testState.result.message || 'Connection test failed.'}
              {testState.result.sample ? (
                <details className="mt-2 text-xs text-slate-700">
                  <summary className="cursor-pointer text-slate-600">Sample response</summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-[0.6rem] bg-white px-3 py-2 text-[11px] leading-4">
                    {JSON.stringify(testState.result.sample, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}

          {testState?.state === 'error' ? (
            <div className="mt-5 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {testState.message || 'Test failed.'}
            </div>
          ) : null}

          {showConfirm ? (
            <div className="mt-5 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="leading-6">
                Disconnect {copy.title}? Class bookings will fall back to the {copy.fallbackProvider}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDisconnect(service)}
                  disabled={isPending}
                  className="rounded-full border border-rose-300 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Disconnecting...' : 'Confirm disconnect'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(null)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {connected ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleTest(service)}
                  disabled={testState?.state === 'pending'}
                  className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testState?.state === 'pending' ? 'Testing...' : 'Test connection'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(service)}
                  disabled={isPending || showConfirm}
                  className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleConnect(service)}
                disabled={isPending || isWaiting}
                className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? 'Opening Zoho...'
                  : isWaiting
                    ? 'Waiting for Zoho authorization...'
                    : `Connect ${copy.title}`}
              </button>
            )}
          </div>
        </article>
      );
    },
    [data, pendingService, waitingService, testResults, confirmDisconnect, handleConnect, handleTest, handleDisconnect],
  );

  const skeletonCard = useMemo(
    () => (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-5 h-20 animate-pulse rounded-[1rem] bg-slate-100" />
        <div className="mt-5 h-9 w-40 animate-pulse rounded-full bg-slate-100" />
      </div>
    ),
    [],
  );

  if (!sessionToken) {
    return (
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Integrations</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in to manage Zoho Calendar, Zoho CRM, and notification CC recipients for this business.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Bring your own
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Integrations</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Connect this business to your own Zoho Calendar and Zoho CRM accounts, and manage who gets
              CC-d on every booking confirmation, reschedule, or cancellation email.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshIntegrations()}
            disabled={loading}
            className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {flashMessage ? (
          <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {flashMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => void refreshIntegrations()}
              className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        ) : null}
      </header>

      {loading && !data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {skeletonCard}
          {skeletonCard}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {renderConnectionCard('calendar')}
          {renderConnectionCard('crm')}
        </div>
      )}

      <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Notifications
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">CC email recipients</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          When BookedAI sends a booking confirmation, cancellation, or reschedule email to your customer,
          these addresses will be CC-d so you can follow up.
        </p>

        <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Operator email
          </div>
          <div className="mt-1 break-all text-slate-900">{operatorEmail || 'Not available'}</div>
          <div className="mt-1 text-xs text-slate-500">
            Always CC-d automatically. You do not need to add this to the list below.
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {ccEmails.length === 0 ? (
            <li className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              No additional CC recipients yet. Add one below.
            </li>
          ) : (
            ccEmails.map((email) => (
              <li
                key={email}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
              >
                <span className="break-all">{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCcEmail(email)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>

        <form className="mt-4 flex flex-wrap gap-2" onSubmit={handleCcEmailFormSubmit}>
          <input
            type="email"
            value={ccInputValue}
            placeholder="another-team@yourbusiness.com"
            onChange={(event) => {
              setCcInputValue(event.target.value);
              if (ccInputError) setCcInputError(null);
            }}
            className="flex-1 min-w-[16rem] rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Add email
          </button>
        </form>
        {ccInputError ? (
          <div className="mt-2 text-xs text-rose-600">{ccInputError}</div>
        ) : null}

        {ccSaveError ? (
          <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {ccSaveError}
          </div>
        ) : null}

        {ccSaveMessage ? (
          <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {ccSaveMessage}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSaveCcEmails()}
            disabled={!ccDirty || ccSavePending}
            className="booked-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ccSavePending ? 'Saving...' : 'Save changes'}
          </button>
          {ccDirty ? (
            <span className="text-xs text-slate-500">You have unsaved changes.</span>
          ) : null}
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Setup help
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Bring your own Zoho client
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Most businesses can use the BookedAI shared Zoho client directly with the buttons above. If you
          prefer to register your own Zoho developer app, copy one of these redirect URIs into the
          consent screen configuration.
        </p>

        <a
          href={SETUP_DOCS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline"
        >
          Read the Zoho setup guide
          <span aria-hidden>-&gt;</span>
        </a>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { key: 'production', label: 'Production', value: REDIRECT_URI_PRODUCTION },
            { key: 'localhost', label: 'Localhost (development)', value: REDIRECT_URI_LOCALHOST },
          ].map((entry) => (
            <div
              key={entry.key}
              className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {entry.label}
              </div>
              <div className="mt-1 break-all font-mono text-xs text-slate-900">{entry.value}</div>
              <button
                type="button"
                onClick={() => handleCopy(entry.key, entry.value)}
                className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {copiedKey === entry.key ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
