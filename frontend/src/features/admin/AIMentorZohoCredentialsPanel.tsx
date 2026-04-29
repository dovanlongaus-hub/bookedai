/**
 * AI Mentor — Zoho credentials admin panel.
 *
 * Lets the tenant admin paste the client_id / client_secret /
 * refresh_token / meeting_user_id / calendar_uid into a form that POSTs
 * to ``PATCH /api/v1/tenants/me/aimentor-zoho-credentials``. The backend
 * stores these in ``tenant_settings.settings_json -> 'integrations' ->
 * 'zoho_aimentor'`` and the Zoho adapters read from there before falling
 * back to env vars (no backend restart needed).
 *
 * Security:
 *  - Existing values come back masked from the GET endpoint
 *    (``client_secret`` / ``refresh_token`` rendered as ``"1000.NK…XQV"``).
 *    Operator types a new value to overwrite — full secret never
 *    re-displayed.
 *  - Submission is HTTPS only, gated by tenant-admin Bearer token, and
 *    the secret travels straight to backend → Postgres. No third-party
 *    JS in this file.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

type CredentialFields =
  | 'client_id'
  | 'client_secret'
  | 'refresh_token'
  | 'meeting_user_id'
  | 'calendar_uid'
  | 'accounts_base_url'
  | 'meeting_api_base_url'
  | 'calendar_api_base_url';

type CredentialPayload = Partial<Record<CredentialFields, string>>;

type CredentialsResponse = {
  status?: string;
  data?: {
    credentials: CredentialPayload & { client_secret?: string | null; refresh_token?: string | null };
    configured: boolean;
    saved_at: string | null;
  };
  error?: { message?: string };
};

type SaveResponse = {
  status?: string;
  data?: {
    credentials: CredentialPayload;
    saved_at: string;
    saved_by_email: string;
  };
  error?: { message?: string };
};

type TestConnectionResult = {
  meeting: { ok: boolean; error: string | null };
  calendar: { ok: boolean; error: string | null };
  both_ok: boolean;
};

type TestConnectionResponse = {
  status?: string;
  data?: TestConnectionResult;
  error?: { message?: string };
};

type Locale = 'en' | 'vi';

const dict = {
  en: {
    title: 'AI Mentor — Zoho credentials',
    lead: 'Paste the Zoho OAuth values here so the platform can schedule Zoho Meeting + Zoho Calendar events on every reservation. Stored in tenant_settings (DB) — no backend restart needed.',
    helpWizard:
      'Need to grab the values? Run the OAuth wizard: aimentor.bookedai.au/aimentor/zoho-oauth-callback',
    statusConfigured: '✓ Configured',
    statusMissing: '⚠ Not configured — Zoho calls will fall back to env vars',
    savedAt: 'Last saved',
    fieldClientId: 'Client ID',
    fieldClientSecret: 'Client Secret',
    fieldRefreshToken: 'Refresh Token',
    fieldMeetingUserId: 'Meeting User ID',
    fieldCalendarUid: 'Calendar UID',
    fieldAccountsBase: 'Accounts base URL (default: accounts.zoho.com.au)',
    fieldMeetingBase: 'Meeting API base URL (default: meeting.zoho.com.au/api/v2)',
    fieldCalendarBase: 'Calendar API base URL (default: calendar.zoho.com.au/api/v1)',
    secretPlaceholder: 'Paste new value to overwrite (existing value not shown)',
    save: 'Save credentials',
    saving: 'Saving…',
    saveError: 'Could not save. Try again.',
    saveSuccess: 'Saved.',
    securityNote:
      'Tip: never share these values via plain chat or email. Use 1Password / encrypted channels. Rotate the client_secret in api-console.zoho.com.au if it was ever exposed.',
    testConnection: 'Test connection',
    testing: 'Testing…',
    testResultMeetingOk: '✓ Zoho Meeting reachable',
    testResultMeetingFail: '✗ Zoho Meeting failed',
    testResultCalendarOk: '✓ Zoho Calendar reachable',
    testResultCalendarFail: '✗ Zoho Calendar failed',
    testResultBothOk: 'Both services authorised — ready to provision real Zoho artefacts on every reservation.',
    testResultPartial: 'Partial success — fix the failing service before going live.',
    testRequestError: 'Could not run the connection test. Check that credentials were saved.',
  },
  vi: {
    title: 'AI Mentor — Thông tin Zoho',
    lead: 'Paste các giá trị Zoho OAuth vào đây để platform tự tạo Zoho Meeting + Calendar event cho mỗi lịch học. Lưu trong tenant_settings (DB) — không cần restart backend.',
    helpWizard:
      'Cần lấy các giá trị? Chạy wizard OAuth tại: aimentor.bookedai.au/aimentor/zoho-oauth-callback',
    statusConfigured: '✓ Đã cấu hình',
    statusMissing: '⚠ Chưa cấu hình — Zoho call sẽ rơi về env vars',
    savedAt: 'Lần lưu cuối',
    fieldClientId: 'Client ID',
    fieldClientSecret: 'Client Secret',
    fieldRefreshToken: 'Refresh Token',
    fieldMeetingUserId: 'Meeting User ID',
    fieldCalendarUid: 'Calendar UID',
    fieldAccountsBase: 'Accounts base URL (mặc định: accounts.zoho.com.au)',
    fieldMeetingBase: 'Meeting API base URL (mặc định: meeting.zoho.com.au/api/v2)',
    fieldCalendarBase: 'Calendar API base URL (mặc định: calendar.zoho.com.au/api/v1)',
    secretPlaceholder: 'Paste giá trị mới để ghi đè (giá trị cũ không hiển thị)',
    save: 'Lưu thông tin',
    saving: 'Đang lưu…',
    saveError: 'Không lưu được. Vui lòng thử lại.',
    saveSuccess: 'Đã lưu.',
    securityNote:
      'Lưu ý: không share các giá trị này qua chat / email thường. Dùng 1Password / kênh mã hoá. Rotate client_secret tại api-console.zoho.com.au nếu lỡ bị lộ.',
    testConnection: 'Kiểm tra kết nối',
    testing: 'Đang kiểm tra…',
    testResultMeetingOk: '✓ Zoho Meeting kết nối được',
    testResultMeetingFail: '✗ Zoho Meeting thất bại',
    testResultCalendarOk: '✓ Zoho Calendar kết nối được',
    testResultCalendarFail: '✗ Zoho Calendar thất bại',
    testResultBothOk: 'Cả hai service đã authorise — sẵn sàng provision Zoho artifacts thật cho mỗi reservation.',
    testResultPartial: 'Một service fail — sửa trước khi go-live.',
    testRequestError: 'Không chạy được test. Kiểm tra credentials đã save chưa.',
  },
} as const;

export type AIMentorZohoCredentialsPanelProps = {
  sessionToken: string | null;
  locale?: Locale;
  className?: string;
};

export function AIMentorZohoCredentialsPanel({
  sessionToken,
  locale,
  className,
}: AIMentorZohoCredentialsPanelProps) {
  const resolvedLocale: Locale = useMemo(() => {
    if (locale === 'en' || locale === 'vi') return locale;
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('bookedai.admin.locale');
        if (stored === 'vi') return 'vi';
      } catch {
        // ignore
      }
    }
    return 'en';
  }, [locale]);
  const t = dict[resolvedLocale];

  const [existing, setExisting] = useState<CredentialPayload | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const [form, setForm] = useState<CredentialPayload>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Test-connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/v1/tenants/me/aimentor-zoho-credentials', {
        method: 'GET',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const payload = (await res.json().catch(() => null)) as CredentialsResponse | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) return;
      setExisting(payload.data.credentials);
      setSavedAt(payload.data.saved_at);
      setConfigured(payload.data.configured);
    } catch {
      // silent — operator can still save fresh values
    }
  }, [sessionToken]);

  useEffect(() => {
    if (sessionToken) void load();
  }, [sessionToken, load]);

  async function handleTestConnection() {
    if (!sessionToken) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/tenants/me/aimentor-zoho-credentials/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const payload = (await res.json().catch(() => null)) as TestConnectionResponse | null;
      if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
        setTestError(payload?.error?.message || t.testRequestError);
        return;
      }
      setTestResult(payload.data);
    } catch {
      setTestError(t.testRequestError);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionToken) return;
    setSaving(true);
    setError(null);
    setSuccessToast(null);
    // Strip empty strings — backend treats those as "leave existing".
    const trimmed: CredentialPayload = {};
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'string' && v.trim()) {
        trimmed[k as CredentialFields] = v.trim();
      }
    }
    try {
      const res = await fetch('/api/v1/tenants/me/aimentor-zoho-credentials', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(trimmed),
      });
      const payload = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok || !payload || payload.status !== 'ok') {
        setError(payload?.error?.message || t.saveError);
        return;
      }
      setSuccessToast(t.saveSuccess);
      setForm({});
      void load();
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  if (!sessionToken) {
    return (
      <div className={className} style={{ padding: 22 }}>
        <p style={{ fontSize: '0.95rem', color: '#5b6b66' }}>
          Sign in with your AI Mentor tenant Google account to manage Zoho credentials.
        </p>
      </div>
    );
  }

  return (
    <section
      className={className}
      style={{
        background: '#fdfaf3',
        borderRadius: 18,
        border: '1px solid rgba(15, 92, 84, 0.12)',
        padding: 24,
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#0f5c54',
          }}
        >
          ai-mentor-doer · zoho integration
        </div>
        <h2
          style={{
            fontFamily: "'Space Grotesk', Inter, sans-serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#061614',
            marginTop: 6,
          }}
        >
          {t.title}
        </h2>
        <p
          style={{
            fontSize: '0.92rem',
            color: '#5b6b66',
            marginTop: 6,
            maxWidth: 640,
            lineHeight: 1.6,
          }}
        >
          {t.lead}
        </p>
        <p style={{ marginTop: 6, fontSize: '0.82rem', color: '#5b6b66' }}>
          <a
            href="/aimentor/zoho-oauth-callback"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0f5c54', textDecoration: 'none', fontWeight: 600 }}
          >
            {t.helpWizard} →
          </a>
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 10,
          background: configured ? 'rgba(47, 158, 117, 0.1)' : 'rgba(255, 107, 61, 0.08)',
          border: `1px solid ${configured ? 'rgba(47, 158, 117, 0.32)' : 'rgba(255, 107, 61, 0.32)'}`,
          fontSize: '0.88rem',
          color: configured ? '#2f9e75' : '#e84e1e',
          fontWeight: 600,
        }}
      >
        <span>{configured ? t.statusConfigured : t.statusMissing}</span>
        {savedAt ? (
          <span style={{ fontSize: '0.78rem', color: '#5b6b66', fontWeight: 500 }}>
            {t.savedAt}: {new Date(savedAt).toLocaleString(resolvedLocale === 'vi' ? 'vi-VN' : 'en-AU')}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
        <FormField
          label={t.fieldClientId}
          value={form.client_id ?? ''}
          existingMasked={existing?.client_id ?? null}
          onChange={(v) => setForm({ ...form, client_id: v })}
          autoComplete="off"
        />
        <FormField
          label={t.fieldClientSecret}
          value={form.client_secret ?? ''}
          existingMasked={existing?.client_secret ?? null}
          onChange={(v) => setForm({ ...form, client_secret: v })}
          secret
          placeholder={t.secretPlaceholder}
          autoComplete="off"
        />
        <FormField
          label={t.fieldRefreshToken}
          value={form.refresh_token ?? ''}
          existingMasked={existing?.refresh_token ?? null}
          onChange={(v) => setForm({ ...form, refresh_token: v })}
          secret
          placeholder={t.secretPlaceholder}
          autoComplete="off"
        />
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <FormField
            label={t.fieldMeetingUserId}
            value={form.meeting_user_id ?? ''}
            existingMasked={existing?.meeting_user_id ?? null}
            onChange={(v) => setForm({ ...form, meeting_user_id: v })}
          />
          <FormField
            label={t.fieldCalendarUid}
            value={form.calendar_uid ?? ''}
            existingMasked={existing?.calendar_uid ?? null}
            onChange={(v) => setForm({ ...form, calendar_uid: v })}
          />
        </div>
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#5b6b66', fontWeight: 600 }}>
            Override default Zoho API base URLs (advanced)
          </summary>
          <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
            <FormField
              label={t.fieldAccountsBase}
              value={form.accounts_base_url ?? ''}
              existingMasked={existing?.accounts_base_url ?? null}
              onChange={(v) => setForm({ ...form, accounts_base_url: v })}
            />
            <FormField
              label={t.fieldMeetingBase}
              value={form.meeting_api_base_url ?? ''}
              existingMasked={existing?.meeting_api_base_url ?? null}
              onChange={(v) => setForm({ ...form, meeting_api_base_url: v })}
            />
            <FormField
              label={t.fieldCalendarBase}
              value={form.calendar_api_base_url ?? ''}
              existingMasked={existing?.calendar_api_base_url ?? null}
              onChange={(v) => setForm({ ...form, calendar_api_base_url: v })}
            />
          </div>
        </details>
        {error ? (
          <div role="alert" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(192, 57, 43, 0.1)', border: '1px solid rgba(192, 57, 43, 0.3)', color: '#c0392b', fontSize: '0.88rem' }}>
            {error}
          </div>
        ) : null}
        {successToast ? (
          <div role="status" style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(47, 158, 117, 0.12)', border: '1px solid rgba(47, 158, 117, 0.32)', color: '#2f9e75', fontSize: '0.88rem' }}>
            {successToast}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              border: '1px solid #ff6b3d',
              background: '#ff6b3d',
              color: '#fdfaf3',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.92rem',
            }}
          >
            {saving ? t.saving : t.save}
          </button>
          <button
            type="button"
            onClick={() => void handleTestConnection()}
            disabled={!configured || testing}
            title={
              configured
                ? undefined
                : 'Save credentials first, then test the connection'
            }
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              border: '1px solid rgba(15, 92, 84, 0.32)',
              background: 'transparent',
              color: configured ? '#0f5c54' : '#5b6b66',
              fontWeight: 700,
              cursor: !configured || testing ? 'not-allowed' : 'pointer',
              fontSize: '0.92rem',
              opacity: configured ? 1 : 0.5,
            }}
          >
            {testing ? t.testing : t.testConnection}
          </button>
        </div>

        {/* Test-connection result panel */}
        {testError ? (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(192, 57, 43, 0.1)',
              border: '1px solid rgba(192, 57, 43, 0.3)',
              color: '#c0392b',
              fontSize: '0.88rem',
            }}
          >
            {testError}
          </div>
        ) : null}
        {testResult ? (
          <div
            role="status"
            style={{
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${testResult.both_ok ? 'rgba(47, 158, 117, 0.32)' : 'rgba(255, 107, 61, 0.32)'}`,
              background: testResult.both_ok
                ? 'rgba(47, 158, 117, 0.08)'
                : 'rgba(255, 107, 61, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk', Inter, sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                color: testResult.both_ok ? '#0f5c54' : '#e84e1e',
              }}
            >
              {testResult.both_ok ? t.testResultBothOk : t.testResultPartial}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <ServiceTestRow
                ok={testResult.meeting.ok}
                error={testResult.meeting.error}
                okLabel={t.testResultMeetingOk}
                failLabel={t.testResultMeetingFail}
              />
              <ServiceTestRow
                ok={testResult.calendar.ok}
                error={testResult.calendar.error}
                okLabel={t.testResultCalendarOk}
                failLabel={t.testResultCalendarFail}
              />
            </div>
          </div>
        ) : null}
        <p
          style={{
            fontSize: '0.78rem',
            color: '#5b6b66',
            lineHeight: 1.55,
            marginTop: 4,
          }}
        >
          {t.securityNote}
        </p>
      </form>
    </section>
  );
}

function ServiceTestRow({
  ok,
  error,
  okLabel,
  failLabel,
}: {
  ok: boolean;
  error: string | null;
  okLabel: string;
  failLabel: string;
}) {
  return (
    <div
      style={{
        flex: '1 1 240px',
        padding: '10px 12px',
        borderRadius: 10,
        background: '#ffffff',
        border: `1px solid ${ok ? 'rgba(47, 158, 117, 0.32)' : 'rgba(192, 57, 43, 0.32)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.78rem',
          fontWeight: 700,
          color: ok ? '#2f9e75' : '#c0392b',
        }}
      >
        {ok ? okLabel : failLabel}
      </div>
      {!ok && error ? (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.74rem',
            color: '#c0392b',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  existingMasked,
  placeholder,
  autoComplete,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  existingMasked: string | null | undefined;
  placeholder?: string;
  autoComplete?: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const inputType = secret && !revealed ? 'password' : 'text';
  const showRevealToggle = secret && value.length > 0;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#5b6b66',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          style={{
            width: '100%',
            padding: showRevealToggle ? '10px 64px 10px 12px' : '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(15, 92, 84, 0.18)',
            background: '#ffffff',
            color: '#1f2a26',
            fontSize: '0.92rem',
            fontFamily: secret ? "'JetBrains Mono', monospace" : 'inherit',
          }}
        />
        {showRevealToggle ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(15, 92, 84, 0.18)',
              background: 'rgba(20, 160, 146, 0.06)',
              color: '#0f5c54',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {revealed ? 'hide' : 'show'}
          </button>
        ) : null}
      </div>
      {existingMasked ? (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.72rem',
            color: '#5b6b66',
          }}
        >
          Stored: <code>{existingMasked}</code>
        </span>
      ) : null}
    </label>
  );
}

export default AIMentorZohoCredentialsPanel;
