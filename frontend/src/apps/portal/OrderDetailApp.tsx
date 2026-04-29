import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import {
  apiV1,
  type OrderCurrency,
  type OrderResponse,
  type OrderSession,
} from '../../shared/api/v1';

type Locale = 'en' | 'vi';

const LOCALE_STORAGE_KEY = 'bookedai.orderDetail.locale';

const dict = {
  en: {
    htmlTitle: 'BookedAI — Your order',
    nav: {
      brand: 'BookedAI',
      brandTag: 'Bookings · Payments · Sessions',
      backHome: 'Back to bookedai.au',
    },
    languageToggle: { label: 'Language', en: 'EN', vi: 'VI' },
    loading: 'Loading your order…',
    notFoundTitle: 'Order not found',
    notFoundBody:
      'We could not find an order with this reference. Check your booking confirmation email — the link there always works.',
    notFoundContact: 'Email support@bookedai.au if you cannot find the email.',
    statusConfirmed: 'Confirmed',
    statusPending: 'Pending payment',
    statusCancelled: 'Cancelled',
    sectionSessionsHeading: 'Your sessions',
    sectionSessionsLead: 'Date, time, cohort, and meeting links for each booked session.',
    sessionUpcoming: 'Upcoming',
    sessionCompleted: 'Completed',
    sessionCancelled: 'Cancelled',
    sessionJoin: 'Join Zoho Meeting',
    sessionAddCalendar: 'Add to my calendar',
    sectionPaymentHeading: 'Payment summary',
    paymentMethodStripe: 'Stripe (card)',
    paymentMethodVnd: 'Techcombank transfer (VND)',
    paymentMethodAud: 'Westpac transfer (AUD)',
    paymentMethodPending: 'Awaiting selection',
    paymentReceipt: 'Download receipt',
    paymentDiscount: 'Discount',
    paymentTotal: 'Total',
    paymentStatusPaid: 'Paid',
    paymentStatusPending: 'Pending',
    paymentStatusUnpaid: 'Unpaid',
    paymentPaidAt: 'Paid on',
    sectionWalletHeading: 'Save to your phone',
    sectionWalletLead:
      'Add a pass to Apple Wallet or Google Wallet so the meeting link, date, and reference travel with you.',
    walletApple: 'Add to Apple Wallet',
    walletGoogle: 'Save to Google Wallet',
    walletDownloading: 'Downloading…',
    walletError: 'Wallet pass is not available right now. Try again or use the meeting link above.',
    sectionCoachHeading: 'Your coach',
    sectionSupportHeading: 'Need help?',
    supportEmail: 'Email',
    supportPhone: 'Phone',
    supportTelegram: 'Telegram',
    supportWhatsapp: 'WhatsApp',
    customerHeading: 'Booked for',
    customerEmailLabel: 'Email',
    customerPhoneLabel: 'Phone',
    referenceLabel: 'Order reference',
    copyReference: 'Copy',
    copiedReference: 'Copied',
    completePaymentCta: 'Complete payment on the chess academy',
    stickyJoin: 'Join meeting',
    stickyWallet: 'Save to wallet',
  },
  vi: {
    htmlTitle: 'BookedAI — Đơn đặt lịch của bạn',
    nav: {
      brand: 'BookedAI',
      brandTag: 'Đặt lịch · Thanh toán · Buổi học',
      backHome: 'Về bookedai.au',
    },
    languageToggle: { label: 'Ngôn ngữ', en: 'EN', vi: 'VI' },
    loading: 'Đang tải đơn của bạn…',
    notFoundTitle: 'Không tìm thấy đơn',
    notFoundBody:
      'Không tìm thấy đơn với mã này. Kiểm tra email xác nhận đặt lịch — link trong email luôn hoạt động.',
    notFoundContact: 'Liên hệ support@bookedai.au nếu bạn không tìm thấy email.',
    statusConfirmed: 'Đã xác nhận',
    statusPending: 'Chờ thanh toán',
    statusCancelled: 'Đã huỷ',
    sectionSessionsHeading: 'Các buổi học của bạn',
    sectionSessionsLead: 'Ngày, giờ, lớp, và link tham gia cho mỗi buổi.',
    sessionUpcoming: 'Sắp tới',
    sessionCompleted: 'Đã hoàn thành',
    sessionCancelled: 'Đã huỷ',
    sessionJoin: 'Tham gia Zoho Meeting',
    sessionAddCalendar: 'Thêm vào lịch của tôi',
    sectionPaymentHeading: 'Thanh toán',
    paymentMethodStripe: 'Stripe (thẻ)',
    paymentMethodVnd: 'Chuyển khoản Techcombank (VND)',
    paymentMethodAud: 'Chuyển khoản Westpac (AUD)',
    paymentMethodPending: 'Chưa chọn phương thức',
    paymentReceipt: 'Tải biên lai',
    paymentDiscount: 'Giảm giá',
    paymentTotal: 'Tổng cộng',
    paymentStatusPaid: 'Đã thanh toán',
    paymentStatusPending: 'Đang xử lý',
    paymentStatusUnpaid: 'Chưa thanh toán',
    paymentPaidAt: 'Thanh toán vào',
    sectionWalletHeading: 'Lưu vào điện thoại',
    sectionWalletLead:
      'Thêm vé vào Apple Wallet hoặc Google Wallet để link buổi học, ngày, và mã đi cùng bạn.',
    walletApple: 'Thêm vào Apple Wallet',
    walletGoogle: 'Lưu vào Google Wallet',
    walletDownloading: 'Đang tải…',
    walletError: 'Vé điện tử tạm thời chưa sẵn sàng. Thử lại hoặc dùng link buổi học phía trên.',
    sectionCoachHeading: 'Giáo viên của bạn',
    sectionSupportHeading: 'Cần hỗ trợ?',
    supportEmail: 'Email',
    supportPhone: 'Điện thoại',
    supportTelegram: 'Telegram',
    supportWhatsapp: 'WhatsApp',
    customerHeading: 'Người đặt',
    customerEmailLabel: 'Email',
    customerPhoneLabel: 'Điện thoại',
    referenceLabel: 'Mã đơn',
    copyReference: 'Sao chép',
    copiedReference: 'Đã sao chép',
    completePaymentCta: 'Hoàn tất thanh toán tại học viện',
    stickyJoin: 'Vào buổi học',
    stickyWallet: 'Lưu vé',
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

function readOrderReferenceFromPath(): string | null {
  if (typeof window === 'undefined') return null;
  const { pathname } = window.location;
  const match = pathname.match(/^\/order\/([^/]+)\/?$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function buildChessSubdomainOrigin(): string {
  if (typeof window === 'undefined') return 'https://chess.bookedai.au';
  const { hostname, protocol } = window.location;
  if (hostname.endsWith('.bookedai.au')) {
    return `${protocol}//chess.bookedai.au`;
  }
  return '/chess-grandmaster';
}

function formatCurrency(amount: number, currency: OrderCurrency, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDateTime(value: string | null, locale: Locale): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  } catch {
    return value;
  }
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'positive' | 'warning' | 'critical' | 'neutral';
}) {
  let style: React.CSSProperties = {};
  if (tone === 'positive') {
    style = {
      borderColor: 'rgba(34, 139, 84, 0.32)',
      background: 'rgba(34, 139, 84, 0.12)',
      color: '#1f7245',
    };
  } else if (tone === 'warning') {
    style = {
      borderColor: 'rgba(180, 130, 40, 0.34)',
      background: 'rgba(255, 196, 80, 0.18)',
      color: '#7a4f0b',
    };
  } else if (tone === 'critical') {
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
    <span
      className="inline-flex items-center rounded-apple-pill border px-3 py-1 text-xs font-semibold"
      style={style}
    >
      {label}
    </span>
  );
}

function buildGoogleCalendarUrl(session: OrderSession, programName: string): string | null {
  if (!session.starts_at) return null;
  const start = new Date(session.starts_at);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = session.duration_minutes && session.duration_minutes > 0 ? session.duration_minutes : 60;
  const end = new Date(start.getTime() + minutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: programName,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (session.meeting_url) params.set('location', session.meeting_url);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function PaymentMethodLabel({ method, t }: { method: OrderResponse['payment']['method']; t: (typeof dict)[Locale] }) {
  if (method === 'stripe') return <>{t.paymentMethodStripe}</>;
  if (method === 'vnd_bank') return <>{t.paymentMethodVnd}</>;
  if (method === 'aud_bank') return <>{t.paymentMethodAud}</>;
  return <>{t.paymentMethodPending}</>;
}

function SessionCard({
  session,
  index,
  t,
  locale,
  programFallback,
}: {
  session: OrderSession;
  index: number;
  t: (typeof dict)[Locale];
  locale: Locale;
  programFallback: string;
}) {
  const status = (session.status ?? 'upcoming') as 'upcoming' | 'completed' | 'cancelled';
  const tone =
    status === 'completed' ? 'neutral' : status === 'cancelled' ? 'critical' : 'positive';
  const statusLabel =
    status === 'completed'
      ? t.sessionCompleted
      : status === 'cancelled'
      ? t.sessionCancelled
      : t.sessionUpcoming;
  const programName = session.program_name || programFallback;
  const calendarUrl = session.calendar_event_url || buildGoogleCalendarUrl(session, programName);
  return (
    <article
      key={session.id}
      className="template-card flex flex-col gap-3 p-5 sm:p-6"
      data-session-index={index}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="template-kicker">{programName}</span>
          <p className="mt-2 text-base font-semibold text-apple-near-black sm:text-lg">
            {formatDateTime(session.starts_at, locale)}
          </p>
          <p className="mt-1 text-sm text-black/60">
            {session.cohort_label || '—'}
            {session.timezone ? <span className="ml-2 text-black/45">· {session.timezone}</span> : null}
          </p>
        </div>
        <StatusPill label={statusLabel} tone={tone} />
      </header>
      <div className="flex flex-wrap gap-2">
        {session.meeting_url ? (
          <a
            href={session.meeting_url}
            target="_blank"
            rel="noreferrer noopener"
            className="booked-button"
          >
            {t.sessionJoin}
          </a>
        ) : null}
        {calendarUrl ? (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="booked-button-secondary"
          >
            {t.sessionAddCalendar}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function CopyReferenceButton({
  reference,
  copyLabel,
  copiedLabel,
}: {
  reference: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard
      .writeText(reference)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }, [reference]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-apple-pill border border-black/12 bg-apple-white px-3 py-1 text-xs font-semibold text-apple-blue hover:bg-apple-light"
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

export function OrderDetailApp() {
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

  const orderReference = useMemo(() => readOrderReferenceFromPath(), []);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [walletPending, setWalletPending] = useState<'apple' | 'google' | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    document.title = t.htmlTitle;
    document.documentElement.setAttribute('lang', locale === 'vi' ? 'vi' : 'en');
  }, [locale, t.htmlTitle]);

  useEffect(() => {
    if (!orderReference) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    void apiV1
      .getOrder(orderReference)
      .then((response) => {
        if (cancelled) return;
        if ('data' in response) {
          setOrder(response.data);
        } else {
          setNotFound(true);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(error instanceof Error ? error.message : t.notFoundBody);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderReference, t.notFoundBody]);

  const handleApplePass = useCallback(async () => {
    if (!orderReference) return;
    setWalletError(null);
    setWalletPending('apple');
    try {
      await apiV1.getOrderApplePass(orderReference);
    } catch {
      setWalletError(t.walletError);
    } finally {
      setWalletPending(null);
    }
  }, [orderReference, t.walletError]);

  const handleGooglePass = useCallback(async () => {
    if (!orderReference) return;
    setWalletError(null);
    setWalletPending('google');
    try {
      const response = await apiV1.getOrderGoogleWalletSaveUrl(orderReference);
      if ('data' in response && response.data?.save_url) {
        if (typeof window !== 'undefined') {
          window.open(response.data.save_url, '_blank', 'noopener,noreferrer');
        }
      } else {
        setWalletError(t.walletError);
      }
    } catch {
      setWalletError(t.walletError);
    } finally {
      setWalletPending(null);
    }
  }, [orderReference, t.walletError]);

  const upcomingMeetingUrl = useMemo(() => {
    if (!order) return null;
    const upcoming = order.sessions.find(
      (s) => s.status !== 'completed' && s.status !== 'cancelled' && s.meeting_url,
    );
    return upcoming?.meeting_url ?? null;
  }, [order]);

  return (
    <main className="booked-shell min-h-screen bg-apple-light text-apple-near-black">
      <header className="sticky top-0 z-30 border-b border-black/6 bg-apple-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:px-8 lg:pb-16">
        {loading ? (
          <div className="template-card p-6 text-sm text-black/64">{t.loading}</div>
        ) : null}

        {!loading && notFound ? (
          <section className="template-card mx-auto max-w-xl p-8 sm:p-10">
            <span className="template-kicker">{t.notFoundTitle}</span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-apple-near-black sm:text-3xl">
              {t.notFoundTitle}
            </h1>
            <p className="mt-4 text-sm leading-7 text-black/64">{t.notFoundBody}</p>
            <p className="mt-3 text-sm text-black/56">{t.notFoundContact}</p>
            <a
              href="mailto:support@bookedai.au"
              className="booked-button mt-5 inline-flex"
              style={{ width: 'fit-content' }}
            >
              support@bookedai.au
            </a>
          </section>
        ) : null}

        {!loading && !notFound && loadError ? (
          <div
            role="alert"
            className="rounded-apple-large border border-apple-danger/30 bg-apple-danger/10 px-4 py-3 text-sm text-apple-danger"
          >
            {loadError}
          </div>
        ) : null}

        {!loading && !notFound && order ? (
          <div className="flex flex-col gap-6">
            <section className="template-card p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="template-kicker">{t.referenceLabel}</span>
                  <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-apple-near-black sm:text-3xl">
                    <span className="font-mono">{order.order_reference}</span>
                  </h1>
                  <p className="mt-2 text-sm text-black/60">
                    {t.customerHeading}: <strong>{order.customer.name || '—'}</strong>
                  </p>
                  {order.customer.email ? (
                    <p className="mt-1 text-sm text-black/60">
                      {t.customerEmailLabel}: {order.customer.email}
                    </p>
                  ) : null}
                  {order.customer.phone ? (
                    <p className="text-sm text-black/60">
                      {t.customerPhoneLabel}: {order.customer.phone}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusPill
                    label={
                      order.status === 'confirmed'
                        ? t.statusConfirmed
                        : order.status === 'cancelled'
                        ? t.statusCancelled
                        : t.statusPending
                    }
                    tone={
                      order.status === 'confirmed'
                        ? 'positive'
                        : order.status === 'cancelled'
                        ? 'critical'
                        : 'warning'
                    }
                  />
                  <CopyReferenceButton
                    reference={order.order_reference}
                    copyLabel={t.copyReference}
                    copiedLabel={t.copiedReference}
                  />
                </div>
              </div>

              {order.status === 'pending_payment' ? (
                <div className="mt-5 rounded-apple-large border border-apple-blue/30 bg-apple-blue/5 px-4 py-3">
                  <a
                    href={`${buildChessSubdomainOrigin()}/?order=${encodeURIComponent(
                      order.order_reference,
                    )}#enroll`}
                    className="booked-button"
                  >
                    {t.completePaymentCta}
                  </a>
                </div>
              ) : null}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <section className="flex flex-col gap-4">
                <header>
                  <span className="template-kicker">{t.sectionSessionsHeading}</span>
                  <p className="mt-2 text-sm text-black/64">{t.sectionSessionsLead}</p>
                </header>
                {order.sessions.length === 0 ? (
                  <div className="template-card p-6 text-sm text-black/56">—</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {order.sessions.map((session, index) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        index={index}
                        t={t}
                        locale={locale}
                        programFallback={t.sectionSessionsHeading}
                      />
                    ))}
                  </div>
                )}
              </section>

              <aside className="flex flex-col gap-4">
                <section className="template-card p-6">
                  <span className="template-kicker">{t.sectionPaymentHeading}</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-[-0.03em] text-apple-near-black">
                      {formatCurrency(order.payment.amount, order.payment.currency, locale)}
                    </span>
                    <StatusPill
                      label={
                        order.payment.status === 'paid'
                          ? t.paymentStatusPaid
                          : order.payment.status === 'pending'
                          ? t.paymentStatusPending
                          : t.paymentStatusUnpaid
                      }
                      tone={
                        order.payment.status === 'paid'
                          ? 'positive'
                          : order.payment.status === 'pending'
                          ? 'warning'
                          : 'critical'
                      }
                    />
                  </div>
                  <p className="mt-3 text-sm text-black/64">
                    <PaymentMethodLabel method={order.payment.method} t={t} />
                  </p>
                  {order.payment.paid_at ? (
                    <p className="mt-1 text-sm text-black/52">
                      {t.paymentPaidAt}: {formatDateTime(order.payment.paid_at, locale)}
                    </p>
                  ) : null}
                  {order.promo.applied && order.promo.label ? (
                    <p className="mt-3 text-sm text-apple-blue">
                      {t.paymentDiscount}: {order.promo.label}
                      {order.promo.discount_pct ? ` (-${order.promo.discount_pct}%)` : ''}
                    </p>
                  ) : null}
                  {order.payment.receipt_url ? (
                    <a
                      href={order.payment.receipt_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="booked-button-secondary mt-4 inline-flex"
                      style={{ width: 'fit-content' }}
                    >
                      {t.paymentReceipt}
                    </a>
                  ) : null}
                </section>

                <section className="template-card p-6">
                  <span className="template-kicker">{t.sectionWalletHeading}</span>
                  <p className="mt-2 text-sm text-black/64">{t.sectionWalletLead}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleApplePass();
                      }}
                      disabled={walletPending !== null}
                      className="booked-button"
                    >
                      {walletPending === 'apple' ? t.walletDownloading : t.walletApple}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleGooglePass();
                      }}
                      disabled={walletPending !== null}
                      className="booked-button-secondary"
                    >
                      {walletPending === 'google' ? t.walletDownloading : t.walletGoogle}
                    </button>
                  </div>
                  {walletError ? (
                    <p className="mt-3 text-xs text-apple-danger" role="alert">
                      {walletError}
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>

            {order.coach && (order.coach.display_name || order.coach.bio_short) ? (
              <section className="template-card p-6 sm:p-8">
                <span className="template-kicker">{t.sectionCoachHeading}</span>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-apple-near-black">
                  {order.coach.display_name || '—'}
                </h2>
                {order.coach.title_short ? (
                  <p className="text-sm text-black/56">{order.coach.title_short}</p>
                ) : null}
                {order.coach.bio_short ? (
                  <p className="mt-3 text-sm leading-7 text-black/72">{order.coach.bio_short}</p>
                ) : null}
              </section>
            ) : null}

            {order.support &&
            (order.support.email ||
              order.support.phone ||
              order.support.telegram ||
              order.support.whatsapp) ? (
              <section className="template-card p-6 sm:p-8">
                <span className="template-kicker">{t.sectionSupportHeading}</span>
                <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-black/72 sm:grid-cols-2">
                  {order.support.email ? (
                    <li>
                      <strong className="mr-2 text-black/52">{t.supportEmail}:</strong>
                      <a className="text-apple-blue hover:underline" href={`mailto:${order.support.email}`}>
                        {order.support.email}
                      </a>
                    </li>
                  ) : null}
                  {order.support.phone ? (
                    <li>
                      <strong className="mr-2 text-black/52">{t.supportPhone}:</strong>
                      <a className="text-apple-blue hover:underline" href={`tel:${order.support.phone}`}>
                        {order.support.phone}
                      </a>
                    </li>
                  ) : null}
                  {order.support.telegram ? (
                    <li>
                      <strong className="mr-2 text-black/52">{t.supportTelegram}:</strong>
                      <a
                        className="text-apple-blue hover:underline"
                        href={order.support.telegram}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {order.support.telegram}
                      </a>
                    </li>
                  ) : null}
                  {order.support.whatsapp ? (
                    <li>
                      <strong className="mr-2 text-black/52">{t.supportWhatsapp}:</strong>
                      <a
                        className="text-apple-blue hover:underline"
                        href={order.support.whatsapp}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {order.support.whatsapp}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      {!loading && !notFound && order ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-black/8 bg-apple-white/95 p-3 shadow-[0_-8px_24px_-10px_rgba(0,0,0,0.12)] backdrop-blur-md sm:hidden"
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 12px)` }}
        >
          {upcomingMeetingUrl ? (
            <a
              href={upcomingMeetingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="booked-button flex-1 text-center"
            >
              {t.stickyJoin}
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '')) {
                void handleGooglePass();
              } else {
                void handleApplePass();
              }
            }}
            disabled={walletPending !== null}
            className="booked-button-secondary flex-1"
          >
            {walletPending !== null ? t.walletDownloading : t.stickyWallet}
          </button>
        </div>
      ) : null}

      <footer className="border-t border-black/8 bg-apple-white/60 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-black/52 sm:px-8">
          <span>© BookedAI. All rights reserved.</span>
          <span>Powered by BookedAI</span>
        </div>
      </footer>
    </main>
  );
}
