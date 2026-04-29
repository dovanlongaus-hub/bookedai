/**
 * AI Mentor — Zoho OAuth callback helper page.
 *
 * Operator workflow (one-time setup, runs in their own browser session
 * while signed in to Zoho as ``aimentor@bookedai.au``):
 *
 *   1. Configure the Zoho OAuth app's "Authorized Redirect URI" as
 *      `https://aimentor.bookedai.au/aimentor/zoho-oauth-callback`.
 *   2. Open the consent URL (this page provides a one-click button that
 *      builds the URL from the operator-supplied client_id).
 *   3. After approving, Zoho redirects back here with `?code=...`.
 *   4. This page extracts the code, displays it (60-second expiry warning),
 *      and pre-fills the `curl` command to swap it for a refresh_token.
 *   5. Operator runs the curl, gets the refresh_token, env-vars it.
 *
 * No client_secret ever touches the browser — the curl runs server-side
 * in the operator's terminal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import '../../theme/aimentor-tokens.css';

const CALLBACK_REDIRECT_URI =
  'https://aimentor.bookedai.au/aimentor/zoho-oauth-callback';

const ZOHO_SCOPES = [
  'ZohoCRM.modules.ALL',
  'ZohoCRM.notifications.ALL',
  'ZohoMeeting.session.ALL',
  'ZohoCalendar.event.ALL',
].join(',');

const ACCOUNTS_BASE_AU = 'https://accounts.zoho.com.au';

type CallbackParams = {
  code: string | null;
  location: string | null;
  accountsServer: string | null;
  error: string | null;
};

function readCallbackParams(): CallbackParams {
  if (typeof window === 'undefined') {
    return { code: null, location: null, accountsServer: null, error: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    location: params.get('location'),
    accountsServer: params.get('accounts-server'),
    error: params.get('error'),
  };
}

// SessionStorage key — bridges client_id + client_secret across the
// Zoho redirect (consent flow navigates away + comes back). 5-min TTL so
// stale entries get garbage-collected on the next mount.
const PENDING_KEY = 'aimentor.bookedai.zoho.pending';
const PENDING_TTL_MS = 5 * 60 * 1000;

type PendingState = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  savedAt: number;
};

function readPendingState(): PendingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingState | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (
      typeof parsed.clientId !== 'string' ||
      typeof parsed.clientSecret !== 'string' ||
      typeof parsed.savedAt !== 'number'
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > PENDING_TTL_MS) {
      window.sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePendingState(state: PendingState) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function clearPendingState() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

type ExchangeStatus = 'idle' | 'submitting' | 'success' | 'error';

type ExchangeResult = {
  refresh_token: string;
  access_token: string | null;
  api_domain: string | null;
  expires_in: number | null;
  token_type: string | null;
};

export function AIMentorZohoOAuthCallbackApp() {
  const callback = useMemo(() => readCallbackParams(), []);
  // Restore client_id + client_secret from sessionStorage if the operator
  // pasted them before clicking "Authorize with Zoho" — survives the
  // round-trip to Zoho and back.
  const restored = useMemo(() => readPendingState(), []);
  const [clientId, setClientId] = useState(restored?.clientId ?? '');
  const [clientSecret, setClientSecret] = useState(restored?.clientSecret ?? '');
  const [copied, setCopied] = useState<string | null>(null);

  // Auto-exchange flow state
  const [exchangeStatus, setExchangeStatus] = useState<ExchangeStatus>('idle');
  const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'AI Mentor — Zoho OAuth setup';
  }, []);

  // When operator navigates to Zoho, persist credentials so this page
  // can pick them up on the redirect back. We don't intercept the
  // anchor click — instead, we write to sessionStorage on every change
  // so by the time they click, the latest values are saved.
  useEffect(() => {
    if (!clientId.trim() && !clientSecret.trim()) return;
    writePendingState({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: CALLBACK_REDIRECT_URI,
      savedAt: Date.now(),
    });
  }, [clientId, clientSecret]);

  const accountsBase = callback.accountsServer || ACCOUNTS_BASE_AU;

  const authorizeUrl = useMemo(() => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId.trim() || '<YOUR_CLIENT_ID>',
      scope: ZOHO_SCOPES,
      redirect_uri: CALLBACK_REDIRECT_URI,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${ACCOUNTS_BASE_AU}/oauth/v2/auth?${params.toString()}`;
  }, [clientId]);

  const exchangeCurl = useMemo(() => {
    if (!callback.code) return '';
    const cid = clientId.trim() || '<YOUR_CLIENT_ID>';
    const csecret = clientSecret.trim() || '<YOUR_CLIENT_SECRET>';
    return [
      `curl -X POST '${accountsBase}/oauth/v2/token' \\`,
      `  -d 'grant_type=authorization_code' \\`,
      `  -d 'client_id=${cid}' \\`,
      `  -d 'client_secret=${csecret}' \\`,
      `  -d 'redirect_uri=${CALLBACK_REDIRECT_URI}' \\`,
      `  -d 'code=${callback.code}'`,
    ].join('\n');
  }, [accountsBase, callback.code, clientId, clientSecret]);

  const copy = useCallback((label: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const exchangeNow = useCallback(async () => {
    if (!callback.code || !clientId.trim() || !clientSecret.trim()) {
      setExchangeError(
        'Need client_id + client_secret + the auth code. Paste credentials in Step 2 first.',
      );
      setExchangeStatus('error');
      return;
    }
    setExchangeStatus('submitting');
    setExchangeError(null);
    try {
      const res = await fetch('/api/v1/aimentor/integrations/zoho/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: callback.code,
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          redirect_uri: CALLBACK_REDIRECT_URI,
          accounts_base_url: accountsBase,
        }),
      });
      const payload = (await res.json().catch(() => null)) as {
        status?: string;
        data?: ExchangeResult;
        error?: { message?: string; details?: { zoho_error?: string } };
      } | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
        const zohoErr = payload?.error?.details?.zoho_error;
        setExchangeError(
          [payload?.error?.message, zohoErr ? `(Zoho: ${zohoErr})` : '']
            .filter(Boolean)
            .join(' ') ||
            'Exchange failed — the code may have expired (60s) or credentials don\'t match.',
        );
        setExchangeStatus('error');
        return;
      }
      setExchangeResult(payload.data);
      setExchangeStatus('success');
      // Wipe stored credentials — operator should now paste them into the
      // admin form (along with the new refresh_token).
      clearPendingState();
    } catch {
      setExchangeError('Network error reaching the exchange endpoint.');
      setExchangeStatus('error');
    }
  }, [accountsBase, callback.code, clientId, clientSecret]);

  return (
    <div className="aimentor-app">
      <main className="aim-shell" style={{ paddingBlock: 32 }}>
        <div className="aim-container" style={{ maxWidth: 880 }}>
          <header style={{ marginBottom: 24 }}>
            <span className="aim-eyebrow aim-eyebrow-coral">AI Mentor · Zoho OAuth setup</span>
            <h1
              className="aim-display"
              style={{
                marginTop: 8,
                fontSize: 'clamp(1.6rem, 3vw, 2rem)',
                color: 'var(--aim-ink)',
              }}
            >
              Connect Zoho Meeting + Calendar to aimentor.bookedai.au
            </h1>
            <p style={{ marginTop: 10, color: 'var(--aim-muted)', lineHeight: 1.65 }}>
              Run this once in the browser session of <strong>aimentor@bookedai.au</strong> to
              authorise Zoho Meeting + Zoho Calendar + Zoho CRM for the AI Mentor flow. The
              redirect URI you register in the Zoho Developer Console must match exactly.
            </p>
          </header>

          {/* Redirect URI banner — primary call-out */}
          <div
            className="aim-card"
            style={{
              padding: 20,
              border: '1px solid rgba(255, 107, 61, 0.32)',
              background: 'rgba(255, 107, 61, 0.05)',
            }}
          >
            <div className="aim-eyebrow aim-eyebrow-coral">Step 1 · Register this redirect URI in Zoho</div>
            <p style={{ marginTop: 10, fontSize: '0.95rem', color: 'var(--aim-text)', lineHeight: 1.6 }}>
              Open <a href="https://api-console.zoho.com.au" target="_blank" rel="noreferrer" style={{ color: 'var(--aim-teal-deep)', fontWeight: 600 }}>api-console.zoho.com.au</a>
              {' '}→ create a <strong>Server-based Application</strong> → set the Authorized Redirect URI to:
            </p>
            <CopyBox label="redirect-uri" value={CALLBACK_REDIRECT_URI} copied={copied} onCopy={copy} mono />
            <p style={{ fontSize: '0.85rem', color: 'var(--aim-muted)', marginTop: 12 }}>
              Then come back to this page with the consent flow (Step 2). The redirect URI is also
              what Zoho redirects to <em>after</em> consent — that's how this page will know to
              show you the auth code.
            </p>
          </div>

          {/* Client credentials input */}
          <div className="aim-card" style={{ marginTop: 20, padding: 20 }}>
            <div className="aim-eyebrow">Step 2 · Paste your client credentials</div>
            <p style={{ marginTop: 8, color: 'var(--aim-muted)', fontSize: '0.9rem' }}>
              From the Zoho app you just created. Stored only in this browser tab — not sent
              anywhere until you run the curl in Step 4.
            </p>
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="aim-field-label">Client ID</span>
                <input
                  className="aim-input"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="aim-field-label">Client Secret</span>
                <input
                  className="aim-input"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="•••••••••• (used only in the curl command below)"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
          </div>

          {/* Authorize button */}
          <div className="aim-card" style={{ marginTop: 20, padding: 20 }}>
            <div className="aim-eyebrow">Step 3 · Open the Zoho consent screen</div>
            <p style={{ marginTop: 8, color: 'var(--aim-muted)', fontSize: '0.9rem' }}>
              Click below to open the Zoho consent screen with all four required scopes
              pre-filled. Approve as <strong>aimentor@bookedai.au</strong>. Zoho will then
              redirect you back here with an auth code.
            </p>
            <a
              className="aim-btn aim-btn-primary aim-btn-lg"
              href={authorizeUrl}
              style={{ marginTop: 12, display: 'inline-block' }}
            >
              Authorize with Zoho →
            </a>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--aim-muted)' }}>
                Show full authorize URL
              </summary>
              <CopyBox label="authorize-url" value={authorizeUrl} copied={copied} onCopy={copy} mono small />
            </details>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(20, 160, 146, 0.06)', fontSize: '0.85rem', color: 'var(--aim-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--aim-teal-deep)' }}>Required scopes (already in the URL):</strong>
              <code style={{ display: 'block', fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', marginTop: 6, wordBreak: 'break-all', color: 'var(--aim-text)' }}>
                {ZOHO_SCOPES}
              </code>
            </div>
          </div>

          {/* Auth code result */}
          {callback.error ? (
            <div
              className="aim-status-error"
              role="alert"
              style={{ marginTop: 20 }}
            >
              <strong>Zoho returned an error:</strong> {callback.error}
              <br />
              Try Step 3 again or double-check the redirect URI matches exactly.
            </div>
          ) : null}

          {callback.code ? (
            <div
              className="aim-card"
              style={{
                marginTop: 20,
                padding: 20,
                border: '1px solid rgba(47, 158, 117, 0.32)',
                background: 'rgba(47, 158, 117, 0.05)',
              }}
            >
              <div className="aim-eyebrow" style={{ color: 'var(--aim-success)' }}>
                Step 4 · Auth code captured — exchange within 60 seconds
              </div>
              <p style={{ marginTop: 8, color: 'var(--aim-muted)', fontSize: '0.9rem' }}>
                Auth codes expire in 60 seconds. <strong>Easiest path:</strong> click
                "Exchange now" — we POST through our backend to Zoho and return your
                refresh_token. Falls back to the curl command if you'd rather run it
                in your terminal.
              </p>
              <CopyBox label="auth-code" value={callback.code} copied={copied} onCopy={copy} mono />

              {/* 1-click exchange — succeeds in ~1s typical */}
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  background: '#fdfaf3',
                  border: '1px solid rgba(255, 107, 61, 0.32)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--aim-font-mono)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--aim-coral)',
                    marginBottom: 6,
                  }}
                >
                  Recommended · 1-click exchange
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--aim-muted)', lineHeight: 1.55, marginBottom: 12 }}>
                  Uses the client_id + client_secret you pasted in Step 2 (still in this
                  browser tab). Backend proxies to Zoho's token endpoint — bypasses CORS,
                  never persists your credentials.
                </p>
                {exchangeStatus === 'success' && exchangeResult ? (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: 'rgba(47, 158, 117, 0.1)',
                      border: '1px solid rgba(47, 158, 117, 0.32)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--aim-font-display)',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        color: '#0f5c54',
                        marginBottom: 8,
                      }}
                    >
                      ✓ Exchange successful
                    </div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--aim-text)', lineHeight: 1.55, marginBottom: 12 }}>
                      Copy the refresh_token below + paste into the admin credentials form at{' '}
                      <a
                        href="https://admin.bookedai.au/#ai-mentor-academy"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--aim-teal-deep)', fontWeight: 600 }}
                      >
                        admin.bookedai.au/#ai-mentor-academy
                      </a>
                      {' '}(top section "AI Mentor — Zoho credentials").
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div
                          style={{
                            fontFamily: 'var(--aim-font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--aim-muted)',
                            marginBottom: 4,
                          }}
                        >
                          refresh_token (long-lived — paste into admin form)
                        </div>
                        <CopyBox
                          label="refresh-token"
                          value={exchangeResult.refresh_token}
                          copied={copied}
                          onCopy={copy}
                          mono
                        />
                      </div>
                      {exchangeResult.api_domain ? (
                        <div>
                          <div
                            style={{
                              fontFamily: 'var(--aim-font-mono)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'var(--aim-muted)',
                              marginBottom: 4,
                            }}
                          >
                            api_domain (auto-derived — informational)
                          </div>
                          <CopyBox
                            label="api-domain"
                            value={exchangeResult.api_domain}
                            copied={copied}
                            onCopy={copy}
                            mono
                            small
                          />
                        </div>
                      ) : null}
                    </div>
                    <a
                      href="https://admin.bookedai.au/#ai-mentor-academy"
                      target="_blank"
                      rel="noreferrer"
                      className="aim-btn aim-btn-primary"
                      style={{ marginTop: 14 }}
                    >
                      Open admin credentials form →
                    </a>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="aim-btn aim-btn-primary aim-btn-lg"
                      onClick={() => void exchangeNow()}
                      disabled={
                        exchangeStatus === 'submitting' ||
                        !clientId.trim() ||
                        !clientSecret.trim()
                      }
                    >
                      {exchangeStatus === 'submitting'
                        ? 'Exchanging…'
                        : 'Exchange now (1-click)'}
                    </button>
                    {!clientId.trim() || !clientSecret.trim() ? (
                      <p style={{ fontSize: '0.78rem', color: 'var(--aim-coral)', marginTop: 8 }}>
                        Paste your client_id + client_secret in Step 2 first.
                      </p>
                    ) : null}
                    {exchangeStatus === 'error' && exchangeError ? (
                      <div
                        className="aim-status-error"
                        role="alert"
                        style={{ marginTop: 10, fontSize: '0.84rem' }}
                      >
                        {exchangeError}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <details style={{ marginTop: 14 }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--aim-ink)',
                    fontSize: '0.88rem',
                  }}
                >
                  Prefer to run curl in your terminal? (alternative)
                </summary>
                <p style={{ marginTop: 10, fontSize: '0.84rem', color: 'var(--aim-muted)' }}>
                  Pre-filled curl command — substitutes your client_id + client_secret + the captured code:
                </p>
                <CopyBox label="exchange-curl" value={exchangeCurl} copied={copied} onCopy={copy} mono multiline />
              </details>
              <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(20, 160, 146, 0.06)', fontSize: '0.86rem', lineHeight: 1.65, color: 'var(--aim-text)' }}>
                <strong>Expected response (JSON):</strong>
                <pre style={{ margin: '8px 0 0 0', fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', color: 'var(--aim-muted)' }}>
{`{
  "access_token": "1000.xxx...",
  "refresh_token": "1000.yyy...",
  "api_domain": "https://www.zohoapis.com.au",
  "token_type": "Bearer",
  "expires_in": 3600
}`}
                </pre>
                <p style={{ marginTop: 12, marginBottom: 0 }}>
                  <strong style={{ color: 'var(--aim-teal-deep)' }}>Save these into env vars and restart the backend:</strong>
                </p>
                <pre style={{ margin: '8px 0 0 0', fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', color: 'var(--aim-text)' }}>
{`ZOHO_MEETING_REFRESH_TOKEN=<refresh_token from above>
ZOHO_CALENDAR_REFRESH_TOKEN=<same refresh_token — covers both scopes>
ZOHO_MEETING_CLIENT_ID=<the same client_id you pasted in Step 2>
ZOHO_MEETING_CLIENT_SECRET=<the same client_secret>
ZOHO_CALENDAR_CLIENT_ID=<same>
ZOHO_CALENDAR_CLIENT_SECRET=<same>
ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com.au
ZOHO_MEETING_API_BASE_URL=https://meeting.zoho.com.au/api/v2
ZOHO_CALENDAR_API_BASE_URL=https://calendar.zoho.com.au/api/v1
# Required user_id + calendar_uid (see Step 5):
ZOHO_MEETING_USER_ID=<aimentor@bookedai.au's Zoho user id>
ZOHO_CALENDAR_UID=<the calendar UID where AI Mentor events go>
AIMENTOR_MENTOR_EMAIL=aimentor@bookedai.au`}
                </pre>
              </div>
            </div>
          ) : null}

          {/* Step 5: how to find user_id + calendar_uid */}
          <div className="aim-card" style={{ marginTop: 20, padding: 20 }}>
            <div className="aim-eyebrow">Step 5 · Find ZOHO_MEETING_USER_ID + ZOHO_CALENDAR_UID</div>
            <ol style={{ marginTop: 10, paddingLeft: 22, fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--aim-text)' }}>
              <li>
                <strong>Meeting user_id:</strong> sign into <a href="https://meeting.zoho.com.au" target="_blank" rel="noreferrer" style={{ color: 'var(--aim-teal-deep)', fontWeight: 600 }}>meeting.zoho.com.au</a> as
                {' '}<strong>aimentor@bookedai.au</strong> → click your profile → Settings → "User ID" or "Account
                ID". Copy that value into <code>ZOHO_MEETING_USER_ID</code>.
              </li>
              <li style={{ marginTop: 8 }}>
                <strong>Calendar UID:</strong> open <a href="https://calendar.zoho.com.au" target="_blank" rel="noreferrer" style={{ color: 'var(--aim-teal-deep)', fontWeight: 600 }}>calendar.zoho.com.au</a> →
                {' '}create a new calendar named "AI Mentor 1-on-1 Pro" (so events don't pollute the default
                calendar) → right-click the calendar → "Calendar Settings" → copy the <strong>Calendar UID</strong> /
                {' '}<strong>Calendar Key</strong>. Paste into <code>ZOHO_CALENDAR_UID</code>.
              </li>
            </ol>
          </div>

          {/* Step 6: send to BookedAI ops */}
          <div className="aim-card" style={{ marginTop: 20, padding: 20 }}>
            <div className="aim-eyebrow">Step 6 · Send these values back to BookedAI ops</div>
            <p style={{ marginTop: 8, color: 'var(--aim-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Once you have all the values, send them to BookedAI ops via a secure channel
              (1Password share, encrypted message — <strong>not</strong> plain email):
            </p>
            <ul style={{ marginTop: 10, paddingLeft: 22, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--aim-text)' }}>
              <li>refresh_token (from the curl in Step 4)</li>
              <li>client_id + client_secret (from your Zoho app — Step 2)</li>
              <li>ZOHO_MEETING_USER_ID + ZOHO_CALENDAR_UID (Step 5)</li>
            </ul>
            <p style={{ marginTop: 10, fontSize: '0.86rem', color: 'var(--aim-muted)' }}>
              BookedAI ops sets these in the production env, restarts the backend, and runs the smoke
              test (<code style={{ fontFamily: 'var(--aim-font-mono)' }}>safe_summary()</code> should
              return <code style={{ fontFamily: 'var(--aim-font-mono)' }}>{'{ zoho_meeting_configured: true, zoho_calendar_configured: true }'}</code>).
            </p>
          </div>

          <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--aim-muted)', textAlign: 'center' }}>
            Powered by BookedAI · all values stay in this browser tab unless you copy them
          </p>
        </div>
      </main>
    </div>
  );
}

function CopyBox({
  label,
  value,
  copied,
  onCopy,
  mono = false,
  multiline = false,
  small = false,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
  mono?: boolean;
  multiline?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: multiline ? 'flex-start' : 'center',
        gap: 8,
        marginTop: 10,
        padding: 12,
        background: '#fdfaf3',
        border: '1px solid var(--aim-line)',
        borderRadius: 10,
      }}
    >
      <code
        style={{
          flex: 1,
          fontFamily: mono ? 'var(--aim-font-mono)' : 'var(--aim-font-body)',
          fontSize: small ? '0.74rem' : '0.84rem',
          color: 'var(--aim-ink)',
          wordBreak: 'break-all',
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
        }}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => onCopy(label, value)}
        style={{
          flex: '0 0 auto',
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(20, 160, 146, 0.32)',
          background: copied === label ? 'rgba(47, 158, 117, 0.16)' : 'rgba(20, 160, 146, 0.06)',
          color: copied === label ? '#2f9e75' : 'var(--aim-teal-deep)',
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.74rem',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {copied === label ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default AIMentorZohoOAuthCallbackApp;
