/**
 * AI Mentor Concierge Chat — bespoke conversational booking interface for
 * aimentor.bookedai.au.
 *
 * Why a custom chat (not the shared BookedAI BookingAssistantDialog):
 *   - The BookedAI dialog searches across every tenant's catalogue. The
 *     AI Mentor subdomain must only ever surface its own programs, never
 *     leak chess / future-swim / other tenants into a learner's flow.
 *   - The AI Mentor brand is teal + coral with Space Grotesk display +
 *     JetBrains Mono accents — not the Apple-system shell BookedAI uses.
 *   - The booking funnel here is bespoke: greet → match → pick program →
 *     pick slot → contact form → reserve (atomic seat hold + Zoho Meeting
 *     + Google Calendar invite via /api/v1/aimentor/slots/{slot_id}/reserve)
 *     → branded success card. No payments mid-chat — Stripe checkout
 *     is the next step the mentor sends after confirming.
 *
 * APIs consumed (all BookedAI-owned):
 *   - GET  /api/v1/aimentor/services/{service_id}/slots
 *   - POST /api/v1/aimentor/slots/{slot_id}/reserve
 *   - POST /api/v1/leads (free-text fallback)
 *
 * Dict-based search: the 10 programs the parent feeds in are the canonical
 * list (mirrors backend migration 035). No API call needed for catalog
 * lookup — keeps chat instant on every keystroke. The reserve endpoint
 * is the one place we round-trip server-side.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { copyTextToClipboard, generateQrCodeDataUrl } from '@/shared/utils/qrCode';

// ---------- types -----------------------------------------------------------

type Locale = 'en' | 'vi';

export type ChatProgram = {
  id: string;
  tier: string;
  name: string;
  summary: string;
  originalAmount: number | null;
  discountedAmount: number | null;
  currency: string;
  customLabel: string;
  suffix: string;
  tags: string[];
  icon: string;
  featured: boolean;
};

type TimeSlot = {
  id: string;
  service_id: string;
  slot_start_at: string;
  slot_end_at: string;
  timezone: string;
  capacity: number;
  booked_count: number;
  seats_available: number;
  label: string | null;
  zoho_meeting_url?: string | null;
};

type ReserveResult = {
  booking_reference: string;
  slot: {
    id: string;
    service_id: string;
    service_name: string;
    slot_start_at: string;
    slot_end_at: string;
    timezone: string;
    label: string | null;
  };
  meeting: {
    join_url: string | null;
    calendar_event_id: string | null;
    calendar_event_url?: string | null;
    provisioned: boolean;
    fallback: string | null;
  };
  portal?: {
    url: string | null;
    access_token?: string | null;
  } | null;
  crm_sync?: {
    lead?: { sync_status?: string | null };
    contact?: { sync_status?: string | null };
    deal?: { sync_status?: string | null };
    task?: { sync_status?: string | null };
    warning_codes?: string[];
  } | null;
};

type Message =
  | { id: string; role: 'assistant'; kind: 'text'; body: string }
  | { id: string; role: 'user'; kind: 'text'; body: string }
  | { id: string; role: 'assistant'; kind: 'typing' }
  | {
      id: string;
      role: 'assistant';
      kind: 'quick_replies';
      options: { id: string; label: string }[];
    }
  | { id: string; role: 'assistant'; kind: 'programs'; programs: ChatProgram[] }
  | { id: string; role: 'user'; kind: 'program_picked'; program: ChatProgram }
  | {
      id: string;
      role: 'assistant';
      kind: 'slots';
      programId: string;
      programName: string;
      slots: TimeSlot[];
    }
  | { id: string; role: 'user'; kind: 'slot_picked'; slot: TimeSlot }
  | {
      id: string;
      role: 'assistant';
      kind: 'contact_form';
      slotId: string;
      programName: string;
    }
  | {
      id: string;
      role: 'user';
      kind: 'contact_submitted';
      name: string;
      email: string;
    }
  | { id: string; role: 'assistant'; kind: 'success'; result: ReserveResult }
  | { id: string; role: 'assistant'; kind: 'error'; body: string }
  | {
      id: string;
      role: 'assistant';
      kind: 'mentor_handoff';
      reason: 'edge_case' | 'on_demand' | 'error_followup';
    };

// ---------- bilingual conversational copy -----------------------------------

const chatCopy = {
  en: {
    headerTitle: 'AI Mentor Concierge',
    headerSubtitle: 'Online · usually replies within 2 minutes',
    inputPlaceholder: 'Type your goal or ask about a program…',
    inputSendLabel: 'Send',
    greeting:
      "Hey! I'm the AI Mentor concierge. Tell me what you want to build with AI and I'll match you to a program — or pick a quick option below.",
    suggestionLabel: 'Quick start',
    quickReplies: [
      { id: 'q-first-app', label: 'I want my first AI app in 1 hour' },
      { id: 'q-automate', label: 'Help me automate real work' },
      { id: 'q-real-product', label: 'Turn my AI into a paying product' },
      { id: 'q-team', label: 'Set this up for my team (group)' },
    ],
    programResultsLead: (n: number) =>
      n === 1
        ? "Here's the program that fits best:"
        : `Here are ${n} programs that fit. Pick one to see open slots:`,
    programNoMatch:
      "Couldn't match that exactly — here are the most popular programs to start from:",
    programPickCta: 'See open slots',
    slotsHeader: (programName: string) =>
      `Open slots for ${programName} (Sydney time):`,
    slotsEmpty:
      "No open slots in the next 4 weeks — message the mentor on Telegram or WhatsApp for a custom time.",
    slotsLoadError: "Couldn't load slots — please try again.",
    slotsRefreshCta: 'Try again',
    slotPickAck: (label: string) => `Locked in ${label}.`,
    contactFormLead:
      "Last step — drop your name + email + phone so I can send the calendar invite + Zoho Meeting link.",
    contactNamePlaceholder: 'Full name',
    contactEmailPlaceholder: 'Email',
    contactPhonePlaceholder: 'Phone (Telegram or WhatsApp ideally)',
    contactSubmit: 'Confirm reservation',
    contactSubmitting: 'Reserving + creating Zoho Meeting…',
    contactErrorEmail: 'Add a valid email to continue.',
    contactErrorName: 'Add your name to continue.',
    confirmAck: (name: string) =>
      `Reserving the slot for ${name} and spinning up Zoho Meeting + Calendar invite…`,
    successHeadline: "You're in!",
    successBody:
      'Confirmation email + Zoho Calendar invite are on the way. Mentor will reach out within 24 hours.',
    successJoin: 'Open Zoho Meeting',
    successAddCalendar: 'Add to Google Calendar',
    successDownloadIcs: 'Download .ics',
    successFallback:
      'Mentor will share the Zoho Meeting link in your confirmation email + on Telegram/WhatsApp within 24 hours.',
    successAnotherCta: 'Book another program',
    errorReserve:
      "Couldn't lock that slot. It may have just filled — pick another or message the mentor.",
    errorReserveTryAgain: 'Pick another slot',
    backToProgramsCta: '← Back to programs',
    youLabel: 'You',
    mentorLabel: 'AI Mentor',
    fallbackTextResponse:
      "I'm a focused booking concierge — for general questions please message the mentor on Telegram or WhatsApp, links are in the footer. Or pick a program below:",
    fallbackTextResponseCta: 'Show me the programs',
    handoffEyebrow: 'Talk to a real mentor',
    handoffLeadEdge:
      "Looks like you have a custom question. Ping the mentor directly on whichever channel you actually use — typical reply within minutes:",
    handoffLeadOnDemand:
      "Sure — message the mentor on whichever channel you use most. Typical reply within minutes:",
    handoffLeadError:
      "Want a human to sort this out? Ping the mentor directly:",
    handoffTelegram: 'Telegram · t.me/BookedAI_Manager_Bot',
    handoffWhatsapp: 'WhatsApp · +61 455 301 335',
    handoffEmail: 'aimentor@bookedai.au',
    headerHandoffLabel: 'Talk to mentor',
    headerHandoffAria: 'Ask a real mentor on Telegram or WhatsApp',
    headerExpandLabel: 'Maximize',
    headerCollapseLabel: 'Minimize',
    headerExpandAria: 'Maximize chat to fullscreen',
    headerCollapseAria: 'Minimize chat',
    headerClearLabel: 'Reset chat',
    headerClearAria: 'Reset the chat to a fresh greeting',
    restoredBadge: 'Picked up where you left off',
  },
  vi: {
    headerTitle: 'AI Mentor Concierge',
    headerSubtitle: 'Đang online · phản hồi trong vài phút',
    inputPlaceholder: 'Nói mục tiêu hoặc hỏi về chương trình…',
    inputSendLabel: 'Gửi',
    greeting:
      'Chào bạn! Mình là concierge của AI Mentor. Nói mình mục tiêu của bạn với AI và mình sẽ gợi ý chương trình phù hợp — hoặc chọn nhanh bên dưới.',
    suggestionLabel: 'Bắt đầu nhanh',
    quickReplies: [
      { id: 'q-first-app', label: 'Mình muốn ứng dụng AI đầu tiên trong 1 giờ' },
      { id: 'q-automate', label: 'Giúp mình tự động hoá công việc' },
      { id: 'q-real-product', label: 'Biến AI thành sản phẩm có doanh thu' },
      { id: 'q-team', label: 'Cho team mình (cohort nhóm)' },
    ],
    programResultsLead: (n: number) =>
      n === 1
        ? 'Đây là chương trình phù hợp nhất:'
        : `Đây là ${n} chương trình phù hợp. Chọn một để xem slot:`,
    programNoMatch:
      'Mình chưa match được chính xác — đây là chương trình phổ biến để bắt đầu:',
    programPickCta: 'Xem slot trống',
    slotsHeader: (programName: string) =>
      `Slot trống cho ${programName} (giờ Sydney):`,
    slotsEmpty:
      'Không có slot trống trong 4 tuần tới — nhắn mentor qua Telegram/WhatsApp để chọn giờ tuỳ chỉnh.',
    slotsLoadError: 'Không tải được slot — vui lòng thử lại.',
    slotsRefreshCta: 'Thử lại',
    slotPickAck: (label: string) => `Đã chọn ${label}.`,
    contactFormLead:
      'Bước cuối — để lại tên + email + số điện thoại để mình gửi calendar invite + link Zoho Meeting.',
    contactNamePlaceholder: 'Họ và tên',
    contactEmailPlaceholder: 'Email',
    contactPhonePlaceholder: 'Số điện thoại (ưu tiên Telegram / WhatsApp)',
    contactSubmit: 'Xác nhận giữ chỗ',
    contactSubmitting: 'Đang giữ chỗ + tạo Zoho Meeting…',
    contactErrorEmail: 'Cần email hợp lệ để tiếp tục.',
    contactErrorName: 'Cần tên của bạn để tiếp tục.',
    confirmAck: (name: string) =>
      `Đang giữ chỗ cho ${name} và tạo Zoho Meeting + Calendar invite…`,
    successHeadline: 'Đã giữ chỗ!',
    successBody:
      'Email xác nhận + Zoho Calendar invite sẽ tới ngay. Mentor liên hệ trong 24 giờ.',
    successJoin: 'Mở Zoho Meeting',
    successAddCalendar: 'Thêm vào Google Calendar',
    successDownloadIcs: 'Tải file .ics',
    successFallback:
      'Mentor sẽ gửi link Zoho Meeting qua email xác nhận + Telegram/WhatsApp trong 24 giờ.',
    successAnotherCta: 'Đặt chương trình khác',
    errorReserve:
      'Không giữ chỗ được. Slot có thể vừa đầy — chọn slot khác hoặc nhắn mentor.',
    errorReserveTryAgain: 'Chọn slot khác',
    backToProgramsCta: '← Về danh sách chương trình',
    youLabel: 'Bạn',
    mentorLabel: 'AI Mentor',
    fallbackTextResponse:
      'Mình tập trung vào việc đặt chỗ — câu hỏi tổng quát hãy nhắn mentor qua Telegram/WhatsApp ở footer. Hoặc xem chương trình bên dưới:',
    fallbackTextResponseCta: 'Xem chương trình',
    handoffEyebrow: 'Trao đổi trực tiếp với mentor',
    handoffLeadEdge:
      'Hỏi của bạn có vẻ là tuỳ chỉnh — nhắn trực tiếp mentor qua kênh bạn quen dùng, thường phản hồi trong vài phút:',
    handoffLeadOnDemand:
      'Được — nhắn mentor qua kênh bạn dùng nhiều nhất. Thường phản hồi trong vài phút:',
    handoffLeadError:
      'Cần người thật xử lý? Nhắn mentor trực tiếp:',
    handoffTelegram: 'Telegram · t.me/BookedAI_Manager_Bot',
    handoffWhatsapp: 'WhatsApp · +61 455 301 335',
    handoffEmail: 'aimentor@bookedai.au',
    headerHandoffLabel: 'Nhắn mentor',
    headerHandoffAria: 'Hỏi mentor thật qua Telegram hoặc WhatsApp',
    headerExpandLabel: 'Mở rộng',
    headerCollapseLabel: 'Thu gọn',
    headerExpandAria: 'Mở chat ra toàn màn hình',
    headerCollapseAria: 'Thu chat',
    headerClearLabel: 'Bắt đầu lại',
    headerClearAria: 'Đặt lại chat về tin chào ban đầu',
    restoredBadge: 'Mình đã giữ phiên chat trước của bạn',
  },
} as const;

// ---------- search heuristic -----------------------------------------------

const KEYWORD_INTENT: Record<string, string[]> = {
  // English keywords + Vietnamese keywords mapped to program IDs
  'first-ai-app': ['first', 'first ai', 'first app', '1 hour', '60', 'sixty', 'beginner', 'start', 'prototype', 'app đầu', '60 phút', 'người mới', 'prototype'],
  executes: ['automate', 'automation', 'workflow', 'save time', 'email triage', 'tự động', 'vận hành', 'tiết kiệm', '5 giờ'],
  'real-product': ['real product', 'monetize', 'paying', 'launch', 'stripe', 'sản phẩm', 'doanh thu', 'monetiz', '10 giờ', 'product'],
  'project-builder': ['project', 'roadmap', 'sprint', 'custom', 'dự án', 'tuỳ chỉnh', 'custom'],
  ongoing: ['ongoing', 'retainer', 'continuous', 'ops support', 'liên tục', 'duy trì'],
};

const GROUP_KEYWORDS = ['group', 'cohort', 'team', 'nhóm', 'cohort', 'team mình'];

type MatchResult = { matches: ChatProgram[]; strong: boolean };

function matchPrograms(query: string, programs: ChatProgram[]): MatchResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      matches: programs.filter((p) => p.featured).slice(0, 3),
      // Empty query is "show me popular" — neutral, not an edge case
      strong: true,
    };
  }

  const wantsGroup = GROUP_KEYWORDS.some((k) => q.includes(k));
  const wantsPrivate = q.includes('private') || q.includes('1-1') || q.includes('1on1') || q.includes('riêng');
  const tierFilter = (p: ChatProgram) => {
    const isGroup = p.id.startsWith('ai-mentor-group') || p.tier.toLowerCase().includes('group') || p.tier.toLowerCase().includes('cohort') || p.tier.toLowerCase().includes('nhóm');
    if (wantsGroup) return isGroup;
    if (wantsPrivate) return !isGroup;
    return true;
  };

  // Score each program by keyword overlap + tag match. Track whether ANY
  // program got an "intent keyword" hit (×3 weight) — that's our signal
  // for "strong match" vs "fallback to featured" (which triggers mentor
  // handoff for free-text queries).
  let anyIntentHit = false;
  const scored = programs.map((p) => {
    let score = 0;
    const haystack = `${p.name} ${p.summary} ${p.tags.join(' ')}`.toLowerCase();

    for (const [intentKey, keywords] of Object.entries(KEYWORD_INTENT)) {
      if (p.id.includes(intentKey)) {
        for (const kw of keywords) {
          if (q.includes(kw)) {
            score += 3;
            anyIntentHit = true;
          }
        }
      }
    }
    // generic word overlap (>=4 chars)
    for (const tok of q.split(/\s+/)) {
      if (tok.length >= 4 && haystack.includes(tok)) score += 1;
    }
    if (p.featured) score += 0.5;
    return { p, score };
  });

  const filtered = scored.filter(({ p }) => tierFilter(p));
  const matched = filtered
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ p }) => p);

  if (matched.length > 0) {
    return { matches: matched, strong: anyIntentHit || wantsGroup || wantsPrivate };
  }
  // Fallback: top 3 featured-then-priced programs of the right tier.
  // Strong=false means handleQuery will append the mentor-handoff card.
  return {
    matches: filtered
      .sort((a, b) => (b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0))
      .slice(0, 3)
      .map(({ p }) => p),
    strong: false,
  };
}

// ---------- calendar helpers (universal Add-to-Calendar) -------------------

function _toIcsDate(dateIso: string): string {
  const d = new Date(dateIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function buildGoogleCalendarUrl(opts: {
  title: string;
  startIso: string;
  endIso: string;
  description: string;
  location: string;
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${_toIcsDate(opts.startIso)}/${_toIcsDate(opts.endIso)}`,
    details: opts.description,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsDataUrl(opts: {
  title: string;
  startIso: string;
  endIso: string;
  description: string;
  location: string;
  uid: string;
}): string {
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Mentor 1-on-1 Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@aimentor.bookedai.au`,
    `DTSTAMP:${_toIcsDate(new Date().toISOString())}`,
    `DTSTART:${_toIcsDate(opts.startIso)}`,
    `DTEND:${_toIcsDate(opts.endIso)}`,
    `SUMMARY:${escape(opts.title)}`,
    `DESCRIPTION:${escape(opts.description)}`,
    `LOCATION:${escape(opts.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

// ---------- formatting helpers ---------------------------------------------

function priceLabel(p: ChatProgram): string {
  if (p.discountedAmount != null) {
    const fmt = (n: number) =>
      Number.isInteger(n)
        ? n.toLocaleString('en-US')
        : n.toLocaleString('en-US', { minimumFractionDigits: 2 });
    return `${p.currency} $${fmt(p.discountedAmount)} ${p.suffix}`;
  }
  return `${p.customLabel} · ${p.suffix}`;
}

let _msgIdCounter = 0;
function nextMsgId(): string {
  _msgIdCounter += 1;
  return `msg-${Date.now()}-${_msgIdCounter}`;
}

// ---------- chat state persistence (sessionStorage) ------------------------
//
// Survives page reload + back-button navigation within the same tab. Keyed
// by locale so a flip wipes stale state. 1-hour TTL guards against
// long-stale slot data (slots may be booked by others by the time the
// learner returns).

const CHAT_STORAGE_KEY = 'aimentor.bookedai.chat.state';
const CHAT_STATE_TTL_MS = 60 * 60 * 1000;

type PersistedChatState = {
  version: 1;
  locale: Locale;
  messages: Message[];
  contactForm: { name: string; email: string; phone: string };
  expanded: boolean;
  savedAt: number;
};

function readPersistedChatState(currentLocale: Locale): PersistedChatState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChatState;
    if (!parsed || parsed.version !== 1) return null;
    if (parsed.locale !== currentLocale) return null;
    if (
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > CHAT_STATE_TTL_MS
    ) {
      return null;
    }
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedChatState(state: Omit<PersistedChatState, 'version' | 'savedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedChatState = {
      ...state,
      version: 1,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function clearPersistedChatState() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---------- AIMentorChat component -----------------------------------------

export type AIMentorChatProps = {
  programs: ChatProgram[];
  locale: Locale;
  mentorInitials?: string;
};

export function AIMentorChat({ programs, locale, mentorInitials = 'LV' }: AIMentorChatProps) {
  const t = chatCopy[locale];

  const buildFreshMessages = useCallback((): Message[] => [
    { id: nextMsgId(), role: 'assistant', kind: 'text', body: chatCopy[locale].greeting },
    {
      id: nextMsgId(),
      role: 'assistant',
      kind: 'quick_replies',
      options: chatCopy[locale].quickReplies.map((q) => ({ id: q.id, label: q.label })),
    },
  ], [locale]);

  // Restore prior session if same locale + within TTL. ``restoredOnce`` is
  // a one-shot ref so we only show the "picked up where you left off" badge
  // once per mount.
  const initialPersisted = useMemo(() => readPersistedChatState(locale), [locale]);
  const [messages, setMessages] = useState<Message[]>(
    () => initialPersisted?.messages ?? buildFreshMessages(),
  );
  const [contactForm, setContactForm] = useState(
    () => initialPersisted?.contactForm ?? { name: '', email: '', phone: '' },
  );
  const [expanded, setExpanded] = useState<boolean>(
    () => initialPersisted?.expanded ?? false,
  );
  const restoredFromStorage = useRef<boolean>(initialPersisted !== null);
  const [draft, setDraft] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Persist on every change so refresh / back-button preserves context.
  useEffect(() => {
    writePersistedChatState({ locale, messages, contactForm, expanded });
  }, [locale, messages, contactForm, expanded]);

  // Reset chat copy when locale flips. Wipes persisted state too — the
  // restored messages would otherwise be in the previous language.
  const previousLocaleRef = useRef<Locale>(locale);
  useEffect(() => {
    if (previousLocaleRef.current === locale) return;
    previousLocaleRef.current = locale;
    clearPersistedChatState();
    restoredFromStorage.current = false;
    setMessages(buildFreshMessages());
    setContactForm({ name: '', email: '', phone: '' });
    setContactError(null);
  }, [locale, buildFreshMessages]);

  // Body scroll lock when expanded fullscreen
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  // Esc to collapse fullscreen
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Cross-component reservation hook — external CTAs (program-card "Book"
  // buttons, hero/final-CTA "Reserve" buttons, ?banner=qr deep links)
  // dispatch a window CustomEvent so any caller on the page can drop the
  // learner straight into chat with the right program / starting message
  // already queued. Source-of-truth is the chat — no parallel form to
  // diverge from.
  useEffect(() => {
    const handleProgramEvent = (event: Event) => {
      const e = event as CustomEvent<{ programId?: string }>;
      const programId = e.detail?.programId;
      if (!programId) return;
      const program = programs.find((p) => p.id === programId);
      if (!program) return;
      // Append a synthetic user "I'd like X" bubble + the program-pick
      // assistant chain. ``handleProgramPick`` calls the slots fetch.
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: 'user',
          kind: 'text',
          body: program.name,
        },
        {
          id: nextMsgId(),
          role: 'assistant',
          kind: 'text',
          body:
            locale === 'vi'
              ? `Đã chọn ${program.name}. Đang tải slot trống…`
              : `Picked ${program.name}. Loading open slots…`,
        },
      ]);
      void (async () => {
        try {
          const res = await fetch(
            `/api/v1/aimentor/services/${encodeURIComponent(program.id)}/slots`,
          );
          const payload = (await res.json().catch(() => null)) as
            | { status?: string; data?: { slots?: TimeSlot[] } }
            | null;
          if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextMsgId(),
                role: 'assistant',
                kind: 'error',
                body: chatCopy[locale].slotsLoadError,
              },
            ]);
            return;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: nextMsgId(),
              role: 'assistant',
              kind: 'slots',
              programId: program.id,
              programName: program.name,
              slots: payload.data?.slots ?? [],
            },
          ]);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: nextMsgId(),
              role: 'assistant',
              kind: 'error',
              body: chatCopy[locale].slotsLoadError,
            },
          ]);
        }
      })();
    };

    const handleQrEvent = () => {
      // Append a one-off welcome variation when the learner arrives via
      // banner QR. We don't reset the rest of the conversation in case
      // they were mid-flow when the URL fired.
      const greeting =
        locale === 'vi'
          ? 'Xin chào từ banner AI Mentor 1-1! Bạn muốn xây gì với AI? Hoặc chọn nhanh một option bên dưới để mình gợi ý chương trình phù hợp.'
          : 'Welcome from the AI Mentor 1-on-1 banner! What do you want to build with AI? Or pick one of the quick options below and I\'ll match you to a program.';
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), role: 'assistant', kind: 'text', body: greeting },
        {
          id: nextMsgId(),
          role: 'assistant',
          kind: 'quick_replies',
          options: chatCopy[locale].quickReplies.map((q) => ({
            id: q.id,
            label: q.label,
          })),
        },
      ]);
    };

    window.addEventListener('aimentor:open-with-program', handleProgramEvent);
    window.addEventListener('aimentor:qr-arrival', handleQrEvent);
    return () => {
      window.removeEventListener('aimentor:open-with-program', handleProgramEvent);
      window.removeEventListener('aimentor:qr-arrival', handleQrEvent);
    };
  }, [programs, locale]);

  // Distributive Omit so TypeScript narrows each branch of the union
  // independently — the naive ``Omit<Extract<Message, …>, 'id' | 'role'>``
  // collapses across the union and rejects type-specific keys (``programs``,
  // ``slotId``, etc.) at the call site.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type _Distrib<T, K extends string> = T extends infer X ? Omit<X, K extends keyof X ? K : never> : never;
  type AssistantPayload = _Distrib<Extract<Message, { role: 'assistant' }>, 'id' | 'role'>;
  type UserPayload = _Distrib<Extract<Message, { role: 'user' }>, 'id' | 'role'>;
  const appendAssistant = useCallback((m: AssistantPayload) => {
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'assistant', ...m } as Message]);
  }, []);
  const appendUser = useCallback((m: UserPayload) => {
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', ...m } as Message]);
  }, []);

  const handleQuery = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      appendUser({ kind: 'text', body: trimmed });
      const { matches, strong } = matchPrograms(trimmed, programs);
      appendAssistant({
        kind: 'text',
        body:
          matches.length > 0 && strong
            ? t.programResultsLead(matches.length)
            : t.programNoMatch,
      });
      appendAssistant({ kind: 'programs', programs: matches });
      if (!strong) {
        // Weak match → user typed something off-script. Surface a mentor
        // handoff card next to the program suggestions so they have a
        // clear escape hatch (Telegram / WhatsApp / email) without
        // hunting for it in the footer.
        appendAssistant({ kind: 'mentor_handoff', reason: 'edge_case' });
      }
    },
    [appendUser, appendAssistant, programs, t],
  );

  const handleQuickReply = useCallback(
    (option: { id: string; label: string }) => {
      handleQuery(option.label);
    },
    [handleQuery],
  );

  const handleProgramPick = useCallback(
    async (program: ChatProgram) => {
      appendUser({ kind: 'program_picked', program });
      try {
        const res = await fetch(
          `/api/v1/aimentor/services/${encodeURIComponent(program.id)}/slots`,
        );
        const payload = (await res.json().catch(() => null)) as
          | { status?: string; data?: { slots?: TimeSlot[] } }
          | null;
        if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
          appendAssistant({ kind: 'error', body: t.slotsLoadError });
          return;
        }
        appendAssistant({
          kind: 'slots',
          programId: program.id,
          programName: program.name,
          slots: payload.data.slots ?? [],
        });
      } catch {
        appendAssistant({ kind: 'error', body: t.slotsLoadError });
      }
    },
    [appendAssistant, appendUser, t],
  );

  const handleSlotPick = useCallback(
    (slot: TimeSlot, programName: string) => {
      const slotLabel = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Australia/Sydney',
      }).format(new Date(slot.slot_start_at));
      appendUser({ kind: 'slot_picked', slot });
      appendAssistant({ kind: 'text', body: t.slotPickAck(slotLabel) });
      appendAssistant({ kind: 'text', body: t.contactFormLead });
      appendAssistant({ kind: 'contact_form', slotId: slot.id, programName });
    },
    [appendAssistant, appendUser, locale, t],
  );

  const handleReserveSubmit = useCallback(
    async (slotId: string) => {
      const name = contactForm.name.trim();
      const email = contactForm.email.trim().toLowerCase();
      if (!name) {
        setContactError(t.contactErrorName);
        return;
      }
      if (!email || !email.includes('@')) {
        setContactError(t.contactErrorEmail);
        return;
      }
      setContactError(null);
      setPendingSubmit(true);
      appendUser({ kind: 'contact_submitted', name, email });
      appendAssistant({ kind: 'text', body: t.confirmAck(name) });

      try {
        const res = await fetch(
          `/api/v1/aimentor/slots/${encodeURIComponent(slotId)}/reserve`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: name,
              email,
              phone: contactForm.phone.trim() || null,
              locale,
            }),
          },
        );
        const payload = (await res.json().catch(() => null)) as
          | { status?: string; data?: ReserveResult; error?: { message?: string } }
          | null;
        if (!res.ok || !payload || payload.status !== 'ok' || !payload.data) {
          appendAssistant({
            kind: 'error',
            body: payload?.error?.message || t.errorReserve,
          });
          setPendingSubmit(false);
          return;
        }
        appendAssistant({ kind: 'text', body: t.successHeadline });
        appendAssistant({ kind: 'success', result: payload.data });
        setContactForm({ name: '', email: '', phone: '' });
      } catch {
        appendAssistant({ kind: 'error', body: t.errorReserve });
      } finally {
        setPendingSubmit(false);
      }
    },
    [appendAssistant, appendUser, contactForm, locale, t],
  );

  const handleSendDraft = useCallback(() => {
    if (!draft.trim()) return;
    handleQuery(draft);
    setDraft('');
  }, [draft, handleQuery]);

  const handleStartOver = useCallback(() => {
    clearPersistedChatState();
    restoredFromStorage.current = false;
    setMessages(buildFreshMessages());
    setContactForm({ name: '', email: '', phone: '' });
    setContactError(null);
  }, [buildFreshMessages]);

  const handleMentorHandoff = useCallback(() => {
    appendAssistant({ kind: 'mentor_handoff', reason: 'on_demand' });
  }, [appendAssistant]);

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  // Container styling differs in expanded mode — fixed full-screen overlay
  // vs embedded card. ``zIndex 60`` sits above PromoBanner (50) + TopNav (40).
  const containerStyle: React.CSSProperties = expanded
    ? {
        background: '#ffffff',
        border: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        maxHeight: 'none',
      }
    : {
        background: '#ffffff',
        border: '1px solid var(--aim-line)',
        borderRadius: 'var(--aim-radius-lg)',
        boxShadow: 'var(--aim-shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: 720,
      };

  return (
    <section style={containerStyle} aria-label={t.headerTitle}>
      {/* Header */}
      <header
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #0f5c54 0%, #14a092 100%)',
          color: '#fdfaf3',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #94e8d2 0%, #1bc7b3 100%)',
            color: '#0a1f1c',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--aim-font-display)',
            fontWeight: 700,
            fontSize: '0.95rem',
            letterSpacing: '-0.02em',
            boxShadow: '0 4px 12px -4px rgba(20, 160, 146, 0.5)',
          }}
        >
          {mentorInitials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--aim-font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '-0.015em',
            }}
          >
            {t.headerTitle}
          </div>
          <div
            style={{
              fontFamily: 'var(--aim-font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              color: '#94e8d2',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 2,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#94e8d2',
                boxShadow: '0 0 6px #94e8d2',
              }}
            />
            {t.headerSubtitle}
          </div>
        </div>
        {/* Action buttons — handoff + reset + maximize/close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
          <HeaderIconButton
            ariaLabel={t.headerHandoffAria}
            title={t.headerHandoffLabel}
            onClick={handleMentorHandoff}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </HeaderIconButton>
          <HeaderIconButton
            ariaLabel={t.headerClearAria}
            title={t.headerClearLabel}
            onClick={handleStartOver}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
              <path d="M21 4v4h-4" />
              <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </HeaderIconButton>
          <HeaderIconButton
            ariaLabel={expanded ? t.headerCollapseAria : t.headerExpandAria}
            title={expanded ? t.headerCollapseLabel : t.headerExpandLabel}
            onClick={toggleExpanded}
          >
            {expanded ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
            )}
          </HeaderIconButton>
        </div>
      </header>

      {/* Restored-state badge (one-time, fades when user interacts) */}
      {restoredFromStorage.current ? (
        <div
          style={{
            padding: '6px 14px',
            background: 'rgba(148, 232, 210, 0.18)',
            color: 'var(--aim-teal-deep)',
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            textAlign: 'center',
            borderBottom: '1px solid rgba(20, 160, 146, 0.18)',
          }}
        >
          ↺ {t.restoredBadge}
        </div>
      ) : null}

      {/* Message scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px',
          background: '#fdfaf3',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 360,
        }}
      >
        {messages.map((msg) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            t={t}
            locale={locale}
            mentorInitials={mentorInitials}
            onQuickReply={handleQuickReply}
            onProgramPick={handleProgramPick}
            onSlotPick={handleSlotPick}
            contactForm={contactForm}
            setContactForm={setContactForm}
            contactError={contactError}
            pendingSubmit={pendingSubmit}
            onContactSubmit={handleReserveSubmit}
            onStartOver={handleStartOver}
          />
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--aim-line)',
          background: '#ffffff',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendDraft();
            }
          }}
          placeholder={t.inputPlaceholder}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--aim-radius)',
            border: '1px solid var(--aim-line)',
            background: '#fdfaf3',
            color: 'var(--aim-ink)',
            fontFamily: 'var(--aim-font-body)',
            fontSize: '0.95rem',
            outline: 'none',
          }}
          aria-label={t.inputPlaceholder}
        />
        <button
          type="button"
          onClick={handleSendDraft}
          disabled={!draft.trim()}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--aim-radius)',
            border: '1px solid var(--aim-coral)',
            background: draft.trim() ? 'var(--aim-coral)' : 'rgba(255, 107, 61, 0.4)',
            color: '#fdfaf3',
            fontFamily: 'var(--aim-font-body)',
            fontWeight: 600,
            fontSize: '0.92rem',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {t.inputSendLabel}
        </button>
      </div>
    </section>
  );
}

// ---------- MessageRow ------------------------------------------------------

function MessageRow({
  msg,
  t,
  locale,
  mentorInitials,
  onQuickReply,
  onProgramPick,
  onSlotPick,
  contactForm,
  setContactForm,
  contactError,
  pendingSubmit,
  onContactSubmit,
  onStartOver,
}: {
  msg: Message;
  t: (typeof chatCopy)[Locale];
  locale: Locale;
  mentorInitials: string;
  onQuickReply: (option: { id: string; label: string }) => void;
  onProgramPick: (program: ChatProgram) => void;
  onSlotPick: (slot: TimeSlot, programName: string) => void;
  contactForm: { name: string; email: string; phone: string };
  setContactForm: (v: { name: string; email: string; phone: string }) => void;
  contactError: string | null;
  pendingSubmit: boolean;
  onContactSubmit: (slotId: string) => void;
  onStartOver: () => void;
}) {
  const isAssistant = msg.role === 'assistant';

  // Plain text bubbles (assistant or user)
  if (msg.kind === 'text') {
    return (
      <ChatBubble role={msg.role} mentorInitials={mentorInitials}>
        {msg.body}
      </ChatBubble>
    );
  }

  // User picked a program
  if (msg.kind === 'program_picked') {
    return (
      <ChatBubble role="user" mentorInitials={mentorInitials}>
        {msg.program.name}
      </ChatBubble>
    );
  }

  // User picked a slot
  if (msg.kind === 'slot_picked') {
    const slotLabel = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Australia/Sydney',
    }).format(new Date(msg.slot.slot_start_at));
    return (
      <ChatBubble role="user" mentorInitials={mentorInitials}>
        {slotLabel}
      </ChatBubble>
    );
  }

  // User submitted contact form
  if (msg.kind === 'contact_submitted') {
    return (
      <ChatBubble role="user" mentorInitials={mentorInitials}>
        {msg.name} · {msg.email}
      </ChatBubble>
    );
  }

  // Assistant: quick replies
  if (isAssistant && msg.kind === 'quick_replies') {
    return (
      <SystemCard>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--aim-coral)',
            marginBottom: 8,
          }}
        >
          {t.suggestionLabel}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {msg.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onQuickReply(option)}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid rgba(20, 160, 146, 0.3)',
                background: 'rgba(20, 160, 146, 0.05)',
                color: 'var(--aim-teal-deep)',
                fontFamily: 'var(--aim-font-body)',
                fontSize: '0.84rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SystemCard>
    );
  }

  // Assistant: program cards
  if (isAssistant && msg.kind === 'programs') {
    return (
      <SystemCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msg.programs.map((p) => (
            <ProgramCard key={p.id} program={p} locale={locale} t={t} onPick={onProgramPick} />
          ))}
          {msg.programs.length === 0 ? (
            <p style={{ fontSize: '0.86rem', color: 'var(--aim-muted)' }}>
              {t.programNoMatch}
            </p>
          ) : null}
        </div>
      </SystemCard>
    );
  }

  // Assistant: slot grid
  if (isAssistant && msg.kind === 'slots') {
    if (msg.slots.length === 0) {
      return (
        <SystemCard>
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
            {t.slotsHeader(msg.programName)}
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--aim-muted)', lineHeight: 1.55 }}>
            {t.slotsEmpty}
          </p>
        </SystemCard>
      );
    }
    return (
      <SystemCard>
        <div
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--aim-coral)',
            marginBottom: 8,
          }}
        >
          {t.slotsHeader(msg.programName)}
        </div>
        <SlotGrid
          slots={msg.slots}
          locale={locale}
          onPick={(slot) => onSlotPick(slot, msg.programName)}
        />
      </SystemCard>
    );
  }

  // Assistant: contact form
  if (isAssistant && msg.kind === 'contact_form') {
    return (
      <SystemCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onContactSubmit(msg.slotId);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <input
            type="text"
            placeholder={t.contactNamePlaceholder}
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            required
            autoComplete="name"
            style={inputStyle}
          />
          <input
            type="email"
            placeholder={t.contactEmailPlaceholder}
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            required
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder={t.contactPhonePlaceholder}
            value={contactForm.phone}
            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
            autoComplete="tel"
            style={inputStyle}
          />
          {contactError ? (
            <div
              role="alert"
              style={{
                fontSize: '0.82rem',
                color: 'var(--aim-danger)',
                background: 'rgba(192, 57, 43, 0.08)',
                padding: '6px 10px',
                borderRadius: 8,
              }}
            >
              {contactError}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={pendingSubmit}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--aim-radius)',
              border: '1px solid var(--aim-coral)',
              background: pendingSubmit ? 'rgba(255, 107, 61, 0.5)' : 'var(--aim-coral)',
              color: '#fdfaf3',
              fontFamily: 'var(--aim-font-body)',
              fontWeight: 600,
              fontSize: '0.92rem',
              cursor: pendingSubmit ? 'wait' : 'pointer',
            }}
          >
            {pendingSubmit ? t.contactSubmitting : t.contactSubmit}
          </button>
        </form>
      </SystemCard>
    );
  }

  // Assistant: success
  if (isAssistant && msg.kind === 'success') {
    return (
      <SystemCard>
        <SuccessCard result={msg.result} locale={locale} t={t} onStartOver={onStartOver} />
      </SystemCard>
    );
  }

  // Assistant: mentor handoff
  if (isAssistant && msg.kind === 'mentor_handoff') {
    return (
      <SystemCard>
        <MentorHandoffCard reason={msg.reason} t={t} />
      </SystemCard>
    );
  }

  // Assistant: error
  if (isAssistant && msg.kind === 'error') {
    return (
      <SystemCard>
        <div
          role="alert"
          style={{
            color: 'var(--aim-danger)',
            background: 'rgba(192, 57, 43, 0.08)',
            border: '1px solid rgba(192, 57, 43, 0.3)',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: '0.9rem',
            lineHeight: 1.5,
          }}
        >
          {msg.body}
        </div>
        <button
          type="button"
          onClick={onStartOver}
          style={{
            marginTop: 10,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(15, 92, 84, 0.32)',
            background: 'transparent',
            color: 'var(--aim-teal-deep)',
            fontFamily: 'var(--aim-font-body)',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
          }}
        >
          {t.errorReserveTryAgain}
        </button>
      </SystemCard>
    );
  }

  return null;
}

// ---------- ChatBubble ------------------------------------------------------

// ---------- HeaderIconButton ----------------------------------------------

function HeaderIconButton({
  ariaLabel,
  title,
  onClick,
  children,
}: {
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        width: 34,
        height: 34,
        borderRadius: 8,
        border: '1px solid rgba(148, 232, 210, 0.32)',
        background: 'rgba(6, 22, 20, 0.18)',
        color: '#94e8d2',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.15s ease, color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(148, 232, 210, 0.18)';
        e.currentTarget.style.color = '#fdfaf3';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(6, 22, 20, 0.18)';
        e.currentTarget.style.color = '#94e8d2';
      }}
    >
      {children}
    </button>
  );
}

// ---------- MentorHandoffCard ---------------------------------------------

function MentorHandoffCard({
  reason,
  t,
}: {
  reason: 'edge_case' | 'on_demand' | 'error_followup';
  t: (typeof chatCopy)[Locale];
}) {
  const lead =
    reason === 'edge_case'
      ? t.handoffLeadEdge
      : reason === 'on_demand'
      ? t.handoffLeadOnDemand
      : t.handoffLeadError;
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--aim-coral)',
          marginBottom: 8,
        }}
      >
        🎧 {t.handoffEyebrow}
      </div>
      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--aim-text)',
          lineHeight: 1.55,
          marginTop: 0,
          marginBottom: 12,
        }}
      >
        {lead}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <a
          href="https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor"
          target="_blank"
          rel="noreferrer"
          style={handoffPill}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flex: '0 0 auto' }}>
            <path d="M9.5 16.7 9.3 19c.4 0 .6-.2.8-.4l1.9-1.8 4 2.9c.7.4 1.2.2 1.4-.7L20 5c.3-1.1-.4-1.6-1.1-1.3L3.7 9.7c-1.1.4-1 1.1-.2 1.3l3.9 1.2L16.6 7c.4-.3.8-.1.5.2L9.5 16.7Z" />
          </svg>
          {t.handoffTelegram}
        </a>
        <a
          href="https://wa.me/61455301335?text=Hi%20AI%20Mentor%2C%20I%20have%20a%20question%20about%20your%20programs."
          target="_blank"
          rel="noreferrer"
          style={handoffPill}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flex: '0 0 auto' }}>
            <path d="M12.04 2.5c-5.27 0-9.55 4.28-9.55 9.55 0 1.68.44 3.32 1.28 4.78L2.5 21.5l4.83-1.26a9.55 9.55 0 0 0 4.71 1.23c5.27 0 9.55-4.28 9.55-9.55 0-2.55-.99-4.95-2.79-6.75A9.5 9.5 0 0 0 12.04 2.5Z" />
          </svg>
          {t.handoffWhatsapp}
        </a>
        <a
          href="mailto:aimentor@bookedai.au?subject=AI%20Mentor%20enrolment%20enquiry"
          style={handoffPill}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: '0 0 auto' }}>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3.5 6.5 8.5 7 8.5-7" />
          </svg>
          {t.handoffEmail}
        </a>
      </div>
    </div>
  );
}

const handoffPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 13px',
  borderRadius: 'var(--aim-radius)',
  border: '1px solid rgba(20, 160, 146, 0.3)',
  background: 'rgba(20, 160, 146, 0.05)',
  color: 'var(--aim-teal-deep)',
  fontFamily: 'var(--aim-font-body)',
  fontSize: '0.84rem',
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background 0.15s ease, border-color 0.15s ease',
};

function ChatBubble({
  role,
  mentorInitials,
  children,
}: {
  role: 'assistant' | 'user';
  mentorInitials: string;
  children: React.ReactNode;
}) {
  const isAssistant = role === 'assistant';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isAssistant ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        gap: 8,
        maxWidth: '92%',
        marginLeft: isAssistant ? 0 : 'auto',
        marginRight: isAssistant ? 'auto' : 0,
      }}
    >
      {isAssistant ? (
        <span
          style={{
            flex: '0 0 auto',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #94e8d2 0%, #1bc7b3 100%)',
            color: '#0a1f1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--aim-font-display)',
            fontWeight: 700,
            fontSize: '0.74rem',
            letterSpacing: '-0.01em',
          }}
        >
          {mentorInitials}
        </span>
      ) : null}
      <div
        style={{
          padding: '9px 13px',
          borderRadius: 14,
          background: isAssistant ? '#ffffff' : 'var(--aim-coral)',
          color: isAssistant ? 'var(--aim-ink)' : '#fdfaf3',
          border: isAssistant ? '1px solid var(--aim-line)' : 'none',
          fontFamily: 'var(--aim-font-body)',
          fontSize: '0.92rem',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          borderBottomLeftRadius: isAssistant ? 4 : 14,
          borderBottomRightRadius: isAssistant ? 14 : 4,
          boxShadow: isAssistant
            ? '0 1px 2px rgba(15, 92, 84, 0.06)'
            : '0 4px 12px -4px rgba(255, 107, 61, 0.4)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- SystemCard ------------------------------------------------------

function SystemCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--aim-line)',
        borderRadius: 14,
        padding: 14,
        marginInline: 4,
        boxShadow: '0 1px 2px rgba(15, 92, 84, 0.04)',
      }}
    >
      {children}
    </div>
  );
}

// ---------- ProgramCard -----------------------------------------------------

function ProgramCard({
  program,
  locale,
  t,
  onPick,
}: {
  program: ChatProgram;
  locale: Locale;
  t: (typeof chatCopy)[Locale];
  onPick: (program: ChatProgram) => void;
}) {
  return (
    <article
      style={{
        padding: 12,
        borderRadius: 12,
        border: program.featured
          ? '1px solid rgba(255, 107, 61, 0.4)'
          : '1px solid var(--aim-line)',
        background: program.featured ? 'rgba(255, 107, 61, 0.04)' : 'var(--aim-cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--aim-teal-deep)',
          }}
        >
          {program.tier}
        </span>
        {program.featured ? (
          <span
            style={{
              fontFamily: 'var(--aim-font-mono)',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fdfaf3',
              background: 'var(--aim-coral)',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            {locale === 'vi' ? 'Phổ biến' : 'Most popular'}
          </span>
        ) : null}
      </div>
      <h3
        style={{
          fontFamily: 'var(--aim-font-display)',
          fontWeight: 700,
          fontSize: '0.98rem',
          color: 'var(--aim-ink)',
          letterSpacing: '-0.015em',
          lineHeight: 1.3,
          margin: 0,
        }}
      >
        {program.name}
      </h3>
      <p style={{ fontSize: '0.84rem', color: 'var(--aim-muted)', lineHeight: 1.55, margin: 0 }}>
        {program.summary}
      </p>
      <div
        style={{
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--aim-ink)',
          marginTop: 2,
        }}
      >
        {priceLabel(program)}
      </div>
      <button
        type="button"
        onClick={() => onPick(program)}
        style={{
          marginTop: 4,
          padding: '8px 12px',
          borderRadius: 'var(--aim-radius)',
          border: '1px solid var(--aim-teal-deep)',
          background: 'var(--aim-teal-deep)',
          color: '#fdfaf3',
          fontFamily: 'var(--aim-font-body)',
          fontWeight: 600,
          fontSize: '0.84rem',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {t.programPickCta} →
      </button>
    </article>
  );
}

// ---------- SlotGrid --------------------------------------------------------

function SlotGrid({
  slots,
  locale,
  onPick,
}: {
  slots: TimeSlot[];
  locale: Locale;
  onPick: (slot: TimeSlot) => void;
}) {
  // Group by Sydney date
  const dayFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Australia/Sydney',
  });
  const timeFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney',
  });
  const grouped = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = dayFmt.format(new Date(slot.slot_start_at));
    const list = grouped.get(key) ?? [];
    list.push(slot);
    grouped.set(key, list);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from(grouped.entries()).map(([day, daySlots]) => (
        <div key={day}>
          <div
            style={{
              fontFamily: 'var(--aim-font-mono)',
              fontSize: '0.66rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--aim-muted)',
              marginBottom: 4,
            }}
          >
            {day}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {daySlots.map((slot) => {
              const isPrivate = slot.capacity === 1;
              const isFull = slot.seats_available <= 0;
              const isGroupBookable = !isPrivate && !isFull;
              const disabled = isFull && isPrivate;
              const seatsLeftLabel = !isPrivate
                ? ` · ${slot.seats_available}/${slot.capacity}`
                : '';
              const bookedBadge = locale === 'vi' ? 'Đã book' : 'Booked';
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    if (!disabled) onPick(slot);
                  }}
                  disabled={disabled}
                  aria-disabled={disabled}
                  title={
                    disabled
                      ? locale === 'vi'
                        ? 'Slot 1-on-1 này đã được đặt'
                        : 'This 1-on-1 slot is already booked'
                      : undefined
                  }
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--aim-radius)',
                    border: disabled
                      ? '1px dashed var(--aim-line)'
                      : isGroupBookable
                        ? '1px solid var(--aim-teal)'
                        : '1px solid var(--aim-line)',
                    background: disabled
                      ? 'rgba(10, 31, 28, 0.04)'
                      : isGroupBookable
                        ? 'rgba(20, 160, 146, 0.08)'
                        : 'var(--aim-cream)',
                    color: disabled ? 'var(--aim-muted)' : 'var(--aim-ink)',
                    fontFamily: 'var(--aim-font-display)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    letterSpacing: '-0.005em',
                    textDecoration: disabled ? 'line-through' : 'none',
                    opacity: disabled ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{timeFmt.format(new Date(slot.slot_start_at))}</span>
                  {disabled ? (
                    <span
                      style={{
                        fontFamily: 'var(--aim-font-mono)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--aim-coral)',
                        background: 'rgba(255, 107, 61, 0.12)',
                        padding: '2px 6px',
                        borderRadius: 999,
                      }}
                    >
                      {bookedBadge}
                    </span>
                  ) : seatsLeftLabel ? (
                    <span
                      style={{
                        fontFamily: 'var(--aim-font-mono)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: 'var(--aim-teal)',
                      }}
                    >
                      {slot.seats_available}/{slot.capacity}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- SuccessCard (in-chat compact version) --------------------------

function SuccessCard({
  result,
  locale,
  t,
  onStartOver,
}: {
  result: ReserveResult;
  locale: Locale;
  t: (typeof chatCopy)[Locale];
  onStartOver: () => void;
}) {
  const start = new Date(result.slot.slot_start_at);
  const end = new Date(result.slot.slot_end_at);
  const dateFmt = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
  });
  const description = [
    `AI Mentor 1-on-1 — ${result.slot.service_name}`,
    `Booking ${result.booking_reference}`,
    result.meeting.join_url ? `Zoho Meeting: ${result.meeting.join_url}` : '',
    'Mentor follow-up via Telegram or WhatsApp within 24 hours.',
  ]
    .filter(Boolean)
    .join('\n');
  const calendarTitle = `AI Mentor 1-on-1 — ${result.slot.service_name}`;
  const location = result.meeting.join_url || 'Zoho Meeting (link in confirmation email)';
  const googleUrl = buildGoogleCalendarUrl({
    title: calendarTitle,
    startIso: result.slot.slot_start_at,
    endIso: result.slot.slot_end_at,
    description,
    location,
  });
  const icsUrl = buildIcsDataUrl({
    title: calendarTitle,
    startIso: result.slot.slot_start_at,
    endIso: result.slot.slot_end_at,
    description,
    location,
    uid: result.booking_reference,
  });
  const icsFilename = `aimentor-${result.booking_reference}.ics`;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(20, 160, 146, 0.08) 0%, rgba(255, 107, 61, 0.04) 100%)',
        border: '1px solid rgba(20, 160, 146, 0.3)',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--aim-success)',
          marginBottom: 4,
        }}
      >
        ✓ {t.successHeadline}
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--aim-text)', lineHeight: 1.55, margin: 0 }}>
        {t.successBody}
      </p>
      <dl style={{ margin: '10px 0 0 0', display: 'grid', gap: 4, fontSize: '0.84rem' }}>
        <SummaryRow label={locale === 'vi' ? 'Chương trình' : 'Program'} value={result.slot.service_name} />
        <SummaryRow label={locale === 'vi' ? 'Slot' : 'Slot'} value={`${dateFmt.format(start)} → ${dateFmt.format(end)}`} />
        <SummaryRow
          label={locale === 'vi' ? 'Mã booking' : 'Booking reference'}
          value={
            <code
              style={{
                fontFamily: 'var(--aim-font-mono)',
                fontSize: '0.78rem',
                background: 'rgba(20, 160, 146, 0.1)',
                color: 'var(--aim-teal-deep)',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {result.booking_reference}
            </code>
          }
        />
      </dl>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {result.meeting.join_url ? (
          <a
            href={result.meeting.join_url}
            target="_blank"
            rel="noreferrer"
            style={successCtaPrimary}
          >
            🎥 {t.successJoin}
          </a>
        ) : null}
        <a href={googleUrl} target="_blank" rel="noreferrer" style={successCtaSecondary}>
          📅 {t.successAddCalendar}
        </a>
        <a href={icsUrl} download={icsFilename} style={successCtaSecondary}>
          ⬇ {t.successDownloadIcs}
        </a>
        {result.portal?.url ? (
          <a href={result.portal.url} target="_blank" rel="noreferrer" style={successCtaSecondary}>
            🔐 {locale === 'vi' ? 'Mở portal' : 'Open portal'}
          </a>
        ) : null}
      </div>
      {result.crm_sync ? (
        <p
          style={{
            marginTop: 8,
            fontSize: '0.76rem',
            color: 'var(--aim-muted)',
            lineHeight: 1.5,
          }}
        >
          {locale === 'vi' ? 'CRM/email/calendar: ' : 'CRM/email/calendar: '}
          {[
            result.crm_sync.lead?.sync_status,
            result.crm_sync.contact?.sync_status,
            result.crm_sync.deal?.sync_status,
            result.crm_sync.task?.sync_status,
          ].filter(Boolean).join(' · ') || 'queued'}
        </p>
      ) : null}
      {!result.meeting.join_url ? (
        <p
          style={{
            marginTop: 8,
            fontSize: '0.78rem',
            color: 'var(--aim-muted)',
            lineHeight: 1.5,
          }}
        >
          {t.successFallback}
        </p>
      ) : null}
      <PaymentPanel
        bookingReference={result.booking_reference}
        serviceId={result.slot.service_id}
        locale={locale}
      />
      <button
        type="button"
        onClick={onStartOver}
        style={{
          marginTop: 12,
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid rgba(15, 92, 84, 0.22)',
          background: 'transparent',
          color: 'var(--aim-teal-deep)',
          fontFamily: 'var(--aim-font-body)',
          fontWeight: 600,
          fontSize: '0.78rem',
          cursor: 'pointer',
        }}
      >
        {t.successAnotherCta}
      </button>
    </div>
  );
}

// ---------- PaymentPanel: post-reservation Credit + QR tabs ----------------

type PaymentInfo = {
  currency: string;
  stripe_checkout_url: string | null;
  bank_account: {
    account_name: string | null;
    bsb: string | null;
    account_number: string | null;
    account_number_masked: string | null;
    bank_name: string | null;
    swift: string | null;
    reference_prefix: string | null;
  };
  qr_payload_template: string | null;
  instructions_en: string | null;
  instructions_vi: string | null;
};

const PROGRAM_PRICES_AUD: Record<string, number> = {
  'ai-mentor-private-first-ai-app-60': 90,
  'ai-mentor-private-executes-for-you-5h': 450,
  'ai-mentor-private-real-product-10h': 900,
  'ai-mentor-group-first-ai-app-60': 38,
  'ai-mentor-group-executes-for-you-5h': 188,
  'ai-mentor-group-real-product-10h': 375,
};

function PaymentPanel({
  bookingReference,
  serviceId,
  locale,
}: {
  bookingReference: string;
  serviceId: string;
  locale: Locale;
}) {
  const [activeTab, setActiveTab] = useState<'card' | 'qr'>('card');
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const amountAud = PROGRAM_PRICES_AUD[serviceId] ?? null;
  const copy = useMemo(
    () =>
      locale === 'vi'
        ? {
            heading: 'Thanh toán giữ chỗ',
            sub: 'Hoàn tất 1 trong 2 cách bên dưới — slot đã giữ trong 24h.',
            tabCard: 'Thẻ tín dụng',
            tabQr: 'Chuyển khoản · QR',
            stripeCta: 'Mở Stripe Checkout (Credit / Debit)',
            stripeNote: 'Visa, Mastercard, Apple Pay, Google Pay đều hỗ trợ.',
            stripeUnavailable: 'Hệ thống thẻ đang bảo trì — vui lòng dùng tab QR.',
            bankAccountName: 'Chủ tài khoản',
            bankName: 'Ngân hàng',
            bsb: 'BSB',
            accountNumber: 'Số tài khoản',
            swift: 'SWIFT',
            reference: 'Nội dung chuyển khoản',
            amount: 'Số tiền',
            scanCta: 'Quét QR bằng app ngân hàng để chuyển khoản',
            copy: 'Sao chép',
            copied: 'Đã sao chép',
            loading: 'Đang tải thông tin thanh toán…',
            error: 'Không tải được thông tin thanh toán — vui lòng email aimentor@bookedai.au.',
          }
        : {
            heading: 'Confirm your seat with payment',
            sub: 'Complete one of the methods below — your slot is held for 24 hours.',
            tabCard: 'Credit / Debit card',
            tabQr: 'Bank transfer · QR',
            stripeCta: 'Open Stripe Checkout (Credit / Debit)',
            stripeNote: 'Visa, Mastercard, Apple Pay, and Google Pay supported.',
            stripeUnavailable: 'Card payments are temporarily unavailable — please use the QR tab.',
            bankAccountName: 'Account name',
            bankName: 'Bank',
            bsb: 'BSB',
            accountNumber: 'Account number',
            swift: 'SWIFT',
            reference: 'Payment reference',
            amount: 'Amount',
            scanCta: 'Scan with your banking app to pre-fill the transfer',
            copy: 'Copy',
            copied: 'Copied',
            loading: 'Loading payment details…',
            error: 'Could not load payment info — please email aimentor@bookedai.au.',
          },
    [locale],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/aimentor/payment-info', { headers: { Accept: 'application/json' } })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload?.status === 'ok' && payload?.data) {
          setInfo(payload.data as PaymentInfo);
        } else {
          setLoadError(copy.error);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(copy.error);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.error]);

  const qrPayload = useMemo(() => {
    if (!info) return '';
    const tpl = info.qr_payload_template ||
      'PAY|{currency}|{amount_aud}|BSB:{bsb}|ACC:{account_number}|REF:{booking_reference}';
    return tpl
      .replace('{currency}', info.currency || 'AUD')
      .replace('{amount_aud}', amountAud != null ? String(amountAud) : '')
      .replace('{bsb}', info.bank_account.bsb || '')
      .replace('{account_number}', info.bank_account.account_number || '')
      .replace('{booking_reference}', bookingReference);
  }, [info, amountAud, bookingReference]);

  useEffect(() => {
    let cancelled = false;
    if (!qrPayload) {
      setQrDataUrl('');
      return undefined;
    }
    generateQrCodeDataUrl(qrPayload).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  const handleCopy = useCallback(async (value: string, key: string) => {
    if (!value) return;
    const ok = await copyTextToClipboard(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    }
  }, []);

  if (loadError) {
    return (
      <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--aim-radius)', background: 'rgba(255, 107, 61, 0.08)', border: '1px solid rgba(255, 107, 61, 0.3)', fontSize: '0.82rem', color: 'var(--aim-coral-deep)' }}>
        {loadError}
      </div>
    );
  }
  if (!info) {
    return (
      <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--aim-radius)', background: 'rgba(20, 160, 146, 0.04)', fontSize: '0.82rem', color: 'var(--aim-muted)' }}>
        {copy.loading}
      </div>
    );
  }

  const stripeUrl = info.stripe_checkout_url
    ? `${info.stripe_checkout_url}${info.stripe_checkout_url.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(bookingReference)}`
    : null;

  return (
    <div
      style={{
        marginTop: 14,
        background: '#ffffff',
        border: '1px solid var(--aim-line)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(10, 31, 28, 0.04)',
      }}
    >
      <div style={{ padding: '12px 14px 8px 14px', borderBottom: '1px solid var(--aim-line)' }}>
        <div style={{ fontFamily: 'var(--aim-font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--aim-ink)' }}>
          {copy.heading}
          {amountAud != null ? (
            <span style={{ marginLeft: 8, fontFamily: 'var(--aim-font-mono)', fontSize: '0.78rem', color: 'var(--aim-teal-deep)', background: 'rgba(20, 160, 146, 0.1)', padding: '2px 8px', borderRadius: 999 }}>
              {info.currency} {amountAud}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--aim-muted)', lineHeight: 1.5 }}>
          {copy.sub}
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--aim-line)', background: 'rgba(20, 160, 146, 0.03)' }}>
        {(['card', 'qr'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--aim-font-display)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: active ? 'var(--aim-teal-deep)' : 'var(--aim-muted)',
                borderBottom: active ? '2px solid var(--aim-teal)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              aria-selected={active}
              role="tab"
            >
              <span>{tab === 'card' ? '💳' : '📱'}</span>
              <span>{tab === 'card' ? copy.tabCard : copy.tabQr}</span>
            </button>
          );
        })}
      </div>
      <div style={{ padding: 14 }}>
        {activeTab === 'card' ? (
          <div>
            {stripeUrl ? (
              <>
                <a
                  href={stripeUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #635bff 0%, #4b3dff 100%)',
                    color: '#ffffff',
                    borderRadius: 999,
                    fontFamily: 'var(--aim-font-display)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    boxShadow: '0 6px 16px -4px rgba(99, 91, 255, 0.4)',
                  }}
                >
                  <span aria-hidden="true">→</span>
                  {copy.stripeCta}
                </a>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: '0.74rem',
                    color: 'var(--aim-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{copy.stripeNote}</span>
                  <span style={{ display: 'inline-flex', gap: 4 }} aria-hidden="true">
                    <PaymentLogoBadge label="Visa" bg="#1a1f71" />
                    <PaymentLogoBadge label="MC" bg="#eb001b" />
                    <PaymentLogoBadge label="Pay" bg="#000000" />
                    <PaymentLogoBadge label="GPay" bg="#1a73e8" />
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: 'var(--aim-muted)' }}>
                {copy.stripeUnavailable}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 180px)', gap: 14, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 6, fontSize: '0.82rem' }}>
              <PaymentRow label={copy.amount} value={amountAud != null ? `${info.currency} ${amountAud}` : '—'} accent />
              <PaymentRow label={copy.reference} value={bookingReference} mono onCopy={() => handleCopy(bookingReference, 'ref')} copied={copied === 'ref'} copyLabel={copy.copy} copiedLabel={copy.copied} />
              <PaymentRow label={copy.bankAccountName} value={info.bank_account.account_name || '—'} />
              <PaymentRow label={copy.bankName} value={info.bank_account.bank_name || '—'} />
              <PaymentRow label={copy.bsb} value={info.bank_account.bsb || '—'} mono onCopy={info.bank_account.bsb ? () => handleCopy(info.bank_account.bsb!, 'bsb') : undefined} copied={copied === 'bsb'} copyLabel={copy.copy} copiedLabel={copy.copied} />
              <PaymentRow
                label={copy.accountNumber}
                value={info.bank_account.account_number || info.bank_account.account_number_masked || '—'}
                mono
                onCopy={info.bank_account.account_number ? () => handleCopy(info.bank_account.account_number!, 'acc') : undefined}
                copied={copied === 'acc'}
                copyLabel={copy.copy}
                copiedLabel={copy.copied}
              />
              {info.bank_account.swift ? (
                <PaymentRow label={copy.swift} value={info.bank_account.swift} mono />
              ) : null}
              <div style={{ fontSize: '0.74rem', color: 'var(--aim-muted)', lineHeight: 1.5, marginTop: 4 }}>
                {locale === 'vi' ? info.instructions_vi : info.instructions_en}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 168,
                  height: 168,
                  background: '#ffffff',
                  border: '1px solid var(--aim-line)',
                  borderRadius: 8,
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Payment QR" style={{ width: '100%', height: '100%' }} />
                ) : (
                  <div style={{ fontSize: '0.7rem', color: 'var(--aim-muted)' }}>QR…</div>
                )}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--aim-muted)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: 168,
                }}
              >
                {copy.scanCta}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  mono,
  accent,
  onCopy,
  copied,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  accent?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 36%) 1fr auto', gap: 8, alignItems: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.66rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--aim-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? 'var(--aim-font-mono)' : 'var(--aim-font-body)',
          fontSize: mono ? '0.84rem' : '0.84rem',
          fontWeight: 600,
          color: accent ? 'var(--aim-teal-deep)' : 'var(--aim-ink)',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: '4px 8px',
            border: '1px solid var(--aim-line)',
            borderRadius: 999,
            background: copied ? 'var(--aim-teal)' : 'transparent',
            color: copied ? '#fdfaf3' : 'var(--aim-teal-deep)',
            fontFamily: 'var(--aim-font-mono)',
            fontSize: '0.66rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'background 160ms ease, color 160ms ease',
          }}
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function PaymentLogoBadge({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 6px',
        background: bg,
        color: '#ffffff',
        fontFamily: 'var(--aim-font-mono)',
        fontSize: '0.62rem',
        fontWeight: 700,
        borderRadius: 4,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 32%) 1fr', gap: 8, alignItems: 'baseline' }}>
      <dt
        style={{
          fontFamily: 'var(--aim-font-mono)',
          fontSize: '0.7rem',
          color: 'var(--aim-muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, color: 'var(--aim-ink)', fontWeight: 600, wordBreak: 'break-word' }}>
        {value}
      </dd>
    </div>
  );
}

// ---------- styles ----------------------------------------------------------

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 'var(--aim-radius)',
  border: '1px solid var(--aim-line)',
  background: '#fdfaf3',
  color: 'var(--aim-ink)',
  fontFamily: 'var(--aim-font-body)',
  fontSize: '0.92rem',
  outline: 'none',
};

const successCtaPrimary: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--aim-radius)',
  border: '1px solid var(--aim-coral)',
  background: 'var(--aim-coral)',
  color: '#fdfaf3',
  fontFamily: 'var(--aim-font-body)',
  fontWeight: 600,
  fontSize: '0.84rem',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const successCtaSecondary: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--aim-radius)',
  border: '1px solid rgba(15, 92, 84, 0.32)',
  background: 'transparent',
  color: 'var(--aim-teal-deep)',
  fontFamily: 'var(--aim-font-body)',
  fontWeight: 600,
  fontSize: '0.84rem',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

export default AIMentorChat;
