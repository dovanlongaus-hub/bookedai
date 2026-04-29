import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import '../../theme/chess-tokens.css';
import { createPublicBookingAssistantLeadAndBookingIntent } from '../../components/landing/assistant/publicBookingAssistantV1';
import { PaymentSelection } from '../../components/chess/PaymentSelection';
import { CourseIllustration, type CourseIllustrationVariant } from '../../components/chess/CourseIllustration';
import { ChessPieceIllustration } from '../../components/chess/ChessPieceIllustration';
import { ChessLogoLockup, ChessLogoMark } from '../../components/chess/ChessLogo';
import {
  IconBoard,
  IconCertificate,
  IconClock,
  IconKnight,
  IconLichess,
  IconTrophy,
  IconZoom,
} from '../../components/chess/ChessIcons';
import { OrderConfirmation } from '../../components/chess/OrderConfirmation';
import { TimeSlotPicker } from '../../components/chess/TimeSlotPicker';
import {
  apiV1,
  type ChessCatalogMatch,
  type ChessCourseSlot,
  type ChessPaymentOption,
} from '../../shared/api/v1';
import type { MatchCandidate } from '../../shared/contracts';

// Launch promo countdown end (Asia/Ho_Chi_Minh = UTC+7). Bump this date to
// extend the launch banner; keeping it as a top-level constant means there is
// exactly one source of truth.
const LAUNCH_PROMO_END_DATE = new Date('2026-05-12T23:59:59+07:00');
const PROMO_BANNER_DISMISSED_KEY = 'chess.promoBanner.dismissedAt';

type Locale = 'en' | 'vi';

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type InquiryFormState = {
  customerName: string;
  email: string;
  phone: string;
  studentAge: string;
  trainingGoal: string;
  preferredFormat: string;
  preferredDate: string;
  preferredTime: string;
  selectedServiceId: string;
  selectedSlotId: string;
  notes: string;
};

type BookingAssistantCatalogResponse = {
  status?: string;
  services?: Array<{
    id?: string;
    name?: string;
    category?: string | null;
    summary?: string | null;
    amount_aud?: number | null;
    display_price?: string | null;
    location?: string | null;
    venue_name?: string | null;
    booking_url?: string | null;
    map_url?: string | null;
    source_url?: string | null;
    image_url?: string | null;
    featured?: boolean;
    tags?: string[] | null;
  }>;
};

type ProgramTier = {
  key: string;
  format: Record<Locale, string>;
  tier: Record<Locale, string>;
  price: Record<Locale, string>;
  priceSuffix: Record<Locale, string>;
  body: Record<Locale, string>;
  features: Record<Locale, string[]>;
  featured: boolean;
  illustration: CourseIllustrationVariant;
};

const TENANT_REF = 'co-mai-hung-chess-class';
const DEFAULT_SOURCE_PAGE = 'chess-grandmaster-runtime';
const LOCALE_STORAGE_KEY = 'chess.bookedai.locale';

const programs: ProgramTier[] = [
  {
    key: 'beginner',
    illustration: 'beginner-group',
    format: {
      en: 'Online via Lichess + Zoom · Group of 8 max',
      vi: 'Online qua Lichess + Zoom · Nhóm tối đa 8',
    },
    tier: { en: 'Beginner Foundations', vi: 'Nền tảng cờ vua' },
    price: { en: 'AUD 16', vi: '260,000 VND' },
    priceSuffix: { en: 'per student per session', vi: '/ học viên / buổi' },
    body: {
      en: 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Built for ages 6-12 in small focused groups.',
      vi: 'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Thiết kế cho độ tuổi 6-12 trong nhóm nhỏ tập trung.',
    },
    features: {
      en: [
        'Online cohort, learn from anywhere',
        'Lichess board + Zoom video',
        'Ages 6-12, max 8 per class',
        '60-min structured curriculum',
        'Workbook + homework included',
        'Monthly parent progress report',
        'Sibling 15% off second child',
      ],
      vi: [
        'Lớp online, học mọi lúc mọi nơi',
        'Bàn cờ Lichess + video Zoom',
        '6-12 tuổi, tối đa 8 học viên',
        'Giáo trình 60 phút có cấu trúc',
        'Tặng kèm sách bài tập + bài về nhà',
        'Báo cáo tiến độ hàng tháng cho phụ huynh',
        'Giảm 15% cho con thứ 2',
      ],
    },
    featured: false,
  },
  {
    key: 'private',
    illustration: 'private-coaching',
    format: {
      en: 'Online 1-on-1 with WGM Mai Hưng',
      vi: 'Online 1-1 với WGM Mai Hưng',
    },
    tier: { en: 'Private Grandmaster Coaching', vi: 'Kèm riêng cùng Đại kiện tướng' },
    price: { en: 'AUD 65', vi: '1,040,000 VND' },
    priceSuffix: { en: 'per session', vi: '/ buổi' },
    body: {
      en: 'Direct grandmaster coaching with WGM Mai Hưng. Personal opening repertoire. Game-by-game review. Custom training plan tuned to your goals.',
      vi: 'Học trực tiếp với Đại kiện tướng Mai Hưng. Kho khai cuộc cá nhân. Phân tích từng ván đấu. Lộ trình riêng theo mục tiêu của bạn.',
    },
    features: {
      en: [
        'Direct teaching by WGM Mai Hưng',
        'Personal opening repertoire',
        'Detailed game-by-game review',
        'Custom training plan',
        'Annual prepay: 10% off',
      ],
      vi: [
        'WGM Mai Hưng dạy trực tiếp',
        'Kho khai cuộc riêng',
        'Phân tích chi tiết từng ván',
        'Lộ trình tập luyện riêng',
        'Đóng năm: giảm thêm 10%',
      ],
    },
    featured: true,
  },
  {
    key: 'tournament',
    illustration: 'tournament-prep',
    format: {
      en: '90-min online advanced sessions · 1-on-1 or pairs',
      vi: 'Buổi online nâng cao 90 phút · Riêng hoặc theo cặp',
    },
    tier: { en: 'Tournament Preparation', vi: 'Luyện thi đấu giải' },
    price: { en: 'AUD 80', vi: '1,300,000 VND' },
    priceSuffix: { en: 'per session', vi: '/ buổi' },
    body: {
      en: 'Tournament-mindset coaching, all online. Calculation depth. Endgame mastery. Pre-event simulation games over Lichess + Zoom. Built for serious competitors.',
      vi: 'Huấn luyện tâm lý thi đấu, hoàn toàn online. Tính toán sâu. Thuần thục tàn cuộc. Ván cờ mô phỏng trước giải qua Lichess + Zoom. Dành cho học viên thi đấu nghiêm túc.',
    },
    features: {
      en: [
        'Deep opening repertoire build',
        'Endgame + calculation drills',
        'Pre-tournament simulation',
        'Mental preparation coaching',
        'Annual prepay: 10% off',
      ],
      vi: [
        'Xây dựng kho khai cuộc chuyên sâu',
        'Bài tập tàn cuộc + tính toán',
        'Ván cờ mô phỏng trước giải đấu',
        'Huấn luyện tâm lý thi đấu',
        'Đóng năm: giảm thêm 10%',
      ],
    },
    featured: false,
  },
  {
    key: 'elite',
    illustration: 'elite-plus',
    format: {
      en: 'Premium online · Sessions recorded · Priority WhatsApp',
      vi: 'Online cao cấp · Có bản ghi · WhatsApp ưu tiên',
    },
    tier: { en: 'Elite Online Plus', vi: 'Online Cao Cấp Plus' },
    price: { en: 'AUD 90', vi: '1,500,000 VND' },
    priceSuffix: { en: 'per session', vi: '/ buổi' },
    body: {
      en: 'Everything in Private 1-on-1, plus recorded sessions you can rewatch, direct WhatsApp/Telegram access for between-class questions, and priority scheduling. Built for serious students who want grandmaster guidance beyond the live session.',
      vi: 'Đầy đủ tính năng Kèm Riêng, kèm thêm bản ghi buổi học để xem lại, kênh WhatsApp/Telegram trực tiếp hỏi giữa các buổi, và ưu tiên đặt lịch. Dành cho học viên thực sự đầu tư muốn được Đại kiện tướng đồng hành ngoài giờ học.',
    },
    features: {
      en: [
        'Everything in Private 1-on-1',
        'Sessions recorded — rewatch anytime',
        'Direct WhatsApp/Telegram with WGM',
        'Priority scheduling slots',
        'Annual prepay: 10% off',
      ],
      vi: [
        'Đầy đủ Kèm Riêng',
        'Bản ghi buổi học — xem lại bất kỳ lúc nào',
        'WhatsApp/Telegram trực tiếp với WGM',
        'Ưu tiên đặt lịch',
        'Đóng năm: giảm thêm 10%',
      ],
    },
    featured: false,
  },
];

// VND-to-AUD quick estimate. We use a fixed approximate rate here (1 AUD ≈ 16,500 VND) so the
// landing page can show a stable AUD amount alongside the VND price even before the backend
// computes the authoritative amount on `chessPaymentOptions`. The backend response is the source
// of truth — these locally derived numbers are only sent so the backend can echo / validate them.
const VND_PER_AUD = 16500;

type ChessProgramKey = (typeof programs)[number]['key'];

interface ChessProgramAmounts {
  programKey: ChessProgramKey;
  vnd: number;
  aud: number;
}

function resolveProgramAmounts(programKey: ChessProgramKey): ChessProgramAmounts {
  // Hardcoded AUD figures that match the brief. All tiers are now billed per session as
  // standalone amounts (no travel surcharge tier — Tier 4 is the premium online package).
  switch (programKey) {
    case 'beginner':
      return { programKey, vnd: 260000, aud: 16 };
    case 'private':
      return { programKey, vnd: 1040000, aud: 65 };
    case 'tournament':
      return { programKey, vnd: 1300000, aud: 80 };
    case 'elite':
      return { programKey, vnd: 1500000, aud: 92 };
    default:
      return { programKey: 'beginner', vnd: 260000, aud: Math.round(260000 / VND_PER_AUD) };
  }
}

function inferProgramKeyFromService(
  candidate: MatchCandidate | null,
  formGoal: string,
  formFormat: string,
): ChessProgramKey {
  const haystacks = [
    candidate?.candidateId ?? '',
    candidate?.serviceName ?? '',
    formGoal,
    formFormat,
  ]
    .map((value) => value.toLowerCase())
    .join(' | ');
  if (
    haystacks.includes('elite') ||
    haystacks.includes('cao cấp') ||
    haystacks.includes('cao cap') ||
    haystacks.includes('premium')
  ) {
    return 'elite';
  }
  if (haystacks.includes('tournament')) {
    return 'tournament';
  }
  if (haystacks.includes('private') || haystacks.includes('1-1') || haystacks.includes('1 kèm 1')) {
    return 'private';
  }
  return 'beginner';
}

const dict = {
  en: {
    htmlTitle: 'GM Mai Hung Chess Academy — Train chess with a Vietnamese grandmaster',
    nav: {
      brandName: 'Mai Hung Chess Academy',
      brandTag: 'Grandmaster Coaching',
      programs: 'Programs',
      coach: 'Coach',
      pricing: 'Pricing',
      concierge: 'Concierge',
      faq: 'FAQ',
      enroll: 'Book a class',
      myAccount: 'My Account',
    },
    hero: {
      eyebrow: 'Vietnam · Grandmaster-led chess academy',
      titlePart1: 'Real grandmaster. Real progress.',
      titleAccent: 'First 30 minutes free.',
      titlePart2: '',
      lead:
        'Train chess with GM Mai Hung. Beginner foundations to tournament-ready coaching. Online or in person, English or Vietnamese. Book a free trial class today and lock the launch 20% off your first month.',
      ctaPrimary: 'Book free trial class',
      ctaSecondary: 'Talk to the concierge',
      trust: ['Grandmaster-led', 'Online + in person', 'Dedicated email + CRM', 'Powered by BookedAI'],
      stat1Value: '15+',
      stat1Label: 'Years coaching',
      stat2Value: '500+',
      stat2Label: 'Students trained',
      stat3Value: '4 tiers',
      stat3Label: 'Beginner → Tournament',
    },
    promo: {
      bannerText: (countdown: string) =>
        `🎯 Launch month: 20% off your first month + free 30-min trial class. Ends in ${countdown}.`,
      bannerCloseLabel: 'Dismiss launch promo banner',
      bannerEndsLabel: 'Ends in',
    },
    coach: {
      name: 'WGM Nguyễn Thị Mai Hưng',
      meta: 'Woman Grandmaster · Vietnam · Born 1994 in Bắc Giang · Peak FIDE 2357',
      quote: 'Chess is the discipline of seeing one move further than your opponent.',
    },
    profile: {
      eyebrowMeet: 'Meet your coach',
      heading: 'WGM Nguyễn Thị Mai Hưng — Vietnamese Woman Grandmaster',
      paragraphs: [
        'WGM Nguyễn Thị Mai Hưng is a Vietnamese Woman Grandmaster, born 28 January 1994 in Bắc Giang. She earned the WIM title in 2010 and the WGM title in 2014, with a peak FIDE rating of 2357 reached in October 2016.',
        "Her competitive record includes the 2013 Vietnamese Women's Chess Championship, multiple Asian Youth Championship titles (U12 in 2005, U14 in 2007, U16 in 2010), the 2013 Asian Junior Championship (U20 girls), team and individual gold at the 2009 Women's Asian Team Championship, and individual bronze at the 2011 World Women's Team Championship. She has represented Vietnam in five Women's Chess Olympiads (2010, 2012, 2014, 2016, 2018).",
        'All sessions are online — Mai Hưng teaches via Lichess board + Zoom video, with Zoho Meeting for 1-on-1 video conferencing and a Zoho Calendar reminder for every booking. Lessons available in English or Vietnamese for students from age 6 through adult improvers.',
      ],
      portraitCaption: 'WGM Nguyễn Thị Mai Hưng — academy portrait',
      portraitVideoCta: 'Watch a 2-min preview',
      portraitVideoNote: 'Coming soon',
      trustBadges: [
        'FIDE Woman Grandmaster',
        'Peak Elo 2357 (Oct 2016)',
        "5× Vietnam Women's Olympiad",
        'EN + VI bilingual',
      ],
      eyebrowAchievements: 'Track record',
      achievementsTitle: 'A career on the board, with the medals to show for it.',
      achievements: [
        '2014 — WGM title awarded by FIDE',
        '2016 — Peak FIDE rating 2357',
        "2013 — Vietnamese Women's Chess Champion",
        '2009 — Asian Team Championship: team gold + individual gold',
        "2010-2018 — 5× Vietnam Women's Olympiad team",
        "2011 — World Women's Team Championship: individual bronze",
      ],
      eyebrowQuote: 'Teaching philosophy',
      quote: 'Chess is the discipline of seeing one move further than your opponent.',
      quoteAttribution: '— WGM Nguyễn Thị Mai Hưng',
      eyebrowTestimonials: 'What families say',
      testimonialsTitle: 'Stories from students and parents.',
      testimonials: [
        {
          quote:
            'My son went from never playing chess to winning his first school tournament in 6 months. Coach Mai Hưng is patient but rigorous — she teaches him to think before he moves.',
          author: 'Mrs. Hương, mother of Linh',
          program: 'Beginner Group',
        },
        {
          quote:
            "I work in finance and wanted a serious 1-on-1 chess coach. WGM Mai Hưng's opening preparation changed how I see the entire game.",
          author: 'David, adult learner',
          program: 'Private 1-on-1',
        },
        {
          quote:
            'Best part: my daughter actually looks forward to chess class. The online format with Lichess and Zoom works beautifully — even for an 8-year-old.',
          author: 'Anh, mother of Mai',
          program: 'Beginner Group',
        },
      ],
      eyebrowHow: 'How online lessons work',
      howTitle: 'Three steps from booking to first move.',
      howSteps: [
        { icon: '📅', title: '1. Book online', body: 'Pick a time on the calendar — instantly held, no card required for trial.' },
        { icon: '📹', title: '2. Join Zoom + Lichess', body: 'You receive a Zoho Meeting link and Lichess board link. Click and play.' },
        { icon: '✅', title: '3. Get session recording', body: 'Elite tier: a recording lands in your inbox. Other tiers: written recap.' },
      ],
      ctaPrimary: 'Book free trial class — no card required',
    },
    ctaStrip: {
      promo: '🎯 Free 30-min trial · 20% off your first month · Online via Zoom + Lichess',
      cta: 'Book free trial',
    },
    meetingBlock: {
      heading: '🎥 Your online session is set',
      joinLabel: 'Join via Zoho Meeting:',
      calendarLabel: 'Add to calendar:',
      emailNote: "We've also sent these to your email.",
    },
    why: {
      eyebrow: 'Why us',
      title: 'A real academy, run by a real grandmaster.',
      lead:
        'Not a generic tutoring service. Every program is shaped by a working grandmaster, not assembled from a curriculum library.',
      items: [
        {
          title: 'Grandmaster-led, end to end',
          body: 'Lessons designed and delivered by GM Mai Hung — not outsourced to junior tutors.',
        },
        {
          title: 'Clear pathway, beginner to tournament',
          body: 'Four structured tiers so parents and students know exactly where they are and what comes next.',
        },
        {
          title: 'Bilingual, online or in person',
          body: 'Coaching in English or Vietnamese. Online via Lichess + Zoom, or in person in Ho Chi Minh City.',
        },
        {
          title: 'Pay per session — no hidden fees',
          body: 'Transparent VND pricing. Stripe, bank transfer, or cash on the day. Cancel any time.',
        },
      ],
    },
    programs: {
      eyebrow: 'Programs & pricing',
      title: 'A grandmaster pathway, priced openly.',
      lead:
        'Each tier targets a clear stage. Choose where the student is now — we will hold a slot and a coach will confirm within 24 hours.',
      featuredLabel: 'Most popular',
      enrollCta: 'Choose this program',
      jumpCta: 'Save my spot',
    },
    concierge: {
      eyebrow: 'Concierge',
      title: 'Tell us about the student in plain language.',
      lead:
        'Ask by age, level, format, or competition goal. Our assistant stays scoped to this academy, not the wider marketplace.',
      placeholder: 'e.g. My child is 8, just starting chess, prefers small online groups…',
      submit: 'Find the best-fit program',
      submitting: 'Searching…',
      quickPrompts: [
        'My child is 8 and just starting chess. What is the best beginner pathway?',
        'I want premium 1-on-1 online coaching with a grandmaster for tournament preparation.',
        'Which chess program suits a serious student who wants deeper 90-minute training?',
        'We want an in-person private class and are happy to pay for stronger tactical coaching.',
      ],
      assistantWelcome:
        'Welcome to the GM Mai Hung concierge. Tell me the student age, current level, and training goal, and I will prepare the strongest-fit pathway.',
      assistantNoMatch:
        'I could not find a strong chess program match yet, but I can still capture the brief and route it to the coach for follow-up.',
      assistantTopMatch: (name: string) =>
        `The strongest match right now is ${name}. Continue below and I will turn that into a qualified enquiry or booking request.`,
      assistantFallback:
        'The live shortlist is temporarily unavailable, but you can still submit the student brief below and the coach will reach out for follow-up.',
    },
    catalog: {
      eyebrow: 'Live catalogue',
      title: 'Current chess services available.',
      loading: 'Loading chess catalogue…',
      empty: 'No chess services are currently visible in the public catalogue.',
      selectButton: 'Choose this program',
      selectedButton: 'Selected',
      sourceLink: 'Open source page',
      enquiryLabel: 'Enquire for pricing',
    },
    steps: {
      eyebrow: 'How enrollment works',
      title: 'From first enquiry to first lesson — 24 hours.',
      items: [
        'Pick a program and tell us about the student.',
        'Our coach reviews the brief within 24 hours.',
        'You receive a confirmed slot, payment link, and lesson plan.',
        'First class held online or at the venue you chose.',
        'Monthly progress report is shared with parents.',
      ],
    },
    slotPicker: {
      heading: 'Pick a session',
      hint: 'These are real cohorts on the calendar over the next 4 weeks. Pick one for instant hold, or skip and we will arrange a custom slot.',
      loading: 'Loading available sessions…',
      empty: 'No scheduled cohorts in the next 4 weeks for this program. Pick any date and time below — the coach will confirm by email.',
      error: 'We could not load live sessions just now.',
      retry: 'Try again',
      spotsLeft: (count: number) => `${count} spots left`,
      spotsLast: (count: number) => `Only ${count} left`,
      selected: 'Selected',
    },
    orderConfirmation: {
      successHeading: 'Your spot is confirmed',
      successSubheading:
        'A confirmation email is on its way. Save the order reference below — your coach uses it to match every payment, message, and progress note.',
      orderReferenceLabel: 'Order reference',
      copyReference: 'Copy',
      copiedReference: 'Copied',
      rowSession: 'Session',
      rowSessionTbc: 'Date confirmed by email',
      rowMeeting: 'Meeting',
      rowMeetingJoin: 'Join Zoho Meeting',
      rowMeetingPending: 'Link emailed before class',
      rowCoach: 'Coach',
      rowPayment: 'Payment',
      paymentPaid: (amount: string) => `Paid · ${amount}`,
      paymentPending: 'Pending — bank transfer',
      paymentUnpaid: 'Pay later — coach will send a reminder',
      viewOrderDetails: 'View order details',
      addAppleWallet: 'Add to Apple Wallet',
      saveGoogleWallet: 'Save to Google Wallet',
      walletAppleHint: 'iPhone',
      walletGoogleHint: 'Android',
      walletDownloading: 'Preparing pass…',
      walletError: 'Wallet pass is not available yet — try again or use the meeting link.',
      addGoogleCalendar: 'Add to Google Calendar',
      downloadIcs: 'Download .ics',
      emailMeCopy: 'Email me a copy',
      emailMeCopySent: 'Email sent',
      whatsNextHeading: "What's next",
      whatsNextSteps: [
        {
          title: 'Check your inbox',
          body: 'A confirmation email with the meeting link and calendar invite is on its way. Look for chess@bookedai.au.',
        },
        {
          title: 'Set up Lichess',
          body: 'Free account at lichess.org. Your coach will share the board link before class.',
          href: 'https://lichess.org/signup',
          cta: 'Open lichess.org/signup',
        },
        {
          title: 'Show up 5 min early',
          body: 'Open the Zoho Meeting link from your inbox or wallet pass. Your coach is in the room ready to play.',
        },
      ],
      cohortDefault: 'Chess class',
    },
    enroll: {
      eyebrow: 'Save my spot',
      title: 'Tell us about the student. We will hold a class.',
      lead: 'Add a date and time and we will hold a real slot. Without a date, we will capture the brief and the coach will reach out within 24 hours.',
      labels: {
        name: 'Parent or student name',
        namePh: 'How should we address you?',
        email: 'Email',
        emailPh: 'you@email.com',
        phone: 'Phone',
        phonePh: '+84 …',
        age: 'Student age',
        goal: 'Training goal',
        format: 'Preferred format',
        date: 'Preferred date',
        time: 'Preferred time',
        notes: 'Notes (optional)',
        notesPh: 'Current level, tournament ambitions, prior coaching, language, schedule…',
        submit: 'Save my spot',
        submitting: 'Saving your spot…',
        replyHint: 'We typically reply within 24 hours.',
        selectedTag: (name: string) => name || 'Choose a program',
        nothingSelected: 'Choose a program',
      },
      ageOptions: [
        { value: '6', label: '6' },
        { value: '8', label: '8' },
        { value: '10', label: '10' },
        { value: '12', label: '12' },
        { value: '15', label: '15' },
        { value: 'Adult', label: 'Adult' },
      ],
      goalOptions: [
        { value: 'Beginner foundations', label: 'Beginner foundations' },
        { value: 'Tactical improvement', label: 'Tactical improvement' },
        { value: 'Tournament preparation', label: 'Tournament preparation' },
        { value: 'Private premium coaching', label: 'Private premium coaching' },
      ],
      formatOptions: [
        { value: 'Online group', label: 'Online group' },
        { value: 'Online private', label: 'Online private' },
        { value: 'In-person group', label: 'In-person group' },
        { value: 'In-person private', label: 'In-person private' },
      ],
      errorContact: 'We need an email or phone number so the academy can reach you back.',
      errorService: 'Pick a chess program so we know what to book.',
      successHeld: (ref: string, _leadId: string) => `Your spot is held with reference ${ref}. The coach has your request and will follow up with the next step.`,
      successCaptured: (_leadId: string) => 'Saved. Your request has been sent to the coach for follow-up within 24 hours.',
      successHeading: 'Your spot is held.',
      returnNow: 'Return now',
      returnIn: (s: number) => `Returning to the main screen in ${s}s`,
      defaultName: 'Chess academy parent',
      detailLabels: {
        age: 'Student age',
        goal: 'Training goal',
        format: 'Preferred format',
        service: 'Selected service',
        notes: 'Notes',
      },
    },
    payment: {
      heading: 'Choose how to pay',
      lead: 'Your spot is held. Pick the option that suits you — pay now to confirm, or pick "Pay later" and the coach will send a payment reminder.',
      loading: 'Preparing your payment options…',
      error: 'We could not load your payment options just now.',
      retry: 'Try again',
      empty: 'No payment options are available yet. The coach will follow up by email.',
      optionStripeTitle: 'Pay by card (AUD via Stripe)',
      optionStripeBody: (amount: string) =>
        `Pay ${amount} securely by card through Stripe. Best for international families paying in Australian dollars.`,
      optionStripeCta: 'Pay now',
      optionVndQrTitle: 'Pay by VND bank QR',
      optionVndQrBody:
        'Scan the QR code with your Vietnamese banking app, or copy the account number and reference into the transfer manually.',
      optionAudTransferTitle: 'Pay by AUD bank transfer',
      optionAudTransferBody:
        'Pay by direct deposit into our Australian Westpac account. Use the reference code below so we can match the payment to your booking.',
      bankDetails: 'Bank details',
      bankNameLabel: 'Bank',
      accountHolderLabel: 'Account holder',
      accountNumberLabel: 'Account number',
      bsbLabel: 'BSB',
      referenceLabel: 'Reference code',
      amountLabel: 'Amount',
      copy: 'Copy',
      copied: 'Copied',
      qrAlt: 'Vietcombank QR code for the chess academy account',
      instructionsHeading: 'How to pay',
      vndInstructions: [
        'Open your bank app and choose the QR / chuyển khoản option.',
        'Scan the QR code or paste the account number above.',
        'Enter the exact amount and the reference code shown — the reference helps us match payment to your booking.',
        'Send the receipt to chess@bookedai.au if you would like immediate confirmation.',
      ],
      audInstructions: [
        'Use your Australian banking app to send a transfer to the account above.',
        'Always include the reference code so we can match the payment to your booking.',
        'Allow up to one business day for clearing. We confirm by email once received.',
      ],
      skipLink: 'Skip — pay later',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Common questions, answered.',
      items: [
        {
          q: 'How are online classes delivered?',
          a: 'Online lessons run on Lichess + Zoom. We share a link before each session. A laptop or tablet is fine; a board is helpful but not required.',
        },
        {
          q: 'Can I switch programs later?',
          a: 'Yes. The four tiers form a clear pathway — students often start with Beginner Foundations and graduate into Private or Tournament tiers.',
        },
        {
          q: 'How do I pay?',
          a: 'Pay per session via Stripe (card), Vietnamese bank transfer (VND), or cash on the day. We do not lock you into long-term contracts.',
        },
        {
          q: 'Do you teach in English or Vietnamese?',
          a: 'Both. Pick the language at booking. Many international families train in English; local students typically prefer Vietnamese.',
        },
        {
          q: 'What ages do you accept?',
          a: 'Children from age 6 up through adults. Group classes are organised by level, not strictly by age.',
        },
      ],
    },
    footer: {
      tagline: 'Grandmaster-led chess coaching, run by GM Mai Hung. Serving families in Vietnam and online worldwide.',
      sectionPrograms: 'Programs',
      sectionContact: 'Contact',
      sectionLegal: 'Legal',
      legal: ['Privacy', 'Terms', 'Refund policy'],
      poweredBy: 'Powered by BookedAI',
      rights: '© GM Mai Hung Chess Academy. All rights reserved.',
    },
    sticky: {
      from: 'From',
      perSession: '/ session',
      cta: 'Book free trial',
      promoText: '🎯 Launch 20% off · Free trial available',
    },
    languageToggle: {
      label: 'Language',
      en: 'EN',
      vi: 'VI',
    },
  },
  vi: {
    htmlTitle: 'Học viện Cờ vua GM Mai Hùng — Học cờ cùng Đại kiện tướng Việt Nam',
    nav: {
      brandName: 'Học viện Mai Hùng',
      brandTag: 'Đào tạo Đại kiện tướng',
      programs: 'Lớp học',
      coach: 'Giáo viên',
      pricing: 'Học phí',
      concierge: 'Tư vấn',
      faq: 'Câu hỏi',
      enroll: 'Đăng ký học',
      myAccount: 'Tài khoản',
    },
    hero: {
      eyebrow: 'Việt Nam · Học viện cờ vua do Đại kiện tướng dẫn dắt',
      titlePart1: 'Đại kiện tướng thật sự. Tiến bộ thật.',
      titleAccent: '30 phút đầu tiên miễn phí.',
      titlePart2: '',
      lead:
        'Học cờ cùng GM Mai Hùng. Từ nền tảng cho người mới đến luyện thi đấu giải. Online hoặc trực tiếp, Tiếng Anh hoặc Tiếng Việt. Đặt buổi thử miễn phí hôm nay để giữ ưu đãi 20% học phí tháng đầu.',
      ctaPrimary: 'Đặt buổi thử miễn phí',
      ctaSecondary: 'Trao đổi với tư vấn',
      trust: ['Đại kiện tướng dẫn dắt', 'Online & trực tiếp', 'Email + CRM riêng', 'Vận hành bởi BookedAI'],
      stat1Value: '15+',
      stat1Label: 'Năm kinh nghiệm',
      stat2Value: '500+',
      stat2Label: 'Học viên đã đào tạo',
      stat3Value: '4 lộ trình',
      stat3Label: 'Cơ bản → Thi đấu',
    },
    promo: {
      bannerText: (countdown: string) =>
        `🎯 Tháng ra mắt: Giảm 20% học phí tháng đầu + buổi thử miễn phí 30 phút. Kết thúc sau ${countdown}.`,
      bannerCloseLabel: 'Đóng banner ưu đãi ra mắt',
      bannerEndsLabel: 'Kết thúc sau',
    },
    coach: {
      name: 'WGM Nguyễn Thị Mai Hưng',
      meta: 'Đại kiện tướng nữ · Việt Nam · Sinh 1994 tại Bắc Giang · Elo cao nhất 2357',
      quote: 'Cờ vua là kỷ luật của việc nhìn xa hơn đối thủ một nước.',
    },
    profile: {
      eyebrowMeet: 'Gặp huấn luyện viên',
      heading: 'WGM Nguyễn Thị Mai Hưng — Đại kiện tướng cờ vua nữ Việt Nam',
      paragraphs: [
        'WGM Nguyễn Thị Mai Hưng là Đại kiện tướng cờ vua nữ của Việt Nam, sinh ngày 28/01/1994 tại Bắc Giang. Cô đạt danh hiệu WIM năm 2010 và WGM năm 2014, đỉnh cao Elo FIDE 2357 (tháng 10/2016).',
        'Thành tích thi đấu nổi bật gồm: vô địch nữ Việt Nam 2013, nhiều lần vô địch giải Trẻ Châu Á (U12 năm 2005, U14 năm 2007, U16 năm 2010), vô địch Trẻ Châu Á U20 nữ năm 2013, huy chương vàng đồng đội + cá nhân tại Giải Đồng đội Châu Á nữ 2009, huy chương đồng cá nhân Giải Đồng đội Thế giới nữ 2011. Cô đại diện Việt Nam tham dự 5 kỳ Olympiad cờ vua nữ (2010, 2012, 2014, 2016, 2018).',
        'Tất cả buổi học hiện diễn ra online — Mai Hưng dạy qua bàn cờ Lichess + video Zoom, với Zoho Meeting cho buổi 1-1 và nhắc lịch tự động qua Zoho Calendar cho mỗi buổi đặt. Có thể học bằng Tiếng Anh hoặc Tiếng Việt cho học viên từ 6 tuổi đến người lớn cải thiện.',
      ],
      portraitCaption: 'WGM Nguyễn Thị Mai Hưng — ảnh chính thức của học viện',
      portraitVideoCta: 'Xem giới thiệu 2 phút',
      portraitVideoNote: 'Sắp ra mắt',
      trustBadges: [
        'Đại kiện tướng nữ FIDE',
        'Elo cao nhất 2357 (10/2016)',
        '5× Olympiad cờ vua nữ Việt Nam',
        'Song ngữ Anh + Việt',
      ],
      eyebrowAchievements: 'Hành trang',
      achievementsTitle: 'Sự nghiệp trên bàn cờ và những huy chương đi kèm.',
      achievements: [
        '2014 — Đạt danh hiệu WGM (FIDE)',
        '2016 — Đỉnh cao Elo FIDE 2357',
        '2013 — Vô địch nữ Việt Nam',
        '2009 — Giải Đồng đội Châu Á nữ: vàng đồng đội + cá nhân',
        '2010-2018 — 5 lần dự Olympiad nữ Việt Nam',
        '2011 — Giải Đồng đội Thế giới nữ: đồng cá nhân',
      ],
      eyebrowQuote: 'Triết lý dạy học',
      quote: 'Cờ vua là kỷ luật của việc nhìn xa hơn đối thủ một nước.',
      quoteAttribution: '— WGM Nguyễn Thị Mai Hưng',
      eyebrowTestimonials: 'Phụ huynh nói gì',
      testimonialsTitle: 'Câu chuyện từ học viên và phụ huynh.',
      testimonials: [
        {
          quote:
            'Bé nhà mình từ chưa biết chơi cờ đã giành giải đầu tiên trong trường sau 6 tháng. Cô Hưng kiên nhẫn nhưng nghiêm khắc — cô dạy bé suy nghĩ trước khi đi.',
          author: 'Chị Hương, mẹ của Linh',
          program: 'Nhóm cơ bản',
        },
        {
          quote:
            'Tôi làm tài chính và muốn một huấn luyện viên 1-1 nghiêm túc. Bài khai cuộc của WGM Mai Hưng đã thay đổi cách tôi nhìn cả ván cờ.',
          author: 'David, học viên trưởng thành',
          program: 'Kèm riêng 1-1',
        },
        {
          quote:
            'Điều tuyệt nhất: con gái tôi rất mong đến giờ học cờ. Hình thức online qua Lichess + Zoom hoạt động tuyệt vời — kể cả với bé 8 tuổi.',
          author: 'Anh, mẹ của Mai',
          program: 'Nhóm cơ bản',
        },
      ],
      eyebrowHow: 'Cách học online',
      howTitle: 'Ba bước từ đặt lịch đến nước cờ đầu tiên.',
      howSteps: [
        { icon: '📅', title: '1. Đặt lịch online', body: 'Chọn giờ trên lịch — giữ chỗ ngay, buổi thử không cần thẻ.' },
        { icon: '📹', title: '2. Vào Zoom + Lichess', body: 'Bạn nhận link Zoho Meeting và link bàn cờ Lichess. Bấm vào và chơi.' },
        { icon: '✅', title: '3. Nhận bản ghi buổi học', body: 'Gói Cao Cấp: bản ghi gửi vào email. Gói khác: bản tóm tắt văn bản.' },
      ],
      ctaPrimary: 'Đặt buổi thử miễn phí — không cần thẻ',
    },
    ctaStrip: {
      promo: '🎯 Buổi thử 30 phút miễn phí · Giảm 20% tháng đầu · Online qua Zoom + Lichess',
      cta: 'Đặt buổi thử',
    },
    meetingBlock: {
      heading: '🎥 Buổi học online của bạn đã được đặt',
      joinLabel: 'Tham gia qua Zoho Meeting:',
      calendarLabel: 'Thêm vào lịch:',
      emailNote: 'Chúng tôi cũng đã gửi qua email cho bạn.',
    },
    why: {
      eyebrow: 'Vì sao chọn chúng tôi',
      title: 'Một học viện thực thụ, do Đại kiện tướng đứng lớp.',
      lead:
        'Không phải dịch vụ gia sư đại trà. Mọi lộ trình đều do Đại kiện tướng đang thi đấu trực tiếp xây dựng và giảng dạy.',
      items: [
        {
          title: 'Đại kiện tướng dạy trực tiếp',
          body: 'Bài giảng do GM Mai Hùng thiết kế và đứng lớp — không thuê ngoài cho gia sư phụ.',
        },
        {
          title: 'Lộ trình rõ ràng, từ cơ bản đến thi đấu',
          body: 'Bốn cấp độ có cấu trúc giúp phụ huynh và học viên biết rõ đang ở đâu và bước tiếp theo là gì.',
        },
        {
          title: 'Song ngữ, online hoặc trực tiếp',
          body: 'Dạy bằng Tiếng Anh hoặc Tiếng Việt. Online qua Lichess + Zoom, hoặc trực tiếp tại TP.HCM.',
        },
        {
          title: 'Học phí theo buổi — minh bạch',
          body: 'Niêm yết VND rõ ràng. Thanh toán qua Stripe, chuyển khoản hoặc tiền mặt. Có thể hủy bất kỳ lúc nào.',
        },
      ],
    },
    programs: {
      eyebrow: 'Lộ trình & học phí',
      title: 'Lộ trình Đại kiện tướng — học phí công khai.',
      lead:
        'Mỗi cấp độ phù hợp với một giai đoạn cụ thể. Chọn cấp độ phù hợp — chúng tôi sẽ giữ chỗ và giáo viên xác nhận trong 24 giờ.',
      featuredLabel: 'Phổ biến nhất',
      enrollCta: 'Chọn lớp này',
      jumpCta: 'Giữ chỗ ngay',
    },
    concierge: {
      eyebrow: 'Tư vấn lớp học',
      title: 'Mô tả về học viên bằng ngôn ngữ tự nhiên.',
      lead:
        'Hỏi theo độ tuổi, trình độ, hình thức học hoặc mục tiêu thi đấu. Trợ lý chỉ tư vấn riêng cho học viện này, không phải cả thị trường.',
      placeholder: 'Ví dụ: Bé nhà mình 8 tuổi, mới học cờ, thích nhóm online nhỏ…',
      submit: 'Tìm lộ trình phù hợp',
      submitting: 'Đang tìm…',
      quickPrompts: [
        'Bé nhà em 8 tuổi, mới bắt đầu học cờ. Lộ trình phù hợp là gì?',
        'Tôi muốn kèm 1-1 online cao cấp với Đại kiện tướng để luyện thi đấu giải.',
        'Lớp nào phù hợp cho học viên nghiêm túc, muốn buổi học sâu 90 phút?',
        'Gia đình muốn học riêng trực tiếp, sẵn sàng đầu tư cho luyện chiến thuật mạnh hơn.',
      ],
      assistantWelcome:
        'Chào bạn, đây là tư vấn của GM Mai Hùng. Hãy cho biết tuổi học viên, trình độ hiện tại và mục tiêu — tôi sẽ đề xuất lộ trình phù hợp nhất.',
      assistantNoMatch:
        'Hiện chưa tìm được lớp phù hợp ngay, nhưng tôi vẫn ghi nhận thông tin và chuyển cho giáo viên để liên hệ tư vấn.',
      assistantTopMatch: (name: string) =>
        `Lớp phù hợp nhất ngay lúc này là ${name}. Tiếp tục bên dưới để tôi chuyển thành đăng ký hoặc đặt lịch chính thức.`,
      assistantFallback:
        'Tư vấn trực tiếp tạm thời chưa khả dụng, nhưng bạn vẫn có thể gửi thông tin học viên bên dưới để giáo viên liên hệ lại.',
    },
    catalog: {
      eyebrow: 'Danh mục lớp đang mở',
      title: 'Các lớp cờ vua hiện có.',
      loading: 'Đang tải danh mục lớp…',
      empty: 'Hiện chưa có lớp cờ vua nào hiển thị công khai.',
      selectButton: 'Chọn lớp này',
      selectedButton: 'Đã chọn',
      sourceLink: 'Mở trang gốc',
      enquiryLabel: 'Liên hệ để biết học phí',
    },
    steps: {
      eyebrow: 'Quy trình đăng ký',
      title: 'Từ đăng ký đến buổi học đầu tiên — trong 24 giờ.',
      items: [
        'Chọn lớp và điền thông tin học viên.',
        'Giáo viên xem xét hồ sơ trong 24 giờ.',
        'Bạn nhận xác nhận lịch học, link thanh toán và giáo trình.',
        'Buổi học đầu tiên diễn ra online hoặc tại địa điểm bạn chọn.',
        'Báo cáo tiến độ hàng tháng được gửi cho phụ huynh.',
      ],
    },
    slotPicker: {
      heading: 'Chọn buổi học',
      hint: 'Đây là các buổi học thật trong 4 tuần tới. Chọn một buổi để giữ chỗ ngay, hoặc bỏ qua để chúng tôi sắp xếp lịch riêng.',
      loading: 'Đang tải các buổi học…',
      empty: 'Hiện chưa có buổi học công khai trong 4 tuần tới cho lớp này. Chọn ngày và giờ bên dưới — giáo viên sẽ xác nhận qua email.',
      error: 'Không tải được lịch buổi học lúc này.',
      retry: 'Thử lại',
      spotsLeft: (count: number) => `Còn ${count} chỗ`,
      spotsLast: (count: number) => `Chỉ còn ${count} chỗ`,
      selected: 'Đã chọn',
    },
    orderConfirmation: {
      successHeading: 'Đã giữ chỗ thành công',
      successSubheading:
        'Email xác nhận đang trên đường tới hộp thư của bạn. Lưu mã đơn bên dưới — giáo viên dùng mã này để khớp mọi giao dịch, tin nhắn và ghi chú tiến độ.',
      orderReferenceLabel: 'Mã đơn',
      copyReference: 'Sao chép',
      copiedReference: 'Đã sao chép',
      rowSession: 'Buổi học',
      rowSessionTbc: 'Lịch sẽ được xác nhận qua email',
      rowMeeting: 'Phòng học',
      rowMeetingJoin: 'Tham gia Zoho Meeting',
      rowMeetingPending: 'Link sẽ gửi trước buổi học',
      rowCoach: 'Giáo viên',
      rowPayment: 'Thanh toán',
      paymentPaid: (amount: string) => `Đã thanh toán · ${amount}`,
      paymentPending: 'Đang chờ — chuyển khoản',
      paymentUnpaid: 'Thanh toán sau — giáo viên sẽ nhắc',
      viewOrderDetails: 'Xem chi tiết đơn',
      addAppleWallet: 'Thêm vào Apple Wallet',
      saveGoogleWallet: 'Lưu vào Google Wallet',
      walletAppleHint: 'iPhone',
      walletGoogleHint: 'Android',
      walletDownloading: 'Đang chuẩn bị vé…',
      walletError: 'Vé điện tử tạm thời chưa khả dụng — thử lại hoặc dùng link buổi học.',
      addGoogleCalendar: 'Thêm vào Google Calendar',
      downloadIcs: 'Tải .ics',
      emailMeCopy: 'Gửi tôi một bản qua email',
      emailMeCopySent: 'Đã gửi',
      whatsNextHeading: 'Việc tiếp theo',
      whatsNextSteps: [
        {
          title: 'Kiểm tra hộp thư',
          body: 'Email xác nhận kèm link buổi học và lịch đang được gửi tới bạn từ chess@bookedai.au.',
        },
        {
          title: 'Tạo tài khoản Lichess',
          body: 'Đăng ký miễn phí tại lichess.org. Giáo viên sẽ gửi link bàn cờ trước buổi học.',
          href: 'https://lichess.org/signup',
          cta: 'Mở lichess.org/signup',
        },
        {
          title: 'Vào sớm 5 phút',
          body: 'Mở link Zoho Meeting từ email hoặc ví điện tử. Giáo viên đã có mặt trong phòng và sẵn sàng chơi.',
        },
      ],
      cohortDefault: 'Lớp cờ vua',
    },
    enroll: {
      eyebrow: 'Giữ chỗ',
      title: 'Cho chúng tôi biết về học viên — chúng tôi sẽ giữ lớp.',
      lead: 'Thêm ngày giờ mong muốn để giữ chỗ thật. Nếu chưa có lịch cụ thể, chúng tôi vẫn ghi nhận và giáo viên sẽ liên hệ trong 24 giờ.',
      labels: {
        name: 'Tên phụ huynh hoặc học viên',
        namePh: 'Chúng tôi nên xưng hô thế nào?',
        email: 'Email',
        emailPh: 'ban@email.com',
        phone: 'Điện thoại',
        phonePh: '+84 …',
        age: 'Tuổi học viên',
        goal: 'Mục tiêu học',
        format: 'Hình thức ưa thích',
        date: 'Ngày học mong muốn',
        time: 'Giờ học mong muốn',
        notes: 'Ghi chú (không bắt buộc)',
        notesPh: 'Trình độ hiện tại, mục tiêu thi đấu, đã học ở đâu, ngôn ngữ, lịch học…',
        submit: 'Giữ chỗ cho tôi',
        submitting: 'Đang giữ chỗ…',
        replyHint: 'Chúng tôi thường phản hồi trong 24 giờ.',
        selectedTag: (name: string) => name || 'Chọn lớp',
        nothingSelected: 'Chọn lớp',
      },
      ageOptions: [
        { value: '6', label: '6 tuổi' },
        { value: '8', label: '8 tuổi' },
        { value: '10', label: '10 tuổi' },
        { value: '12', label: '12 tuổi' },
        { value: '15', label: '15 tuổi' },
        { value: 'Adult', label: 'Người lớn' },
      ],
      goalOptions: [
        { value: 'Beginner foundations', label: 'Nền tảng cơ bản' },
        { value: 'Tactical improvement', label: 'Nâng cao chiến thuật' },
        { value: 'Tournament preparation', label: 'Luyện thi đấu giải' },
        { value: 'Private premium coaching', label: 'Kèm riêng cao cấp' },
      ],
      formatOptions: [
        { value: 'Online group', label: 'Nhóm online' },
        { value: 'Online private', label: 'Online 1 kèm 1' },
        { value: 'In-person group', label: 'Nhóm trực tiếp' },
        { value: 'In-person private', label: 'Trực tiếp 1 kèm 1' },
      ],
      errorContact: 'Cần email hoặc số điện thoại để học viện liên hệ lại.',
      errorService: 'Vui lòng chọn một lớp để chúng tôi giữ chỗ.',
      successHeld: (ref: string, _leadId: string) =>
        `Chỗ học của bạn đã được giữ với mã ${ref}. Giáo viên đã nhận yêu cầu và sẽ gửi bước tiếp theo.`,
      successCaptured: (_leadId: string) =>
        'Đã ghi nhận. Yêu cầu của bạn đã được gửi cho giáo viên để liên hệ trong 24 giờ.',
      successHeading: 'Đã giữ chỗ thành công.',
      returnNow: 'Quay lại ngay',
      returnIn: (s: number) => `Quay lại màn hình chính sau ${s}s`,
      defaultName: 'Phụ huynh học viên cờ',
      detailLabels: {
        age: 'Tuổi học viên',
        goal: 'Mục tiêu học',
        format: 'Hình thức',
        service: 'Lớp đã chọn',
        notes: 'Ghi chú',
      },
    },
    payment: {
      heading: 'Chọn hình thức thanh toán',
      lead: 'Chỗ học của bạn đã được giữ. Hãy chọn hình thức thanh toán phù hợp — thanh toán ngay để xác nhận, hoặc chọn "Thanh toán sau" và giáo viên sẽ gửi nhắc thanh toán.',
      loading: 'Đang chuẩn bị các phương thức thanh toán…',
      error: 'Không tải được phương thức thanh toán lúc này.',
      retry: 'Thử lại',
      empty: 'Hiện chưa có phương thức thanh toán. Giáo viên sẽ liên hệ qua email.',
      optionStripeTitle: 'Thanh toán bằng thẻ (AUD qua Stripe)',
      optionStripeBody: (amount: string) =>
        `Thanh toán ${amount} an toàn qua Stripe. Phù hợp với gia đình quốc tế thanh toán bằng Đô la Úc.`,
      optionStripeCta: 'Thanh toán ngay',
      optionVndQrTitle: 'Chuyển khoản VND qua mã QR',
      optionVndQrBody:
        'Quét mã QR bằng ứng dụng ngân hàng Việt Nam, hoặc sao chép số tài khoản và mã tham chiếu để chuyển khoản thủ công.',
      optionAudTransferTitle: 'Chuyển khoản AUD qua Westpac',
      optionAudTransferBody:
        'Chuyển khoản trực tiếp vào tài khoản Westpac của học viện tại Úc. Vui lòng nhập đúng mã tham chiếu để chúng tôi đối soát.',
      bankDetails: 'Thông tin ngân hàng',
      bankNameLabel: 'Ngân hàng',
      accountHolderLabel: 'Chủ tài khoản',
      accountNumberLabel: 'Số tài khoản',
      bsbLabel: 'BSB',
      referenceLabel: 'Mã tham chiếu',
      amountLabel: 'Số tiền',
      copy: 'Sao chép',
      copied: 'Đã sao chép',
      qrAlt: 'Mã QR Vietcombank của Học viện Cờ vua',
      instructionsHeading: 'Hướng dẫn thanh toán',
      vndInstructions: [
        'Mở ứng dụng ngân hàng và chọn chức năng QR / chuyển khoản.',
        'Quét mã QR phía trên hoặc dán số tài khoản đã hiển thị.',
        'Nhập đúng số tiền và mã tham chiếu để học viện đối soát đúng giao dịch.',
        'Gửi biên lai về chess@bookedai.au nếu bạn muốn xác nhận ngay.',
      ],
      audInstructions: [
        'Dùng ứng dụng ngân hàng Úc để chuyển khoản tới tài khoản phía trên.',
        'Luôn nhập mã tham chiếu để học viện đối soát giao dịch.',
        'Có thể mất tối đa một ngày làm việc để giao dịch về tài khoản. Chúng tôi xác nhận qua email khi nhận được.',
      ],
      skipLink: 'Bỏ qua — thanh toán sau',
    },
    faq: {
      eyebrow: 'Câu hỏi thường gặp',
      title: 'Những câu hỏi phổ biến.',
      items: [
        {
          q: 'Lớp online được tổ chức như thế nào?',
          a: 'Lớp online dạy qua Lichess + Zoom. Chúng tôi gửi link trước mỗi buổi. Học viên chỉ cần laptop hoặc máy tính bảng; có bàn cờ thật càng tốt nhưng không bắt buộc.',
        },
        {
          q: 'Có thể chuyển lớp giữa chừng không?',
          a: 'Được. Bốn lộ trình tạo thành chuỗi rõ ràng — học viên thường bắt đầu từ Nền tảng và tiến lên Kèm riêng hoặc Luyện thi đấu.',
        },
        {
          q: 'Thanh toán như thế nào?',
          a: 'Thanh toán theo buổi qua Stripe (thẻ), chuyển khoản ngân hàng Việt Nam (VND), hoặc tiền mặt. Không ràng buộc hợp đồng dài hạn.',
        },
        {
          q: 'Dạy bằng Tiếng Anh hay Tiếng Việt?',
          a: 'Cả hai. Chọn ngôn ngữ khi đăng ký. Nhiều gia đình quốc tế chọn Tiếng Anh; học viên trong nước thường chọn Tiếng Việt.',
        },
        {
          q: 'Nhận học viên độ tuổi nào?',
          a: 'Từ 6 tuổi trở lên đến người lớn. Lớp nhóm chia theo trình độ chứ không hoàn toàn theo tuổi.',
        },
      ],
    },
    footer: {
      tagline: 'Học viện Cờ vua do Đại kiện tướng Mai Hùng dẫn dắt. Phục vụ học viên tại Việt Nam và online toàn cầu.',
      sectionPrograms: 'Lớp học',
      sectionContact: 'Liên hệ',
      sectionLegal: 'Pháp lý',
      legal: ['Bảo mật', 'Điều khoản', 'Chính sách hoàn tiền'],
      poweredBy: 'Vận hành bởi BookedAI',
      rights: '© Học viện Cờ vua GM Mai Hùng. Mọi quyền được bảo lưu.',
    },
    sticky: {
      from: 'Từ',
      perSession: '/ buổi',
      cta: 'Đặt buổi thử',
      promoText: '🎯 Giảm 20% ra mắt · Có buổi thử miễn phí',
    },
    languageToggle: {
      label: 'Ngôn ngữ',
      en: 'EN',
      vi: 'VI',
    },
  },
} as const;

const initialInquiryFormState: InquiryFormState = {
  customerName: '',
  email: '',
  phone: '',
  studentAge: '8',
  trainingGoal: 'Beginner foundations',
  preferredFormat: 'Online group',
  preferredDate: '',
  preferredTime: '',
  selectedServiceId: '',
  selectedSlotId: '',
  notes: '',
};

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') {
      return stored;
    }
  } catch {
    // ignore localStorage errors (private mode etc.)
  }
  return 'en';
}

function buildOrderDetailUrl(orderReference: string): string {
  if (typeof window === 'undefined') {
    return `/order/${encodeURIComponent(orderReference)}`;
  }
  const { hostname, protocol } = window.location;
  if (hostname.endsWith('.bookedai.au')) {
    return `${protocol}//portal.bookedai.au/order/${encodeURIComponent(orderReference)}`;
  }
  return `/order/${encodeURIComponent(orderReference)}`;
}

function buildStudentPortalUrl(): string {
  if (typeof window === 'undefined') return '/student-account';
  const { hostname, protocol } = window.location;
  if (hostname.endsWith('.bookedai.au')) {
    return `${protocol}//portal.bookedai.au/student-account`;
  }
  return '/student-account';
}

function buildAttribution() {
  if (typeof window === 'undefined') {
    return {
      source: 'chess.bookedai.au',
      medium: 'web',
      landing_path: '/chess-grandmaster',
      referrer: null,
    };
  }
  return {
    source: window.location.hostname || 'chess.bookedai.au',
    medium: 'web',
    landing_path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
  };
}

function buildActorContext() {
  return {
    channel: 'public_web' as const,
    deployment_mode: 'standalone_app' as const,
    tenant_ref: TENANT_REF,
  };
}

function buildRuntimeConfig() {
  return {
    tenantRef: TENANT_REF,
    channel: 'public_web' as const,
    deploymentMode: 'standalone_app' as const,
    source: 'chess.bookedai.au',
    widgetId: 'grandmaster-chess-concierge',
  };
}

async function fetchChessCatalog(): Promise<MatchCandidate[]> {
  const response = await fetch('/api/booking-assistant/catalog', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Unable to load chess catalogue (${response.status}).`);
  }
  const payload = (await response.json()) as BookingAssistantCatalogResponse;
  const services = Array.isArray(payload.services) ? payload.services : [];
  return services
    .filter((service) => {
      const id = service.id ?? '';
      const name = (service.name ?? '').toLowerCase();
      const venue = (service.venue_name ?? '').toLowerCase();
      return id.includes('chess') || name.includes('chess') || venue.includes('chess');
    })
    .map((service) => ({
      candidateId: service.id ?? '',
      providerName: 'GM Mai Hung Chess Academy',
      serviceName: service.name ?? 'Chess training program',
      sourceType: 'service_catalog',
      category: service.category ?? 'Kids Services',
      summary: service.summary ?? 'Chess coaching program',
      venueName: service.venue_name ?? 'Grandmaster Chess Academy',
      location: service.location ?? 'Online or arranged venue',
      bookingUrl: service.booking_url ?? null,
      mapUrl: service.map_url ?? null,
      sourceUrl: service.source_url ?? null,
      imageUrl: service.image_url ?? null,
      amountAud: service.amount_aud ?? null,
      currencyCode: 'AUD',
      displayPrice: service.display_price ?? 'Enquire for pricing',
      tags: Array.isArray(service.tags) ? service.tags.filter(Boolean) : [],
      featured: Boolean(service.featured),
    }))
    .filter((service) => service.candidateId);
}

function mapProgramKeyToPieceVariant(
  key: ChessProgramKey,
): 'pawn' | 'king' | 'queen' | 'rook' {
  switch (key) {
    case 'beginner':
      return 'pawn';
    case 'private':
      return 'king';
    case 'tournament':
      return 'queen';
    case 'elite':
      return 'rook';
    default:
      return 'pawn';
  }
}

function formatPromoCountdown(now: Date, end: Date): string {
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) {
    return '0d 0h 0m';
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes - days * 60 * 24 - hours * 60;
  return `${days}d ${hours}h ${minutes}m`;
}

interface PromoBannerProps {
  text: (countdown: string) => string;
  closeLabel: string;
}

function PromoBanner({ text, closeLabel }: PromoBannerProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<string>(() =>
    formatPromoCountdown(new Date(), LAUNCH_PROMO_END_DATE),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let dismissed = false;
    try {
      dismissed = Boolean(window.localStorage.getItem(PROMO_BANNER_DISMISSED_KEY));
    } catch {
      dismissed = false;
    }
    const expired = new Date().getTime() >= LAUNCH_PROMO_END_DATE.getTime();
    setVisible(!dismissed && !expired);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const tick = () => {
      const now = new Date();
      if (now.getTime() >= LAUNCH_PROMO_END_DATE.getTime()) {
        setVisible(false);
        return;
      }
      setCountdown(formatPromoCountdown(now, LAUNCH_PROMO_END_DATE));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PROMO_BANNER_DISMISSED_KEY, new Date().toISOString());
      } catch {
        // ignore localStorage errors (private mode etc.)
      }
    }
  }, []);

  if (!visible) return null;

  // We split the message around the countdown placeholder so it can be visually
  // highlighted as a tabular-numbers chip while the surrounding copy stays
  // localised.
  const fullText = text(`__COUNTDOWN__`);
  const [before, after] = fullText.split('__COUNTDOWN__');

  return (
    <div className="chess-promo-banner" role="region" aria-live="polite">
      <div className="chess-promo-banner__text">
        {before}
        <span className="chess-promo-banner__countdown">{countdown}</span>
        {after}
      </div>
      <button
        type="button"
        className="chess-promo-banner__dismiss"
        aria-label={closeLabel}
        onClick={handleDismiss}
      >
        ×
      </button>
    </div>
  );
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

export function ChessGrandmasterApp() {
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

  const [catalogServices, setCatalogServices] = useState<MatchCandidate[]>([]);
  const [catalogPending, setCatalogPending] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [searchQuery, setSearchQuery] = useState<string>(dict.en.concierge.quickPrompts[0]);
  const [searchResults, setSearchResults] = useState<MatchCandidate[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    { role: 'assistant', content: dict.en.concierge.assistantWelcome },
  ]);
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [leadPending, setLeadPending] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadError, setLeadError] = useState('');
  const [formState, setFormState] = useState<InquiryFormState>(initialInquiryFormState);
  const [paymentOptions, setPaymentOptions] = useState<ChessPaymentOption[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentRequest, setPaymentRequest] = useState<{
    leadId: string;
    bookingIntentId: string | null;
    programKey: ChessProgramKey;
    amountVnd: number;
    amountAud: number;
    parentName: string;
    parentEmail: string | null;
  } | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderReference: string;
    sessionStartsAt: string | null;
    sessionTimeLabel: string | null;
    cohortLabel: string | null;
    meetingUrl: string | null;
    calendarUrl: string | null;
    coachName: string;
    paymentStatus: 'paid' | 'pending' | 'unpaid';
    paymentAmountFormatted: string | null;
  } | null>(null);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<ChessCourseSlot | null>(null);

  const returnToMainScreenAfterBooking = useCallback(() => {
    setLeadStatus('');
    setLeadError('');
    setLeadPending(false);
    setPaymentOptions([]);
    setPaymentError('');
    setPaymentLoading(false);
    setPaymentRequest(null);
    setOrderConfirmation(null);
    setSelectedSlotDetails(null);
    setFormState(initialInquiryFormState);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    document.title = t.htmlTitle;
    document.documentElement.setAttribute('lang', locale === 'vi' ? 'vi' : 'en');
  }, [locale, t.htmlTitle]);

  useEffect(() => {
    setConversation((current) => {
      if (!current.length) {
        return [{ role: 'assistant', content: t.concierge.assistantWelcome }];
      }
      const next = [...current];
      next[0] = { role: 'assistant', content: t.concierge.assistantWelcome };
      return next;
    });
    setSearchQuery((current) => {
      const allPrompts: readonly string[] = [
        ...dict.en.concierge.quickPrompts,
        ...dict.vi.concierge.quickPrompts,
      ];
      if (allPrompts.includes(current)) {
        return t.concierge.quickPrompts[0];
      }
      return current;
    });
  }, [locale, t.concierge.assistantWelcome, t.concierge.quickPrompts]);

  const loadPaymentOptions = useCallback(
    async (
      params: {
        leadId: string;
        bookingIntentId: string | null;
        programKey: ChessProgramKey;
        amountVnd: number;
        amountAud: number;
        parentName: string;
        parentEmail: string | null;
      },
      activeLocale: Locale,
    ) => {
      setPaymentLoading(true);
      setPaymentError('');
      try {
        const response = await apiV1.chessPaymentOptions({
          lead_id: params.leadId,
          booking_intent_id: params.bookingIntentId,
          program_key: params.programKey,
          amount_vnd: params.amountVnd,
          amount_aud: params.amountAud,
          parent_name: params.parentName,
          parent_email: params.parentEmail,
          locale: activeLocale,
        });
        if ('data' in response) {
          setPaymentOptions(response.data.payment_options);
        } else {
          setPaymentOptions([]);
        }
      } catch (error) {
        setPaymentError(
          error instanceof Error
            ? error.message
            : activeLocale === 'vi'
            ? 'Không tải được phương thức thanh toán lúc này.'
            : 'We could not load your payment options just now.',
        );
        setPaymentOptions([]);
      } finally {
        setPaymentLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!paymentRequest) {
      return;
    }
    void loadPaymentOptions(paymentRequest, locale);
    // We deliberately depend on paymentRequest + locale so reloading or toggling language
    // re-fetches the correct option set.
  }, [paymentRequest, locale, loadPaymentOptions]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogPending(true);
      setCatalogError('');
      try {
        const services = await fetchChessCatalog();
        if (cancelled) return;
        setCatalogServices(services);
        setFormState((current) => ({
          ...current,
          selectedServiceId: current.selectedServiceId || services[0]?.candidateId || '',
        }));
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : 'Unable to load chess catalogue.');
        }
      } finally {
        if (!cancelled) {
          setCatalogPending(false);
        }
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedResults = searchResults.length ? searchResults : catalogServices;
  const selectedResult = useMemo(
    () =>
      displayedResults.find((item) => item.candidateId === formState.selectedServiceId) ??
      catalogServices[0] ??
      null,
    [catalogServices, displayedResults, formState.selectedServiceId],
  );

  async function handleSearchSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    setSearchPending(true);
    setSearchError('');
    setConversation((current) => [...current, { role: 'user', content: trimmedQuery }]);
    try {
      // Tenant-scoped catalog search (chess tenant only — does NOT hit marketplace search).
      // Backend filters by `tenant_id` already; the frontend just sends the visitor's natural-language
      // class-finder query plus optional structured filters.
      const response = await apiV1.chessCatalogSearch({
        query: trimmedQuery,
        filters: null,
      });
      if (!('data' in response)) {
        throw new Error('Search was accepted, but no shortlist was returned yet.');
      }
      const matches = response.data.matches.slice(0, 6);
      const mapped: MatchCandidate[] = matches.map((match) => ({
        candidateId: match.service_id,
        providerName: 'Mai Hưng Chess Academy',
        serviceName: match.name,
        sourceType: 'chess_catalog',
        category: match.tier || 'Chess',
        summary: match.summary,
        venueName: 'Mai Hưng Chess Academy',
        location: 'Online via Lichess + Zoom',
        bookingUrl: null,
        mapUrl: null,
        sourceUrl: null,
        imageUrl: null,
        amountAud: null,
        currencyCode: 'AUD',
        displayPrice: locale === 'vi' ? match.display_price_vnd : match.display_price_aud,
        tags: [match.format, match.tier].filter(Boolean),
        featured: false,
      }));
      setSearchResults(mapped);
      setFormState((current) => ({
        ...current,
        selectedServiceId: mapped[0]?.candidateId || current.selectedServiceId,
      }));
      const reply = mapped.length
        ? t.concierge.assistantTopMatch(mapped[0].serviceName)
        : t.concierge.assistantNoMatch;
      setConversation((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search chess programs right now.');
      setConversation((current) => [
        ...current,
        { role: 'assistant', content: t.concierge.assistantFallback },
      ]);
    } finally {
      setSearchPending(false);
    }
  }

  async function handleInquirySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeadPending(true);
    setLeadError('');
    setLeadStatus('');
    try {
      const trimmedEmail = formState.email.trim();
      const trimmedPhone = formState.phone.trim();
      if (!trimmedEmail && !trimmedPhone) {
        throw new Error(t.enroll.errorContact);
      }
      if (!selectedResult?.candidateId) {
        throw new Error(t.enroll.errorService);
      }
      const detailNote = [
        `${t.enroll.detailLabels.age}: ${formState.studentAge}`,
        `${t.enroll.detailLabels.goal}: ${formState.trainingGoal}`,
        `${t.enroll.detailLabels.format}: ${formState.preferredFormat}`,
        selectedResult.serviceName ? `${t.enroll.detailLabels.service}: ${selectedResult.serviceName}` : null,
        formState.notes.trim() ? `${t.enroll.detailLabels.notes}: ${formState.notes.trim()}` : null,
        `Locale: ${locale}`,
      ]
        .filter(Boolean)
        .join(' | ');

      let bookingReference = '';
      let leadId = 'captured';
      let bookingIntentId: string | null = null;
      let meetingUrl: string | null = null;
      let calendarUrl: string | null = null;

      if (formState.preferredDate && formState.preferredTime) {
        const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
          customerName: formState.customerName.trim() || t.enroll.defaultName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          serviceId: selectedResult.candidateId,
          serviceName: selectedResult.serviceName,
          serviceCategory: selectedResult.category || 'Kids Services',
          requestedDate: formState.preferredDate,
          requestedTime: formState.preferredTime,
          timezone: 'Asia/Ho_Chi_Minh',
          sourcePage: DEFAULT_SOURCE_PAGE,
          notes: detailNote,
          runtimeConfig: buildRuntimeConfig(),
          // Forward the picked time-slot id when the visitor selected one in the
          // TimeSlotPicker. The backend honours `desired_slot.schedule_slot_id` and
          // matches the booking intent to that real cohort row directly.
          scheduleSlotId: formState.selectedSlotId || null,
        });
        bookingReference = authoritativeResult.bookingReference || '';
        leadId = authoritativeResult.leadId || leadId;
        bookingIntentId = authoritativeResult.bookingIntentId || null;
        meetingUrl = authoritativeResult.meetingUrl ?? null;
        calendarUrl = authoritativeResult.calendarUrl ?? null;
      } else {
        const leadResponse = await apiV1.createLead({
          lead_type: 'chess_program_enquiry',
          contact: {
            full_name: formState.customerName.trim() || t.enroll.defaultName,
            email: trimmedEmail || null,
            phone: trimmedPhone || null,
            preferred_contact_method: trimmedEmail ? 'email' : 'phone',
          },
          business_context: {
            business_name: 'GM Mai Hung Chess Academy',
            industry: 'Kids Services',
            location: selectedResult.location || selectedResult.venueName || null,
            service_category: 'Chess coaching',
          },
          attribution: buildAttribution(),
          intent_context: {
            source_page: DEFAULT_SOURCE_PAGE,
            intent_type: 'booking_or_callback',
            notes: detailNote,
            requested_service_id: selectedResult.candidateId,
          },
          actor_context: buildActorContext(),
        });
        if ('data' in leadResponse && leadResponse.data.lead_id) {
          leadId = leadResponse.data.lead_id;
        }
      }

      if (trimmedEmail) {
        await apiV1.sendLifecycleEmail({
          template_key: 'booking_confirmation',
          to: [trimmedEmail],
          subject:
            locale === 'vi'
              ? 'Học viện Cờ vua GM Mai Hùng — Đã ghi nhận đăng ký'
              : 'GM Mai Hung Chess Academy enquiry received',
          variables: {
            parent_name: formState.customerName.trim() || (locale === 'vi' ? 'Phụ huynh' : 'Parent'),
            child_age: formState.studentAge,
            preferred_location: selectedResult.location || selectedResult.venueName || 'Chess academy',
            preferred_date: formState.preferredDate || (locale === 'vi' ? 'Sẽ xác nhận' : 'To be confirmed'),
            preferred_time: formState.preferredTime || (locale === 'vi' ? 'Sẽ xác nhận' : 'To be confirmed'),
            booking_reference: bookingReference || 'pending-follow-up',
          },
          context: { tenant_ref: TENANT_REF, source_surface: DEFAULT_SOURCE_PAGE },
          actor_context: buildActorContext(),
        });
      }

      setLeadStatus(
        bookingReference
          ? t.enroll.successHeld(bookingReference, leadId)
          : t.enroll.successCaptured(leadId),
      );
      const programKey = inferProgramKeyFromService(
        selectedResult,
        formState.trainingGoal,
        formState.preferredFormat,
      );
      const amounts = resolveProgramAmounts(programKey);
      const trimmedName = formState.customerName.trim() || t.enroll.defaultName;
      setPaymentOptions([]);
      setPaymentError('');
      setPaymentRequest({
        leadId,
        bookingIntentId,
        programKey,
        amountVnd: amounts.vnd,
        amountAud: amounts.aud,
        parentName: trimmedName,
        parentEmail: trimmedEmail || null,
      });
      // Build the on-screen order confirmation card. We always show it after a successful submit
      // (even when the visitor only captured a brief without a date) so the visitor walks away
      // with a clear reference and next-steps. Locale dictates which currency is shown — AUD
      // for EN, VND for VI. Backend payment status is `unpaid` until they tap Stripe / transfer.
      const sessionStartsAt = (() => {
        if (selectedSlotDetails?.starts_at) return selectedSlotDetails.starts_at;
        if (formState.preferredDate) {
          return formState.preferredTime
            ? `${formState.preferredDate}T${formState.preferredTime}:00`
            : formState.preferredDate;
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
      setOrderConfirmation({
        orderReference:
          bookingReference || (locale === 'vi' ? 'CHESS-PENDING' : 'CHESS-PENDING'),
        sessionStartsAt,
        sessionTimeLabel: formState.preferredTime || null,
        cohortLabel:
          selectedSlotDetails?.cohort_label || selectedResult.serviceName || null,
        meetingUrl,
        calendarUrl,
        coachName: 'WGM Nguyễn Thị Mai Hưng',
        // Payment is always `unpaid` immediately after submit — the visitor still has to click
        // Stripe / send a bank transfer. The PaymentSelection block below the order card walks
        // them through the actual payment.
        paymentStatus: 'unpaid',
        paymentAmountFormatted: formattedAmount,
      });

      setFormState((current) => ({ ...current, notes: '' }));
    } catch (error) {
      setLeadError(
        error instanceof Error
          ? error.message
          : locale === 'vi'
          ? 'Đã có lỗi khi giữ chỗ. Vui lòng thử lại hoặc gửi email cho học viện.'
          : 'Something went wrong saving your spot. Try again or email the academy.',
      );
    } finally {
      setLeadPending(false);
    }
  }

  function scrollToId(id: string) {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="chess-app chess-shell">
      <nav className="chess-nav" aria-label="Primary">
        <div className="chess-container chess-nav-inner">
          <a href="#top" className="chess-brand" aria-label={t.nav.brandName}>
            <span className="chess-brand-mark" aria-hidden="true">
              <KnightIcon className="" />
            </span>
            <span className="chess-brand-text">
              <span className="chess-brand-name">{t.nav.brandName}</span>
              <span className="chess-brand-tag">{t.nav.brandTag}</span>
            </span>
          </a>
          <div className="chess-nav-links" aria-label="Sections">
            <button type="button" onClick={() => scrollToId('programs')} className="chess-nav-link">
              {t.nav.programs}
            </button>
            <button type="button" onClick={() => scrollToId('coach')} className="chess-nav-link">
              {t.nav.coach}
            </button>
            <button type="button" onClick={() => scrollToId('concierge')} className="chess-nav-link">
              {t.nav.concierge}
            </button>
            <button type="button" onClick={() => scrollToId('faq')} className="chess-nav-link">
              {t.nav.faq}
            </button>
            <a href={buildStudentPortalUrl()} className="chess-nav-link">
              {t.nav.myAccount}
            </a>
          </div>
          <div className="chess-nav-actions">
            <div
              role="group"
              aria-label={t.languageToggle.label}
              className="chess-lang-toggle"
            >
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
            <button
              type="button"
              className="chess-btn chess-btn-primary chess-btn-sm"
              onClick={() => scrollToId('enroll')}
            >
              {t.nav.enroll}
            </button>
          </div>
        </div>
      </nav>

      <PromoBanner text={t.promo.bannerText} closeLabel={t.promo.bannerCloseLabel} />

      <main id="top">
        <section className="chess-hero">
          <div className="chess-container chess-hero-grid">
            <div>
              <span className="chess-eyebrow">{t.hero.eyebrow}</span>
              <h1 className="chess-hero-title" style={{ marginTop: 18 }}>
                {t.hero.titlePart1} <em>{t.hero.titleAccent}</em>
                {t.hero.titlePart2 ? t.hero.titlePart2 : null}
              </h1>
              <p className="chess-hero-lead" style={{ marginTop: 24 }}>
                {t.hero.lead}
              </p>
              <div className="chess-hero-cta">
                <button
                  type="button"
                  className="chess-btn chess-btn-primary"
                  onClick={() => scrollToId('enroll')}
                >
                  {t.hero.ctaPrimary}
                </button>
                <button
                  type="button"
                  className="chess-btn chess-btn-secondary"
                  onClick={() => scrollToId('concierge')}
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
              <div className="chess-hero-trust">
                {t.hero.trust.map((chip) => (
                  <span key={chip} className="chess-trust-chip">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="chess-hero-stats" style={{ marginTop: 36 }}>
                <div className="chess-hero-stat">
                  <div className="chess-hero-stat-value">{t.hero.stat1Value}</div>
                  <div className="chess-hero-stat-label">{t.hero.stat1Label}</div>
                </div>
                <div className="chess-hero-stat">
                  <div className="chess-hero-stat-value">{t.hero.stat2Value}</div>
                  <div className="chess-hero-stat-label">{t.hero.stat2Label}</div>
                </div>
                <div className="chess-hero-stat">
                  <div className="chess-hero-stat-value">{t.hero.stat3Value}</div>
                  <div className="chess-hero-stat-label">{t.hero.stat3Label}</div>
                </div>
              </div>
            </div>

            <aside id="coach" className="chess-coach-card" aria-label={t.coach.name}>
              <div className="chess-coach-portrait" aria-hidden="true">
                <KnightIcon className="chess-coach-portrait-icon" />
              </div>
              <div className="chess-coach-name">{t.coach.name}</div>
              <div className="chess-coach-meta">{t.coach.meta}</div>
              <blockquote className="chess-coach-quote">{t.coach.quote}</blockquote>
            </aside>
          </div>
        </section>

        {/* CTA strip 1 — between hero and profile */}
        <section className="chess-cta-strip">
          <div className="chess-container chess-cta-strip-inner">
            <span className="chess-cta-strip-promo">{t.ctaStrip.promo}</span>
            <button
              type="button"
              className="chess-btn chess-btn-primary chess-btn-sm"
              onClick={() => scrollToId('enroll')}
            >
              {t.ctaStrip.cta}
            </button>
          </div>
        </section>

        {/* About GM Mai Hung & The Academy — main tenant profile section */}
        <section id="about" className="chess-section chess-section-light chess-profile-section">
          <div className="chess-container">
            {/* Block A — Coach bio + portrait */}
            <div className="chess-profile-grid">
              <div className="chess-bio-paragraphs">
                <span className="chess-eyebrow chess-eyebrow-on-light">
                  {t.profile.eyebrowMeet}
                </span>
                <h2 className="chess-section-title" style={{ marginTop: 12 }}>
                  {t.profile.heading}
                </h2>
                {t.profile.paragraphs.map((para, idx) => (
                  <p key={`bio-${idx}`}>{para}</p>
                ))}
              </div>

              <aside
                className="chess-coach-card chess-profile-portrait"
                aria-label={t.profile.portraitCaption}
              >
                <div className="chess-coach-portrait" aria-hidden="true">
                  <KnightIcon className="chess-coach-portrait-icon" />
                </div>
                <div className="chess-coach-name">{t.coach.name}</div>
                <div className="chess-coach-meta">{t.profile.portraitCaption}</div>
                <a
                  href="#"
                  aria-disabled="true"
                  onClick={(event) => event.preventDefault()}
                  className="chess-btn chess-btn-outline chess-btn-sm chess-profile-video-cta"
                >
                  {t.profile.portraitVideoCta}
                  <span className="chess-profile-video-note">
                    {' '}
                    · {t.profile.portraitVideoNote}
                  </span>
                </a>
              </aside>
            </div>

            <div className="chess-trust-badges" role="list">
              {t.profile.trustBadges.map((badge) => (
                <span key={badge} className="chess-trust-chip" role="listitem">
                  {badge}
                </span>
              ))}
            </div>

            {/* Block B — Achievements timeline */}
            {/* TODO: replace with real GM Mai Hung achievements before launch */}
            <div className="chess-profile-block">
              <header className="chess-section-header">
                <span className="chess-eyebrow chess-eyebrow-on-light">
                  {t.profile.eyebrowAchievements}
                </span>
                <h3 className="chess-section-title chess-section-title-sm">
                  {t.profile.achievementsTitle}
                </h3>
              </header>
              <div className="chess-achievements-grid">
                {t.profile.achievements.map((item, idx) => (
                  <article key={`ach-${idx}`} className="chess-achievement-card">
                    <span className="chess-achievement-num">{String(idx + 1).padStart(2, '0')}</span>
                    <p className="chess-achievement-text">{item}</p>
                  </article>
                ))}
              </div>
            </div>

            {/* Block C — Teaching philosophy quote */}
            <div className="chess-profile-block">
              <span className="chess-eyebrow chess-eyebrow-on-light">
                {t.profile.eyebrowQuote}
              </span>
              <blockquote className="chess-quote-block">
                <p className="chess-quote-text">{t.profile.quote}</p>
                <footer className="chess-quote-attribution">{t.profile.quoteAttribution}</footer>
              </blockquote>
            </div>

            {/* Block D — Sample testimonials */}
            {/* TODO: replace with real testimonials before launch */}
            <div className="chess-profile-block">
              <header className="chess-section-header">
                <span className="chess-eyebrow chess-eyebrow-on-light">
                  {t.profile.eyebrowTestimonials}
                </span>
                <h3 className="chess-section-title chess-section-title-sm">
                  {t.profile.testimonialsTitle}
                </h3>
              </header>
              <div className="chess-testimonials-grid">
                {t.profile.testimonials.map((item, idx) => (
                  <article key={`testimonial-${idx}`} className="chess-testimonial-card">
                    <p className="chess-testimonial-quote">“{item.quote}”</p>
                    <div className="chess-testimonial-meta">
                      <span className="chess-testimonial-author">{item.author}</span>
                      <span className="chess-testimonial-program">{item.program}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Block E — How online lessons work */}
            <div className="chess-profile-block">
              <header className="chess-section-header">
                <span className="chess-eyebrow chess-eyebrow-on-light">
                  {t.profile.eyebrowHow}
                </span>
                <h3 className="chess-section-title chess-section-title-sm">
                  {t.profile.howTitle}
                </h3>
              </header>
              <div className="chess-how-grid">
                {t.profile.howSteps.map((step, idx) => (
                  <article key={`how-${idx}`} className="chess-how-step">
                    <span className="chess-how-icon" aria-hidden="true">
                      {step.icon}
                    </span>
                    <h4 className="chess-how-title">{step.title}</h4>
                    <p className="chess-how-body">{step.body}</p>
                  </article>
                ))}
              </div>
            </div>

            {/* Primary CTA at end of profile section */}
            <div className="chess-profile-cta">
              <button
                type="button"
                className="chess-btn chess-btn-primary"
                onClick={() => scrollToId('enroll')}
              >
                {t.profile.ctaPrimary}
              </button>
            </div>
          </div>
        </section>

        <section className="chess-section chess-section-light">
          <div className="chess-container">
            <header className="chess-section-header">
              <span className="chess-eyebrow chess-eyebrow-on-light">{t.why.eyebrow}</span>
              <h2 className="chess-section-title">{t.why.title}</h2>
              <p className="chess-section-lead">{t.why.lead}</p>
            </header>
            <div className="chess-grid-4">
              {t.why.items.map((item) => (
                <article key={item.title} className="chess-card-flat">
                  <div className="chess-pricing-format" style={{ marginBottom: 8 }}>
                    ♞
                  </div>
                  <h3
                    className="chess-display"
                    style={{ fontSize: '1.15rem', color: 'var(--chess-navy)' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: '0.92rem',
                      lineHeight: 1.65,
                      color: 'var(--chess-muted)',
                    }}
                  >
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="programs" className="chess-section chess-section-paper">
          <div className="chess-container">
            <header className="chess-section-header">
              <span className="chess-eyebrow chess-eyebrow-on-light">{t.programs.eyebrow}</span>
              <h2 className="chess-section-title">{t.programs.title}</h2>
              <p className="chess-section-lead">{t.programs.lead}</p>
            </header>
            <div className="chess-grid-4">
              {programs.map((program) => (
                <article
                  key={program.key}
                  className="chess-pricing-card"
                  data-featured={program.featured ? 'true' : 'false'}
                >
                  <ChessPieceIllustration
                    variant={mapProgramKeyToPieceVariant(program.key as ChessProgramKey)}
                  />
                  {program.featured ? (
                    <div className="chess-pricing-format" style={{ color: 'var(--chess-gold-deep)' }}>
                      ★ {t.programs.featuredLabel}
                    </div>
                  ) : (
                    <div className="chess-pricing-format">{program.format[locale]}</div>
                  )}
                  <h3 className="chess-pricing-tier">{program.tier[locale]}</h3>
                  {program.featured ? (
                    <div className="chess-pricing-format">{program.format[locale]}</div>
                  ) : null}
                  <div>
                    <span className="chess-pricing-amount">{program.price[locale]}</span>
                    <span className="chess-pricing-amount-suffix">{program.priceSuffix[locale]}</span>
                  </div>
                  <p className="chess-pricing-body">{program.body[locale]}</p>
                  <ul className="chess-pricing-list">
                    {program.features[locale].map((feat) => (
                      <li key={feat}>{feat}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="chess-btn chess-btn-primary"
                    onClick={() => scrollToId('enroll')}
                  >
                    {t.programs.jumpCta}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip — after programs */}
        <section className="chess-cta-strip chess-cta-strip-dark">
          <div className="chess-container chess-cta-strip-inner">
            <span className="chess-cta-strip-promo">{t.ctaStrip.promo}</span>
            <button
              type="button"
              className="chess-btn chess-btn-primary chess-btn-sm"
              onClick={() => scrollToId('enroll')}
            >
              {t.ctaStrip.cta}
            </button>
          </div>
        </section>

        <section id="concierge" className="chess-section chess-section-dark">
          <div className="chess-container">
            <div className="chess-split">
              <div className="chess-concierge">
                <header>
                  <span className="chess-eyebrow">{t.concierge.eyebrow}</span>
                  <h2 className="chess-section-title" style={{ marginTop: 12 }}>
                    {t.concierge.title}
                  </h2>
                  <p className="chess-section-lead" style={{ marginTop: 12 }}>
                    {t.concierge.lead}
                  </p>
                </header>
                <form onSubmit={handleSearchSubmit}>
                  <label htmlFor="chess-concierge-query" className="chess-sr-only">
                    {t.concierge.placeholder}
                  </label>
                  <textarea
                    id="chess-concierge-query"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t.concierge.placeholder}
                    className="chess-textarea"
                    style={{
                      background: 'rgba(246, 241, 231, 0.06)',
                      borderColor: 'rgba(201, 162, 74, 0.24)',
                      color: 'var(--chess-on-navy)',
                      minHeight: 120,
                    }}
                  />
                  <div className="chess-concierge-prompts">
                    {t.concierge.quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="chess-concierge-prompt"
                        onClick={() => setSearchQuery(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={searchPending}
                    className="chess-btn chess-btn-primary"
                    style={{ marginTop: 18 }}
                  >
                    {searchPending ? t.concierge.submitting : t.concierge.submit}
                  </button>
                </form>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                  {conversation.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`chess-concierge-bubble ${
                        message.role === 'assistant' ? 'is-assistant' : 'is-user'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                  {searchError ? (
                    <div className="chess-concierge-bubble is-assistant" role="alert">
                      {searchError}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <header style={{ marginBottom: 18 }}>
                  <span className="chess-eyebrow">{t.catalog.eyebrow}</span>
                  <h2 className="chess-section-title" style={{ marginTop: 12 }}>
                    {t.catalog.title}
                  </h2>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {catalogPending ? (
                    <div
                      className="chess-concierge-bubble is-assistant"
                      style={{ background: 'rgba(246,241,231,0.06)' }}
                    >
                      {t.catalog.loading}
                    </div>
                  ) : null}
                  {catalogError ? (
                    <div className="chess-status-error" style={{ color: 'var(--chess-on-navy)', borderColor: 'rgba(181,51,51,0.45)', background: 'rgba(181,51,51,0.18)' }}>
                      {catalogError}
                    </div>
                  ) : null}
                  {!catalogPending && !catalogError && !displayedResults.length ? (
                    <div
                      className="chess-concierge-bubble is-assistant"
                      style={{ background: 'rgba(246,241,231,0.06)' }}
                    >
                      {t.catalog.empty}
                    </div>
                  ) : null}
                  {displayedResults.map((result) => {
                    const selected = formState.selectedServiceId === result.candidateId;
                    return (
                      <article
                        key={result.candidateId}
                        className="chess-service-row"
                        data-selected={selected ? 'true' : 'false'}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div className="chess-pricing-format">
                              {result.venueName || 'Chess academy'}
                            </div>
                            <h3 className="chess-service-name" style={{ marginTop: 6 }}>
                              {result.serviceName}
                            </h3>
                            <p className="chess-service-summary" style={{ marginTop: 8 }}>
                              {result.summary}
                            </p>
                            <div
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--chess-muted)',
                                marginTop: 8,
                              }}
                            >
                              {result.location}
                            </div>
                          </div>
                          <span className="chess-price-pill">
                            {result.displayPrice || t.catalog.enquiryLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlotDetails(null);
                              setFormState((current) => ({
                                ...current,
                                selectedServiceId: result.candidateId,
                                selectedSlotId: '',
                              }));
                            }}
                            className={`chess-btn chess-btn-sm ${
                              selected ? 'chess-btn-light' : 'chess-btn-outline'
                            }`}
                            aria-pressed={selected}
                          >
                            {selected ? t.catalog.selectedButton : t.catalog.selectButton}
                          </button>
                          {result.bookingUrl ? (
                            <a
                              href={result.bookingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="chess-btn chess-btn-sm chess-btn-outline"
                            >
                              {t.catalog.sourceLink}
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA strip — after concierge */}
        <section className="chess-cta-strip">
          <div className="chess-container chess-cta-strip-inner">
            <span className="chess-cta-strip-promo">{t.ctaStrip.promo}</span>
            <button
              type="button"
              className="chess-btn chess-btn-primary chess-btn-sm"
              onClick={() => scrollToId('enroll')}
            >
              {t.ctaStrip.cta}
            </button>
          </div>
        </section>

        <section className="chess-section chess-section-light">
          <div className="chess-container">
            <div className="chess-split">
              <div>
                <span className="chess-eyebrow chess-eyebrow-on-light">{t.steps.eyebrow}</span>
                <h2 className="chess-section-title" style={{ marginTop: 12 }}>
                  {t.steps.title}
                </h2>
                <ol className="chess-step-list" style={{ marginTop: 22 }}>
                  {t.steps.items.map((step, index) => (
                    <li key={step} className="chess-step">
                      <span className="chess-step-num">{index + 1}</span>
                      <span className="chess-step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <form id="enroll" onSubmit={handleInquirySubmit} className="chess-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <span className="chess-eyebrow chess-eyebrow-on-light">{t.enroll.eyebrow}</span>
                    <h2
                      className="chess-display"
                      style={{
                        marginTop: 8,
                        fontSize: '1.6rem',
                        color: 'var(--chess-navy)',
                      }}
                    >
                      {t.enroll.title}
                    </h2>
                  </div>
                  <span className="chess-price-pill">
                    {t.enroll.labels.selectedTag(selectedResult?.serviceName || '')}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: 14,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    marginTop: 22,
                  }}
                >
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.name}</span>
                    <input
                      value={formState.customerName}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, customerName: event.target.value }))
                      }
                      className="chess-input"
                      placeholder={t.enroll.labels.namePh}
                      autoComplete="name"
                    />
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.email}</span>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, email: event.target.value }))
                      }
                      className="chess-input"
                      placeholder={t.enroll.labels.emailPh}
                      inputMode="email"
                      autoComplete="email"
                    />
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.phone}</span>
                    <input
                      type="tel"
                      value={formState.phone}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, phone: event.target.value }))
                      }
                      className="chess-input"
                      placeholder={t.enroll.labels.phonePh}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.age}</span>
                    <select
                      value={formState.studentAge}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, studentAge: event.target.value }))
                      }
                      className="chess-select"
                    >
                      {t.enroll.ageOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.goal}</span>
                    <select
                      value={formState.trainingGoal}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, trainingGoal: event.target.value }))
                      }
                      className="chess-select"
                    >
                      {t.enroll.goalOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.format}</span>
                    <select
                      value={formState.preferredFormat}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, preferredFormat: event.target.value }))
                      }
                      className="chess-select"
                    >
                      {t.enroll.formatOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.date}</span>
                    <input
                      type="date"
                      value={formState.preferredDate}
                      onChange={(event) => {
                        // Manually overriding the date breaks the slot-id link, so clear it.
                        setSelectedSlotDetails(null);
                        setFormState((current) => ({
                          ...current,
                          preferredDate: event.target.value,
                          selectedSlotId: '',
                        }));
                      }}
                      className="chess-input"
                    />
                  </label>
                  <label className="chess-field">
                    <span className="chess-field-label">{t.enroll.labels.time}</span>
                    <input
                      type="time"
                      value={formState.preferredTime}
                      onChange={(event) => {
                        setSelectedSlotDetails(null);
                        setFormState((current) => ({
                          ...current,
                          preferredTime: event.target.value,
                          selectedSlotId: '',
                        }));
                      }}
                      className="chess-input"
                    />
                  </label>
                </div>
                <TimeSlotPicker
                  locale={locale}
                  dict={t.slotPicker}
                  serviceId={selectedResult?.candidateId ?? null}
                  selectedSlotId={formState.selectedSlotId}
                  onSelect={(slot) => {
                    setSelectedSlotDetails(slot);
                    if (!slot) {
                      setFormState((current) => ({
                        ...current,
                        selectedSlotId: '',
                      }));
                      return;
                    }
                    setFormState((current) => ({
                      ...current,
                      selectedSlotId: slot.slot_id,
                      preferredDate: slot.date || current.preferredDate,
                      preferredTime: slot.start_time || current.preferredTime,
                    }));
                  }}
                />
                <label className="chess-field" style={{ marginTop: 14 }}>
                  <span className="chess-field-label">{t.enroll.labels.notes}</span>
                  <textarea
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, notes: event.target.value }))
                    }
                    className="chess-textarea"
                    placeholder={t.enroll.labels.notesPh}
                  />
                </label>
                <p
                  style={{
                    marginTop: 14,
                    padding: '14px 16px',
                    borderRadius: 'var(--chess-radius)',
                    background: 'var(--chess-ivory)',
                    color: 'var(--chess-muted)',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                  }}
                >
                  {t.enroll.lead}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 14,
                    alignItems: 'center',
                    marginTop: 16,
                  }}
                >
                  <button
                    type="submit"
                    disabled={leadPending}
                    className="chess-btn chess-btn-primary"
                  >
                    {leadPending ? t.enroll.labels.submitting : t.enroll.labels.submit}
                  </button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--chess-muted)' }}>
                    {t.enroll.labels.replyHint}
                  </span>
                </div>
                {/*
                  Render order in the new order: PaymentSelection appears ABOVE OrderConfirmation
                  while payment is pending so the visitor sees the actionable Stripe / VND / AUD
                  options first. After they land, OrderConfirmation acts as the "Humanitix-style"
                  recap: order reference + meeting link + wallet passes + what's-next.
                */}
                {paymentRequest ? (
                  <PaymentSelection
                    locale={locale}
                    dict={t.payment}
                    options={
                      // Locale-correct currency rule:
                      //   EN locale → only AUD options (Stripe AUD + AUD bank transfer)
                      //   VI locale → only VND options (VND bank QR transfer)
                      // The backend may return both currencies regardless of locale; we filter
                      // here so visitors only see the option that matches the price they read
                      // on the program card and sticky CTA.
                      paymentOptions.filter((option) =>
                        locale === 'vi' ? option.currency === 'VND' : option.currency === 'AUD',
                      )
                    }
                    loading={paymentLoading}
                    error={paymentError || null}
                    onRetry={() => {
                      void loadPaymentOptions(paymentRequest, locale);
                    }}
                    onSkip={returnToMainScreenAfterBooking}
                  />
                ) : null}
                {orderConfirmation ? (
                  <OrderConfirmation
                    locale={locale}
                    dict={t.orderConfirmation}
                    orderReference={orderConfirmation.orderReference}
                    session={{
                      startsAt: orderConfirmation.sessionStartsAt,
                      timeLabel: orderConfirmation.sessionTimeLabel,
                      cohortLabel: orderConfirmation.cohortLabel,
                      meetingUrl: orderConfirmation.meetingUrl,
                      calendarUrl: orderConfirmation.calendarUrl,
                    }}
                    coachName={orderConfirmation.coachName}
                    coachTitle={locale === 'vi' ? 'Đại kiện tướng nữ' : 'Woman Grandmaster'}
                    paymentStatus={orderConfirmation.paymentStatus}
                    paymentAmountFormatted={orderConfirmation.paymentAmountFormatted}
                    portalOrderUrl={
                      orderConfirmation.orderReference &&
                      !orderConfirmation.orderReference.endsWith('-PENDING')
                        ? buildOrderDetailUrl(orderConfirmation.orderReference)
                        : null
                    }
                    onReturnHome={returnToMainScreenAfterBooking}
                    returnHomeLabel={t.enroll.returnNow}
                  />
                ) : null}
                {leadStatus && !orderConfirmation ? (
                  <div className="chess-status-success" style={{ marginTop: 18 }}>
                    <span className="chess-eyebrow chess-eyebrow-on-light">
                      {t.enroll.successHeading}
                    </span>
                    <p
                      style={{
                        marginTop: 10,
                        fontSize: '0.95rem',
                        lineHeight: 1.65,
                        color: 'var(--chess-text)',
                      }}
                    >
                      {leadStatus}
                    </p>
                  </div>
                ) : null}
                {leadError ? (
                  <div className="chess-status-error" style={{ marginTop: 16 }} role="alert">
                    {leadError}
                  </div>
                ) : null}
              </form>
            </div>
          </div>
        </section>

        <section id="faq" className="chess-section chess-section-paper">
          <div className="chess-container">
            <header className="chess-section-header">
              <span className="chess-eyebrow chess-eyebrow-on-light">{t.faq.eyebrow}</span>
              <h2 className="chess-section-title">{t.faq.title}</h2>
            </header>
            <div className="chess-card-flat" style={{ padding: 28 }}>
              {t.faq.items.map((item) => (
                <div key={item.q} className="chess-faq-item">
                  <div className="chess-faq-question">{item.q}</div>
                  <div className="chess-faq-answer">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip — after FAQ */}
        <section className="chess-cta-strip">
          <div className="chess-container chess-cta-strip-inner">
            <span className="chess-cta-strip-promo">{t.ctaStrip.promo}</span>
            <button
              type="button"
              className="chess-btn chess-btn-primary chess-btn-sm"
              onClick={() => scrollToId('enroll')}
            >
              {t.ctaStrip.cta}
            </button>
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
              <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--chess-on-navy-muted)' }}>
                {t.footer.tagline}
              </p>
            </div>
            <div>
              <h4>{t.footer.sectionPrograms}</h4>
              {programs.map((program) => (
                <button
                  key={program.key}
                  type="button"
                  className="chess-footer-link"
                  onClick={() => scrollToId('programs')}
                  style={{ background: 'none', border: 0, padding: '4px 0', textAlign: 'left', cursor: 'pointer' }}
                >
                  {program.tier[locale]}
                </button>
              ))}
            </div>
            <div>
              <h4>{t.footer.sectionContact}</h4>
              <a className="chess-footer-link" href="mailto:chess@bookedai.au">chess@bookedai.au</a>
              <button
                type="button"
                className="chess-footer-link"
                onClick={() => scrollToId('enroll')}
                style={{ background: 'none', border: 0, padding: '4px 0', textAlign: 'left', cursor: 'pointer' }}
              >
                {t.nav.enroll}
              </button>
              <button
                type="button"
                className="chess-footer-link"
                onClick={() => scrollToId('concierge')}
                style={{ background: 'none', border: 0, padding: '4px 0', textAlign: 'left', cursor: 'pointer' }}
              >
                {t.nav.concierge}
              </button>
            </div>
          </div>
          <div className="chess-footer-bottom">
            <span>{t.footer.rights}</span>
            <span>{t.footer.poweredBy}</span>
          </div>
        </div>
      </footer>

      <div className="chess-sticky-cta" role="region" aria-label={t.nav.enroll}>
        <div className="chess-sticky-cta-text">
          <strong>{t.sticky.promoText}</strong>
          <span style={{ display: 'block', opacity: 0.85, marginTop: 2 }}>
            {/*
              Locale-correct currency on the sticky mobile CTA:
              EN visitors see AUD (matching the Stripe / international audience), VI visitors
              see VND (matching the Vietnamese pricing tier shown in the program cards above).
              Beginner Foundations: AUD 16 / VND 260,000 per session.
            */}
            {t.sticky.from} {locale === 'vi' ? '260,000 VND' : 'AUD 16'} {t.sticky.perSession}
          </span>
        </div>
        <button
          type="button"
          className="chess-btn chess-btn-primary chess-btn-sm"
          onClick={() => scrollToId('enroll')}
        >
          {t.sticky.cta}
        </button>
      </div>
    </div>
  );
}
