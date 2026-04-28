import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '../../theme/chess-tokens.css';
import { apiV1, type StudentBookingSummary, type StudentMeResponse, type StudentProfile, type StudentProgressEntry } from '../../shared/api/v1';

type Locale = 'en' | 'vi';

const LOCALE_STORAGE_KEY = 'chess.bookedai.locale';
const SESSION_TOKEN_STORAGE_KEY = 'chess.bookedai.studentSession';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type GoogleCredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  prompt: () => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number | boolean>,
  ) => void;
  cancel: () => void;
  disableAutoSelect: () => void;
};

// We deliberately do not extend the global `Window` interface here; another app
// (`TenantApp`) already declares the `window.google` shape and TypeScript would
// complain about redeclaration. Read access goes through this helper which
// performs a structural cast at the call site.
function readGoogleAccountsId(): GoogleAccountsId | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } }).google;
  return candidate?.accounts?.id ?? null;
}

const dict = {
  en: {
    htmlTitle: 'GM Mai Hung Chess Academy — Student account',
    nav: {
      brandName: 'Mai Hung Chess Academy',
      brandTag: 'Student account',
      backToHome: 'Back to homepage',
      signOut: 'Sign out',
    },
    languageToggle: {
      label: 'Language',
      en: 'EN',
      vi: 'VI',
    },
    signIn: {
      eyebrow: 'Student & parent account',
      title: 'Sign in to view your bookings and progress.',
      lead: 'Use your Google account — the same one a parent or student already uses for email or Drive — to see upcoming sessions, payment status, and the coach progress notes.',
      googleConfigMissing:
        'Google sign-in is not configured for this environment. Email chess@bookedai.au and the academy will share your bookings directly.',
      authError: 'We could not sign you in just now. Please try again.',
      pendingTitle: 'Signing you in…',
      pendingBody: 'Connecting to Google and the chess academy.',
      privacy:
        'We only read your email and full name from Google to match the booking. You can revoke access at any time from your Google account.',
    },
    account: {
      welcome: (name: string) => `Welcome back, ${name}.`,
      signedInAs: 'Signed in as',
      bookingsHeading: 'Your bookings',
      bookingsLead: 'Upcoming and recent chess sessions held in your name.',
      bookingsEmpty: 'No bookings on file yet. Book a session and it will appear here.',
      progressHeading: 'Progress timeline',
      progressLead: 'Coach notes from each session — bring them to your next class as a reference.',
      progressEmpty: 'Your coach has not added progress notes yet. They appear here after the first session.',
      tableDate: 'Date',
      tableTime: 'Time',
      tableService: 'Program',
      tableStatus: 'Status',
      tablePayment: 'Payment',
      progressDate: 'Session date',
      progressLevel: 'Level',
      progressAttendance: 'Attendance',
      progressNotes: 'Coach notes',
      loading: 'Loading your account…',
      loadError: 'We could not load your account. Try refreshing or signing in again.',
      retry: 'Retry',
      logoutError: 'Sign-out failed, but we cleared your local session.',
    },
    footer: {
      tagline: 'GM Mai Hung Chess Academy — student & parent account portal.',
      poweredBy: 'Powered by BookedAI',
      rights: '© GM Mai Hung Chess Academy. All rights reserved.',
    },
  },
  vi: {
    htmlTitle: 'Học viện Cờ vua GM Mai Hùng — Tài khoản học viên',
    nav: {
      brandName: 'Học viện Mai Hùng',
      brandTag: 'Tài khoản học viên',
      backToHome: 'Về trang chủ',
      signOut: 'Đăng xuất',
    },
    languageToggle: {
      label: 'Ngôn ngữ',
      en: 'EN',
      vi: 'VI',
    },
    signIn: {
      eyebrow: 'Tài khoản học viên & phụ huynh',
      title: 'Đăng nhập để xem lịch học và tiến độ.',
      lead: 'Dùng tài khoản Google — cùng tài khoản phụ huynh hoặc học viên đang dùng cho email hoặc Drive — để xem lịch học, tình trạng thanh toán và ghi chú tiến độ từ giáo viên.',
      googleConfigMissing:
        'Đăng nhập Google chưa được cấu hình cho môi trường này. Vui lòng email chess@bookedai.au để học viện gửi lịch học trực tiếp.',
      authError: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      pendingTitle: 'Đang đăng nhập…',
      pendingBody: 'Đang kết nối với Google và học viện cờ.',
      privacy:
        'Chúng tôi chỉ đọc email và họ tên từ Google để khớp với lịch học. Bạn có thể thu hồi quyền truy cập bất kỳ lúc nào từ tài khoản Google.',
    },
    account: {
      welcome: (name: string) => `Xin chào, ${name}.`,
      signedInAs: 'Đăng nhập với',
      bookingsHeading: 'Lịch học của bạn',
      bookingsLead: 'Các buổi học cờ sắp tới và gần đây dưới tên của bạn.',
      bookingsEmpty: 'Chưa có lịch học nào. Đăng ký một buổi học và lịch sẽ hiển thị tại đây.',
      progressHeading: 'Tiến độ học tập',
      progressLead: 'Ghi chú từ giáo viên sau mỗi buổi học — hãy mang theo cho buổi tiếp theo.',
      progressEmpty: 'Giáo viên chưa cập nhật tiến độ. Sẽ hiển thị tại đây sau buổi học đầu tiên.',
      tableDate: 'Ngày',
      tableTime: 'Giờ',
      tableService: 'Chương trình',
      tableStatus: 'Trạng thái',
      tablePayment: 'Thanh toán',
      progressDate: 'Ngày buổi học',
      progressLevel: 'Trình độ',
      progressAttendance: 'Tham gia',
      progressNotes: 'Ghi chú giáo viên',
      loading: 'Đang tải tài khoản…',
      loadError: 'Không tải được tài khoản. Vui lòng thử làm mới hoặc đăng nhập lại.',
      retry: 'Thử lại',
      logoutError: 'Đăng xuất gặp lỗi, nhưng phiên đăng nhập đã được xóa khỏi máy.',
    },
    footer: {
      tagline: 'Học viện Cờ vua GM Mai Hùng — cổng tài khoản dành cho học viên và phụ huynh.',
      poweredBy: 'Vận hành bởi BookedAI',
      rights: '© Học viện Cờ vua GM Mai Hùng. Mọi quyền được bảo lưu.',
    },
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
  } catch {
    // ignore
  }
  return 'en';
}

function readStoredSession(): { token: string; student: StudentProfile } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; student?: StudentProfile };
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim() && parsed.student) {
      return { token: parsed.token, student: parsed.student };
    }
  } catch {
    // ignore corrupt local state
  }
  return null;
}

function storeSession(payload: { token: string; student: StudentProfile } | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!payload) {
      window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

function KnightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.5 2.2c-.6-.1-1.2.1-1.6.5l-2.7 2.7-1.4-.7c-.4-.2-.9-.1-1.2.2l-.9.9c-.4.4-.4 1 0 1.4l1.5 1.5L4.6 11c-.5.6-.7 1.4-.6 2.1l.3 1.5-1.1 1.1c-.5.5-.5 1.3 0 1.8l.7.7c.4.4 1 .5 1.5.3l1.2-.6 1.2 1.2c.5.5 1.1.7 1.7.6L18.5 18c1.6-.2 2.5-1.9 1.7-3.3l-.9-1.5c.6-.2 1-.7 1-1.4V8.7c0-.3-.1-.7-.3-.9l-3.6-4.4c-.4-.5-1-.7-1.6-.6l-2.3.4zm.5 4.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
  );
}

function StatusBadge({ value }: { value: string }) {
  const text = (value || '').trim();
  const lower = text.toLowerCase();
  let background = 'var(--chess-paper)';
  let color = 'var(--chess-muted)';
  let border = '1px solid var(--chess-line)';
  if (lower.includes('paid') || lower.includes('confirmed') || lower.includes('đã thanh toán')) {
    background = 'rgba(47, 110, 62, 0.14)';
    color = 'var(--chess-success)';
    border = '1px solid rgba(47, 110, 62, 0.32)';
  } else if (lower.includes('pending') || lower.includes('đang chờ') || lower.includes('chờ')) {
    background = 'rgba(201, 162, 74, 0.18)';
    color = 'var(--chess-gold-deep)';
    border = '1px solid rgba(201, 162, 74, 0.42)';
  } else if (lower.includes('cancel') || lower.includes('failed') || lower.includes('huỷ')) {
    background = 'rgba(181, 51, 51, 0.14)';
    color = 'var(--chess-danger)';
    border = '1px solid rgba(181, 51, 51, 0.32)';
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: '0.78rem',
        fontWeight: 600,
        background,
        color,
        border,
        textTransform: 'capitalize',
      }}
    >
      {text || '—'}
    </span>
  );
}

function BookingsTable({
  bookings,
  t,
}: {
  bookings: StudentBookingSummary[];
  t: (typeof dict)[Locale];
}) {
  if (!bookings.length) {
    return (
      <p style={{ color: 'var(--chess-muted)', fontSize: '0.92rem' }}>{t.account.bookingsEmpty}</p>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: 'var(--chess-paper)',
          borderRadius: 'var(--chess-radius)',
          overflow: 'hidden',
          boxShadow: 'var(--chess-shadow-card)',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--chess-ivory)' }}>
            <th style={cellHeaderStyle}>{t.account.tableDate}</th>
            <th style={cellHeaderStyle}>{t.account.tableTime}</th>
            <th style={cellHeaderStyle}>{t.account.tableService}</th>
            <th style={cellHeaderStyle}>{t.account.tableStatus}</th>
            <th style={cellHeaderStyle}>{t.account.tablePayment}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.booking_intent_id}
              style={{ borderTop: '1px solid var(--chess-line)' }}
            >
              <td style={cellBodyStyle}>{booking.requested_date || '—'}</td>
              <td style={cellBodyStyle}>{booking.requested_time || '—'}</td>
              <td style={cellBodyStyle}>{booking.service_name || '—'}</td>
              <td style={cellBodyStyle}>
                <StatusBadge value={booking.status} />
              </td>
              <td style={cellBodyStyle}>
                <StatusBadge value={booking.payment_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.72rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--chess-muted)',
  fontWeight: 700,
};

const cellBodyStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '0.92rem',
  color: 'var(--chess-text)',
  verticalAlign: 'middle',
};

function ProgressTimeline({
  progress,
  t,
}: {
  progress: StudentProgressEntry[];
  t: (typeof dict)[Locale];
}) {
  if (!progress.length) {
    return (
      <p style={{ color: 'var(--chess-muted)', fontSize: '0.92rem' }}>{t.account.progressEmpty}</p>
    );
  }
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {progress.map((entry, index) => (
        <li
          key={`${entry.session_date}-${index}`}
          style={{
            background: 'var(--chess-paper)',
            border: '1px solid var(--chess-line)',
            borderRadius: 'var(--chess-radius)',
            padding: 18,
            boxShadow: 'var(--chess-shadow-card)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: 'var(--chess-gold-deep)',
                fontWeight: 700,
              }}
            >
              {t.account.progressDate}
            </span>
            <span style={{ fontSize: '0.95rem', color: 'var(--chess-navy)', fontWeight: 600 }}>
              {entry.session_date || '—'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 10,
              fontSize: '0.88rem',
              color: 'var(--chess-muted)',
            }}
          >
            <span>
              <strong style={{ color: 'var(--chess-text)' }}>{t.account.progressLevel}:</strong>{' '}
              {entry.level || '—'}
            </span>
            <span>
              <strong style={{ color: 'var(--chess-text)' }}>{t.account.progressAttendance}:</strong>{' '}
              {entry.attendance || '—'}
            </span>
          </div>
          {entry.notes ? (
            <p
              style={{
                marginTop: 12,
                fontSize: '0.92rem',
                lineHeight: 1.65,
                color: 'var(--chess-text)',
              }}
            >
              {entry.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ChessAccountApp() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const t = dict[locale];

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    }
  }, []);

  const initialSession = useMemo(() => readStoredSession(), []);
  const [sessionToken, setSessionToken] = useState<string | null>(initialSession?.token ?? null);
  const [student, setStudent] = useState<StudentProfile | null>(initialSession?.student ?? null);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [account, setAccount] = useState<StudentMeResponse | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);

  useEffect(() => {
    document.title = t.htmlTitle;
    document.documentElement.setAttribute('lang', locale === 'vi' ? 'vi' : 'en');
  }, [locale, t.htmlTitle]);

  // Inject Google Identity Services script.
  useEffect(() => {
    if (!googleClientId) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (readGoogleAccountsId()) {
      setGoogleReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => setGoogleReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [googleClientId]);

  // Initialize and render Google sign-in button when ready.
  useEffect(() => {
    if (sessionToken) return;
    if (!googleReady || !googleClientId) return;
    const accountsId = readGoogleAccountsId();
    if (!googleButtonRef.current || !accountsId) return;

    const container = googleButtonRef.current;
    container.innerHTML = '';

    if (!googleInitializedRef.current) {
      accountsId.initialize({
        client_id: googleClientId,
        callback: (response) => {
          const idToken = response.credential?.trim();
          if (!idToken) {
            setAuthError(t.signIn.authError);
            return;
          }
          setAuthPending(true);
          setAuthError(null);
          void apiV1
            .studentGoogleAuth({ id_token: idToken, intent: 'sign_in' })
            .then((envelope) => {
              if (envelope.status !== 'ok') {
                throw new Error(t.signIn.authError);
              }
              const data = envelope.data;
              setSessionToken(data.session_token);
              setStudent(data.student);
              storeSession({ token: data.session_token, student: data.student });
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : t.signIn.authError;
              setAuthError(message || t.signIn.authError);
            })
            .finally(() => {
              setAuthPending(false);
            });
        },
      });
      googleInitializedRef.current = true;
    }

    accountsId.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 280,
    });
  }, [googleClientId, googleReady, sessionToken, t.signIn.authError]);

  const loadAccount = useCallback(
    async (token: string) => {
      setAccountLoading(true);
      setAccountError(null);
      try {
        const response = await apiV1.studentMe(token);
        if (response.status !== 'ok') {
          throw new Error(t.account.loadError);
        }
        setAccount(response.data);
        // Update student record from server in case avatar/name changed.
        setStudent(response.data.student);
        storeSession({ token, student: response.data.student });
      } catch (error) {
        const message = error instanceof Error ? error.message : t.account.loadError;
        setAccountError(message || t.account.loadError);
      } finally {
        setAccountLoading(false);
      }
    },
    [t.account.loadError],
  );

  // Load account whenever a session token is available.
  useEffect(() => {
    if (!sessionToken) {
      setAccount(null);
      return;
    }
    void loadAccount(sessionToken);
  }, [sessionToken, loadAccount]);

  const handleSignOut = useCallback(async () => {
    const token = sessionToken;
    setSessionToken(null);
    setStudent(null);
    setAccount(null);
    storeSession(null);
    googleInitializedRef.current = false;
    const accountsId = readGoogleAccountsId();
    if (accountsId?.disableAutoSelect) {
      try {
        accountsId.disableAutoSelect();
      } catch {
        // ignore
      }
    }
    if (token) {
      try {
        await apiV1.studentLogout(token);
      } catch {
        // We already cleared the local session — surface a soft warning only.
        setAuthError(t.account.logoutError);
      }
    }
  }, [sessionToken, t.account.logoutError]);

  return (
    <div className="chess-app chess-shell">
      <nav className="chess-nav" aria-label="Primary">
        <div className="chess-container chess-nav-inner">
          <a href="/" className="chess-brand" aria-label={t.nav.brandName}>
            <span className="chess-brand-mark" aria-hidden="true">
              <KnightIcon className="" />
            </span>
            <span className="chess-brand-text">
              <span className="chess-brand-name">{t.nav.brandName}</span>
              <span className="chess-brand-tag">{t.nav.brandTag}</span>
            </span>
          </a>
          <div className="chess-nav-links" aria-label="Sections">
            <a href="/" className="chess-nav-link">
              {t.nav.backToHome}
            </a>
          </div>
          <div className="chess-nav-actions">
            <div role="group" aria-label={t.languageToggle.label} className="chess-lang-toggle">
              <button
                type="button"
                className="chess-lang-option"
                aria-pressed={locale === 'en'}
                onClick={() => setLocale('en')}
              >
                {t.languageToggle.en}
              </button>
              <button
                type="button"
                className="chess-lang-option"
                aria-pressed={locale === 'vi'}
                onClick={() => setLocale('vi')}
              >
                {t.languageToggle.vi}
              </button>
            </div>
            {sessionToken ? (
              <button
                type="button"
                className="chess-btn chess-btn-outline chess-btn-sm"
                onClick={() => {
                  void handleSignOut();
                }}
              >
                {t.nav.signOut}
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      <main>
        <section className="chess-section chess-section-paper">
          <div className="chess-container">
            {!sessionToken ? (
              <div className="chess-card" style={{ maxWidth: 640, margin: '0 auto' }}>
                <span className="chess-eyebrow chess-eyebrow-on-light">{t.signIn.eyebrow}</span>
                <h1
                  className="chess-display"
                  style={{ marginTop: 12, fontSize: '1.8rem', color: 'var(--chess-navy)' }}
                >
                  {t.signIn.title}
                </h1>
                <p
                  style={{
                    marginTop: 14,
                    fontSize: '0.95rem',
                    lineHeight: 1.65,
                    color: 'var(--chess-muted)',
                  }}
                >
                  {t.signIn.lead}
                </p>

                {!googleClientId ? (
                  <div className="chess-status-error" style={{ marginTop: 18 }} role="alert">
                    {t.signIn.googleConfigMissing}
                  </div>
                ) : (
                  <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div ref={googleButtonRef} aria-label="Google sign-in" />
                    {authPending ? (
                      <div
                        className="chess-status-success"
                        style={{ background: 'var(--chess-ivory)' }}
                      >
                        <span className="chess-eyebrow chess-eyebrow-on-light">
                          {t.signIn.pendingTitle}
                        </span>
                        <p
                          style={{
                            marginTop: 8,
                            fontSize: '0.9rem',
                            color: 'var(--chess-muted)',
                          }}
                        >
                          {t.signIn.pendingBody}
                        </p>
                      </div>
                    ) : null}
                    {authError ? (
                      <div className="chess-status-error" role="alert">
                        {authError}
                      </div>
                    ) : null}
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--chess-muted)',
                        lineHeight: 1.6,
                      }}
                    >
                      {t.signIn.privacy}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <header
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {student?.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt=""
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--chess-gold)',
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: 'var(--chess-navy)',
                          color: 'var(--chess-on-navy)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--chess-font-display)',
                          fontSize: '1.4rem',
                          fontWeight: 700,
                        }}
                      >
                        {(student?.full_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <h1
                        className="chess-display"
                        style={{ fontSize: '1.6rem', color: 'var(--chess-navy)' }}
                      >
                        {t.account.welcome(student?.full_name || '')}
                      </h1>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--chess-muted)',
                          marginTop: 4,
                        }}
                      >
                        {t.account.signedInAs}: {student?.email || '—'}
                      </p>
                    </div>
                  </div>
                </header>

                {accountLoading ? (
                  <p style={{ color: 'var(--chess-muted)', fontSize: '0.92rem' }}>
                    {t.account.loading}
                  </p>
                ) : null}

                {accountError ? (
                  <div
                    className="chess-status-error"
                    role="alert"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <span>{accountError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (sessionToken) {
                          void loadAccount(sessionToken);
                        }
                      }}
                      className="chess-btn chess-btn-sm chess-btn-outline"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      {t.account.retry}
                    </button>
                  </div>
                ) : null}

                {!accountLoading && !accountError && account ? (
                  <>
                    <section>
                      <header style={{ marginBottom: 12 }}>
                        <span className="chess-eyebrow chess-eyebrow-on-light">
                          {t.account.bookingsHeading}
                        </span>
                        <p
                          style={{
                            fontSize: '0.92rem',
                            color: 'var(--chess-muted)',
                            marginTop: 6,
                          }}
                        >
                          {t.account.bookingsLead}
                        </p>
                      </header>
                      <BookingsTable bookings={account.bookings} t={t} />
                    </section>
                    <section>
                      <header style={{ marginBottom: 12 }}>
                        <span className="chess-eyebrow chess-eyebrow-on-light">
                          {t.account.progressHeading}
                        </span>
                        <p
                          style={{
                            fontSize: '0.92rem',
                            color: 'var(--chess-muted)',
                            marginTop: 6,
                          }}
                        >
                          {t.account.progressLead}
                        </p>
                      </header>
                      <ProgressTimeline progress={account.progress} t={t} />
                    </section>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="chess-footer">
        <div className="chess-container">
          <div className="chess-footer-grid">
            <div>
              <div className="chess-brand" style={{ marginBottom: 14 }}>
                <span className="chess-brand-mark" aria-hidden="true">
                  <KnightIcon className="" />
                </span>
                <span className="chess-brand-text">
                  <span className="chess-brand-name">{t.nav.brandName}</span>
                  <span className="chess-brand-tag">{t.nav.brandTag}</span>
                </span>
              </div>
              <p
                style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--chess-on-navy-muted)' }}
              >
                {t.footer.tagline}
              </p>
            </div>
          </div>
          <div className="chess-footer-bottom">
            <span>{t.footer.rights}</span>
            <span>{t.footer.poweredBy}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
