import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import '../../theme/aimentor-tokens.css';

const LOCALE_STORAGE_KEY = 'aimentor.bookedai.locale';
const SESSION_TOKEN_STORAGE_KEY = 'aimentor.bookedai.studentSession';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

type Locale = 'en' | 'vi';
type SignInMethod = 'google' | 'email' | 'booking';

type StudentProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_locale: Locale | string | null;
};

type StudentBookingSummary = {
  booking_intent_id: string;
  booking_reference: string;
  service_name: string | null;
  requested_date: string | null;
  requested_time: string | null;
  timezone: string | null;
  status: string;
  payment_status: string;
  cancel_eligibility?: boolean;
  reschedule_eligibility?: boolean;
};

type StudentProgressEntry = {
  session_date: string | null;
  program_track: string | null;
  skill_level: string | null;
  attendance: number | null;
  notes: string | null;
  next_focus: string | null;
  artifact_url: string | null;
};

type StudentMeResponse = {
  student: StudentProfile;
  bookings: StudentBookingSummary[];
  progress: StudentProgressEntry[];
};

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

// Note: ``Window.google`` is already declared globally by other shells
// (TenantApp.tsx, ChessAccountApp.tsx). Re-declaring it here triggers a
// duplicate-property TS error, so we read the runtime object via a typed
// helper instead.
type GoogleWindow = Window & {
  google?: { accounts?: { id?: GoogleAccountsId } };
};

// ---------------- Translations -------------------------------------------

const dict = {
  en: {
    htmlTitle: 'AI Mentor — Student account',
    nav: {
      brandName: 'AI Mentor 1-1 Pro',
      brandTag: 'Student account',
      backToSales: 'Back to programs',
      signOut: 'Sign out',
    },
    languageToggle: { label: 'Language', en: 'EN', vi: 'VI' },
    signIn: {
      eyebrow: 'Student account',
      title: 'Sign in to view your bookings, payments, and mentor progress.',
      lead:
        'Use your Google account — the same one you used when booking — to see upcoming sessions, Stripe receipts, and the mentor progress journal.',
      googleConfigMissing:
        'Google sign-in is not configured for this environment. Email aimentor@bookedai.au and the team will share your bookings directly.',
      tabs: {
        google: 'Google',
        email: 'Email help',
        booking: 'Booking ref',
      },
      googleHeading: 'Continue with Google',
      googleHelper:
        'Fastest path when your booking email is a Google account.',
      emailHeading: 'Need help by email?',
      emailHelper:
        'Send us the email used for booking and the team will resend your session details.',
      emailCta: 'Email AI Mentor',
      bookingHeading: 'Have a booking reference?',
      bookingHelper:
        'Use the reference from your confirmation email, such as AIM-1234567890.',
      bookingPlaceholder: 'AIM-XXXXXXXXXX',
      bookingCta: 'Open booking',
      authError: 'We could not sign you in just now. Please try again.',
      pendingTitle: 'Signing you in…',
      pendingBody: 'Connecting to Google and AI Mentor.',
      privacy:
        'We only read your email and full name from Google to match your bookings. You can revoke access any time from your Google account.',
    },
    account: {
      welcome: (name: string) => `Welcome back, ${name}.`,
      signedInAs: 'Signed in as',
      bookingsHeading: 'Your bookings',
      bookingsLead: 'Upcoming and recent AI Mentor sessions held in your name.',
      bookingsEmpty:
        'No bookings on file yet. Book a program from the homepage and it will appear here.',
      bookProgramsCta: 'Browse programs',
      progressHeading: 'Progress journal',
      progressLead:
        'Mentor notes after each session. Bring them to your next class as a reference.',
      progressEmpty:
        'Your mentor has not added progress notes yet. They appear here after the first session.',
      tableDate: 'Date',
      tableTime: 'Time',
      tableService: 'Program',
      tableStatus: 'Status',
      tablePayment: 'Payment',
      tableActions: 'Actions',
      actionCancel: 'Cancel',
      actionReschedule: 'Reschedule',
      cancelModalTitle: 'Cancel booking',
      cancelModalBody: (service: string, date: string) =>
        `Cancel your ${service} booking on ${date}? Any payment will be refunded per policy. This cannot be undone.`,
      cancelReasonLabel: 'Reason (optional)',
      cancelConfirmCta: 'Confirm cancel',
      cancelKeepCta: 'Keep booking',
      cancelSuccess: 'Booking cancelled',
      cancelGenericError: 'Could not cancel booking. Please try again.',
      rescheduleModalTitle: 'Reschedule booking',
      rescheduleModalBody: (service: string, date: string) =>
        `Pick a new date and time for your ${service} booking (currently ${date}).`,
      rescheduleNewSlotLabel: 'New date and time',
      rescheduleNoteLabel: 'Note for mentor (optional)',
      rescheduleConfirmCta: 'Confirm reschedule',
      rescheduleCancelCta: 'Keep current time',
      rescheduleSuccess: 'Booking rescheduled',
      rescheduleGenericError: 'Could not reschedule. Please try again.',
      rescheduleSlotMissing: 'Please pick a new date and time.',
      progressDate: 'Session date',
      progressTrack: 'Track',
      progressLevel: 'Skill level',
      progressAttendance: 'Attendance',
      progressNotes: 'Mentor notes',
      progressNext: 'Next focus',
      progressArtifact: 'View artifact',
      loading: 'Loading your account…',
      loadError:
        'We could not load your account. Try refreshing or signing in again.',
      retry: 'Retry',
      logoutError:
        'Sign-out failed, but we cleared your local session.',
    },
    footer: {
      tagline: 'AI Mentor 1-1 Pro — student account portal.',
      poweredBy: 'Powered by BookedAI',
      rights: '© AI Mentor 1-1 Pro. All rights reserved.',
    },
  },
  vi: {
    htmlTitle: 'AI Mentor — Tài khoản học viên',
    nav: {
      brandName: 'AI Mentor 1-1 Pro',
      brandTag: 'Tài khoản học viên',
      backToSales: 'Về trang chương trình',
      signOut: 'Đăng xuất',
    },
    languageToggle: { label: 'Ngôn ngữ', en: 'EN', vi: 'VI' },
    signIn: {
      eyebrow: 'Tài khoản học viên',
      title: 'Đăng nhập để xem lịch học, thanh toán và tiến độ.',
      lead:
        'Dùng tài khoản Google — cùng tài khoản bạn đã dùng khi đặt chỗ — để xem lịch học sắp tới, hoá đơn Stripe và nhật ký tiến độ từ mentor.',
      googleConfigMissing:
        'Đăng nhập Google chưa được cấu hình. Vui lòng email aimentor@bookedai.au để đội AI Mentor gửi lịch học trực tiếp.',
      tabs: {
        google: 'Google',
        email: 'Email hỗ trợ',
        booking: 'Mã booking',
      },
      googleHeading: 'Tiếp tục với Google',
      googleHelper:
        'Nhanh nhất khi email đặt chỗ của bạn là tài khoản Google.',
      emailHeading: 'Cần hỗ trợ qua email?',
      emailHelper:
        'Gửi email bạn đã dùng khi đặt chỗ, đội AI Mentor sẽ gửi lại chi tiết buổi học.',
      emailCta: 'Email AI Mentor',
      bookingHeading: 'Bạn có mã booking?',
      bookingHelper:
        'Dùng mã trong email xác nhận, ví dụ AIM-1234567890.',
      bookingPlaceholder: 'AIM-XXXXXXXXXX',
      bookingCta: 'Mở booking',
      authError: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      pendingTitle: 'Đang đăng nhập…',
      pendingBody: 'Đang kết nối với Google và AI Mentor.',
      privacy:
        'Chúng tôi chỉ đọc email và họ tên từ Google để khớp với lịch học. Bạn có thể thu hồi quyền truy cập bất cứ lúc nào.',
    },
    account: {
      welcome: (name: string) => `Xin chào, ${name}.`,
      signedInAs: 'Đăng nhập với',
      bookingsHeading: 'Lịch học của bạn',
      bookingsLead: 'Các buổi AI Mentor sắp tới và gần đây dưới tên bạn.',
      bookingsEmpty:
        'Chưa có lịch học nào. Đăng ký một chương trình từ trang chủ và lịch sẽ hiển thị tại đây.',
      bookProgramsCta: 'Xem chương trình',
      progressHeading: 'Nhật ký tiến độ',
      progressLead:
        'Ghi chú từ mentor sau mỗi buổi học. Hãy mang theo cho buổi tiếp theo.',
      progressEmpty:
        'Mentor chưa cập nhật tiến độ. Sẽ hiển thị tại đây sau buổi học đầu tiên.',
      tableDate: 'Ngày',
      tableTime: 'Giờ',
      tableService: 'Chương trình',
      tableStatus: 'Trạng thái',
      tablePayment: 'Thanh toán',
      tableActions: 'Thao tác',
      actionCancel: 'Huỷ',
      actionReschedule: 'Đổi lịch',
      cancelModalTitle: 'Huỷ buổi học',
      cancelModalBody: (service: string, date: string) =>
        `Huỷ buổi học ${service} ngày ${date}? Khoản thanh toán (nếu có) sẽ được hoàn theo chính sách. Hành động này không thể hoàn tác.`,
      cancelReasonLabel: 'Lý do (không bắt buộc)',
      cancelConfirmCta: 'Xác nhận huỷ',
      cancelKeepCta: 'Giữ booking',
      cancelSuccess: 'Đã huỷ booking',
      cancelGenericError: 'Không thể huỷ booking. Vui lòng thử lại.',
      rescheduleModalTitle: 'Đổi lịch buổi học',
      rescheduleModalBody: (service: string, date: string) =>
        `Chọn ngày giờ mới cho buổi học ${service} (hiện tại: ${date}).`,
      rescheduleNewSlotLabel: 'Ngày giờ mới',
      rescheduleNoteLabel: 'Ghi chú cho mentor (không bắt buộc)',
      rescheduleConfirmCta: 'Xác nhận đổi lịch',
      rescheduleCancelCta: 'Giữ giờ hiện tại',
      rescheduleSuccess: 'Đã đổi lịch buổi học',
      rescheduleGenericError: 'Không thể đổi lịch. Vui lòng thử lại.',
      rescheduleSlotMissing: 'Vui lòng chọn ngày giờ mới.',
      progressDate: 'Ngày buổi học',
      progressTrack: 'Track',
      progressLevel: 'Trình độ',
      progressAttendance: 'Tham gia',
      progressNotes: 'Ghi chú mentor',
      progressNext: 'Trọng tâm kế tiếp',
      progressArtifact: 'Xem artifact',
      loading: 'Đang tải tài khoản…',
      loadError:
        'Không tải được tài khoản. Vui lòng thử làm mới hoặc đăng nhập lại.',
      retry: 'Thử lại',
      logoutError: 'Đăng xuất gặp lỗi, nhưng phiên đăng nhập đã được xoá khỏi máy.',
    },
    footer: {
      tagline: 'AI Mentor 1-1 Pro — cổng tài khoản học viên.',
      poweredBy: 'Vận hành bởi BookedAI',
      rights: '© AI Mentor 1-1 Pro. Mọi quyền được bảo lưu.',
    },
  },
} as const;

type Dict = (typeof dict)[Locale];

// ---------------- helpers -------------------------------------------------

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
    if (
      parsed &&
      typeof parsed.token === 'string' &&
      parsed.token.trim() &&
      parsed.student
    ) {
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
    // ignore
  }
}

function readGoogleAccountsId(): GoogleAccountsId | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as GoogleWindow).google?.accounts?.id;
}

async function callJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; payload: T | null }> {
  try {
    const res = await fetch(url, init);
    let payload: T | null = null;
    try {
      payload = (await res.json()) as T;
    } catch {
      payload = null;
    }
    return { ok: res.ok, status: res.status, payload };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

// ---------------- icons ---------------------------------------------------

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 18.5V9.5L12 5L19 9.5V18.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="12.4" r="2.4" fill="currentColor" />
      <path
        d="M8.6 15.6 L12 12.4 L15.4 15.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ---------------- Status badge -------------------------------------------

function StatusBadge({ value }: { value: string }) {
  const text = (value || '').trim();
  const lower = text.toLowerCase();
  let background = 'rgba(15, 92, 84, 0.06)';
  let color = 'var(--aim-muted)';
  let border = '1px solid var(--aim-line)';
  if (
    lower.includes('paid') ||
    lower.includes('confirmed') ||
    lower.includes('đã thanh toán')
  ) {
    background = 'rgba(47, 158, 117, 0.14)';
    color = 'var(--aim-success)';
    border = '1px solid rgba(47, 158, 117, 0.32)';
  } else if (
    lower.includes('pending') ||
    lower.includes('đang chờ') ||
    lower.includes('chờ')
  ) {
    background = 'rgba(214, 137, 16, 0.18)';
    color = 'var(--aim-warning)';
    border = '1px solid rgba(214, 137, 16, 0.42)';
  } else if (
    lower.includes('cancel') ||
    lower.includes('failed') ||
    lower.includes('huỷ')
  ) {
    background = 'rgba(192, 57, 43, 0.14)';
    color = 'var(--aim-danger)';
    border = '1px solid rgba(192, 57, 43, 0.32)';
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
        fontFamily: 'var(--aim-font-mono)',
        letterSpacing: '0.02em',
      }}
    >
      {text || '—'}
    </span>
  );
}

// ---------------- Bookings table -----------------------------------------

const cellHeaderStyle: CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--aim-muted)',
  fontWeight: 700,
  fontFamily: 'var(--aim-font-mono)',
};

const cellBodyStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: '0.92rem',
  color: 'var(--aim-text)',
  verticalAlign: 'middle',
};

function BookingsTable({
  bookings,
  t,
  onCancel,
  onReschedule,
}: {
  bookings: StudentBookingSummary[];
  t: Dict;
  onCancel: (booking: StudentBookingSummary) => void;
  onReschedule: (booking: StudentBookingSummary) => void;
}) {
  if (!bookings.length) {
    return (
      <div className="aim-card-tinted" style={{ padding: 22 }}>
        <p style={{ color: 'var(--aim-muted)', fontSize: '0.95rem' }}>
          {t.account.bookingsEmpty}
        </p>
        <a className="aim-btn aim-btn-primary aim-btn-sm" href="/aimentor#programs" style={{ marginTop: 12 }}>
          {t.account.bookProgramsCta} →
        </a>
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: 'var(--aim-paper)',
          borderRadius: 'var(--aim-radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--aim-shadow-card)',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--aim-cream-deep)' }}>
            <th style={cellHeaderStyle}>{t.account.tableDate}</th>
            <th style={cellHeaderStyle}>{t.account.tableTime}</th>
            <th style={cellHeaderStyle}>{t.account.tableService}</th>
            <th style={cellHeaderStyle}>{t.account.tableStatus}</th>
            <th style={cellHeaderStyle}>{t.account.tablePayment}</th>
            <th style={cellHeaderStyle}>{t.account.tableActions}</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const lower = (booking.status || '').toLowerCase();
            const terminal = lower.includes('cancel') || lower.includes('huỷ') || lower.includes('completed');
            // Default to showing buttons when eligibility flag missing (backwards compat).
            const showCancel = booking.cancel_eligibility !== false;
            const showReschedule = booking.reschedule_eligibility !== false;
            return (
              <tr
                key={booking.booking_intent_id}
                style={{ borderTop: '1px solid var(--aim-line)' }}
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
                <td style={cellBodyStyle}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {showCancel ? (
                      <button
                        type="button"
                        className="aim-btn aim-btn-outline aim-btn-sm"
                        disabled={terminal}
                        onClick={() => onCancel(booking)}
                      >
                        {t.account.actionCancel}
                      </button>
                    ) : null}
                    {showReschedule ? (
                      <button
                        type="button"
                        className="aim-btn aim-btn-secondary aim-btn-sm"
                        disabled={terminal}
                        onClick={() => onReschedule(booking)}
                      >
                        {t.account.actionReschedule}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Modal scaffold -----------------------------------------

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  display: 'grid',
  placeItems: 'center',
  padding: 16,
  zIndex: 1000,
};

const modalCardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  maxWidth: 480,
  width: '100%',
  boxShadow: '0 30px 60px rgba(15, 23, 42, 0.30)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
        <h3
          className="aim-display"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            color: 'var(--aim-ink)',
          }}
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

// ---------------- Progress timeline --------------------------------------

function ProgressTimeline({
  progress,
  t,
}: {
  progress: StudentProgressEntry[];
  t: Dict;
}) {
  if (!progress.length) {
    return (
      <div className="aim-card-tinted" style={{ padding: 22 }}>
        <p style={{ color: 'var(--aim-muted)', fontSize: '0.95rem' }}>
          {t.account.progressEmpty}
        </p>
      </div>
    );
  }
  return (
    <ol
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {progress.map((entry, index) => (
        <li
          key={`${entry.session_date}-${index}`}
          className="aim-card-flat"
          style={{ padding: 20 }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'baseline',
            }}
          >
            <span
              className="aim-eyebrow aim-eyebrow-coral"
              style={{ fontSize: '0.7rem' }}
            >
              {t.account.progressDate}
            </span>
            <span
              style={{
                fontSize: '1rem',
                color: 'var(--aim-ink)',
                fontWeight: 600,
                fontFamily: 'var(--aim-font-display)',
                letterSpacing: '-0.01em',
              }}
            >
              {entry.session_date || '—'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              marginTop: 10,
              fontSize: '0.88rem',
              color: 'var(--aim-muted)',
            }}
          >
            {entry.program_track ? (
              <span>
                <strong style={{ color: 'var(--aim-text)' }}>
                  {t.account.progressTrack}:
                </strong>{' '}
                {entry.program_track}
              </span>
            ) : null}
            {entry.skill_level ? (
              <span>
                <strong style={{ color: 'var(--aim-text)' }}>
                  {t.account.progressLevel}:
                </strong>{' '}
                {entry.skill_level}
              </span>
            ) : null}
            {entry.attendance != null ? (
              <span>
                <strong style={{ color: 'var(--aim-text)' }}>
                  {t.account.progressAttendance}:
                </strong>{' '}
                {entry.attendance}
              </span>
            ) : null}
          </div>
          {entry.notes ? (
            <p
              style={{
                marginTop: 12,
                fontSize: '0.92rem',
                lineHeight: 1.65,
                color: 'var(--aim-text)',
              }}
            >
              {entry.notes}
            </p>
          ) : null}
          {entry.next_focus ? (
            <p
              style={{
                marginTop: 8,
                fontSize: '0.88rem',
                color: 'var(--aim-muted)',
              }}
            >
              <strong style={{ color: 'var(--aim-text)' }}>
                {t.account.progressNext}:
              </strong>{' '}
              {entry.next_focus}
            </p>
          ) : null}
          {entry.artifact_url ? (
            <a
              className="aim-btn aim-btn-outline aim-btn-sm"
              href={entry.artifact_url}
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: 10 }}
            >
              {t.account.progressArtifact} →
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

// ---------------- Main app -----------------------------------------------

export function AIMentorAccountApp() {
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
  const [sessionToken, setSessionToken] = useState<string | null>(
    initialSession?.token ?? null,
  );
  const [student, setStudent] = useState<StudentProfile | null>(
    initialSession?.student ?? null,
  );
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('google');
  const [bookingReference, setBookingReference] = useState('');

  const [account, setAccount] = useState<StudentMeResponse | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Cancel / reschedule modal state.
  const [cancelTarget, setCancelTarget] = useState<StudentBookingSummary | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<StudentBookingSummary | null>(null);
  const [rescheduleNewSlot, setRescheduleNewSlot] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [actionToast, setActionToast] = useState<string | null>(null);

  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);

  useEffect(() => {
    document.title = t.htmlTitle;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
    }
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
    if (signInMethod !== 'google') return;
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
          void (async () => {
            const { ok, payload } = await callJson<{
              status?: string;
              data?: { session_token: string; student: StudentProfile };
              error?: { message?: string };
            }>('/api/v1/aimentor/students/google_auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_token: idToken,
                intent: 'sign_in',
                preferred_locale: locale,
              }),
            });
            if (!ok || !payload || payload.status !== 'ok' || !payload.data) {
              setAuthError(
                payload?.error?.message || t.signIn.authError,
              );
              setAuthPending(false);
              return;
            }
            const data = payload.data;
            setSessionToken(data.session_token);
            setStudent(data.student);
            storeSession({ token: data.session_token, student: data.student });
            // Sync server preferred_locale into UI so page flips immediately.
            const nextLocale = (data.student.preferred_locale === 'vi'
              ? 'vi'
              : 'en') as Locale;
            setLocale(nextLocale);
            setAuthPending(false);
          })();
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
  }, [
    googleClientId,
    googleReady,
    signInMethod,
    sessionToken,
    t.signIn.authError,
    locale,
    setLocale,
  ]);

  const loadAccount = useCallback(
    async (token: string) => {
      setAccountLoading(true);
      setAccountError(null);
      const { ok, payload } = await callJson<{
        status?: string;
        data?: StudentMeResponse;
        error?: { message?: string };
      }>('/api/v1/aimentor/students/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ok || !payload || payload.status !== 'ok' || !payload.data) {
        setAccountError(payload?.error?.message || t.account.loadError);
        setAccountLoading(false);
        return;
      }
      const data = payload.data;
      setAccount(data);
      setStudent(data.student);
      storeSession({ token, student: data.student });
      // Honour server-side preferred locale on each load.
      if (data.student.preferred_locale === 'vi' && locale !== 'vi') {
        setLocale('vi');
      } else if (data.student.preferred_locale === 'en' && locale !== 'en') {
        setLocale('en');
      }
      setAccountLoading(false);
    },
    [locale, setLocale, t.account.loadError],
  );

  // Load account whenever a session token is available.
  useEffect(() => {
    if (!sessionToken) {
      setAccount(null);
      return;
    }
    void loadAccount(sessionToken);
  }, [sessionToken, loadAccount]);

  // Auto-dismiss the action toast after a short delay.
  useEffect(() => {
    if (!actionToast) return;
    const timer = window.setTimeout(() => setActionToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionToast]);

  const openCancelModal = useCallback((booking: StudentBookingSummary) => {
    setCancelTarget(booking);
    setCancelReason('');
    setCancelError(null);
  }, []);

  const closeCancelModal = useCallback(() => {
    if (cancelSubmitting) return;
    setCancelTarget(null);
    setCancelReason('');
    setCancelError(null);
  }, [cancelSubmitting]);

  const openRescheduleModal = useCallback((booking: StudentBookingSummary) => {
    setRescheduleTarget(booking);
    setRescheduleNewSlot('');
    setRescheduleNote('');
    setRescheduleError(null);
  }, []);

  const closeRescheduleModal = useCallback(() => {
    if (rescheduleSubmitting) return;
    setRescheduleTarget(null);
    setRescheduleNewSlot('');
    setRescheduleNote('');
    setRescheduleError(null);
  }, [rescheduleSubmitting]);

  const submitCancel = useCallback(async () => {
    if (!cancelTarget || !sessionToken) return;
    setCancelSubmitting(true);
    setCancelError(null);
    const reason = cancelReason.trim();
    const { ok, payload } = await callJson<{
      success?: boolean;
      idempotent?: boolean;
      error?: { message?: string };
    }>(`/api/v1/booking/${encodeURIComponent(cancelTarget.booking_reference)}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ reason: reason || null }),
    });
    setCancelSubmitting(false);
    if (!ok || !payload || payload.success === false) {
      setCancelError(payload?.error?.message || t.account.cancelGenericError);
      return;
    }
    setCancelTarget(null);
    setCancelReason('');
    setActionToast(t.account.cancelSuccess);
    void loadAccount(sessionToken);
  }, [cancelTarget, cancelReason, sessionToken, loadAccount, t.account.cancelGenericError, t.account.cancelSuccess]);

  const submitReschedule = useCallback(async () => {
    if (!rescheduleTarget || !sessionToken) return;
    if (!rescheduleNewSlot) {
      setRescheduleError(t.account.rescheduleSlotMissing);
      return;
    }
    setRescheduleSubmitting(true);
    setRescheduleError(null);
    // Convert the local datetime-local string (no TZ) to ISO 8601 by letting
    // the JS Date constructor interpret it as the user's local time.
    let isoNewStart: string;
    try {
      const parsed = new Date(rescheduleNewSlot);
      if (Number.isNaN(parsed.getTime())) throw new Error('invalid');
      isoNewStart = parsed.toISOString();
    } catch {
      setRescheduleSubmitting(false);
      setRescheduleError(t.account.rescheduleSlotMissing);
      return;
    }
    const userTz =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;
    const note = rescheduleNote.trim();
    // TODO Phase 2: replace with full slot picker (mirror AIMentorChat's slot grid).
    const { ok, payload } = await callJson<{
      success?: boolean;
      error?: { message?: string };
    }>(`/api/v1/booking/${encodeURIComponent(rescheduleTarget.booking_reference)}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        new_start_at: isoNewStart,
        ...(userTz ? { new_timezone: userTz } : {}),
        ...(note ? { customer_note: note } : {}),
      }),
    });
    setRescheduleSubmitting(false);
    if (!ok || !payload || payload.success === false) {
      setRescheduleError(payload?.error?.message || t.account.rescheduleGenericError);
      return;
    }
    setRescheduleTarget(null);
    setRescheduleNewSlot('');
    setRescheduleNote('');
    setActionToast(t.account.rescheduleSuccess);
    void loadAccount(sessionToken);
  }, [
    rescheduleTarget,
    rescheduleNewSlot,
    rescheduleNote,
    sessionToken,
    loadAccount,
    t.account.rescheduleGenericError,
    t.account.rescheduleSuccess,
    t.account.rescheduleSlotMissing,
  ]);

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
      const { ok } = await callJson('/api/v1/aimentor/students/me/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!ok) {
        setAuthError(t.account.logoutError);
      }
    }
  }, [sessionToken, t.account.logoutError]);

  // Sync locale to backend when changed (and user is signed in).
  const syncLocale = useCallback(
    async (next: Locale) => {
      if (!sessionToken) return;
      await callJson('/api/v1/aimentor/students/me/locale', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ preferred_locale: next }),
      });
    },
    [sessionToken],
  );

  const onLocaleChange = useCallback(
    (next: Locale) => {
      setLocale(next);
      void syncLocale(next);
    },
    [setLocale, syncLocale],
  );

  return (
    <div className="aimentor-app">
      <nav className="aim-nav" aria-label="Primary">
        <div className="aim-container aim-nav-inner">
          <a href="/aimentor" className="aim-brand" aria-label={t.nav.brandName}>
            <span className="aim-brand-mark">
              <BrandMark size={22} />
            </span>
            <span className="aim-brand-text">
              <span className="aim-brand-name">{t.nav.brandName}</span>
              <span className="aim-brand-tag">{t.nav.brandTag}</span>
            </span>
          </a>
          <div className="aim-nav-links" aria-label="Sections">
            <a href="/aimentor" className="aim-nav-link">
              {t.nav.backToSales}
            </a>
          </div>
          <div className="aim-nav-actions">
            <div
              role="group"
              aria-label={t.languageToggle.label}
              className="aim-lang-toggle"
            >
              <button
                type="button"
                className="aim-lang-option"
                aria-pressed={locale === 'en'}
                onClick={() => onLocaleChange('en')}
              >
                {t.languageToggle.en}
              </button>
              <button
                type="button"
                className="aim-lang-option"
                aria-pressed={locale === 'vi'}
                onClick={() => onLocaleChange('vi')}
              >
                {t.languageToggle.vi}
              </button>
            </div>
            {sessionToken ? (
              <button
                type="button"
                className="aim-btn aim-btn-secondary aim-btn-sm"
                onClick={() => void handleSignOut()}
              >
                {t.nav.signOut}
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="aim-shell">
        {!sessionToken ? (
          <section className="aim-section">
            <div className="aim-container">
              <div className="aim-card" style={{ maxWidth: 560, marginInline: 'auto' }}>
                <span className="aim-eyebrow aim-eyebrow-coral">
                  {t.signIn.eyebrow}
                </span>
                <h1
                  className="aim-display"
                  style={{
                    marginTop: 12,
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--aim-ink)',
                  }}
                >
                  {t.signIn.title}
                </h1>
                <p
                  style={{
                    marginTop: 14,
                    color: 'var(--aim-muted)',
                    lineHeight: 1.65,
                    fontSize: '0.95rem',
                  }}
                >
                  {t.signIn.lead}
                </p>

                {authPending ? (
                  <div className="aim-status-info" style={{ marginTop: 18 }}>
                    <strong>{t.signIn.pendingTitle}</strong>
                    <div style={{ marginTop: 4 }}>{t.signIn.pendingBody}</div>
                  </div>
                ) : null}

                {authError ? (
                  <div className="aim-status-error" role="alert" style={{ marginTop: 18 }}>
                    {authError}
                  </div>
                ) : null}

                <div
                  role="tablist"
                  aria-label={t.signIn.title}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 4,
                    marginTop: 22,
                    padding: 4,
                    border: '1px solid var(--aim-line)',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.04)',
                  }}
                >
                  {(['google', 'email', 'booking'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      role="tab"
                      aria-selected={signInMethod === method}
                      onClick={() => setSignInMethod(method)}
                      style={{
                        minHeight: 40,
                        border: 0,
                        borderRadius: 9,
                        background: signInMethod === method ? '#ffffff' : 'transparent',
                        color: signInMethod === method ? 'var(--aim-ink)' : 'var(--aim-muted)',
                        boxShadow: signInMethod === method ? '0 8px 18px rgba(15, 23, 42, 0.10)' : 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--aim-font-display)',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                      }}
                    >
                      {t.signIn.tabs[method]}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    border: '1px solid var(--aim-line)',
                    borderRadius: 14,
                    padding: 16,
                    background: '#fff',
                  }}
                >
                  {signInMethod === 'google' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid var(--aim-line)',
                            color: 'var(--aim-ink)',
                            fontWeight: 800,
                          }}
                        >
                          G
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--aim-ink)' }}>
                            {t.signIn.googleHeading}
                          </div>
                          <div style={{ marginTop: 3, color: 'var(--aim-muted)', fontSize: '0.84rem', lineHeight: 1.45 }}>
                            {t.signIn.googleHelper}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', minHeight: 44 }}>
                        {googleClientId ? (
                          <div ref={googleButtonRef} aria-label="Google sign-in" />
                        ) : (
                          <p
                            style={{
                              color: 'var(--aim-muted)',
                              fontSize: '0.9rem',
                              textAlign: 'center',
                              lineHeight: 1.6,
                              margin: 0,
                            }}
                          >
                            {t.signIn.googleConfigMissing}
                          </p>
                        )}
                      </div>
                    </>
                  ) : null}

                  {signInMethod === 'email' ? (
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--aim-ink)' }}>
                        {t.signIn.emailHeading}
                      </div>
                      <p style={{ margin: '6px 0 14px', color: 'var(--aim-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                        {t.signIn.emailHelper}
                      </p>
                      <a
                        className="aim-btn aim-btn-primary aim-btn-block"
                        href="mailto:aimentor@bookedai.au?subject=AI%20Mentor%20account%20help"
                      >
                        {t.signIn.emailCta}
                      </a>
                    </div>
                  ) : null}

                  {signInMethod === 'booking' ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const ref = bookingReference.trim();
                        if (ref) {
                          window.location.href = `https://portal.bookedai.au/order/${encodeURIComponent(ref)}`;
                        }
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--aim-ink)' }}>
                        {t.signIn.bookingHeading}
                      </div>
                      <p style={{ margin: '6px 0 12px', color: 'var(--aim-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                        {t.signIn.bookingHelper}
                      </p>
                      <input
                        className="aim-input"
                        value={bookingReference}
                        onChange={(event) => setBookingReference(event.target.value.toUpperCase())}
                        placeholder={t.signIn.bookingPlaceholder}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="aim-btn aim-btn-primary aim-btn-block"
                        style={{ marginTop: 10 }}
                      >
                        {t.signIn.bookingCta}
                      </button>
                    </form>
                  ) : null}
                </div>

                <p
                  style={{
                    marginTop: 22,
                    fontSize: '0.82rem',
                    color: 'var(--aim-muted)',
                    lineHeight: 1.6,
                  }}
                >
                  {t.signIn.privacy}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="aim-section">
            <div className="aim-container" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <header className="aim-section-header">
                <span className="aim-eyebrow">{t.signIn.eyebrow}</span>
                <h1
                  className="aim-display"
                  style={{
                    fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
                    color: 'var(--aim-ink)',
                  }}
                >
                  {student?.full_name
                    ? t.account.welcome(student.full_name)
                    : t.account.welcome(student?.email ?? 'student')}
                </h1>
                <p
                  style={{
                    color: 'var(--aim-muted)',
                    fontSize: '0.95rem',
                    marginTop: 8,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{t.account.signedInAs}: </span>
                  <span style={{ color: 'var(--aim-text)', fontWeight: 600 }}>
                    {student?.email ?? '—'}
                  </span>
                </p>
              </header>

              {accountLoading && !account ? (
                <div className="aim-status-info">{t.account.loading}</div>
              ) : null}

              {accountError ? (
                <div className="aim-status-error" role="alert">
                  {accountError}
                  <button
                    type="button"
                    className="aim-btn aim-btn-outline aim-btn-sm"
                    style={{ marginLeft: 12 }}
                    onClick={() => sessionToken && void loadAccount(sessionToken)}
                  >
                    {t.account.retry}
                  </button>
                </div>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2
                    className="aim-section-title"
                    style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)' }}
                  >
                    {t.account.bookingsHeading}
                  </h2>
                  <p
                    style={{
                      color: 'var(--aim-muted)',
                      fontSize: '0.92rem',
                      marginTop: 4,
                    }}
                  >
                    {t.account.bookingsLead}
                  </p>
                </div>
                <BookingsTable
                  bookings={account?.bookings ?? []}
                  t={t}
                  onCancel={openCancelModal}
                  onReschedule={openRescheduleModal}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2
                    className="aim-section-title"
                    style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)' }}
                  >
                    {t.account.progressHeading}
                  </h2>
                  <p
                    style={{
                      color: 'var(--aim-muted)',
                      fontSize: '0.92rem',
                      marginTop: 4,
                    }}
                  >
                    {t.account.progressLead}
                  </p>
                </div>
                <ProgressTimeline progress={account?.progress ?? []} t={t} />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="aim-footer">
        <div className="aim-container">
          <div className="aim-footer-bottom">
            <span>{t.footer.rights}</span>
            <span>{t.footer.poweredBy}</span>
          </div>
        </div>
      </footer>

      {actionToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--aim-ink)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 999,
            fontSize: '0.92rem',
            fontWeight: 600,
            boxShadow: '0 18px 32px rgba(15, 23, 42, 0.30)',
            zIndex: 1100,
          }}
        >
          {actionToast}
        </div>
      ) : null}

      {cancelTarget ? (
        <ModalShell title={t.account.cancelModalTitle} onClose={closeCancelModal}>
          <p style={{ margin: 0, color: 'var(--aim-text)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            {t.account.cancelModalBody(
              cancelTarget.service_name || '—',
              cancelTarget.requested_date || '—',
            )}
          </p>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: '0.85rem',
              color: 'var(--aim-muted)',
              fontWeight: 600,
            }}
          >
            {t.account.cancelReasonLabel}
            <textarea
              className="aim-input"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              style={{ resize: 'vertical', minHeight: 70 }}
              disabled={cancelSubmitting}
            />
          </label>
          {cancelError ? (
            <div className="aim-status-error" role="alert">
              {cancelError}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="aim-btn aim-btn-outline aim-btn-sm"
              onClick={closeCancelModal}
              disabled={cancelSubmitting}
            >
              {t.account.cancelKeepCta}
            </button>
            <button
              type="button"
              className="aim-btn aim-btn-sm"
              onClick={() => void submitCancel()}
              disabled={cancelSubmitting}
              style={{
                background: 'var(--aim-danger)',
                color: '#fff',
                border: '1px solid var(--aim-danger)',
              }}
            >
              {t.account.cancelConfirmCta}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {rescheduleTarget ? (
        <ModalShell title={t.account.rescheduleModalTitle} onClose={closeRescheduleModal}>
          <p style={{ margin: 0, color: 'var(--aim-text)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            {t.account.rescheduleModalBody(
              rescheduleTarget.service_name || '—',
              `${rescheduleTarget.requested_date || '—'} ${rescheduleTarget.requested_time || ''}`.trim(),
            )}
          </p>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: '0.85rem',
              color: 'var(--aim-muted)',
              fontWeight: 600,
            }}
          >
            {t.account.rescheduleNewSlotLabel}
            {/* TODO Phase 2: replace with full slot picker (reuse AIMentorChat slot grid). */}
            <input
              type="datetime-local"
              className="aim-input"
              value={rescheduleNewSlot}
              onChange={(event) => setRescheduleNewSlot(event.target.value)}
              disabled={rescheduleSubmitting}
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: '0.85rem',
              color: 'var(--aim-muted)',
              fontWeight: 600,
            }}
          >
            {t.account.rescheduleNoteLabel}
            <textarea
              className="aim-input"
              value={rescheduleNote}
              onChange={(event) => setRescheduleNote(event.target.value)}
              rows={2}
              style={{ resize: 'vertical', minHeight: 56 }}
              disabled={rescheduleSubmitting}
            />
          </label>
          {rescheduleError ? (
            <div className="aim-status-error" role="alert">
              {rescheduleError}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="aim-btn aim-btn-outline aim-btn-sm"
              onClick={closeRescheduleModal}
              disabled={rescheduleSubmitting}
            >
              {t.account.rescheduleCancelCta}
            </button>
            <button
              type="button"
              className="aim-btn aim-btn-primary aim-btn-sm"
              onClick={() => void submitReschedule()}
              disabled={rescheduleSubmitting}
            >
              {t.account.rescheduleConfirmCta}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default AIMentorAccountApp;
