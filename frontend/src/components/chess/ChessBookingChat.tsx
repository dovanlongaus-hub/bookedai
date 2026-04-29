/*
 * ChessBookingChat — chat-driven booking flow for chess.bookedai.au.
 *
 * Replaces the legacy multi-field enroll form + concierge dual-column section
 * with a single conversational thread. Calls live backend endpoints:
 *   • apiV1.chessCatalogSearch — tenant-scoped catalog search
 *   • apiV1.chessCourseSlots — slots per course
 *   • createPublicBookingAssistantLeadAndBookingIntent — booking intent
 *   • apiV1.chessPaymentOptions — Stripe + bank QR options
 *
 * The component reuses the existing OrderConfirmation + PaymentSelection
 * components inline in the chat thread (rendered as bot bubbles). It also
 * reuses TimeSlotPicker logic via inline rendering of slot data.
 *
 * Bilingual EN/VI throughout. Listens for the `chess-chat-focus` custom event
 * dispatched by primary CTAs and auto-focuses the input on receipt.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import {
  apiV1,
  type ChessCatalogMatch,
  type ChessCourseSlot,
  type ChessPaymentOption,
} from '../../shared/api/v1';
import { createPublicBookingAssistantLeadAndBookingIntent } from '../landing/assistant/publicBookingAssistantV1';
import { ChessPieceIllustration } from './ChessPieceIllustration';
import { OrderConfirmation, type OrderConfirmationDictionary } from './OrderConfirmation';
import { PaymentSelection, type PaymentSelectionDictionary } from './PaymentSelection';

export type ChessBookingChatLocale = 'en' | 'vi';

export interface ChessBookingChatDictionary {
  header: string;
  reset: string;
  inputPlaceholder: string;
  send: string;
  voiceTooltip: string;
  intro: string;
  searching: string;
  searchHits: string;
  searchEmpty: string;
  searchError: string;
  pickSlotPrompt: string;
  slotsLoading: string;
  slotsEmpty: string;
  slotsError: string;
  /** Friendly retry message when the chosen slot was reserved by someone else
   * between picker render and submit (race-condition lock). */
  slotLockedRetry: string;
  slotSpotsLeft: (count: number) => string;
  slotSpotsLast: (count: number) => string;
  collectingName: string;
  collectingEmail: string;
  collectingPhone: string;
  reviewing: string;
  submitting: string;
  payment: string;
  bookAnother: string;
  done: string;
  edit: string;
  confirm: string;
  skipPhone: string;
  browseAll: string;
  chooseCourse: string;
  selected: string;
  errorEmail: string;
  errorName: string;
  reviewLineCourse: (name: string) => string;
  reviewLineSlot: (datetime: string) => string;
  reviewLineContact: (name: string, email: string) => string;
  reviewSlotTbc: string;
  cohortDefault: string;
  ariaThread: string;
  inputLabel: string;
  quickReplies: readonly string[];
  ctaBanner: string;
  defaultName: string;
  bookingError: string;
}

interface ChessBookingChatProps {
  locale: ChessBookingChatLocale;
  dict: ChessBookingChatDictionary;
  paymentDict: PaymentSelectionDictionary;
  orderDict: OrderConfirmationDictionary;
  /** Reference page id used by attribution metadata. */
  sourcePage: string;
  /** Tenant runtime config so the booking assistant call carries correct tenant ref. */
  runtimeConfig: {
    tenantRef: string;
    channel: 'public_web';
    deploymentMode: 'standalone_app';
    source: string;
    widgetId: string;
  };
  /** Resolve VND/AUD program amounts for a given service. Falls back to beginner. */
  resolveProgramAmounts: (programKey: ChessProgramKeyHint) => {
    programKey: ChessProgramKeyHint;
    vnd: number;
    aud: number;
  };
  /** Helper that maps a service id / name to a program key. */
  inferProgramKeyFromName: (serviceName: string) => ChessProgramKeyHint;
  /** Builder for the portal order detail URL. */
  buildOrderDetailUrl: (orderReference: string) => string;
  returnHomeLabel: string;
  onReturnHome?: () => void;
}

export type ChessProgramKeyHint =
  | 'beginner'
  | 'private'
  | 'tournament'
  | 'elite'
  | 'superkid'
  | 'advanced_group'
  | 'private_1_1';

type ChatMessage =
  | { kind: 'bot'; id: string; text: string }
  | { kind: 'user'; id: string; text: string }
  | { kind: 'courses'; id: string; courses: ChessCatalogMatch[] }
  | { kind: 'slots'; id: string; slots: ChessCourseSlot[]; serviceId: string }
  | { kind: 'review'; id: string }
  | { kind: 'payment'; id: string }
  | { kind: 'order'; id: string }
  | { kind: 'typing'; id: string };

type ChatStep =
  | 'intro'
  | 'searching'
  | 'pickSlot'
  | 'collectingName'
  | 'collectingEmail'
  | 'collectingPhone'
  | 'reviewing'
  | 'submitting'
  | 'payment'
  | 'done';

interface CollectedDetails {
  customerName: string;
  email: string;
  phone: string;
}

interface BookingResult {
  bookingReference: string;
  leadId: string;
  bookingIntentId: string | null;
  meetingUrl: string | null;
  calendarUrl: string | null;
}

interface OrderCard {
  orderReference: string;
  sessionStartsAt: string | null;
  sessionTimeLabel: string | null;
  cohortLabel: string | null;
  meetingUrl: string | null;
  calendarUrl: string | null;
  paymentAmountFormatted: string | null;
  programKey: ChessProgramKeyHint;
  amounts: { vnd: number; aud: number };
  parentName: string;
  parentEmail: string | null;
  leadId: string;
  bookingIntentId: string | null;
}

const TIMEZONE = 'Asia/Ho_Chi_Minh';

let messageCounter = 0;
function nextId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

function formatSlotLabel(slot: ChessCourseSlot, locale: ChessBookingChatLocale): string {
  const dateText = slot.date || slot.starts_at;
  if (!dateText) return slot.cohort_label || '';
  const parsed = new Date(dateText);
  let datePart = dateText;
  if (!Number.isNaN(parsed.getTime())) {
    try {
      datePart = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(parsed);
    } catch {
      datePart = dateText;
    }
  }
  const timePart = slot.start_time
    ? slot.start_time
    : slot.starts_at
    ? (() => {
        const t = new Date(slot.starts_at);
        if (Number.isNaN(t.getTime())) return '';
        try {
          return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(t);
        } catch {
          return '';
        }
      })()
    : '';
  return `${datePart}${timePart ? ` · ${timePart}` : ''}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseMoneyAmount(value: string | null | undefined): number | null {
  const normalized = String(value ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)?.[1];
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveSelectedCourseAmounts(
  course: ChessCatalogMatch,
  fallback: { vnd: number; aud: number },
): { vnd: number; aud: number } {
  const rawAmountAud = (course as ChessCatalogMatch & { amount_aud?: number | string | null }).amount_aud;
  const courseAud =
    typeof rawAmountAud === 'number'
      ? rawAmountAud
      : typeof rawAmountAud === 'string'
        ? Number(rawAmountAud)
        : parseMoneyAmount(course.display_price_aud);
  const aud = Number.isFinite(courseAud) && Number(courseAud) > 0 ? Number(courseAud) : fallback.aud;
  const vnd = parseMoneyAmount(course.display_price_vnd) ?? Math.round(aud * 16500);
  return { aud, vnd };
}

function buildLookaheadRange() {
  const today = new Date();
  const to = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: fmt(today), to: fmt(to) };
}

function MiniAvatar() {
  return (
    <span className="chess-chat-avatar" aria-hidden="true">
      <ChessPieceIllustration variant="pawn" />
    </span>
  );
}

function VoiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.21L4.2 11l8.8 1-8.8 1-2.18 6.19a1 1 0 0 0 1.38 1.21z" />
    </svg>
  );
}

function CourseCardInline({
  course,
  locale,
  selected,
  onSelect,
  ctaLabel,
  selectedLabel,
}: {
  course: ChessCatalogMatch;
  locale: ChessBookingChatLocale;
  selected: boolean;
  onSelect: () => void;
  ctaLabel: string;
  selectedLabel: string;
}) {
  const price = locale === 'vi' ? course.display_price_vnd : course.display_price_aud;
  return (
    <article className="chess-chat-card chess-chat-course" data-selected={selected}>
      <div className="chess-chat-course-head">
        <ChessPieceIllustration variant="queen" className="chess-chat-course-thumb" />
        <div className="chess-chat-course-meta">
          <h4 className="chess-chat-course-name">{course.name}</h4>
          <p className="chess-chat-course-summary">{course.summary}</p>
          <div className="chess-chat-course-price">{price}</div>
        </div>
      </div>
      <button
        type="button"
        className={`chess-btn chess-btn-sm ${selected ? 'chess-btn-light' : 'chess-btn-primary'}`}
        onClick={onSelect}
        aria-pressed={selected}
        disabled={selected}
      >
        {selected ? selectedLabel : ctaLabel}
      </button>
    </article>
  );
}

function SlotCardInline({
  slot,
  locale,
  selected,
  onSelect,
  spotsLeftText,
  spotsLastText,
  selectedLabel,
}: {
  slot: ChessCourseSlot;
  locale: ChessBookingChatLocale;
  selected: boolean;
  onSelect: () => void;
  spotsLeftText: (count: number) => string;
  spotsLastText: (count: number) => string;
  selectedLabel: string;
}) {
  const lowSpots = slot.spots_left > 0 && slot.spots_left <= 2;
  const dateLabel = (() => {
    if (!slot.date && !slot.starts_at) return '—';
    const parsed = new Date(slot.date || slot.starts_at);
    if (Number.isNaN(parsed.getTime())) return slot.date || slot.starts_at;
    try {
      return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(parsed);
    } catch {
      return slot.date || slot.starts_at;
    }
  })();
  const timeLabel = slot.start_time
    ? slot.start_time
    : slot.starts_at
    ? (() => {
        const t = new Date(slot.starts_at);
        if (Number.isNaN(t.getTime())) return '';
        try {
          return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(t);
        } catch {
          return '';
        }
      })()
    : '';
  return (
    <button
      type="button"
      className="chess-chat-slot"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="chess-chat-slot-date">{dateLabel}</span>
      <span className="chess-chat-slot-time">{timeLabel}</span>
      {slot.cohort_label ? (
        <span className="chess-chat-slot-cohort">{slot.cohort_label}</span>
      ) : null}
      {slot.spots_left > 0 ? (
        <span
          className={`chess-chat-slot-spots${lowSpots ? ' chess-chat-slot-spots--low' : ''}`}
        >
          {lowSpots ? spotsLastText(slot.spots_left) : spotsLeftText(slot.spots_left)}
        </span>
      ) : null}
      {selected ? (
        <span className="chess-chat-slot-selected" aria-hidden="true">
          ✓ {selectedLabel}
        </span>
      ) : null}
    </button>
  );
}

export function ChessBookingChat({
  locale,
  dict,
  paymentDict,
  orderDict,
  sourcePage,
  runtimeConfig,
  resolveProgramAmounts,
  inferProgramKeyFromName,
  buildOrderDetailUrl,
  returnHomeLabel,
  onReturnHome,
}: ChessBookingChatProps) {
  const [step, setStep] = useState<ChatStep>('intro');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { kind: 'bot', id: nextId('m'), text: dict.intro },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<ChessCatalogMatch | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ChessCourseSlot | null>(null);
  const [details, setDetails] = useState<CollectedDetails>({
    customerName: '',
    email: '',
    phone: '',
  });
  const [paymentOptions, setPaymentOptions] = useState<ChessPaymentOption[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderCard, setOrderCard] = useState<OrderCard | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Keep the chat localised when the page-level locale toggles.
  useEffect(() => {
    setMessages((current) => {
      // Only swap the very first bot intro string — leave conversation history untouched.
      if (!current.length) return current;
      const next = [...current];
      const first = next[0];
      if (first.kind === 'bot' && first.id === 'm-1') {
        next[0] = { ...first, text: dict.intro };
      }
      return next;
    });
  }, [dict.intro]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for the `chess-chat-focus` custom event dispatched by primary CTAs.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    function onFocus() {
      const el = inputRef.current;
      if (el) {
        // Delay a tick so the smooth scroll lands first.
        window.setTimeout(() => {
          try {
            el.focus({ preventScroll: false });
          } catch {
            el.focus();
          }
        }, 280);
      }
    }
    window.addEventListener('chess-chat-focus', onFocus);
    return () => window.removeEventListener('chess-chat-focus', onFocus);
  }, []);

  const appendBot = useCallback((text: string) => {
    setMessages((current) => [...current, { kind: 'bot', id: nextId('m'), text }]);
  }, []);

  const appendUser = useCallback((text: string) => {
    setMessages((current) => [...current, { kind: 'user', id: nextId('m'), text }]);
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      setErrorBanner(null);
      setStep('searching');
      const typingId = nextId('typing');
      setMessages((current) => [
        ...current,
        { kind: 'bot', id: nextId('m'), text: dict.searching },
        { kind: 'typing', id: typingId },
      ]);
      try {
        const response = await apiV1.chessCatalogSearch({
          query: query.trim(),
          filters: null,
        });
        setMessages((current) => current.filter((m) => m.id !== typingId));
        if (!('data' in response)) {
          appendBot(dict.searchError);
          setStep('intro');
          return;
        }
        const matches = response.data.matches.slice(0, 4);
        if (!matches.length) {
          appendBot(dict.searchEmpty);
          setStep('intro');
          return;
        }
        appendBot(dict.searchHits);
        setMessages((current) => [
          ...current,
          { kind: 'courses', id: nextId('cards'), courses: matches },
        ]);
        setStep('intro');
      } catch (err) {
        setMessages((current) => current.filter((m) => m.id !== typingId));
        appendBot(err instanceof Error ? err.message : dict.searchError);
        setStep('intro');
      }
    },
    [appendBot, dict.searchEmpty, dict.searchError, dict.searchHits, dict.searching],
  );

  const loadSlots = useCallback(
    async (course: ChessCatalogMatch) => {
      setStep('pickSlot');
      const typingId = nextId('typing');
      setMessages((current) => [
        ...current,
        { kind: 'bot', id: nextId('m'), text: dict.pickSlotPrompt },
        { kind: 'typing', id: typingId },
      ]);
      try {
        const range = buildLookaheadRange();
        const response = await apiV1.chessCourseSlots(course.service_id, {
          from: range.from,
          to: range.to,
          limit: 8,
        });
        setMessages((current) => current.filter((m) => m.id !== typingId));
        if ('data' in response && Array.isArray(response.data.slots) && response.data.slots.length) {
          setMessages((current) => [
            ...current,
            {
              kind: 'slots',
              id: nextId('slots'),
              slots: response.data.slots,
              serviceId: course.service_id,
            },
          ]);
        } else {
          appendBot(dict.slotsEmpty);
          // Skip slot selection — proceed to detail collection without a fixed slot.
          appendBot(dict.collectingName);
          setStep('collectingName');
        }
      } catch (err) {
        setMessages((current) => current.filter((m) => m.id !== typingId));
        appendBot(err instanceof Error ? err.message : dict.slotsError);
        appendBot(dict.collectingName);
        setStep('collectingName');
      }
    },
    [
      appendBot,
      dict.collectingName,
      dict.pickSlotPrompt,
      dict.slotsEmpty,
      dict.slotsError,
    ],
  );

  const handleQuickReply = useCallback(
    (text: string) => {
      if (step === 'searching' || step === 'submitting') return;
      appendUser(text);
      void performSearch(text);
    },
    [appendUser, performSearch, step],
  );

  const handleCourseSelect = useCallback(
    (course: ChessCatalogMatch) => {
      if (step === 'pickSlot' || step === 'submitting') return;
      setSelectedCourse(course);
      setSelectedSlot(null);
      appendUser(dict.chooseCourse + ' · ' + course.name);
      void loadSlots(course);
    },
    [appendUser, dict.chooseCourse, loadSlots, step],
  );

  const handleSlotSelect = useCallback(
    (slot: ChessCourseSlot) => {
      if (step !== 'pickSlot') return;
      setSelectedSlot(slot);
      const slotText = formatSlotLabel(slot, locale);
      appendUser(slotText);
      appendBot(dict.collectingName);
      setStep('collectingName');
    },
    [appendBot, appendUser, dict.collectingName, locale, step],
  );

  const handleSendInput = useCallback(
    (raw?: string) => {
      const value = (raw ?? inputValue).trim();
      if (!value) return;
      setInputValue('');
      // Conversational steps interpret the input differently per state.
      if (step === 'collectingName') {
        appendUser(value);
        if (value.length < 2) {
          appendBot(dict.errorName);
          return;
        }
        setDetails((current) => ({ ...current, customerName: value }));
        appendBot(dict.collectingEmail);
        setStep('collectingEmail');
        return;
      }
      if (step === 'collectingEmail') {
        appendUser(value);
        if (!isValidEmail(value)) {
          appendBot(dict.errorEmail);
          return;
        }
        setDetails((current) => ({ ...current, email: value }));
        appendBot(dict.collectingPhone);
        setStep('collectingPhone');
        return;
      }
      if (step === 'collectingPhone') {
        appendUser(value);
        setDetails((current) => ({ ...current, phone: value }));
        appendBot(dict.reviewing);
        setMessages((current) => [...current, { kind: 'review', id: nextId('review') }]);
        setStep('reviewing');
        return;
      }
      // Free-form natural-language search at any other moment.
      if (step === 'intro' || step === 'done') {
        appendUser(value);
        void performSearch(value);
        return;
      }
      // Step doesn't accept text — ignore but surface a helpful nudge.
      appendUser(value);
    },
    [
      appendBot,
      appendUser,
      dict.collectingEmail,
      dict.collectingPhone,
      dict.errorEmail,
      dict.errorName,
      dict.reviewing,
      inputValue,
      performSearch,
      step,
    ],
  );

  const handleSkipPhone = useCallback(() => {
    if (step !== 'collectingPhone') return;
    appendUser(dict.skipPhone);
    setDetails((current) => ({ ...current, phone: '' }));
    appendBot(dict.reviewing);
    setMessages((current) => [...current, { kind: 'review', id: nextId('review') }]);
    setStep('reviewing');
  }, [appendBot, appendUser, dict.reviewing, dict.skipPhone, step]);

  const handleEditDetails = useCallback(() => {
    setStep('collectingName');
    appendBot(dict.collectingName);
  }, [appendBot, dict.collectingName]);

  const loadPaymentOptions = useCallback(
    async (card: OrderCard) => {
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const response = await apiV1.chessPaymentOptions({
          lead_id: card.leadId,
          booking_intent_id: card.bookingIntentId,
          program_key: card.programKey,
          amount_vnd: card.amounts.vnd,
          amount_aud: card.amounts.aud,
          parent_name: card.parentName,
          parent_email: card.parentEmail,
          locale,
        });
        if ('data' in response) {
          setPaymentOptions(response.data.payment_options);
        } else {
          setPaymentOptions([]);
        }
      } catch (err) {
        setPaymentError(
          err instanceof Error
            ? err.message
            : locale === 'vi'
            ? 'Không tải được phương thức thanh toán lúc này.'
            : 'We could not load your payment options just now.',
        );
        setPaymentOptions([]);
      } finally {
        setPaymentLoading(false);
      }
    },
    [locale],
  );

  const submitBooking = useCallback(async () => {
    if (!selectedCourse) return;
    setStep('submitting');
    const typingId = nextId('typing');
    setMessages((current) => [
      ...current,
      { kind: 'bot', id: nextId('m'), text: dict.submitting },
      { kind: 'typing', id: typingId },
    ]);
    try {
      const trimmedEmail = details.email.trim();
      const trimmedPhone = details.phone.trim();
      const trimmedName = details.customerName.trim() || dict.defaultName;
      const detailNote = [
        `Course: ${selectedCourse.name}`,
        selectedSlot ? `Slot: ${formatSlotLabel(selectedSlot, locale)}` : null,
        `Locale: ${locale}`,
      ]
        .filter(Boolean)
        .join(' | ');
      let result: BookingResult = {
        bookingReference: '',
        leadId: 'captured',
        bookingIntentId: null,
        meetingUrl: null,
        calendarUrl: null,
      };
      if (selectedSlot && selectedSlot.date && selectedSlot.start_time) {
        const authoritative = await createPublicBookingAssistantLeadAndBookingIntent({
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          serviceId: selectedCourse.service_id,
          serviceName: selectedCourse.name,
          serviceCategory: 'Chess coaching',
          requestedDate: selectedSlot.date,
          requestedTime: selectedSlot.start_time,
          timezone: TIMEZONE,
          sourcePage,
          notes: detailNote,
          runtimeConfig,
          scheduleSlotId: selectedSlot.slot_id || null,
        });
        result = {
          bookingReference: authoritative.bookingReference || '',
          leadId: authoritative.leadId || 'captured',
          bookingIntentId: authoritative.bookingIntentId || null,
          meetingUrl: authoritative.meetingUrl ?? null,
          calendarUrl: authoritative.calendarUrl ?? null,
        };
      } else {
        // No fixed slot — just create a lead via the booking assistant with a placeholder
        // date/time. The backend captures the brief and the coach follows up by email.
        const today = new Date();
        const placeholderDate = today.toISOString().slice(0, 10);
        const authoritative = await createPublicBookingAssistantLeadAndBookingIntent({
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          serviceId: selectedCourse.service_id,
          serviceName: selectedCourse.name,
          serviceCategory: 'Chess coaching',
          requestedDate: placeholderDate,
          requestedTime: '00:00',
          timezone: TIMEZONE,
          sourcePage,
          notes: detailNote + ' | NO_FIXED_SLOT',
          runtimeConfig,
          scheduleSlotId: null,
        });
        result = {
          bookingReference: authoritative.bookingReference || '',
          leadId: authoritative.leadId || 'captured',
          bookingIntentId: authoritative.bookingIntentId || null,
          meetingUrl: null,
          calendarUrl: null,
        };
      }

      const programKey = inferProgramKeyFromName(selectedCourse.name);
      const amounts = resolveSelectedCourseAmounts(
        selectedCourse,
        resolveProgramAmounts(programKey),
      );
      const sessionStartsAt = (() => {
        if (selectedSlot?.starts_at) return selectedSlot.starts_at;
        if (selectedSlot?.date) {
          return selectedSlot.start_time
            ? `${selectedSlot.date}T${selectedSlot.start_time}:00`
            : selectedSlot.date;
        }
        return null;
      })();
      const formattedAmount = (() => {
        const amount = locale === 'vi' ? amounts.vnd : amounts.aud;
        const currency = locale === 'vi' ? 'VND' : 'AUD';
        try {
          return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
            style: 'currency',
            currency,
            maximumFractionDigits: currency === 'VND' ? 0 : 2,
          }).format(amount);
        } catch {
          return `${amount} ${currency}`;
        }
      })();
      const card: OrderCard = {
        orderReference: result.bookingReference || 'CHESS-PENDING',
        sessionStartsAt,
        sessionTimeLabel: selectedSlot?.start_time || null,
        cohortLabel: selectedSlot?.cohort_label || selectedCourse.name || null,
        meetingUrl: result.meetingUrl,
        calendarUrl: result.calendarUrl,
        paymentAmountFormatted: formattedAmount,
        programKey,
        amounts: { vnd: amounts.vnd, aud: amounts.aud },
        parentName: trimmedName,
        parentEmail: trimmedEmail || null,
        leadId: result.leadId,
        bookingIntentId: result.bookingIntentId,
      };
      setOrderCard(card);
      // Fire-and-forget lifecycle confirmation email so the parent receives a
      // booking summary + meeting URL + add-to-calendar link + (when payment
      // is still pending) a payment_link back to the portal order page where
      // they can complete Stripe checkout or view the QR/bank transfer details.
      // Auto-CC chess@bookedai.au is handled server-side (migration 039 + the
      // _resolve_lifecycle_cc_list path in v1_communication_handlers.py).
      if (trimmedEmail && result.bookingReference) {
        const payLinkBase = (() => {
          if (typeof window === 'undefined') return '';
          const { hostname, protocol } = window.location;
          if (hostname.endsWith('.bookedai.au')) {
            return `${protocol}//portal.bookedai.au/order/${encodeURIComponent(result.bookingReference)}`;
          }
          return `/order/${encodeURIComponent(result.bookingReference)}`;
        })();
        // Build a UNIVERSAL Google Calendar "add event" URL the recipient can
        // click without needing a Zoho login. Zoho's own viewEventURL only
        // works for the calendar owner (chess@bookedai.au) and just shows a
        // sign-in wall to guests. Google Calendar's render?action=TEMPLATE
        // URL is publicly clickable from any email client.
        const buildGoogleCalendarAddUrl = (): string => {
          if (!sessionStartsAt) return '';
          const startDt = new Date(sessionStartsAt);
          if (Number.isNaN(startDt.getTime())) return '';
          // Read duration from slot via permissive access — the API surfaces
          // it as optional but legacy versions of the TS type omit it.
          const slotDuration = (selectedSlot as { duration_minutes?: number | null } | null)
            ?.duration_minutes;
          const durationMin =
            typeof slotDuration === 'number' && slotDuration > 0 ? slotDuration : 60;
          const endDt = new Date(startDt.getTime() + durationMin * 60 * 1000);
          const fmt = (d: Date): string =>
            d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${selectedCourse.name} — WGM Mai Hưng`,
            dates: `${fmt(startDt)}/${fmt(endDt)}`,
            details: [
              `Booking ${result.bookingReference}`,
              result.meetingUrl ? `Join: ${result.meetingUrl}` : '',
              `Coach: WGM Nguyễn Thị Mai Hưng`,
              selectedSlot?.cohort_label || '',
            ]
              .filter(Boolean)
              .join('\n'),
            location: 'Online (Lichess + Zoom + Zoho Meeting)',
          });
          return `https://calendar.google.com/calendar/render?${params.toString()}`;
        };
        const publicCalendarAdd = buildGoogleCalendarAddUrl();
        void apiV1
          .sendLifecycleEmail({
            template_key: 'bookedai_booking_confirmation',
            to: [trimmedEmail],
            cc: [],
            subject:
              locale === 'vi'
                ? `Xác nhận đăng ký lớp cờ vua — ${result.bookingReference}`
                : `Chess class booking confirmed — ${result.bookingReference}`,
            variables: {
              parent_name: trimmedName,
              service_name: selectedCourse.name,
              cohort_label: selectedSlot?.cohort_label || '',
              preferred_date: selectedSlot?.date || '',
              preferred_time: selectedSlot?.start_time || '',
              booking_reference: result.bookingReference,
              meeting_url: result.meetingUrl || '',
              // Use the Google Calendar add URL (universal, no login wall) as
              // the calendar variable — falls back to Zoho's URL only when
              // we can't compute the public one.
              calendar_event_url: publicCalendarAdd || result.calendarUrl || '',
              payment_link: payLinkBase,
              manage_link: payLinkBase,
              locale,
              amount_display: formattedAmount,
            },
            context: {
              tenant_ref: 'co-mai-hung-chess-class',
              source_surface: sourcePage,
              booking_intent_id: result.bookingIntentId,
            },
            actor_context: {
              channel: 'public_web',
              deployment_mode: 'standalone_app',
              tenant_ref: 'co-mai-hung-chess-class',
            },
          })
          .catch(() => {
            // Email send is best-effort; backend webhook + outbox event tracks
            // the booking either way. Don't block the chat UX.
          });
      }
      setMessages((current) => current.filter((m) => m.id !== typingId));
      appendBot(dict.payment);
      setMessages((current) => [
        ...current,
        { kind: 'order', id: nextId('order') },
        { kind: 'payment', id: nextId('pay') },
      ]);
      setStep('payment');
      void loadPaymentOptions(card);
    } catch (err) {
      setMessages((current) => current.filter((m) => m.id !== typingId));
      // Detect race-condition slot lock: backend returns a 422 whose message
      // mentions "just filled" / "schedule slot". Auto-recover by clearing the
      // stale slot selection, surfacing a friendly retry message, and
      // re-fetching the live open-slot list so the visitor can pick again.
      const message = err instanceof Error ? err.message : '';
      const isSlotLocked = /just filled|schedule slot|slot.*full|slot.*unavailable/i.test(
        message,
      );
      if (isSlotLocked && selectedCourse) {
        setSelectedSlot(null);
        appendBot(dict.slotLockedRetry);
        void loadSlots(selectedCourse);
        return;
      }
      appendBot(err instanceof Error ? err.message : dict.bookingError);
      setStep('reviewing');
    }
  }, [
    appendBot,
    details,
    dict.bookingError,
    dict.defaultName,
    dict.payment,
    dict.slotLockedRetry,
    dict.submitting,
    inferProgramKeyFromName,
    loadPaymentOptions,
    loadSlots,
    locale,
    resolveProgramAmounts,
    runtimeConfig,
    selectedCourse,
    selectedSlot,
    sourcePage,
  ]);

  const renderConfirmedOrder = useCallback(() => {
    setMessages((current) =>
      current.some((message) => message.kind === 'order')
        ? current
        : [...current, { kind: 'order', id: nextId('order') }],
    );
    setStep('done');
  }, []);

  const handlePaymentSkip = useCallback(() => {
    if (!orderCard) return;
    renderConfirmedOrder();
  }, [orderCard, renderConfirmedOrder]);

  const handleResetChat = useCallback(() => {
    messageCounter = 0;
    setStep('intro');
    setMessages([{ kind: 'bot', id: nextId('m'), text: dict.intro }]);
    setSelectedCourse(null);
    setSelectedSlot(null);
    setDetails({ customerName: '', email: '', phone: '' });
    setPaymentOptions([]);
    setPaymentError(null);
    setOrderCard(null);
    setErrorBanner(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chess-chat-focus'));
    }
  }, [dict.intro]);

  const handleBrowseAll = useCallback(() => {
    appendUser(dict.browseAll);
    void performSearch('all chess programs');
  }, [appendUser, dict.browseAll, performSearch]);

  const handleSubmitForm = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSendInput();
    },
    [handleSendInput],
  );

  const handleInputKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendInput();
      }
    },
    [handleSendInput],
  );

  const inputDisabled =
    step === 'searching' || step === 'submitting' || step === 'pickSlot';

  // The intro chips render below the most recent bot message when at intro step.
  const showQuickReplies = step === 'intro' && messages.length <= 2;
  const showBrowseAll = step === 'intro';

  // Memoised review summary for the inline review card.
  const reviewLines = useMemo(() => {
    const courseLine = selectedCourse ? dict.reviewLineCourse(selectedCourse.name) : '';
    const slotLine = selectedSlot
      ? dict.reviewLineSlot(formatSlotLabel(selectedSlot, locale))
      : dict.reviewSlotTbc;
    const contactLine = dict.reviewLineContact(
      details.customerName || '—',
      details.email || '—',
    );
    return { courseLine, slotLine, contactLine };
  }, [details.customerName, details.email, dict, locale, selectedCourse, selectedSlot]);

  return (
    <div className="chess-chat" data-step={step}>
      <header className="chess-chat-header">
        <strong>{dict.header}</strong>
        <button type="button" className="chess-chat-reset" onClick={handleResetChat}>
          {dict.reset}
        </button>
      </header>
      <div
        ref={threadRef}
        className="chess-chat-thread"
        role="log"
        aria-live="polite"
        aria-label={dict.ariaThread}
      >
        {messages.map((message) => {
          if (message.kind === 'bot') {
            return (
              <div key={message.id} className="chess-chat-bubble chess-chat-bubble--bot">
                <MiniAvatar />
                <div className="chess-chat-bubble-text">{message.text}</div>
              </div>
            );
          }
          if (message.kind === 'user') {
            return (
              <div key={message.id} className="chess-chat-bubble chess-chat-bubble--user">
                <div className="chess-chat-bubble-text">{message.text}</div>
              </div>
            );
          }
          if (message.kind === 'typing') {
            return (
              <div key={message.id} className="chess-chat-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            );
          }
          if (message.kind === 'courses') {
            return (
              <div key={message.id} className="chess-chat-cards">
                {message.courses.map((course) => (
                  <CourseCardInline
                    key={course.service_id}
                    course={course}
                    locale={locale}
                    selected={selectedCourse?.service_id === course.service_id}
                    onSelect={() => handleCourseSelect(course)}
                    ctaLabel={dict.chooseCourse}
                    selectedLabel={dict.selected}
                  />
                ))}
              </div>
            );
          }
          if (message.kind === 'slots') {
            return (
              <div key={message.id} className="chess-chat-card chess-chat-slots">
                <div className="chess-chat-slots-row">
                  {message.slots.map((slot) => (
                    <SlotCardInline
                      key={slot.slot_id}
                      slot={slot}
                      locale={locale}
                      selected={selectedSlot?.slot_id === slot.slot_id}
                      onSelect={() => handleSlotSelect(slot)}
                      spotsLeftText={dict.slotSpotsLeft}
                      spotsLastText={dict.slotSpotsLast}
                      selectedLabel={dict.selected}
                    />
                  ))}
                </div>
              </div>
            );
          }
          if (message.kind === 'review') {
            return (
              <div key={message.id} className="chess-chat-card chess-chat-review">
                <ul className="chess-chat-review-list">
                  <li>{reviewLines.courseLine}</li>
                  <li>{reviewLines.slotLine}</li>
                  <li>{reviewLines.contactLine}</li>
                </ul>
                <div className="chess-chat-review-actions">
                  <button
                    type="button"
                    className="chess-btn chess-btn-primary chess-btn-sm"
                    onClick={() => void submitBooking()}
                    disabled={step === 'submitting'}
                  >
                    {dict.confirm}
                  </button>
                  <button
                    type="button"
                    className="chess-btn chess-btn-outline chess-btn-sm"
                    onClick={handleEditDetails}
                  >
                    {dict.edit}
                  </button>
                </div>
              </div>
            );
          }
          if (message.kind === 'payment' && orderCard) {
            return (
              <div key={message.id} className="chess-chat-card chess-chat-payment">
                <PaymentSelection
                  locale={locale}
                  dict={paymentDict}
                  options={paymentOptions.filter((option) =>
                    locale === 'vi' ? option.currency === 'VND' : option.currency === 'AUD',
                  )}
                  loading={paymentLoading}
                  error={paymentError}
                  onRetry={() => void loadPaymentOptions(orderCard)}
                  onSkip={handlePaymentSkip}
                />
              </div>
            );
          }
          if (message.kind === 'order' && orderCard) {
            return (
              <div key={message.id} className="chess-chat-card chess-chat-order">
                <OrderConfirmation
                  locale={locale}
                  dict={orderDict}
                  orderReference={orderCard.orderReference}
                  session={{
                    startsAt: orderCard.sessionStartsAt,
                    timeLabel: orderCard.sessionTimeLabel,
                    cohortLabel: orderCard.cohortLabel,
                    meetingUrl: orderCard.meetingUrl,
                    calendarUrl: orderCard.calendarUrl,
                  }}
                  coachName="WGM Nguyễn Thị Mai Hưng"
                  coachTitle={locale === 'vi' ? 'Đại kiện tướng nữ' : 'Woman Grandmaster'}
                  paymentStatus="unpaid"
                  paymentAmountFormatted={orderCard.paymentAmountFormatted}
                  portalOrderUrl={
                    orderCard.orderReference &&
                    !orderCard.orderReference.endsWith('-PENDING')
                      ? buildOrderDetailUrl(orderCard.orderReference)
                      : null
                  }
                  tenantContact={{
                    email: 'chess@bookedai.au',
                    phone: null,
                    telegramUrl: null,
                    whatsappUrl: null,
                  }}
                  onReturnHome={() => {
                    handleResetChat();
                    onReturnHome?.();
                  }}
                  returnHomeLabel={returnHomeLabel}
                />
              </div>
            );
          }
          return null;
        })}

        {showQuickReplies ? (
          <div className="chess-chat-quickreplies" role="group" aria-label={dict.header}>
            {dict.quickReplies.map((chip) => (
              <button
                key={chip}
                type="button"
                className="chess-chat-quickreply"
                onClick={() => handleQuickReply(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {step === 'collectingPhone' ? (
          <div className="chess-chat-quickreplies">
            <button
              type="button"
              className="chess-chat-quickreply"
              onClick={handleSkipPhone}
            >
              {dict.skipPhone}
            </button>
          </div>
        ) : null}

        {showBrowseAll && messages.length <= 2 ? (
          <div className="chess-chat-quickreplies">
            <button
              type="button"
              className="chess-chat-quickreply chess-chat-quickreply--ghost"
              onClick={handleBrowseAll}
            >
              {dict.browseAll}
            </button>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="chess-chat-quickreplies">
            <button
              type="button"
              className="chess-chat-quickreply"
              onClick={handleResetChat}
            >
              {dict.bookAnother}
            </button>
          </div>
        ) : null}

        {errorBanner ? (
          <div className="chess-chat-bubble chess-chat-bubble--bot" role="alert">
            <MiniAvatar />
            <div className="chess-chat-bubble-text">{errorBanner}</div>
          </div>
        ) : null}
      </div>

      <form className="chess-chat-input-row" onSubmit={handleSubmitForm}>
        <label htmlFor="chess-chat-input" className="chess-sr-only">
          {dict.inputLabel}
        </label>
        <input
          id="chess-chat-input"
          ref={inputRef as RefObject<HTMLInputElement>}
          type="text"
          className="chess-chat-input"
          placeholder={dict.inputPlaceholder}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleInputKey}
          disabled={inputDisabled}
          autoComplete="off"
        />
        <button
          type="button"
          className="chess-chat-icon-btn"
          aria-label={dict.voiceTooltip}
          title={dict.voiceTooltip}
          disabled
        >
          <VoiceIcon />
        </button>
        <button
          type="submit"
          className="chess-chat-send"
          aria-label={dict.send}
          disabled={inputDisabled || !inputValue.trim()}
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
