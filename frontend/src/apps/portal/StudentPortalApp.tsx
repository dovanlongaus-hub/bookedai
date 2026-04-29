import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  apiV1,
  type StudentBookingSummary,
  type StudentMeResponse,
  type StudentProfile,
  type StudentProgressEntry,
} from '../../shared/api/v1';

type Locale = 'en' | 'vi';

const LOCALE_STORAGE_KEY = 'bookedai.studentPortal.locale';
const SESSION_STORAGE_KEY = 'bookedai.studentPortal.session';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type StoredSession = { token: string; student: StudentProfile };

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

function readGoogleAccountsId(): GoogleAccountsId | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }).google;
  return candidate?.accounts?.id ?? null;
}

const dict = {
  en: {
    htmlTitle: 'BookedAI — Student account',
    nav: {
      brand: 'BookedAI Student Portal',
      brandTag: 'Bookings · Payments · Progress',
      backHome: 'Back to bookedai.au',
      signOut: 'Sign out',
    },
    languageToggle: {
      label: 'Language',
      en: 'EN',
      vi: 'VI',
    },
    signIn: {
      eyebrow: 'Student & parent account',
      title: 'Sign in to view your bookings, payments, and progress.',
      lead:
        'One account across all BookedAI services you have enrolled in — chess, AI mentor, and more. Sign in with the Google account that received your booking confirmation email.',
      googleConfigMissing:
        'Google sign-in is not configured for this environment. Email support@bookedai.au and we will share your bookings directly.',
      authError: 'We could not sign you in just now. Please try again.',
      pendingTitle: 'Signing you in…',
      pendingBody: 'Connecting to Google and BookedAI.',
      privacy:
        'We only read your email and full name from Google to match the booking. You can revoke access any time from your Google account.',
    },
    account: {
      welcome: (name: string) => `Welcome, ${name}.`,
      signedInAs: 'Signed in as',
      bookingsHeading: 'Your bookings',
      bookingsLead: 'Upcoming and recent sessions held in your name.',
      bookingsEmpty: 'No bookings on file yet. Once you enrol in a class it will appear here.',
      progressHeading: 'Progress timeline',
      progressLead: 'Coach notes from each session — useful to bring into your next class.',
      progressEmpty: 'Your coach has not added progress notes yet. Notes appear here after the first session.',
      tableDate: 'Date',
      tableTime: 'Time',
      tableService: 'Program',
      tableStatus: 'Status',
      tablePayment: 'Payment',
      tableMeeting: 'Meeting',
      meetingJoin: 'Join',
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
      tagline: 'BookedAI Student Portal — one account, every BookedAI service.',
      poweredBy: 'Powered by BookedAI',
      rights: '© BookedAI. All rights reserved.',
    },
  },
  vi: {
    htmlTitle: 'BookedAI — Tài khoản học viên',
    nav: {
      brand: 'Cổng học viên BookedAI',
      brandTag: 'Lịch học · Thanh toán · Tiến độ',
      backHome: 'Về bookedai.au',
      signOut: 'Đăng xuất',
    },
    languageToggle: {
      label: 'Ngôn ngữ',
      en: 'EN',
      vi: 'VI',
    },
    signIn: {
      eyebrow: 'Tài khoản học viên & phụ huynh',
      title: 'Đăng nhập để xem lịch học, thanh toán và tiến độ.',
      lead:
        'Một tài khoản dùng chung cho mọi dịch vụ BookedAI bạn đã đăng ký — cờ vua, AI mentor và các dịch vụ khác. Đăng nhập bằng tài khoản Google đã nhận email xác nhận đăng ký.',
      googleConfigMissing:
        'Đăng nhập Google chưa được cấu hình cho môi trường này. Vui lòng email support@bookedai.au để chúng tôi gửi lịch học trực tiếp.',
      authError: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      pendingTitle: 'Đang đăng nhập…',
      pendingBody: 'Đang kết nối với Google và BookedAI.',
      privacy:
        'Chúng tôi chỉ đọc email và họ tên từ Google để khớp với lịch học. Bạn có thể thu hồi quyền truy cập bất kỳ lúc nào từ tài khoản Google.',
    },
    account: {
      welcome: (name: string) => `Xin chào, ${name}.`,
      signedInAs: 'Đăng nhập với',
      bookingsHeading: 'Lịch học của bạn',
      bookingsLead: 'Các buổi học sắp tới và gần đây dưới tên của bạn.',
      bookingsEmpty: 'Chưa có lịch học. Sau khi đăng ký một lớp, lịch sẽ hiển thị tại đây.',
      progressHeading: 'Tiến độ học tập',
      progressLead: 'Ghi chú từ giáo viên sau mỗi buổi học — hữu ích cho buổi tiếp theo.',
      progressEmpty: 'Giáo viên chưa cập nhật tiến độ. Sẽ hiển thị tại đây sau buổi học đầu tiên.',
      tableDate: 'Ngày',
      tableTime: 'Giờ',
      tableService: 'Chương trình',
      tableStatus: 'Trạng thái',
      tablePayment: 'Thanh toán',
      tableMeeting: 'Buổi học',
      meetingJoin: 'Tham gia',
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
      tagline: 'Cổng học viên BookedAI — một tài khoản cho mọi dịch vụ BookedAI.',
      poweredBy: 'Vận hành bởi BookedAI',
      rights: '© BookedAI. Mọi quyền được bảo lưu.',
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

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim() && parsed.student) {
      return { token: parsed.token, student: parsed.student as StudentProfile };
    }
  } catch {
    // ignore
  }
  return null;
}

function writeStoredSession(payload: StoredSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!payload) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function readSessionFromUrlOnce(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('session');
    if (!token) return null;
    url.searchParams.delete('session');
    const cleaned = `${url.pathname}${url.search ? url.search : ''}${url.hash}`;
    window.history.replaceState({}, '', cleaned);
    return token.trim() || null;
  } catch {
    return null;
  }
}

function StatusBadge({ value }: { value: string }) {
  const text = (value || '').trim();
  const lower = text.toLowerCase();
  let className =
    'inline-flex items-center rounded-apple-pill border px-3 py-1 text-xs font-semibold capitalize';
  let style: React.CSSProperties = {};
  if (lower.includes('paid') || lower.includes('confirmed') || lower.includes('đã thanh toán')) {
    style = {
      borderColor: 'rgba(34, 139, 84, 0.32)',
      background: 'rgba(34, 139, 84, 0.12)',
      color: '#1f7245',
    };
  } else if (lower.includes('pending') || lower.includes('chờ') || lower.includes('đang')) {
    style = {
      borderColor: 'rgba(180, 130, 40, 0.34)',
      background: 'rgba(255, 196, 80, 0.18)',
      color: '#7a4f0b',
    };
  } else if (lower.includes('cancel') || lower.includes('failed') || lower.includes('huỷ')) {
    style = {
      borderColor: 'rgba(180, 56, 56, 0.32)',
      background: 'rgba(180, 56, 56, 0.12)',
      color: '#992525',
    };
  } else {
    style = {
      borderColor: 'rgba(0,0,0,0.1)',
      background: '#f5f5f7',
      color: '#1d1d1f',
    };
  }
  return (
    <span className={className} style={style}>
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
      <p className="text-sm text-black/64">{t.account.bookingsEmpty}</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse overflow-hidden rounded-apple-large bg-apple-white shadow-apple-sm">
        <thead>
          <tr className="bg-apple-light">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tableDate}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tableTime}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tableService}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tableStatus}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tablePayment}
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
              {t.account.tableMeeting}
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.booking_intent_id} className="border-t border-black/8">
              <td className="px-4 py-3 text-sm text-apple-near-black">
                {booking.requested_date || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-apple-near-black">
                {booking.requested_time || '—'}
              </td>
              <td className="px-4 py-3 text-sm text-apple-near-black">
                {booking.service_name || '—'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={booking.status} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={booking.payment_status} />
              </td>
              <td className="px-4 py-3 text-sm">
                {booking.meeting_url ? (
                  <a
                    href={booking.meeting_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-apple-blue underline-offset-2 hover:underline"
                  >
                    {t.account.meetingJoin}
                  </a>
                ) : (
                  <span className="text-black/56">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressTimeline({
  progress,
  t,
}: {
  progress: StudentProgressEntry[];
  t: (typeof dict)[Locale];
}) {
  if (!progress.length) {
    return <p className="text-sm text-black/64">{t.account.progressEmpty}</p>;
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {progress.map((entry, index) => (
        <li
          key={`${entry.session_date}-${index}`}
          className="rounded-apple-large border border-black/8 bg-apple-white p-5 shadow-apple-sm"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-blue">
              {t.account.progressDate}
            </span>
            <span className="text-base font-semibold text-apple-near-black">
              {entry.session_date || '—'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-black/64">
            <span>
              <strong className="text-apple-near-black">{t.account.progressLevel}:</strong>{' '}
              {entry.level || '—'}
            </span>
            <span>
              <strong className="text-apple-near-black">{t.account.progressAttendance}:</strong>{' '}
              {entry.attendance || '—'}
            </span>
          </div>
          {entry.notes ? (
            <p className="mt-3 text-sm leading-7 text-apple-near-black">{entry.notes}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function StudentPortalApp() {
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

  // Bootstrap: pull session from URL if present (cross-subdomain handoff from chess.bookedai.au).
  // Then fall back to localStorage.
  const initial = useMemo<{ token: string | null; student: StudentProfile | null }>(() => {
    const tokenFromUrl = readSessionFromUrlOnce();
    if (tokenFromUrl) {
      // Persist immediately so subsequent reloads work.
      writeStoredSession({
        token: tokenFromUrl,
        student: {
          id: '',
          email: '',
          full_name: '',
          avatar_url: null,
        },
      });
      return { token: tokenFromUrl, student: null };
    }
    const stored = readStoredSession();
    if (stored) return { token: stored.token, student: stored.student };
    return { token: null, student: null };
  }, []);

  const [sessionToken, setSessionToken] = useState<string | null>(initial.token);
  const [student, setStudent] = useState<StudentProfile | null>(initial.student);
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

  // Inject Google Identity Services script once.
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

  // Initialize + render Google sign-in button when needed.
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
              writeStoredSession({ token: data.session_token, student: data.student });
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
        setStudent(response.data.student);
        writeStoredSession({ token, student: response.data.student });
      } catch (error) {
        const message = error instanceof Error ? error.message : t.account.loadError;
        setAccountError(message || t.account.loadError);
      } finally {
        setAccountLoading(false);
      }
    },
    [t.account.loadError],
  );

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
    writeStoredSession(null);
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
        setAuthError(t.account.logoutError);
      }
    }
  }, [sessionToken, t.account.logoutError]);

  const initials = (student?.full_name || student?.email || '?').charAt(0).toUpperCase();

  return (
    <main className="booked-shell min-h-screen bg-apple-light text-apple-near-black">
      <header className="sticky top-0 z-30 border-b border-black/6 bg-apple-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-apple-standard bg-apple-blue text-sm font-semibold text-apple-white"
            >
              ⌘
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[-0.01em] text-apple-near-black">
                {t.nav.brand}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/52">
                {t.nav.brandTag}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://bookedai.au"
              className="text-xs font-medium text-black/64 hover:text-apple-blue"
            >
              {t.nav.backHome}
            </a>
            <div
              role="group"
              aria-label={t.languageToggle.label}
              className="flex items-center overflow-hidden rounded-apple-pill border border-black/12 bg-apple-white"
            >
              <button
                type="button"
                aria-pressed={locale === 'en'}
                onClick={() => setLocale('en')}
                className={
                  locale === 'en'
                    ? 'bg-apple-blue px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-apple-white'
                    : 'px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-black/64 hover:text-apple-near-black'
                }
              >
                {t.languageToggle.en}
              </button>
              <button
                type="button"
                aria-pressed={locale === 'vi'}
                onClick={() => setLocale('vi')}
                className={
                  locale === 'vi'
                    ? 'bg-apple-blue px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-apple-white'
                    : 'px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-black/64 hover:text-apple-near-black'
                }
              >
                {t.languageToggle.vi}
              </button>
            </div>
            {sessionToken ? (
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                className="booked-button-secondary"
              >
                {t.nav.signOut}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 lg:pb-28">
        {!sessionToken ? (
          <section className="template-card mx-auto max-w-xl p-8 sm:p-10">
            <span className="template-kicker">{t.signIn.eyebrow}</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-apple-near-black">
              {t.signIn.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-black/64">{t.signIn.lead}</p>

            {!googleClientId ? (
              <div
                role="alert"
                className="mt-6 rounded-apple-large border border-apple-danger/30 bg-apple-danger/10 px-4 py-3 text-sm text-apple-danger"
              >
                {t.signIn.googleConfigMissing}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                <div ref={googleButtonRef} aria-label="Google sign-in" />
                {authPending ? (
                  <div className="rounded-apple-large bg-apple-light px-4 py-3 text-sm text-black/64">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-blue">
                      {t.signIn.pendingTitle}
                    </div>
                    <p className="mt-1">{t.signIn.pendingBody}</p>
                  </div>
                ) : null}
                {authError ? (
                  <div
                    role="alert"
                    className="rounded-apple-large border border-apple-danger/30 bg-apple-danger/10 px-4 py-3 text-sm text-apple-danger"
                  >
                    {authError}
                  </div>
                ) : null}
                <p className="text-xs leading-6 text-black/52">{t.signIn.privacy}</p>
              </div>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {student?.avatar_url ? (
                  <img
                    src={student.avatar_url}
                    alt=""
                    className="h-14 w-14 rounded-full border-2 border-apple-blue object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-apple-blue text-xl font-semibold text-apple-white"
                  >
                    {initials}
                  </span>
                )}
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.03em] text-apple-near-black">
                    {t.account.welcome(student?.full_name || student?.email || '')}
                  </h1>
                  <p className="mt-1 text-sm text-black/56">
                    {t.account.signedInAs}: {student?.email || '—'}
                  </p>
                </div>
              </div>
            </header>

            {accountLoading ? (
              <p className="text-sm text-black/56">{t.account.loading}</p>
            ) : null}

            {accountError ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-apple-large border border-apple-danger/30 bg-apple-danger/10 px-4 py-4"
              >
                <span className="text-sm text-apple-danger">{accountError}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (sessionToken) {
                      void loadAccount(sessionToken);
                    }
                  }}
                  className="booked-button-secondary self-start"
                >
                  {t.account.retry}
                </button>
              </div>
            ) : null}

            {!accountLoading && !accountError && account ? (
              <>
                <section>
                  <header className="mb-3">
                    <span className="template-kicker">{t.account.bookingsHeading}</span>
                    <p className="mt-2 text-sm text-black/64">{t.account.bookingsLead}</p>
                  </header>
                  <BookingsTable bookings={account.bookings} t={t} />
                </section>
                <section>
                  <header className="mb-3">
                    <span className="template-kicker">{t.account.progressHeading}</span>
                    <p className="mt-2 text-sm text-black/64">{t.account.progressLead}</p>
                  </header>
                  <ProgressTimeline progress={account.progress} t={t} />
                </section>
              </>
            ) : null}
          </div>
        )}
      </div>

      <footer className="border-t border-black/8 bg-apple-white/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-black/52 sm:px-8">
          <span>{t.footer.rights}</span>
          <span>{t.footer.poweredBy}</span>
        </div>
      </footer>
    </main>
  );
}
