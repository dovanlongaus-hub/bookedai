import { useCallback, useMemo, useState } from 'react';

export type OrderConfirmationLocale = 'en' | 'vi';

/**
 * Shape of the in-memory session struct the chess enroll form already holds. We accept a tiny
 * subset because the chess form does not yet round-trip through the GET /v1/orders endpoint —
 * the post-booking confirmation uses the data already in hand (booking_reference + meeting_url).
 *
 * The richer OrderResponse shape from `apiV1.getOrder` is consumed by the standalone
 * portal.bookedai.au/order/{ref} page (see OrderDetailApp).
 */
export interface OrderConfirmationSessionInput {
  /**
   * ISO date or freeform date string (the chess form keeps it as `YYYY-MM-DD` or "to be confirmed").
   */
  startsAt: string | null;
  /**
   * Optional formatted time-of-day. Chess form keeps it as `HH:MM` text.
   */
  timeLabel?: string | null;
  cohortLabel?: string | null;
  meetingUrl?: string | null;
  calendarUrl?: string | null;
}

export interface OrderConfirmationDictionary {
  successHeading: string;
  successSubheading: string;
  orderReferenceLabel: string;
  copyReference: string;
  copiedReference: string;
  rowSession: string;
  rowSessionTbc: string;
  rowMeeting: string;
  rowMeetingJoin: string;
  rowMeetingPending: string;
  rowCoach: string;
  rowPayment: string;
  paymentPaid: (amount: string) => string;
  paymentPending: string;
  paymentUnpaid: string;
  viewOrderDetails: string;
  joinMeeting: string;
  addGoogleCalendar: string;
  downloadIcs: string;
  emailMeCopy: string;
  emailMeCopySent: string;
  whatsNextHeading: string;
  whatsNextSteps: readonly { title: string; body: string; href?: string; cta?: string }[];
  cohortDefault: string;
  /** Tenant contact card shown after the action buttons. */
  tenantContact: {
    heading: string;
    subheading: string;
    emailLabel: string;
    phoneLabel?: string;
    telegramLabel?: string;
    whatsappLabel?: string;
    supportLine: string;
  };
}

/** Tenant contact data passed from the consuming surface (chess subdomain). */
export interface OrderConfirmationTenantContact {
  email: string;
  phone?: string | null;
  telegramUrl?: string | null;
  whatsappUrl?: string | null;
}

interface OrderConfirmationProps {
  locale: OrderConfirmationLocale;
  dict: OrderConfirmationDictionary;
  orderReference: string;
  /**
   * The single primary session for the booking (chess academy currently books one session at a
   * time on the public landing surface). When backend returns multiple sessions in
   * `OrderResponse.sessions`, the portal page renders the full list — this card focuses on the
   * first one.
   */
  session: OrderConfirmationSessionInput;
  coachName: string;
  coachTitle?: string | null;
  paymentStatus: 'paid' | 'pending' | 'unpaid';
  paymentAmountFormatted?: string | null;
  /**
   * Origin for the standalone portal order detail page, e.g. `https://portal.bookedai.au`.
   * If null, the "View Order Details" link is hidden.
   */
  portalOrderUrl: string | null;
  /** Tenant contact info — coach email + optional phone/messaging channels. */
  tenantContact: OrderConfirmationTenantContact;
  onEmailMeCopy?: () => Promise<void> | void;
  /**
   * Callback fired when the visitor taps "Return to start". Used by the chess form to reset
   * its state. Optional — when omitted, the action button is hidden.
   */
  onReturnHome?: () => void;
  returnHomeLabel?: string | null;
}

function CheckmarkIcon() {
  return (
    <svg
      viewBox="0 0 56 56"
      width="56"
      height="56"
      aria-hidden="true"
      focusable="false"
      className="chess-order-success-icon-svg"
    >
      <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="3" />
      <path
        d="M16 29l8 8 16-18"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect
        x="2"
        y="6"
        width="14"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M16 10l5-3v10l-5-3z" fill="currentColor" />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect
        x="2"
        y="6"
        width="20"
        height="13"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 4H6a2 2 0 0 0-2 2v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d="M4 5h16v11H8l-4 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M12 4v12m0 0l-5-5m5 5l5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M14 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4l-9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 5H5v14h14v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function buildGoogleCalendarUrl(input: {
  title: string;
  startsAt: string | null;
  durationMinutes?: number;
  meetingUrl?: string | null;
  details?: string | null;
}): string | null {
  if (!input.startsAt) return null;
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : 60;
  const end = new Date(start.getTime() + minutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (input.meetingUrl) params.set('location', input.meetingUrl);
  if (input.details) params.set('details', input.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsBlobUrl(input: {
  title: string;
  startsAt: string | null;
  durationMinutes?: number;
  meetingUrl?: string | null;
  details?: string | null;
  uid: string;
}): string | null {
  if (typeof window === 'undefined') return null;
  if (!input.startsAt) return null;
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const minutes = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : 60;
  const end = new Date(start.getTime() + minutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedAI//Chess Academy//EN',
    'BEGIN:VEVENT',
    `UID:${input.uid}@bookedai.au`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${input.title.replace(/\n/g, ' ')}`,
  ];
  if (input.meetingUrl) lines.push(`LOCATION:${input.meetingUrl}`);
  if (input.details) lines.push(`DESCRIPTION:${input.details.replace(/\n/g, '\\n')}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
}

export function OrderConfirmation({
  locale,
  dict,
  orderReference,
  session,
  coachName,
  coachTitle,
  paymentStatus,
  paymentAmountFormatted,
  portalOrderUrl,
  tenantContact,
  onEmailMeCopy,
  onReturnHome,
  returnHomeLabel,
}: OrderConfirmationProps) {
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailPending, setEmailPending] = useState(false);

  const sessionTitle = useMemo(() => {
    const cohort = session.cohortLabel || dict.cohortDefault;
    return `${cohort}`;
  }, [dict.cohortDefault, session.cohortLabel]);

  const sessionDateLabel = useMemo(() => {
    const date = session.startsAt;
    if (!date) return dict.rowSessionTbc;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      // Could be a `YYYY-MM-DD` plain date — render directly with optional time label.
      return session.timeLabel ? `${date} · ${session.timeLabel}` : date;
    }
    try {
      const dateFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return dateFmt.format(parsed);
    } catch {
      return parsed.toISOString();
    }
  }, [dict.rowSessionTbc, locale, session.startsAt, session.timeLabel]);

  const handleCopyReference = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard
      .writeText(orderReference)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        // ignore — user can copy manually
      });
  }, [orderReference]);

  const handleEmailMe = useCallback(async () => {
    if (!onEmailMeCopy) return;
    setEmailPending(true);
    try {
      await onEmailMeCopy();
      setEmailSent(true);
    } catch {
      // The chess form already surfaces lifecycle errors above; suppress here so the
      // confirmation card stays clean. Visitor can try again.
    } finally {
      setEmailPending(false);
    }
  }, [onEmailMeCopy]);

  const googleCalendarUrl = useMemo(
    () =>
      buildGoogleCalendarUrl({
        title: sessionTitle,
        startsAt: session.startsAt,
        meetingUrl: session.meetingUrl,
      }),
    [session.meetingUrl, session.startsAt, sessionTitle],
  );

  const icsUrl = useMemo(
    () =>
      buildIcsBlobUrl({
        title: sessionTitle,
        startsAt: session.startsAt,
        meetingUrl: session.meetingUrl,
        uid: orderReference,
      }),
    [orderReference, session.meetingUrl, session.startsAt, sessionTitle],
  );

  const paymentLabel = useMemo(() => {
    if (paymentStatus === 'paid') {
      return dict.paymentPaid(paymentAmountFormatted ?? '—');
    }
    if (paymentStatus === 'pending') {
      return dict.paymentPending;
    }
    return dict.paymentUnpaid;
  }, [dict, paymentAmountFormatted, paymentStatus]);

  return (
    <section
      className="chess-order-confirmation"
      role="region"
      aria-label={dict.successHeading}
    >
      <header className="chess-order-confirmation__header">
        <div className="chess-order-success-icon" aria-hidden="true">
          <CheckmarkIcon />
        </div>
        <h2 className="chess-order-confirmation__title">{dict.successHeading}</h2>
        <p className="chess-order-confirmation__sub">{dict.successSubheading}</p>
      </header>

      <div className="chess-order-reference" role="group" aria-label={dict.orderReferenceLabel}>
        <span className="chess-order-reference__label">{dict.orderReferenceLabel}</span>
        <div className="chess-order-reference__value">
          <span className="chess-order-reference__code">{orderReference}</span>
          <button
            type="button"
            onClick={handleCopyReference}
            className="chess-order-reference__copy"
            aria-label={dict.copyReference}
          >
            <CopyIcon />
            <span>{copied ? dict.copiedReference : dict.copyReference}</span>
          </button>
        </div>
      </div>

      <ul className="chess-order-info-rows" role="list">
        <li className="chess-order-info-row">
          <span className="chess-order-info-row__icon" aria-hidden="true">
            <CalendarIcon />
          </span>
          <div className="chess-order-info-row__body">
            <span className="chess-order-info-row__label">{dict.rowSession}</span>
            <span className="chess-order-info-row__value">
              {sessionDateLabel}
              {session.cohortLabel ? (
                <span className="chess-order-info-row__pill">{session.cohortLabel}</span>
              ) : null}
            </span>
          </div>
        </li>
        <li className="chess-order-info-row">
          <span className="chess-order-info-row__icon" aria-hidden="true">
            <VideoIcon />
          </span>
          <div className="chess-order-info-row__body">
            <span className="chess-order-info-row__label">{dict.rowMeeting}</span>
            {session.meetingUrl ? (
              <a
                className="chess-order-info-row__link"
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {dict.rowMeetingJoin}
              </a>
            ) : (
              <span className="chess-order-info-row__value">{dict.rowMeetingPending}</span>
            )}
          </div>
        </li>
        <li className="chess-order-info-row">
          <span className="chess-order-info-row__icon" aria-hidden="true">
            <CoachIcon />
          </span>
          <div className="chess-order-info-row__body">
            <span className="chess-order-info-row__label">{dict.rowCoach}</span>
            <span className="chess-order-info-row__value">
              {coachName}
              {coachTitle ? (
                <span className="chess-order-info-row__muted"> · {coachTitle}</span>
              ) : null}
            </span>
          </div>
        </li>
        <li className="chess-order-info-row">
          <span className="chess-order-info-row__icon" aria-hidden="true">
            <CardIcon />
          </span>
          <div className="chess-order-info-row__body">
            <span className="chess-order-info-row__label">{dict.rowPayment}</span>
            <span
              className={`chess-order-info-row__value chess-order-info-row__value--${paymentStatus}`}
            >
              {paymentLabel}
            </span>
          </div>
        </li>
      </ul>

      <div className="chess-order-actions" role="group" aria-label={dict.viewOrderDetails}>
        {session.meetingUrl ? (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="chess-btn chess-btn-primary chess-order-actions__primary"
          >
            <VideoIcon />
            <span>{dict.joinMeeting}</span>
          </a>
        ) : null}
        {googleCalendarUrl ? (
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="chess-btn chess-btn-light"
          >
            <CalendarIcon />
            <span>{dict.addGoogleCalendar}</span>
          </a>
        ) : null}
        {icsUrl ? (
          <a
            href={icsUrl}
            download={`${orderReference}.ics`}
            className="chess-btn chess-btn-outline chess-btn-sm"
          >
            <DownloadIcon />
            <span>{dict.downloadIcs}</span>
          </a>
        ) : null}
        {portalOrderUrl ? (
          <a
            href={portalOrderUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="chess-btn chess-btn-outline chess-btn-sm"
          >
            <ExternalLinkIcon />
            <span>{dict.viewOrderDetails}</span>
          </a>
        ) : null}
        {onEmailMeCopy ? (
          <button
            type="button"
            onClick={() => {
              void handleEmailMe();
            }}
            disabled={emailPending || emailSent}
            className="chess-btn chess-btn-outline chess-btn-sm"
          >
            <EmailIcon />
            <span>{emailSent ? dict.emailMeCopySent : dict.emailMeCopy}</span>
          </button>
        ) : null}
      </div>

      {/* Tenant contact card — surfaces immediately after the primary actions so a
       * thank-you-and-contact lands together. Replaces the wallet buttons that
       * shipped here previously. */}
      <aside
        className="chess-order-tenant-contact"
        role="group"
        aria-label={dict.tenantContact.heading}
      >
        <div className="chess-order-tenant-contact__heading">
          <span className="chess-order-tenant-contact__title">{dict.tenantContact.heading}</span>
          <span className="chess-order-tenant-contact__sub">
            {dict.tenantContact.subheading}
          </span>
        </div>
        <ul className="chess-order-tenant-contact__rows" role="list">
          <li className="chess-order-tenant-contact__row">
            <span className="chess-order-tenant-contact__icon" aria-hidden="true">
              <EmailIcon />
            </span>
            <span className="chess-order-tenant-contact__label">{dict.tenantContact.emailLabel}</span>
            <a
              href={`mailto:${tenantContact.email}`}
              className="chess-order-tenant-contact__value"
            >
              {tenantContact.email}
            </a>
          </li>
          {tenantContact.phone && dict.tenantContact.phoneLabel ? (
            <li className="chess-order-tenant-contact__row">
              <span className="chess-order-tenant-contact__icon" aria-hidden="true">
                <PhoneIcon />
              </span>
              <span className="chess-order-tenant-contact__label">
                {dict.tenantContact.phoneLabel}
              </span>
              <a
                href={`tel:${tenantContact.phone.replace(/\s+/g, '')}`}
                className="chess-order-tenant-contact__value"
              >
                {tenantContact.phone}
              </a>
            </li>
          ) : null}
          {tenantContact.telegramUrl && dict.tenantContact.telegramLabel ? (
            <li className="chess-order-tenant-contact__row">
              <span className="chess-order-tenant-contact__icon" aria-hidden="true">
                <ChatBubbleIcon />
              </span>
              <span className="chess-order-tenant-contact__label">
                {dict.tenantContact.telegramLabel}
              </span>
              <a
                href={tenantContact.telegramUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="chess-order-tenant-contact__value"
              >
                Telegram
              </a>
            </li>
          ) : null}
          {tenantContact.whatsappUrl && dict.tenantContact.whatsappLabel ? (
            <li className="chess-order-tenant-contact__row">
              <span className="chess-order-tenant-contact__icon" aria-hidden="true">
                <ChatBubbleIcon />
              </span>
              <span className="chess-order-tenant-contact__label">
                {dict.tenantContact.whatsappLabel}
              </span>
              <a
                href={tenantContact.whatsappUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="chess-order-tenant-contact__value"
              >
                WhatsApp
              </a>
            </li>
          ) : null}
        </ul>
        <p className="chess-order-tenant-contact__support">
          {dict.tenantContact.supportLine}
        </p>
      </aside>

      <div className="chess-order-whats-next">
        <h3 className="chess-order-whats-next__heading">{dict.whatsNextHeading}</h3>
        <ol className="chess-order-whats-next__list">
          {dict.whatsNextSteps.map((step, idx) => (
            <li key={`${idx}-${step.title}`} className="chess-order-whats-next__item">
              <span className="chess-order-whats-next__num">{idx + 1}</span>
              <div className="chess-order-whats-next__body">
                <span className="chess-order-whats-next__title">{step.title}</span>
                <p className="chess-order-whats-next__text">{step.body}</p>
                {step.href && step.cta ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="chess-order-whats-next__cta"
                  >
                    {step.cta}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {onReturnHome && returnHomeLabel ? (
        <div className="chess-order-return">
          <button
            type="button"
            onClick={onReturnHome}
            className="chess-btn chess-btn-sm chess-btn-outline"
          >
            {returnHomeLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
