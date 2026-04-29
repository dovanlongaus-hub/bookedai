import { useEffect, useMemo, useState } from 'react';

import '../../theme/chess-tokens.css';

const LOCALE_STORAGE_KEY = 'chess.bookedai.locale';
const SESSION_STORAGE_KEY = 'chess.bookedai.studentSession';

type Locale = 'en' | 'vi';

const dict = {
  en: {
    htmlTitle: 'GM Mai Hung Chess Academy — Redirecting to Student Portal',
    title: 'Redirecting to your BookedAI Student Portal…',
    lead:
      'Your account, bookings, payments, and progress live on the unified BookedAI Student Portal at portal.bookedai.au. We are taking you there now.',
    fallback: 'If the redirect does not happen automatically:',
    cta: 'Open Student Portal',
    backHome: 'Back to chess.bookedai.au',
  },
  vi: {
    htmlTitle: 'Học viện Cờ vua GM Mai Hùng — Đang chuyển tới Cổng học viên',
    title: 'Đang chuyển tới Cổng học viên BookedAI…',
    lead:
      'Tài khoản, lịch học, thanh toán và tiến độ của bạn nằm trên Cổng học viên chung tại portal.bookedai.au. Chúng tôi đang đưa bạn tới đó.',
    fallback: 'Nếu trình duyệt không tự chuyển:',
    cta: 'Mở Cổng học viên',
    backHome: 'Về chess.bookedai.au',
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

function readLegacyChessSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed?.token === 'string' && parsed.token.trim() ? parsed.token : null;
  } catch {
    return null;
  }
}

function buildPortalUrl(token: string | null): string {
  if (typeof window === 'undefined') return '/student-account';
  const { hostname, protocol } = window.location;
  const base = hostname.endsWith('.bookedai.au')
    ? `${protocol}//portal.bookedai.au/student-account`
    : `/student-account`;
  if (!token) return base;
  return `${base}?session=${encodeURIComponent(token)}`;
}

export function ChessAccountApp() {
  const [locale] = useState<Locale>(getInitialLocale);
  const t = dict[locale];

  const portalUrl = useMemo(() => buildPortalUrl(readLegacyChessSessionToken()), []);

  useEffect(() => {
    document.title = t.htmlTitle;
    document.documentElement.setAttribute('lang', locale === 'vi' ? 'vi' : 'en');
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.location.replace(portalUrl);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [locale, portalUrl, t.htmlTitle]);

  return (
    <div className="chess-app chess-shell">
      <main>
        <section className="chess-section chess-section-paper">
          <div className="chess-container">
            <div className="chess-card" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
              <h1
                className="chess-display"
                style={{ fontSize: '1.6rem', color: 'var(--chess-navy)' }}
              >
                {t.title}
              </h1>
              <p
                style={{
                  marginTop: 14,
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  color: 'var(--chess-muted)',
                }}
              >
                {t.lead}
              </p>
              <p
                style={{
                  marginTop: 22,
                  fontSize: '0.85rem',
                  color: 'var(--chess-muted)',
                }}
              >
                {t.fallback}
              </p>
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <a href={portalUrl} className="chess-btn chess-btn-primary">
                  {t.cta}
                </a>
                <a href="/" className="chess-btn chess-btn-outline">
                  {t.backHome}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
