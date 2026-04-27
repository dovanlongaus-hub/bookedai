import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { brandShortIconPath, demoContent } from '../../components/landing/data';
import { apiV1 } from '../../shared/api';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../shared/config/api';
import { resolveApiErrorMessage } from '../../shared/api/client';
import { isPublicBookingAssistantV1LiveReadEnabled } from '../../shared/config/publicBookingAssistant';
import {
  createBookedAiHomepageRuntimeConfig,
  getResultConfidencePresentation,
} from '../../shared/runtime/publicAssistantRuntime';
import {
  BOOKEDAI_TENANT_CAPABILITY_CHIPS,
  buildBookedAiTenantCapabilitySummary,
  buildGoogleMapsSearchUrl,
  buildPartnerMatchActionFooterModelFromServiceItem,
  isBookedAiChessTenantService,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';
import { PartnerMatchShortlist } from '../../shared/components/PartnerMatchShortlist';
import type { MatchCandidate } from '../../shared/contracts';
import { normalizePhoneForMessaging } from '../../shared/utils/phone';
import {
  createPublicBookingAssistantLeadAndBookingIntent,
  createPublicBookingAssistantSessionId,
  getPublicBookingAssistantLiveReadRecommendation,
  primePublicBookingAssistantSession,
  shadowPublicBookingAssistantLeadAndBookingIntent,
} from '../../components/landing/assistant/publicBookingAssistantV1';
import type { HomepageContent } from './homepageContent';

type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  contact_phone?: string | null;
  source_url?: string | null;
  tags: string[];
  featured: boolean;
  distance_km?: number | null;
  source_type?: string | null;
  source_label?: string | null;
  why_this_matches?: string | null;
  display_price?: string | null;
  price_posture?: string | null;
  booking_path_type?: string | null;
  next_step?: string | null;
  availability_state?: string | null;
  booking_confidence?: string | null;
  trust_signal?: string | null;
};

type BookingAssistantCatalogResponse = {
  status: string;
  business_email: string;
  stripe_enabled: boolean;
  services: ServiceCatalogItem[];
};

type BookingAssistantChatResponse = {
  status: string;
  reply: string;
  matched_services: ServiceCatalogItem[];
  suggested_service_id: string | null;
  should_request_location: boolean;
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
  portal_url: string;
  service: ServiceCatalogItem;
  amount_aud: number;
  amount_label: string;
  requested_date: string;
  requested_time: string;
  timezone: string;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string;
  qr_code_url: string;
  email_status: 'sent' | 'pending_manual_followup';
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  calendar_add_url: string | null;
  confirmation_message: string;
  contact_email: string;
  workflow_status: string | null;
  crm_sync?: {
    lead?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    contact?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    deal?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    task?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    warning_codes?: string[];
  } | null;
  automation?: {
    paymentIntent?: {
      status: string;
      paymentIntentId?: string | null;
      warnings: string[];
      checkoutUrl?: string | null;
    } | null;
    lifecycleEmail?: {
      status: string;
      messageId?: string | null;
      warnings: string[];
    } | null;
    sms?: {
      status: string;
      messageId?: string | null;
      provider?: string | null;
      warnings: string[];
    } | null;
    whatsapp?: {
      status: string;
      messageId?: string | null;
      provider?: string | null;
      warnings: string[];
    } | null;
    revenueOps?: {
      status: string;
      actionCount: number;
      actionTypes: string[];
      warnings: string[];
    } | null;
  } | null;
};

type UserGeoContext = {
  latitude: number;
  longitude: number;
  locality: string | null;
};

type HomepageSearchExperienceProps = {
  content: HomepageContent;
  sourcePath: string;
  initialQuery: string | null;
  initialQueryRequestId: number;
  experimentVariant?: 'control' | 'product_first';
  onHomepageEvent?: (eventName: string, payload?: Record<string, unknown>) => void;
};

type LiveReadBookingSummary = {
  serviceId: string | null;
  nextStep: string | null;
  paymentAllowedBeforeConfirmation: boolean;
  bookingPath: string | null;
};

type BookingReturnNotice = {
  tone: 'success' | 'warning';
  title: string;
  body: string;
};

const SEARCH_PROGRESS_STAGES = [
  {
    label: 'Reading your request',
    detail: 'I am checking the service, location, and timing signals before ranking options.',
  },
  {
    label: 'Finding places and providers',
    detail: 'Early matches can appear while I keep checking location and booking paths.',
  },
  {
    label: 'Showing the shortlist',
    detail: 'I will keep the screen on results so you can scroll, compare, and ask follow-up questions.',
  },
  {
    label: 'Checking next actions',
    detail: 'Maps, details, contact, and booking actions are being attached to the best matches.',
  },
] as const;

const SEARCH_PROGRESS_PROMPTS = [
  'You can keep chatting while I search: add a suburb, landmark, or "near me".',
  'Add a preferred day or time window if timing matters.',
  'Add who this is for, for example age, level, goal, or group size.',
  'Ask me to compare by closest, fastest, price, or best reviewed.',
] as const;
const BOOKING_EMPTY_STEPS = [
  'Send a booking request',
  'Review ranked matches',
  'Choose one option to unlock booking',
] as const;

type FollowUpQuestion = {
  id: string;
  question: string;
  suggestion: string;
  quickAnswers?: string[];
};

type NoResultSuggestion = {
  title: string;
  query: string;
};

type IntentSuggestion = {
  label: string;
  query: string;
};

type AgentChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  resultIds?: string[];
  suggestions?: IntentSuggestion[];
};

type ClarificationNeed = 'location' | 'timing' | 'brief';

function deriveClarificationNeeds(query: string): ClarificationNeed[] {
  const normalized = query.toLowerCase();
  const needs: ClarificationNeed[] = [];
  const hasLocation = /\b(in|near|around|at|within)\b|\b(sydney|melbourne|brisbane|perth|adelaide|cbd|suburb|city)\b/i.test(query);
  const hasTime = /\b(today|tomorrow|tonight|weekend|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)\b/i.test(query);
  const hasSpecificNeed = normalized.split(/\s+/).filter(Boolean).length >= 6;

  if (!hasLocation) needs.push('location');
  if (!hasTime) needs.push('timing');
  if (!hasSpecificNeed) needs.push('brief');

  return needs;
}

function shouldHoldResultsForClarification(query: string) {
  const needs = deriveClarificationNeeds(query);
  return {
    needs,
    hold: needs.includes('location') && needs.length >= 2,
  };
}

function deriveFollowUpQuestions(query: string, results: ServiceCatalogItem[], warnings: string[]) {
  const normalized = query.toLowerCase();
  const prompts: FollowUpQuestion[] = [];
  const needs = deriveClarificationNeeds(query);

  if (needs.includes('location')) {
    prompts.push({
      id: 'location',
      question: 'Which area should BookedAI prioritise?',
      suggestion: 'Add your suburb, city, or nearby area so I can rank closer matches first.',
      quickAnswers: ['Near Sydney CBD', 'In Chatswood', 'Around Parramatta'],
    });
  }

  if (needs.includes('timing')) {
    prompts.push({
      id: 'timing',
      question: 'When do you want this booked?',
      suggestion: 'Add a preferred day, date, or time window so I can narrow the shortlist.',
      quickAnswers: ['Today after 5pm', 'This weekend', 'Tomorrow morning'],
    });
  }

  if (needs.includes('brief') || results.length === 0) {
    prompts.push({
      id: 'brief',
      question: 'What matters most for this request?',
      suggestion: 'Add a short brief like group size, budget, service style, or a must-have requirement.',
      quickAnswers: ['Premium option', 'Fastest available', 'Beginner-friendly'],
    });
  }

  if (warnings.some((warning) => /location|permission|broad|refine/i.test(warning))) {
    prompts.unshift({
      id: 'warning-context',
      question: 'Can you give one more detail so I can tighten the ranking?',
      suggestion: 'The fastest refinements are area, timing, and the exact service requirement.',
    });
  }

  return prompts.filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 3);
}

function deriveNoResultSuggestions(query: string, warnings: string[]) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [] as NoResultSuggestion[];
  }

  const suggestions: NoResultSuggestion[] = [
    { title: 'Add location', query: `${trimmed} in Sydney` },
    { title: 'Add timing', query: `${trimmed} this weekend` },
    { title: 'Add clearer brief', query: `${trimmed} for 4 people with budget under 300` },
  ];

  if (/restaurant|dinner|lunch|food|cafe/i.test(trimmed)) {
    suggestions.unshift({ title: 'Nearby dining', query: `${trimmed} near CBD` });
  }

  if (/transport|driver|airport|transfer/i.test(trimmed)) {
    suggestions.unshift({ title: 'Airport transfer', query: `${trimmed} airport transfer tomorrow morning` });
  }

  if (warnings.some((warning) => /location/i.test(warning))) {
    suggestions.unshift({ title: 'Location-first retry', query: `${trimmed} near my area` });
  }

  return suggestions.slice(0, 4);
}

function deriveIntentSuggestions(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [] as IntentSuggestion[];
  }

  const suggestions: IntentSuggestion[] = [
    { label: 'Add location', query: `${trimmed} near Sydney CBD` },
    { label: 'Add timing', query: `${trimmed} this weekend` },
    { label: 'Add preference', query: `${trimmed} premium and closest option` },
  ];

  if (/swim|class|lesson|coach/i.test(trimmed)) {
    suggestions.unshift({ label: 'Kids beginner option', query: `${trimmed} for a beginner child after school` });
  }

  if (/hair|salon|barber|cut/i.test(trimmed)) {
    suggestions.unshift({ label: 'Same-day nearby', query: `${trimmed} near Sydney CBD this afternoon` });
  }

  if (/restaurant|dining|lunch|dinner|cafe/i.test(trimmed)) {
    suggestions.unshift({ label: 'Tonight nearby', query: `${trimmed} near me tonight with booking` });
  }

  if (/mentor|consult|ai|coach/i.test(trimmed)) {
    suggestions.unshift({ label: 'Business goal', query: `${trimmed} for startup growth this week` });
  }

  return suggestions.filter((item, index, array) => array.findIndex((candidate) => candidate.query === item.query) === index).slice(0, 4);
}

function deriveChatSuggestionsFromFollowUps(query: string, questions: FollowUpQuestion[]) {
  const trimmed = query.trim();
  const suggestions = questions.flatMap((item) => {
    const answers = item.quickAnswers?.length ? item.quickAnswers : [item.suggestion];
    return answers.map((answer) => ({
      label: answer.length > 28 ? item.question.replace(/\?$/, '') : answer,
      query: `${trimmed} ${answer}`.trim(),
    }));
  });

  return suggestions
    .filter((item, index, array) => array.findIndex((candidate) => candidate.query === item.query) === index)
    .slice(0, 4);
}

function deriveNoResultReason(query: string, warnings: string[]) {
  if (warnings.some((warning) => /location/i.test(warning))) {
    return 'BookedAI could not rank a strong match because location context is still too broad.';
  }
  if (warnings.some((warning) => /broad|refine|specific/i.test(warning))) {
    return 'BookedAI understood the intent, but the request is still broad enough that ranking confidence stayed low.';
  }
  if (query.trim().split(/\s+/).filter(Boolean).length < 4) {
    return 'The current request is short, so there is not enough context yet to confidently rank a shortlist.';
  }
  return 'No strong record was found for the exact request, but BookedAI can usually get closer with one more detail or a nearby keyword variation.';
}

function getResultEntryStyle(index: number) {
  return {
    animation: `homepage-result-entry 360ms cubic-bezier(0.16, 1, 0.3, 1) both`,
    animationDelay: `${Math.max(0, index) * 55}ms`,
  };
}

async function extractLightweightPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  const decoded = new TextDecoder('latin1').decode(buffer);
  const matches = Array.from(decoded.matchAll(/\(([^()]{4,160})\)/g))
    .map((match) => match[1].replace(/\\[nrt]/g, ' ').replace(/\\\)/g, ')').trim())
    .filter((value) => /[A-Za-z]{3,}/.test(value));
  const unique = Array.from(new Set(matches));
  const joined = unique.join(' ').replace(/\s+/g, ' ').trim();
  return joined ? joined.slice(0, 800) : null;
}
const bookedAiShortIconSrc = brandShortIconPath;

type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BookingOutcomeStep = {
  label: string;
  value: string;
  tone: string;
};

type BookingFlowStep = {
  id: string;
  label: string;
  detail: string;
  state: 'pending' | 'active' | 'complete';
};

type EnterpriseJourneyStatus = 'completed' | 'in_progress' | 'attention' | 'pending';

type OperationTimelineItem = {
  id: string;
  title: string;
  detail: string;
  status: EnterpriseJourneyStatus;
  reference?: string | null;
};

type CommunicationPreviewCard = {
  id: string;
  title: string;
  channel: string;
  tone: 'dark' | 'light' | 'success';
  recipient: string;
  summary: string;
  body: string;
};

type EnterpriseJourneyStep = {
  id: string;
  title: string;
  description: string;
  status: EnterpriseJourneyStatus;
  channel?: string;
};

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 3v3M19.5 4.5h-3M4.5 16.5h3M6 15v3" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m5 12 4.2 4.2L19 6.5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" strokeWidth="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" strokeWidth="1.8" />
      <path d="M15 15h2v2h-2zM18 14h2v2h-2zM16 18h4v2h-4zM14 16h2v4h-2z" strokeWidth="1.8" />
    </svg>
  );
}

function LinkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M10.5 13.5 13.5 10.5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.8 16.2 7.5 17.5a4 4 0 0 1-5.7-5.7l2.6-2.6a4 4 0 0 1 5.7 0" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m15.2 7.8 1.3-1.3a4 4 0 0 1 5.7 5.7l-2.6 2.6a4 4 0 0 1-5.7 0" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.25" strokeWidth="1.8" />
    </svg>
  );
}

function InfoIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
      <path d="M12 11v5" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8h.01" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M7.5 5.5 9 4a1.8 1.8 0 0 1 2.7.35l1 1.75a1.8 1.8 0 0 1-.35 2.15l-.9.9a9.5 9.5 0 0 0 3.4 3.4l.9-.9a1.8 1.8 0 0 1 2.15-.35l1.75 1a1.8 1.8 0 0 1 .35 2.7l-1.5 1.5c-.65.65-1.62.9-2.5.62C10.8 15.55 8.45 13.2 6.88 8c-.28-.88-.03-1.85.62-2.5Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M5 6.5h14v9H9l-4 3v-12Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m4 11 8-6 8 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5v8h11v-8" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="6" width="16" height="12" rx="2.5" strokeWidth="1.8" />
      <path d="m5.5 8 6.5 5 6.5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="9" y="4" width="6" height="10" rx="3" strokeWidth="1.8" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AttachmentIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        d="M8.5 12.5 14.9 6.1a3.25 3.25 0 1 1 4.6 4.6l-8 8a5 5 0 0 1-7.1-7.1l8.3-8.3"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpDownIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m8 10 4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 14-4 4-4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandButtonMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <img src={bookedAiShortIconSrc} alt="" aria-hidden="true" className={`${className} object-contain`} />;
}

function buildBookingOutcomeSteps(result: BookingAssistantSessionResponse): BookingOutcomeStep[] {
  const lifecycleEmailStatus = normalizeAutomationStatus(result.automation?.lifecycleEmail?.status);
  const smsStatus = normalizeAutomationStatus(result.automation?.sms?.status);
  const whatsappStatus = normalizeAutomationStatus(result.automation?.whatsapp?.status);

  return [
    {
      label: 'Confirmation email',
      value:
        lifecycleEmailStatus === 'sent' || lifecycleEmailStatus === 'delivered'
          ? 'Sent to customer'
          : lifecycleEmailStatus === 'queued'
            ? 'Queued for follow-up'
            : result.email_status === 'sent'
          ? 'Sent to customer'
          : `Handled by ${result.contact_email}`,
      tone:
        lifecycleEmailStatus === 'sent' ||
        lifecycleEmailStatus === 'delivered' ||
        result.email_status === 'sent'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Payment',
      value:
        result.payment_status === 'stripe_checkout_ready'
          ? 'Checkout ready now'
          : 'Payment follow-up required',
      tone:
        result.payment_status === 'stripe_checkout_ready'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Calendar and workflow',
      value:
        result.meeting_status === 'scheduled'
          ? 'Calendar event sent'
          : result.calendar_add_url
            ? 'Calendar link ready'
            : result.workflow_status
              ? 'Follow-up scheduled'
              : 'Pending confirmation',
      tone:
        result.meeting_status === 'scheduled' || result.workflow_status
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
    },
    {
      label: 'SMS and WhatsApp',
      value:
        smsStatus === 'sent' ||
        whatsappStatus === 'sent' ||
        smsStatus === 'delivered' ||
        whatsappStatus === 'delivered'
          ? 'Messaging sent'
          : smsStatus === 'queued' || whatsappStatus === 'queued'
            ? 'Sending shortly'
            : 'Awaiting phone-based follow-up',
      tone:
        smsStatus === 'sent' ||
        whatsappStatus === 'sent' ||
        smsStatus === 'delivered' ||
        whatsappStatus === 'delivered'
          ? 'bg-emerald-50 text-emerald-700'
          : smsStatus === 'queued' || whatsappStatus === 'queued'
            ? 'bg-sky-50 text-sky-700'
            : 'bg-slate-100 text-slate-600',
    },
  ];
}

function normalizeSyncStatus(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function normalizeAutomationStatus(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function deriveCommunicationLaneStatus(
  lane:
    | {
        status?: string | null;
        warnings?: string[];
      }
    | null
    | undefined,
): EnterpriseJourneyStatus {
  const status = normalizeAutomationStatus(lane?.status);
  if (!status) {
    return 'pending';
  }
  if (['sent', 'delivered'].includes(status)) {
    return 'completed';
  }
  if (['queued', 'opened', 'unknown', 'pending'].includes(status)) {
    return 'in_progress';
  }
  if (['failed', 'error'].includes(status) || (lane?.warnings?.length ?? 0) > 0) {
    return 'attention';
  }
  return 'in_progress';
}

function deriveCrmSyncStatus(result: BookingAssistantSessionResponse | null): EnterpriseJourneyStatus {
  if (!result?.crm_sync) {
    return 'pending';
  }

  const statuses = [
    normalizeSyncStatus(result.crm_sync.lead?.sync_status),
    normalizeSyncStatus(result.crm_sync.contact?.sync_status),
    normalizeSyncStatus(result.crm_sync.deal?.sync_status),
    normalizeSyncStatus(result.crm_sync.task?.sync_status),
  ].filter(Boolean);

  if (!statuses.length) {
    return 'pending';
  }
  if (statuses.some((status) => ['failed', 'manual_review_required'].includes(status))) {
    return 'attention';
  }
  if (statuses.every((status) => status === 'synced')) {
    return 'completed';
  }
  if (statuses.some((status) => ['retrying', 'pending'].includes(status))) {
    return 'in_progress';
  }
  return 'in_progress';
}

function getEnterpriseStatusTone(status: EnterpriseJourneyStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'in_progress':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'attention':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function getEnterpriseStatusLabel(status: EnterpriseJourneyStatus) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'attention':
      return 'Needs review';
    default:
      return 'Pending';
  }
}

function buildV1ActorContext() {
  const runtimeConfig = createBookedAiHomepageRuntimeConfig();
  return {
    channel: runtimeConfig.channel ?? 'public_web',
    tenant_ref: runtimeConfig.tenantRef ?? null,
    deployment_mode: runtimeConfig.deploymentMode ?? 'standalone_app',
  };
}

function createAgentChatMessageId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatCurrencyAud(amount: number | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getServiceInitials(service: ServiceCatalogItem) {
  const source = service.venue_name || service.name || service.category || 'AI';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AI';
}

function buildSearchResultFacts(service: ServiceCatalogItem, confidenceLabel: string) {
  return [
    service.price_posture || formatCurrencyAud(service.amount_aud) || 'Price not listed',
    service.duration_minutes ? `${service.duration_minutes} min` : 'Duration TBD',
    service.location || service.venue_name || 'Location TBD',
    confidenceLabel,
  ].filter((item): item is string => Boolean(item)).slice(0, 4);
}

function derivePaymentOptionForAutomation(params: {
  paymentAllowedBeforeConfirmation: boolean;
  bookingPath: string | null;
}) {
  if (params.paymentAllowedBeforeConfirmation) {
    return 'stripe_card' as const;
  }

  if (params.bookingPath === 'book_on_partner_site') {
    return 'partner_checkout' as const;
  }

  return 'invoice_after_confirmation' as const;
}

function buildOperationTimeline(result: BookingAssistantSessionResponse): OperationTimelineItem[] {
  const paymentStatus = normalizeAutomationStatus(result.automation?.paymentIntent?.status);
  const emailStatus = normalizeAutomationStatus(result.automation?.lifecycleEmail?.status);
  const smsStatus = normalizeAutomationStatus(result.automation?.sms?.status);
  const whatsappStatus = normalizeAutomationStatus(result.automation?.whatsapp?.status);
  const crmStatus = deriveCrmSyncStatus(result);

  return [
    {
      id: 'booking-captured',
      title: 'Booking captured',
      detail: `Booking reference ${result.booking_reference} was created for ${result.service.name}.`,
      status: 'completed',
      reference: result.booking_reference,
    },
    {
      id: 'payment-intent',
      title: 'Payment',
      detail:
        paymentStatus === 'pending'
          ? 'Payment is recorded and a checkout link will be prepared shortly.'
          : paymentStatus
            ? `Payment status: ${paymentStatus.replace(/_/g, ' ')}.`
            : 'Payment details will appear once the booking is confirmed.',
      status:
        result.payment_status === 'stripe_checkout_ready'
          ? 'completed'
          : result.automation?.paymentIntent
            ? 'in_progress'
            : 'pending',
      reference: result.automation?.paymentIntent?.paymentIntentId ?? null,
    },
    {
      id: 'email-dispatch',
      title: 'Confirmation email',
      detail:
        emailStatus === 'sent' || emailStatus === 'delivered'
          ? 'Confirmation email was sent successfully.'
          : emailStatus === 'queued'
            ? 'Confirmation email is queued and will be sent shortly.'
            : result.contact_email
              ? `Confirmation email will be sent to ${result.contact_email}.`
              : 'No email address was provided for this booking.',
      status: deriveCommunicationLaneStatus(result.automation?.lifecycleEmail),
      reference: result.automation?.lifecycleEmail?.messageId ?? null,
    },
    {
      id: 'sms-dispatch',
      title: 'SMS confirmation',
      detail:
        smsStatus === 'sent' || smsStatus === 'delivered'
          ? 'SMS confirmation was sent successfully.'
          : smsStatus === 'queued'
            ? 'SMS confirmation is queued and will be sent shortly.'
            : 'Add a phone number to receive an SMS confirmation for this booking.',
      status: deriveCommunicationLaneStatus(result.automation?.sms),
      reference: result.automation?.sms?.messageId ?? null,
    },
    {
      id: 'whatsapp-dispatch',
      title: 'WhatsApp confirmation',
      detail:
        whatsappStatus === 'sent' || whatsappStatus === 'delivered'
          ? 'WhatsApp confirmation was sent successfully.'
          : whatsappStatus === 'queued'
            ? 'WhatsApp confirmation is queued and will be sent shortly.'
            : 'Add a phone number to receive a WhatsApp confirmation for this booking.',
      status: deriveCommunicationLaneStatus(result.automation?.whatsapp),
      reference: result.automation?.whatsapp?.messageId ?? null,
    },
    {
      id: 'crm-sync',
      title: 'Business sync',
      detail:
        crmStatus === 'completed'
          ? 'Your booking details have been synced with the business system.'
          : crmStatus === 'attention'
            ? 'Business sync needs a review — the team has been notified.'
            : 'Business sync will begin once your booking is confirmed.',
      status: crmStatus,
      reference:
        result.crm_sync?.deal?.external_entity_id ??
        result.crm_sync?.contact?.external_entity_id ??
        result.crm_sync?.lead?.external_entity_id ??
        null,
    },
    {
      id: 'revenue-ops-agent',
      title: 'Follow-up actions',
      detail: result.automation?.revenueOps
        ? `${result.automation.revenueOps.actionCount} follow-up action${result.automation.revenueOps.actionCount === 1 ? '' : 's'} queued — reminders, confirmations, and next steps will be sent.`
        : 'Follow-up reminders and confirmations will be queued after your booking is confirmed.',
      status:
        result.automation?.revenueOps?.status === 'queued'
          ? 'in_progress'
          : result.automation?.revenueOps?.status === 'manual_review'
            ? 'attention'
            : 'pending',
      reference: result.automation?.revenueOps?.actionTypes.slice(0, 2).join(', ') ?? null,
    },
  ];
}

function paymentReadyCopy(result: BookingAssistantSessionResponse) {
  return result.payment_status === 'stripe_checkout_ready'
    ? `Pay here: ${result.payment_url}`
    : 'Payment follow-up will be sent separately.';
}

function buildCommunicationPreviewCards(params: {
  result: BookingAssistantSessionResponse;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const { result, customerName, customerEmail, customerPhone } = params;
  const displayName = customerName.trim() || 'Customer';
  const normalizedEmail = customerEmail.trim().toLowerCase();
  const normalizedPhone = normalizePhoneForMessaging(customerPhone) ?? customerPhone.trim();
  const slotLine = `${result.requested_date} at ${result.requested_time} ${result.timezone}`;
  const serviceLabel = result.service.name;
  const paymentLine =
    result.payment_status === 'stripe_checkout_ready'
      ? `Payment link: ${result.payment_url}`
      : 'Payment will be completed after manual confirmation.';
  const calendarLine =
    result.meeting_event_url || result.calendar_add_url
      ? `Calendar link: ${result.meeting_event_url ?? result.calendar_add_url}`
      : 'A calendar invite will be sent to you once the booking is confirmed.';

  const cards: CommunicationPreviewCard[] = [];

  if (normalizedEmail) {
    cards.push({
      id: 'email',
      title: 'Confirmation email',
      channel: 'Email',
      tone: 'dark',
      recipient: normalizedEmail,
      summary: 'Your booking confirmation with reference, payment status, and portal link.',
      body: `Subject: Your ${serviceLabel} booking is confirmed\n\nHi ${displayName},\n\nThanks for choosing ${serviceLabel}. Your booking reference is ${result.booking_reference}.\nRequested slot: ${slotLine}.\n${paymentLine}\n${calendarLine}\nPortal: ${getBookingPortalUrl(result)}\n\nThe BookedAI team`,
    });
  }

  if (normalizedPhone) {
    cards.push({
      id: 'sms',
      title: 'SMS follow-up',
      channel: 'SMS',
      tone: 'light',
      recipient: normalizedPhone,
      summary: 'A short reminder with your booking reference and portal link.',
      body: `${displayName}, your ${serviceLabel} booking ref is ${result.booking_reference}. Slot: ${slotLine}. ${paymentReadyCopy(result)} Portal: ${getBookingPortalUrl(result)}`,
    });
    cards.push({
      id: 'whatsapp',
      title: 'WhatsApp confirmation',
      channel: 'WhatsApp',
      tone: 'success',
      recipient: normalizedPhone,
      summary: 'A richer channel for payment reminders, reschedule help, and follow-up questions.',
      body: `Hi ${displayName}, thanks for booking ${serviceLabel} with BookedAI.\nBooking reference: ${result.booking_reference}\nRequested slot: ${slotLine}\n${paymentLine}\nIf you need to reschedule or ask a question, reply here and our team will continue the conversation.`,
    });
  }

  return cards;
}

function buildEnterpriseJourneySteps(params: {
  result: BookingAssistantSessionResponse | null;
  selectedService: ServiceCatalogItem | null;
  customerEmail: string;
  customerPhone: string;
}) {
  const { result, selectedService, customerEmail, customerPhone } = params;
  const hasPhone = customerPhone.trim().replace(/\D/g, '').length >= 8;
  const hasEmail = customerEmail.trim().length > 3;
  const paymentReady = result?.payment_status === 'stripe_checkout_ready';
  const calendarReady = Boolean(result?.meeting_event_url || result?.calendar_add_url);
  const crmStatus = deriveCrmSyncStatus(result);
  const emailLaneStatus = deriveCommunicationLaneStatus(result?.automation?.lifecycleEmail);
  const smsLaneStatus = deriveCommunicationLaneStatus(result?.automation?.sms);
  const whatsappLaneStatus = deriveCommunicationLaneStatus(result?.automation?.whatsapp);
  const paymentIntentStatus = normalizeAutomationStatus(result?.automation?.paymentIntent?.status);
  const paymentWarnings = result?.automation?.paymentIntent?.warnings ?? [];

  return [
    {
      id: 'match',
      title: 'Search and matching',
      description: selectedService
        ? `${selectedService.name} is selected from the matched shortlist.`
        : 'BookedAI is still turning the request into a ranked shortlist.',
      status: selectedService ? 'completed' : 'in_progress',
      channel: 'Search',
    },
    {
      id: 'preview',
      title: 'Preview and decision',
      description: selectedService
        ? 'Price, duration, location, and trust signals are ready before checkout.'
        : 'Preview opens once a service is selected.',
      status: selectedService ? 'completed' : 'pending',
      channel: 'Preview',
    },
    {
      id: 'booking',
      title: 'Booking confirmed',
      description: result
        ? `Your booking reference ${result.booking_reference} has been created and confirmed.`
        : 'Fill in your details and preferred time to create your booking.',
      status: result ? 'completed' : selectedService ? 'in_progress' : 'pending',
      channel: 'Booking',
    },
    {
      id: 'email',
      title: 'Email confirmation',
      description: hasEmail
        ? emailLaneStatus === 'completed'
          ? `Confirmation email has been sent for ${customerEmail.trim().toLowerCase()}.`
          : emailLaneStatus === 'in_progress'
            ? `Confirmation email is queued for ${customerEmail.trim().toLowerCase()}.`
            : `Confirmation email is ready for ${customerEmail.trim().toLowerCase()}.`
        : 'Add an email address to receive a confirmation for your booking.',
      status: !hasEmail ? 'pending' : result ? emailLaneStatus : 'pending',
      channel: 'Email',
    },
    {
      id: 'calendar',
      title: 'Calendar event',
      description: calendarReady
        ? 'Your calendar invite is ready to add.'
        : result
          ? 'A calendar event will be prepared by the provider.'
          : 'A calendar event will be added after your booking is confirmed.',
      status: calendarReady ? 'completed' : result ? 'attention' : 'pending',
      channel: 'Calendar',
    },
    {
      id: 'payment',
      title: 'Payment readiness',
      description: paymentReady
        ? 'Checkout link is ready for immediate payment.'
        : paymentIntentStatus
          ? paymentWarnings.length
            ? 'Payment is recorded. The provider will confirm the checkout link shortly.'
            : 'Payment is ready and waiting on the next step from the provider.'
        : result
          ? 'Payment will be collected once the provider confirms your booking.'
          : 'Payment options will appear after your booking request is submitted.'
      ,
      status: paymentReady ? 'completed' : paymentIntentStatus ? 'in_progress' : result ? 'attention' : 'pending',
      channel: 'Payment',
    },
    {
      id: 'crm',
      title: 'Business sync',
      description: result?.crm_sync
        ? 'Your booking details have been synced with the business system.'
        : 'Business sync will begin once your booking is confirmed.',
      status: result ? crmStatus : 'pending',
      channel: 'CRM',
    },
    {
      id: 'messaging',
      title: 'SMS and WhatsApp follow-up',
      description: hasPhone
        ? smsLaneStatus === 'completed' || whatsappLaneStatus === 'completed'
          ? 'SMS and WhatsApp confirmations have been sent to your number.'
          : smsLaneStatus === 'in_progress' || whatsappLaneStatus === 'in_progress'
            ? 'SMS and WhatsApp confirmations are being prepared for your number.'
            : 'You will receive SMS and WhatsApp updates on the number you provided.'
        : 'Add a phone number to receive SMS and WhatsApp updates for your booking.',
      status: !hasPhone
        ? 'pending'
        : result
          ? smsLaneStatus === 'attention' || whatsappLaneStatus === 'attention'
            ? 'attention'
            : smsLaneStatus === 'completed' || whatsappLaneStatus === 'completed'
              ? 'completed'
              : smsLaneStatus === 'in_progress' || whatsappLaneStatus === 'in_progress'
                ? 'in_progress'
                : 'pending'
          : 'in_progress',
      channel: 'Messaging',
    },
    {
      id: 'thank-you',
      title: 'What to do next',
      description: result
        ? 'Your booking portal, payment link, and support details are all ready above.'
        : 'Next steps and portal access will appear after your booking is confirmed.',
      status: result ? 'completed' : 'pending',
      channel: 'Aftercare',
    },
  ] satisfies EnterpriseJourneyStep[];
}

function getBookingPortalUrl(
  result: BookingAssistantSessionResponse,
  action?: 'edit' | 'reschedule' | 'cancel',
) {
  if (result.portal_url?.trim()) {
    const url = new URL(result.portal_url.trim());
    if (action) {
      url.searchParams.set('action', action);
    }
    return url.toString();
  }

  return `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(result.booking_reference)}${action ? `&action=${encodeURIComponent(action)}` : ''}`;
}

function getBookingQrCodeUrl(result: BookingAssistantSessionResponse) {
  if (result.qr_code_url?.trim()) {
    return result.qr_code_url.trim();
  }

  const targetUrl = getBookingPortalUrl(result);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}`;
}

function buildTelegramCareUrl(params: {
  bookingReference?: string | null;
  serviceName?: string | null;
}) {
  const bookingReference = params.bookingReference?.trim();
  if (bookingReference) {
    return `https://t.me/BookedAI_Manager_Bot?start=${encodeURIComponent(`bk.${bookingReference}`)}`;
  }

  const serviceSlug = (params.serviceName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  return `https://t.me/BookedAI_Manager_Bot?start=${encodeURIComponent(serviceSlug ? `svc.${serviceSlug}` : 'care')}`;
}

function buildBookingFlowSteps(params: {
  currentQuery: string;
  selectedService: ServiceCatalogItem | null;
  result: BookingAssistantSessionResponse | null;
  submitLoading: boolean;
}): BookingFlowStep[] {
  const trimmedQuery = params.currentQuery.trim();

  return [
    {
      id: 'search',
      label: 'Search intent',
      detail: trimmedQuery || 'Start with a natural-language search to build the shortlist.',
      state: trimmedQuery ? 'complete' : 'active',
    },
    {
      id: 'selected',
      label: 'Chosen match',
      detail: params.selectedService
        ? `${params.selectedService.name}${params.selectedService.location ? ` • ${params.selectedService.location}` : ''}`
        : 'Choose one ranked option from the shortlist to continue.',
      state: params.selectedService ? 'complete' : trimmedQuery ? 'active' : 'pending',
    },
    {
      id: 'request',
      label: 'BookedAI booking flow',
      detail: params.result
        ? `Booking ${params.result.booking_reference} is ready with portal, follow-up, and next actions.`
        : params.submitLoading
          ? 'Submitting your booking request and preparing the next step.'
          : params.selectedService
            ? 'Confirm your details below and BookedAI will create the booking request.'
            : 'The next step activates after you select a result and confirm the request.',
      state: params.result ? 'complete' : params.submitLoading || params.selectedService ? 'active' : 'pending',
    },
  ];
}

function buildFallbackCatalog(): BookingAssistantCatalogResponse {
  return {
    status: 'fallback',
    business_email: 'info@bookedai.au',
    stripe_enabled: true,
    services: demoContent.results.map((item, index) => ({
      id: `fallback-${index + 1}`,
      name: item.name,
      category: item.category,
      summary: item.summary,
      duration_minutes: 45,
      amount_aud: Number.parseInt(item.priceLabel.replace(/[^\d]/g, ''), 10) || 60,
      image_url: item.imageUrl,
      map_snapshot_url: null,
      venue_name: item.name,
      location: item.locationLabel,
      map_url: null,
      booking_url: '#',
      tags: demoContent.quickFilters,
      featured: true,
      distance_km: null,
    })),
  };
}

function buildDefaultPreferredSlot() {
  const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  const hours = `${next.getHours()}`.padStart(2, '0');
  const minutes = `${Math.floor(next.getMinutes() / 15) * 15}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parsePreferredSlot(value: string) {
  if (!value.includes('T')) {
    return null;
  }

  const [requestedDate, requestedTime] = value.split('T');
  if (!requestedDate || !requestedTime) {
    return null;
  }

  return { requestedDate, requestedTime };
}

function buildAuthoritativeBookingIntentResult(params: {
  authoritativeResult: Awaited<ReturnType<typeof createPublicBookingAssistantLeadAndBookingIntent>>;
  selectedService: ServiceCatalogItem;
  requestedDate: string;
  requestedTime: string;
  customerEmail: string;
  nextStep: string | null;
}): BookingAssistantSessionResponse {
  const { authoritativeResult, selectedService, requestedDate, requestedTime, customerEmail, nextStep } = params;
  const bookingReference =
    authoritativeResult.bookingReference?.trim() || authoritativeResult.bookingIntentId;
  const amountLabel =
    typeof selectedService.amount_aud === 'number' && Number.isFinite(selectedService.amount_aud)
      ? `A$${selectedService.amount_aud}`
      : 'TBC';
  const detailLine = nextStep?.trim() || authoritativeResult.warnings[0] || 'We will confirm the final slot with the provider.';

  return {
    status: 'ok',
    booking_reference: bookingReference,
    portal_url: `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(bookingReference)}`,
    service: selectedService,
    amount_aud: selectedService.amount_aud,
    amount_label: amountLabel,
    requested_date: requestedDate,
    requested_time: requestedTime,
    timezone: 'Australia/Sydney',
    payment_status: 'payment_follow_up_required',
    payment_url: '',
    qr_code_url: '',
    email_status: customerEmail.trim() ? 'sent' : 'pending_manual_followup',
    meeting_status: 'configuration_required',
    meeting_join_url: null,
    meeting_event_url: null,
    calendar_add_url: null,
    confirmation_message: `Booking request captured in v1. ${detailLine}`,
    contact_email: customerEmail.trim() || 'follow-up required',
    workflow_status: authoritativeResult.trust.recommended_booking_path ?? 'request_callback',
    crm_sync: authoritativeResult.crmSync ?? null,
  };
}

function validateBookingForm(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredSlot: string;
}) {
  const trimmedName = params.customerName.trim();
  const trimmedEmail = params.customerEmail.trim();
  const trimmedPhone = params.customerPhone.trim();

  if (trimmedName.length < 2) {
    return 'Enter a customer name before continuing.';
  }

  if (!trimmedEmail && !trimmedPhone) {
    return 'Enter an email address or phone number.';
  }

  if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return 'Enter a valid email address.';
  }

  if (trimmedPhone) {
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return 'Enter a valid phone number with at least 8 digits.';
    }
  }

  if (!parsePreferredSlot(params.preferredSlot)) {
    return 'Choose a valid preferred booking time.';
  }

  return '';
}

function dedupeServices(services: ServiceCatalogItem[]) {
  const seen = new Set<string>();
  return services.filter((service) => {
    if (!service.id || seen.has(service.id)) {
      return false;
    }
    seen.add(service.id);
    return true;
  });
}

function toServiceCatalogItem(candidate: MatchCandidate): ServiceCatalogItem {
  return {
    id: candidate.candidateId,
    name: candidate.serviceName,
    category: candidate.category ?? 'Service',
    summary: candidate.summary ?? candidate.explanation ?? '',
    duration_minutes: candidate.durationMinutes ?? 30,
    amount_aud: candidate.amountAud ?? 0,
    image_url: candidate.imageUrl ?? null,
    map_snapshot_url: null,
    venue_name: candidate.venueName ?? candidate.providerName ?? null,
    location: candidate.location ?? null,
    map_url: candidate.mapUrl ?? null,
    booking_url: candidate.bookingUrl ?? null,
    contact_phone: candidate.contactPhone ?? null,
    source_url: candidate.sourceUrl ?? null,
    tags: candidate.tags ?? [],
    featured: candidate.featured ?? false,
    distance_km: candidate.distanceKm ?? null,
    source_type: candidate.sourceType ?? null,
    source_label: candidate.sourceLabel ?? null,
    why_this_matches: candidate.whyThisMatches ?? null,
    price_posture: candidate.pricePosture ?? null,
    booking_path_type: candidate.bookingPathType ?? null,
    next_step: candidate.nextStep ?? null,
    availability_state: candidate.availabilityState ?? null,
    booking_confidence: candidate.bookingConfidence ?? null,
    trust_signal: candidate.trustSignal ?? null,
  };
}

function normalizeSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .toLowerCase();
}

function isOnlineFriendlyService(service: ServiceCatalogItem, query: string) {
  const serviceText = normalizeSearchText([
    service.name,
    service.category,
    service.summary,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);
  const queryText = query.trim().toLowerCase();
  const onlineKeywords = ['online', 'virtual', 'remote', 'telehealth', 'video', 'zoom', 'phone consult'];
  const queryPrefersOnline = onlineKeywords.some((keyword) => queryText.includes(keyword));
  const serviceSupportsOnline =
    onlineKeywords.some((keyword) => serviceText.includes(keyword)) ||
    (service.booking_url ? !service.location || service.location.toLowerCase().includes('online') : false);

  return queryPrefersOnline || serviceSupportsOnline ? serviceSupportsOnline : false;
}

function getLocationPriorityBucket(
  service: ServiceCatalogItem,
  locality: string | null,
  query: string,
) {
  const locationText = normalizeSearchText([service.location, service.venue_name, ...service.tags]);
  const localityMatch = locality ? locationText.includes(locality.trim().toLowerCase()) : false;
  const onlineFriendly = isOnlineFriendlyService(service, query);
  const hasExplicitLocation = Boolean(service.location?.trim() || service.venue_name?.trim());

  if (localityMatch) {
    return 0;
  }
  if (onlineFriendly) {
    return 1;
  }
  if (!locality && typeof service.distance_km === 'number') {
    return 2;
  }
  if (!hasExplicitLocation) {
    return 3;
  }
  return 4;
}

function resolvePriorityIntentTerms(query: string, intentTermsOverride?: string[] | null) {
  if (intentTermsOverride && intentTermsOverride.length > 0) {
    return Array.from(new Set(intentTermsOverride.map((term) => term.trim().toLowerCase()).filter(Boolean)));
  }

  return extractQueryIntentTerms(query);
}

function computeIntentPriorityScore(
  service: ServiceCatalogItem,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return 0;
  }

  const nameText = normalizeSearchText([service.name]);
  const summaryText = normalizeSearchText([service.summary]);
  const metadataText = normalizeSearchText([
    service.category,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);

  let score = 0;
  for (const term of intentTerms) {
    if (nameText.includes(term)) {
      score += 7;
      continue;
    }
    if (metadataText.includes(term)) {
      score += 4;
      continue;
    }
    if (summaryText.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function prioritizeSearchResults(
  services: ServiceCatalogItem[],
  locality: string | null,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  return [...services]
    .map((service, index) => ({
      service,
      index,
      intentScore: computeIntentPriorityScore(service, query, intentTermsOverride),
      bucket: getLocationPriorityBucket(service, locality, query),
      distance: typeof service.distance_km === 'number' ? service.distance_km : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
      if (left.intentScore !== right.intentScore) {
        return right.intentScore - left.intentScore;
      }
      if (left.bucket !== right.bucket) {
        return left.bucket - right.bucket;
      }
      if (left.service.featured !== right.service.featured) {
        return left.service.featured ? -1 : 1;
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.service);
}

function uniqueCandidateServices(
  rankedCandidates: MatchCandidate[],
  legacyMatches: ServiceCatalogItem[],
  catalog: BookingAssistantCatalogResponse | null,
) {
  const catalogById = new Map((catalog?.services ?? []).map((service) => [service.id, service]));
  const v1Matches = rankedCandidates.map((candidate) => {
    const match = toServiceCatalogItem(candidate);
    const catalogMatch = catalogById.get(match.id);
    if (!catalogMatch) {
      return match;
    }

    return {
      ...catalogMatch,
      ...match,
      category: match.category || catalogMatch.category,
      summary: match.summary || catalogMatch.summary,
      duration_minutes: match.duration_minutes && match.duration_minutes !== 30
        ? match.duration_minutes
        : catalogMatch.duration_minutes,
      amount_aud: match.amount_aud > 0 ? match.amount_aud : catalogMatch.amount_aud,
      image_url: match.image_url || catalogMatch.image_url,
      map_snapshot_url: match.map_snapshot_url || catalogMatch.map_snapshot_url,
      venue_name: match.venue_name || catalogMatch.venue_name,
      location: match.location || catalogMatch.location,
      map_url: match.map_url || catalogMatch.map_url,
      booking_url: match.booking_url || catalogMatch.booking_url,
      contact_phone: match.contact_phone || catalogMatch.contact_phone,
      source_url: match.source_url || catalogMatch.source_url,
      tags: match.tags.length ? match.tags : catalogMatch.tags,
      featured: match.featured || catalogMatch.featured,
      price_posture: match.price_posture || catalogMatch.price_posture,
      booking_path_type: match.booking_path_type || catalogMatch.booking_path_type,
      next_step: match.next_step || catalogMatch.next_step,
      availability_state: match.availability_state || catalogMatch.availability_state,
      booking_confidence: match.booking_confidence || catalogMatch.booking_confidence,
      trust_signal: match.trust_signal || catalogMatch.trust_signal,
    };
  });
  const merged = [...v1Matches, ...legacyMatches];
  const normalized = merged.map<ServiceCatalogItem>((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    summary: item.summary,
    duration_minutes: item.duration_minutes,
    amount_aud: item.amount_aud,
    image_url: item.image_url,
    map_snapshot_url: item.map_snapshot_url,
    venue_name: item.venue_name,
    location: item.location,
    map_url: item.map_url,
    booking_url: item.booking_url,
    tags: item.tags,
    featured: item.featured,
    distance_km: item.distance_km ?? null,
    source_type: item.source_type ?? null,
    source_label: item.source_label ?? null,
    why_this_matches: item.why_this_matches ?? null,
    price_posture: item.price_posture ?? null,
    booking_path_type: item.booking_path_type ?? null,
    next_step: item.next_step ?? null,
    availability_state: item.availability_state ?? null,
    booking_confidence: item.booking_confidence ?? null,
    trust_signal: item.trust_signal ?? null,
  }));

  if (normalized.length > 0) {
    return dedupeServices(normalized);
  }

  return [];
}

function extractQueryIntentTerms(query: string) {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'around',
    'at',
    'book',
    'booking',
    'class',
    'classes',
    'find',
    'for',
    'get',
    'i',
    'in',
    'is',
    'looking',
    'lesson',
    'lessons',
    'me',
    'my',
    'near',
    'need',
    'of',
    'on',
    'option',
    'options',
    'please',
    'service',
    'services',
    'session',
    'sessions',
    'the',
    'to',
    'training',
    'tutor',
    'want',
    'with',
  ]);
  const locationWords = new Set([
    'sydney',
    'melbourne',
    'brisbane',
    'perth',
    'adelaide',
    'canberra',
    'wollongong',
    'parramatta',
    'nsw',
    'vic',
    'qld',
    'cbd',
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !stopWords.has(term) && !locationWords.has(term)),
    ),
  );
}

function hasExplicitSearchArea(query: string) {
  return /\b(sydney|western sydney|startup hub|caringbah|kirrawee|leichhardt|miranda|rouse hill|st peters|parramatta|cbd|nsw)\b/i.test(query);
}

function getFastSearchIntent(query: string): 'swim' | 'chess' | 'wsti_event' | null {
  if (hasNearMeIntent(query) && !hasExplicitSearchArea(query)) {
    return null;
  }
  if (/\b(wsti|western sydney tech innovators|western sydney startup hub|startup hub|ai events?|ai meetup|tech innovators)\b/i.test(query)) {
    return 'wsti_event';
  }
  if (/\b(co mai hung|mai hung|chess|grandmaster|woman grandmaster)\b/i.test(query)) {
    return 'chess';
  }
  if (/\b(future swim|futureswim|swim|swimming|learn to swim|water familiarisation|stroke correction|pre-squad)\b/i.test(query)) {
    return 'swim';
  }
  return null;
}

function buildWstiFastResult(): ServiceCatalogItem {
  return {
    id: 'event:https://www.meetup.com/western-sydney-tech-innovators/',
    name: 'WSTI AI Events - Western Sydney Tech Innovators',
    category: 'AI Event',
    summary:
      'Western Sydney Tech Innovators runs practical AI meetups, founder sessions, and community events connected to the Western Sydney Startup Hub.',
    duration_minutes: 90,
    amount_aud: 0,
    image_url: '/wsti-logo.webp',
    map_snapshot_url: null,
    venue_name: 'Western Sydney Tech Innovators',
    location: 'Western Sydney Startup Hub',
    map_url: 'https://www.google.com/maps/search/?api=1&query=Western%20Sydney%20Startup%20Hub',
    booking_url: 'https://www.meetup.com/western-sydney-tech-innovators/',
    source_url: 'https://www.meetup.com/western-sydney-tech-innovators/',
    tags: ['ai', 'event', 'events', 'wsti', 'western sydney', 'startup hub', 'meetup'],
    featured: true,
    distance_km: null,
    source_type: 'shortcut',
    source_label: 'WSTI Meetup',
    why_this_matches:
      'Fast shortcut match for WSTI, AI events, and Western Sydney Startup Hub searches while live event discovery refreshes.',
    display_price: 'Details in follow-up',
    price_posture: 'price_tbc',
    booking_path_type: 'book_on_partner_site',
    next_step: 'Open the WSTI event page to compare upcoming AI sessions.',
    availability_state: 'partner_booking_only',
    booking_confidence: 'medium',
    trust_signal: 'WSTI shortcut',
  };
}

function buildFastSearchPreviewResults(
  query: string,
  catalog: BookingAssistantCatalogResponse | null,
) {
  const intent = getFastSearchIntent(query);
  if (!intent) {
    return [] as ServiceCatalogItem[];
  }

  if (intent === 'wsti_event') {
    const catalogMatches = (catalog?.services ?? []).filter((service) => {
      const text = normalizeSearchText([
        service.id,
        service.name,
        service.category,
        service.summary,
        service.venue_name,
        service.location,
        service.source_label,
        ...service.tags,
      ]);
      return /\b(wsti|western sydney tech innovators|startup hub|ai event|ai meetup)\b/i.test(text);
    });
    return dedupeServices([buildWstiFastResult(), ...catalogMatches]).slice(0, 3);
  }

  const catalogMatches = (catalog?.services ?? []).filter((service) => {
    const text = normalizeSearchText([
      service.id,
      service.name,
      service.category,
      service.summary,
      service.venue_name,
      service.location,
      service.source_label,
      ...service.tags,
    ]);
    if (intent === 'chess') {
      return /\b(chess|co mai hung|grandmaster|strategy|tournament)\b/i.test(text);
    }
    return /\b(future swim|futureswim|swim|swimming|learn to swim|water familiarisation|stroke correction|pre-squad)\b/i.test(text);
  });

  return prioritizeSearchResults(catalogMatches, null, query).slice(0, 3);
}

function filterResultsByIntentTerms(
  services: ServiceCatalogItem[],
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return services;
  }

  const strongMatches = services.filter((service) => {
    const primaryServiceText = normalizeSearchText([
      service.name,
      service.category,
      service.location,
      service.venue_name,
      ...service.tags,
    ]);
    return intentTerms.some((term) => primaryServiceText.includes(term));
  });
  if (strongMatches.length > 0) {
    return strongMatches;
  }

  const filtered = services.filter((service) => {
    const summaryText = normalizeSearchText([service.summary]);
    return intentTerms.some((term) => summaryText.includes(term));
  });

  return filtered.length > 0 ? filtered : services;
}

function orderResultsByRecommendationIds(
  services: ServiceCatalogItem[],
  recommendedCandidateIds: string[],
) {
  if (!recommendedCandidateIds.length) {
    return services;
  }

  const byId = new Map(services.map((service) => [service.id, service]));
  const ordered = recommendedCandidateIds
    .map((candidateId) => byId.get(candidateId) ?? null)
    .filter((service): service is ServiceCatalogItem => Boolean(service));

  if (!ordered.length) {
    return services;
  }

  const orderedIds = new Set(ordered.map((service) => service.id));
  const remainder = services.filter((service) => !orderedIds.has(service.id));
  return [...ordered, ...remainder];
}

function buildLiveReadResultsSummary(params: {
  rankedCount: number;
  warnings: string[];
  normalizedQuery: string | null;
  inferredLocation: string | null;
  inferredCategory: string | null;
}) {
  const preferredWarning =
    params.warnings.find((warning) => /location access is needed/i.test(warning)) ??
    params.warnings.find((warning) =>
      /accuracy over showing a wrong-domain recommendation/i.test(warning),
    ) ??
    params.warnings[0] ??
    null;
  const normalizedQuery = params.normalizedQuery?.trim() || null;
  const inferredLocation = params.inferredLocation?.trim() || null;
  const normalizedQueryAlreadyCarriesLocation =
    Boolean(normalizedQuery && inferredLocation) &&
    normalizeSearchText([normalizedQuery]).includes(normalizeSearchText([inferredLocation]));
  const enrichedNormalizedQuery =
    normalizedQuery && inferredLocation && !normalizedQueryAlreadyCarriesLocation
      ? `${normalizedQuery} near ${inferredLocation.toLowerCase()}`
      : normalizedQuery;
  const descriptor =
    enrichedNormalizedQuery ||
    [params.inferredCategory, inferredLocation].filter(Boolean).join(' in ') ||
    null;

  if (!params.rankedCount) {
    const isLocationWarning = Boolean(
      preferredWarning && /location access is needed/i.test(preferredWarning),
    );
    const warningLine =
      isLocationWarning
        ? 'Turn on location on this device so I can narrow nearby matches in real time instead of showing broad Australia-wide results.'
        : preferredWarning ?? 'I could not find a strong relevant match for that request.';
    return descriptor
      ? `${warningLine} I stayed grounded to ${descriptor}, so I am not showing unrelated stored results.`
      : `${warningLine} I am not showing unrelated stored results.`;
  }

  const shownCount = Math.min(params.rankedCount, 3);
  if (descriptor) {
    return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'} for ${descriptor}. Here are the top ${shownCount} to compare first.`;
  }

  return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'}. Here are the top ${shownCount} to compare first.`;
}

function hasLocationPermissionWarning(warnings: string[]) {
  return warnings.some((warning) =>
    /location access is needed to (find services near you|rank nearby matches)/i.test(warning),
  );
}

function hasNearMeIntent(query: string) {
  return /\b(near me|nearby|close to me|around me|in my area)\b/i.test(query);
}

export function HomepageSearchExperience({
  content,
  sourcePath,
  initialQuery,
  initialQueryRequestId,
  experimentVariant = 'control',
  onHomepageEvent,
}: HomepageSearchExperienceProps) {
  const isLiveReadMode = isPublicBookingAssistantV1LiveReadEnabled();
  const homepageRuntimeConfig = useMemo(() => createBookedAiHomepageRuntimeConfig(), []);
  const [catalog, setCatalog] = useState<BookingAssistantCatalogResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [currentQuery, setCurrentQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<ServiceCatalogItem[]>([]);
  const [agentChatMessages, setAgentChatMessages] = useState<AgentChatMessage[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [previewService, setPreviewService] = useState<ServiceCatalogItem | null>(null);
  const [assistantSummary, setAssistantSummary] = useState('');
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geoHint, setGeoHint] = useState('');
  const [searchProgressStageIndex, setSearchProgressStageIndex] = useState(0);
  const [showDelayedSearchNudge, setShowDelayedSearchNudge] = useState(false);
  const [attachedReferences, setAttachedReferences] = useState<
    Array<{ id: string; name: string; kind: 'image' | 'file'; extractedText?: string | null }>
  >([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const customerPhoneHelperId = useId();
  const [preferredSlot, setPreferredSlot] = useState(buildDefaultPreferredSlot());
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<BookingAssistantSessionResponse | null>(null);
  const [bookingComposerOpen, setBookingComposerOpen] = useState(false);
  const [, setComposerCollapsed] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [geoContext, setGeoContext] = useState<UserGeoContext | null>(null);
  const [liveReadBookingSummary, setLiveReadBookingSummary] = useState<LiveReadBookingSummary | null>(null);
  const [bookingReturnNotice, setBookingReturnNotice] = useState<BookingReturnNotice | null>(null);
  const [lastHandledRequestId, setLastHandledRequestId] = useState(0);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const bookingFormRef = useRef<HTMLDivElement | null>(null);
  const searchComposerRef = useRef<HTMLTextAreaElement | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionBaseQueryRef = useRef('');
  const bookingAssistantV1SessionIdRef = useRef<string | null>(null);
  const announcedBookingReferenceRef = useRef<string | null>(null);

  function trackHomepageSearchEvent(eventName: string, payload: Record<string, unknown> = {}) {
    onHomepageEvent?.(eventName, {
      variant: experimentVariant,
      surface: 'homepage_search',
      query: currentQuery || searchQuery || null,
      selected_service_id: selectedServiceId || null,
      result_count: results.length,
      ...payload,
    });
  }

  function returnToHomepageSearch() {
    setResult(null);
    setBookingComposerOpen(false);
    setComposerCollapsed(false);
    setSelectedServiceId('');
    setPreviewService(null);
    setLiveReadBookingSummary(null);
    setSubmitError('');
    setSubmitLoading(false);
    setSearchQuery('');
    setCurrentQuery('');
    setResults([]);
    setAgentChatMessages([]);
    setAssistantSummary('');
    setSearchWarnings([]);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');
    setPreferredSlot(buildDefaultPreferredSlot());

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const bookingStatus = currentUrl.searchParams.get('booking');
    const bookingRef = currentUrl.searchParams.get('ref')?.trim() || null;

    if (bookingStatus === 'success' && bookingRef) {
      setBookingReturnNotice({
        tone: 'success',
        title: 'Payment complete',
        body: `Booking ${bookingRef} has been sent through payment, confirmation, and follow-up.`,
      });
      return;
    }

    if (bookingStatus === 'cancelled' && bookingRef) {
      setBookingReturnNotice({
        tone: 'warning',
        title: 'Payment not completed',
        body: `Booking ${bookingRef} is still saved. Reopen the booking flow when you are ready to finish payment.`,
      });
      return;
    }

    setBookingReturnNotice(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      if (shouldUseLocalStaticPublicData()) {
        setCatalog(buildFallbackCatalog());
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load service catalog.');
        }

        const payload = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(payload);
      } catch {
        if (!controller.signal.aborted) {
          setCatalog(buildFallbackCatalog());
        }
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialQuery?.trim()) {
      return;
    }

    setSearchQuery(initialQuery.trim());
  }, [initialQuery, initialQueryRequestId]);

  useEffect(() => {
    if (!currentQuery && !result) {
      setComposerCollapsed(false);
    }
  }, [currentQuery, result]);

  useEffect(() => {
    if (!result || announcedBookingReferenceRef.current === result.booking_reference) {
      return;
    }

    announcedBookingReferenceRef.current = result.booking_reference;
    setAgentChatMessages((current) => [
      ...current,
      {
        id: createAgentChatMessageId('assistant'),
        role: 'assistant',
        content: `Thanks, your booking is captured. Reference ${result.booking_reference}. You can scan the QR or open the portal, and I can keep helping with another search here.`,
        suggestions: [
          { label: 'Search again', query: currentQuery || 'Find another nearby service this week' },
          { label: 'Need help', query: `Help me with booking ${result.booking_reference}` },
        ],
      },
    ]);
  }, [currentQuery, result]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const speechRecognition =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    setVoiceSupported(Boolean(speechRecognition));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!searchLoading) {
      setSearchProgressStageIndex(0);
      setShowDelayedSearchNudge(false);
      return;
    }

    setSearchProgressStageIndex(0);
    setShowDelayedSearchNudge(false);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const nextIndex = Math.min(SEARCH_PROGRESS_STAGES.length - 1, Math.floor(elapsedMs / 800));
      setSearchProgressStageIndex(nextIndex);
    }, 180);
    const delayedNudgeTimer = window.setTimeout(() => {
      setShowDelayedSearchNudge(true);
    }, 2600);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(delayedNudgeTimer);
    };
  }, [searchLoading]);

  useEffect(() => {
    if (!previewService || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewService(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewService]);

  const selectedService = useMemo(
    () => results.find((service) => service.id === selectedServiceId) ?? null,
    [results, selectedServiceId],
  );
  const resultById = useMemo(
    () => new Map(results.map((service) => [service.id, service])),
    [results],
  );

  function focusSearchComposer() {
    window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      searchComposerRef.current?.focus();
    }, 80);
  }

  async function handleSearchComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (searchLoading) {
      return;
    }

    await runSearch(searchQuery);
  }

  async function requestGeoContext() {
    if (geoContext) {
      return geoContext;
    }
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    return await new Promise<UserGeoContext | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextContext = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locality: null,
          };
          setGeoContext(nextContext);
          resolve(nextContext);
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 10 * 60 * 1000,
        },
      );
    });
  }

  async function requestLegacySearch(query: string, nextGeoContext?: UserGeoContext | null) {
    const response = await fetch(`${getApiBaseUrl()}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        conversation: [{ role: 'user', content: query }],
        user_latitude: nextGeoContext?.latitude ?? geoContext?.latitude ?? null,
        user_longitude: nextGeoContext?.longitude ?? geoContext?.longitude ?? null,
        user_locality: nextGeoContext?.locality ?? geoContext?.locality ?? null,
      }),
    });

    const rawResponseText = await response.text();
    let payload: (BookingAssistantChatResponse & { detail?: string }) | null = null;
    if (rawResponseText) {
      try {
        payload = JSON.parse(rawResponseText) as BookingAssistantChatResponse & { detail?: string };
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      throw new Error(payload?.detail || 'Unable to search services right now.');
    }

    if (!payload) {
      throw new Error('Unable to search services right now.');
    }

    return payload;
  }

  async function runPostBookingAutomation(params: {
    bookingIntentId: string;
    bookingReference: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    selectedService: ServiceCatalogItem;
    requestedDate: string;
    requestedTime: string;
    notes: string | null;
    paymentAllowedBeforeConfirmation: boolean;
    bookingPath: string | null;
    paymentLink?: string | null;
    portalUrl?: string | null;
  }) {
    const actorContext = buildV1ActorContext();
    const slotLabel = `${params.requestedDate} ${params.requestedTime} Australia/Sydney`;
    const paymentOption = derivePaymentOptionForAutomation({
      paymentAllowedBeforeConfirmation: params.paymentAllowedBeforeConfirmation,
      bookingPath: params.bookingPath,
    });
    const communicationVariables = {
      customer_name: params.customerName.trim(),
      service_name: params.selectedService.name,
      slot_label: slotLabel,
      booking_reference: params.bookingReference,
      business_name: params.selectedService.venue_name ?? 'BookedAI',
      venue_name: [params.selectedService.venue_name, params.selectedService.location].filter(Boolean).join(' • '),
      support_email: 'info@bookedai.au',
      payment_link: params.paymentLink?.trim() || '',
      manage_link: params.portalUrl?.trim() || '',
      timezone: 'Australia/Sydney',
      additional_note: params.notes?.trim() || '',
    };

    const automation: NonNullable<BookingAssistantSessionResponse['automation']> = {};

    try {
      const paymentIntentResponse = await apiV1.createPaymentIntent({
        booking_intent_id: params.bookingIntentId,
        selected_payment_option: paymentOption,
        actor_context: actorContext,
      });

      if ('data' in paymentIntentResponse) {
        automation.paymentIntent = {
          status: paymentIntentResponse.data.payment_status,
          paymentIntentId: paymentIntentResponse.data.payment_intent_id ?? null,
          warnings: paymentIntentResponse.data.warnings ?? [],
          checkoutUrl: paymentIntentResponse.data.checkout_url ?? null,
        };
      }
    } catch (error) {
      automation.paymentIntent = {
        status: 'error',
        paymentIntentId: null,
        warnings: [error instanceof Error ? error.message : 'Payment intent automation failed.'],
        checkoutUrl: null,
      };
    }

    if (params.customerEmail?.trim()) {
      try {
        const emailResponse = await apiV1.sendLifecycleEmail({
          template_key: 'bookedai_booking_confirmation',
          to: [params.customerEmail.trim().toLowerCase()],
          subject: null,
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            source_page: sourcePath,
          },
          actor_context: actorContext,
        });

        if ('data' in emailResponse) {
          automation.lifecycleEmail = {
            status: emailResponse.data.delivery_status,
            messageId: emailResponse.data.message_id ?? null,
            warnings: emailResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.lifecycleEmail = {
          status: 'error',
          messageId: null,
          warnings: [error instanceof Error ? error.message : 'Lifecycle email automation failed.'],
        };
      }
    }

    if (params.customerPhone?.trim()) {
      const phone = normalizePhoneForMessaging(params.customerPhone);

      if (!phone) {
        automation.sms = {
          status: 'skipped',
          messageId: null,
          provider: null,
          warnings: ['SMS follow-up requires an international-format phone number such as +61400000000.'],
        };
        automation.whatsapp = {
          status: 'skipped',
          messageId: null,
          provider: null,
          warnings: ['WhatsApp follow-up requires an international-format phone number such as +61400000000.'],
        };
      } else {
        try {
        const smsResponse = await apiV1.sendSmsMessage({
          to: phone,
          template_key: 'bookedai_booking_confirmation',
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            channel: 'sms',
          },
          actor_context: actorContext,
        });

        if ('data' in smsResponse) {
          automation.sms = {
            status: smsResponse.data.delivery_status,
            messageId: smsResponse.data.message_id ?? null,
            provider: smsResponse.data.provider ?? null,
            warnings: smsResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.sms = {
          status: 'error',
          messageId: null,
          provider: null,
          warnings: [error instanceof Error ? error.message : 'SMS automation failed.'],
        };
      }

        try {
        const whatsappResponse = await apiV1.sendWhatsAppMessage({
          to: phone,
          template_key: 'bookedai_booking_confirmation',
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            channel: 'whatsapp',
          },
          actor_context: actorContext,
        });

        if ('data' in whatsappResponse) {
          automation.whatsapp = {
            status: whatsappResponse.data.delivery_status,
            messageId: whatsappResponse.data.message_id ?? null,
            provider: whatsappResponse.data.provider ?? null,
            warnings: whatsappResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.whatsapp = {
          status: 'error',
          messageId: null,
          provider: null,
          warnings: [error instanceof Error ? error.message : 'WhatsApp automation failed.'],
        };
      }
      }
    }

    try {
      const handoffResponse = await apiV1.queueRevenueOpsHandoff({
        booking_reference: params.bookingReference,
        booking_intent_id: params.bookingIntentId,
        customer: {
          name: params.customerName.trim(),
          email: params.customerEmail,
          phone: params.customerPhone,
        },
        service: {
          service_id: params.selectedService.id,
          service_name: params.selectedService.name,
          category: params.selectedService.category,
          venue_name: params.selectedService.venue_name,
          location: params.selectedService.location,
          booking_path: params.bookingPath,
        },
        lifecycle: {
          requested_slot: slotLabel,
          payment_allowed_before_confirmation: params.paymentAllowedBeforeConfirmation,
          payment_link: params.paymentLink ?? null,
          portal_url: params.portalUrl ?? null,
          notes: params.notes,
        },
        actor_context: actorContext,
        context: {
          source_page: sourcePath,
          agent_handoff: 'search_conversation_to_revenue_operations',
        },
      });

      if ('data' in handoffResponse) {
        automation.revenueOps = {
          status: 'queued',
          actionCount: handoffResponse.data.queued_actions.length,
          actionTypes: handoffResponse.data.queued_actions.map((action: { action_type: string }) => action.action_type),
          warnings: [],
        };
      }
    } catch (error) {
      automation.revenueOps = {
        status: 'manual_review',
        actionCount: 0,
        actionTypes: [],
        warnings: [error instanceof Error ? error.message : 'We could not start the booking follow-up automatically. Our team will follow up shortly.'],
      };
    }

    return automation;
  }

  async function runSearch(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    trackHomepageSearchEvent('homepage_search_started', {
      query: trimmedQuery,
      query_length: trimmedQuery.length,
      attachment_count: attachedReferences.length,
      live_read_mode: isLiveReadMode,
    });
    const clarificationDecision = shouldHoldResultsForClarification(trimmedQuery);

    const attachmentContext =
      attachedReferences.length > 0
        ? ` Attached references: ${attachedReferences
            .map((item) =>
              item.extractedText
                ? `${item.kind}:${item.name} content:${item.extractedText}`
                : `${item.kind}:${item.name}`,
            )
            .join(', ')}.`
        : '';
    const effectiveQuery = `${trimmedQuery}${attachmentContext}`.trim();
    const priorAgentMessages = agentChatMessages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setAgentChatMessages((current) => [
      ...current,
      {
        id: createAgentChatMessageId('user'),
        role: 'user',
        content: trimmedQuery,
      },
    ]);
    setCurrentQuery(trimmedQuery);
    setSearchLoading(true);
    setSearchError('');
    setAssistantSummary('');
    setSearchWarnings([]);
    setGeoHint('');
    setLiveReadBookingSummary(null);
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(false);
    setComposerCollapsed(false);

    const fastPreviewResults = buildFastSearchPreviewResults(effectiveQuery, catalog);

    if (fastPreviewResults.length > 0 || catalog?.services.length) {
      const initialResults =
        fastPreviewResults.length > 0
          ? fastPreviewResults
          : prioritizeSearchResults(
              filterResultsByIntentTerms(
                catalog?.services ?? [],
                effectiveQuery,
              ),
              geoContext?.locality ?? null,
              effectiveQuery,
            ).slice(0, 3);

      if (initialResults.length > 0) {
        trackHomepageSearchEvent('homepage_top_research_visible', {
          query: trimmedQuery,
          result_count: initialResults.length,
          mode: fastPreviewResults.length > 0 ? 'fast_shortcut' : 'initial_catalog',
        });
        setResults(initialResults);
        setSelectedServiceId('');
        setAssistantSummary(
          fastPreviewResults.length > 0
            ? 'I am showing shortcut matches immediately while live ranking, event discovery, and booking-path checks continue.'
            : 'I am showing the first likely matches while live ranking, location, and booking-path checks continue.',
        );
        setAgentChatMessages((current) => [
          ...current,
          {
            id: createAgentChatMessageId('assistant'),
            role: 'assistant',
            content:
              fastPreviewResults.length > 0
                ? 'I found shortcut matches immediately for this search. I will keep checking live ranking and booking paths in the background.'
                : 'I am showing the first likely matches while live ranking continues. Add area, time, or a preference if you want me to tighten the search.',
            resultIds: initialResults.map((item) => item.id),
            suggestions: deriveIntentSuggestions(trimmedQuery).slice(0, 3),
          },
        ]);
      } else {
        setResults([]);
        setSelectedServiceId('');
      }
    } else {
      setResults([]);
      setSelectedServiceId('');
    }

    async function requestCustomerAgentTurn(nextGeoContext?: UserGeoContext | null) {
      try {
        const response = await apiV1.createCustomerAgentTurn({
          message: effectiveQuery,
          conversation_id: bookingAssistantV1SessionIdRef.current,
          messages: priorAgentMessages,
          location: nextGeoContext?.locality ?? geoContext?.locality ?? null,
          preferences: selectedServiceId ? { requested_service_id: selectedServiceId } : null,
          channel_context: {
            channel: homepageRuntimeConfig.channel ?? 'public_web',
            tenant_ref: homepageRuntimeConfig.tenantRef ?? null,
            deployment_mode: homepageRuntimeConfig.deploymentMode ?? 'standalone_app',
            widget_id: homepageRuntimeConfig.widgetId ?? 'bookedai-homepage-live-read',
          },
          attribution: {
            source: homepageRuntimeConfig.source ?? 'bookedai_homepage',
            medium: homepageRuntimeConfig.medium ?? 'bookedai_owned_website',
            campaign: homepageRuntimeConfig.campaign ?? 'bookedai_homepage_live_read',
            keyword: trimmedQuery,
            landing_path: sourcePath,
          },
          user_location: nextGeoContext
            ? { latitude: nextGeoContext.latitude, longitude: nextGeoContext.longitude }
            : geoContext
              ? { latitude: geoContext.latitude, longitude: geoContext.longitude }
              : null,
          context: {
            surface: homepageRuntimeConfig.surface ?? 'bookedai_homepage_search_shell',
            attached_reference_count: attachedReferences.length,
          },
        });

        return 'data' in response ? response.data : null;
      } catch {
        return null;
      }
    }

    if (clarificationDecision.hold) {
      setSearchLoading(false);
      setResults([]);
      setSelectedServiceId('');
      setSearchWarnings(['Clarification needed before ranking']);
      const clarificationSummary =
        clarificationDecision.needs.includes('location') && clarificationDecision.needs.includes('timing')
          ? 'Before I rank results, add your area and preferred timing. One short detail about the type of booking will make the shortlist much stronger.'
          : clarificationDecision.needs.includes('location')
            ? 'Before I rank results, add your area so I can narrow the shortlist.'
            : clarificationDecision.needs.includes('timing')
              ? 'Before I rank results, add your preferred timing so I can narrow the shortlist.'
              : 'Before I rank results, add one stronger detail about what you need.';
      setAssistantSummary(clarificationSummary);
      setAgentChatMessages((current) => [
        ...current,
        {
          id: createAgentChatMessageId('assistant'),
          role: 'assistant',
          content: clarificationSummary,
          suggestions: deriveChatSuggestionsFromFollowUps(
            trimmedQuery,
            deriveFollowUpQuestions(trimmedQuery, [], ['Clarification needed before ranking']),
          ),
        },
      ]);
      return;
    }

    try {
      let activeGeoContext = geoContext;
      let agentTurn = await requestCustomerAgentTurn(activeGeoContext);
      let liveRead = agentTurn?.search
        ? {
            candidateIds: agentTurn.search.candidates.map((candidate) => candidate.candidateId),
            rankedCandidates: agentTurn.search.candidates,
            recommendedCandidateIds: agentTurn.search.recommendations
              .map((recommendation) => recommendation.candidateId)
              .filter(Boolean),
            suggestedServiceId:
              agentTurn.search.recommendations[0]?.candidateId ??
              agentTurn.search.candidates[0]?.candidateId ??
              null,
            queryUnderstandingSummary: agentTurn.search.query_understanding,
            semanticAssistSummary: agentTurn.search.semantic_assist,
            warnings: agentTurn.search.warnings,
            trustSummary: null,
            bookingRequestSummary: agentTurn.search.booking_context?.summary ?? null,
            bookingPathSummary: null,
            usedLiveRead: true,
          }
        : await getPublicBookingAssistantLiveReadRecommendation({
            query: effectiveQuery,
            sourcePage: sourcePath,
            locationHint: activeGeoContext?.locality ?? null,
            serviceCategory: null,
            selectedServiceId: selectedServiceId || null,
            userLocation: activeGeoContext
              ? { latitude: activeGeoContext.latitude, longitude: activeGeoContext.longitude }
              : null,
            runtimeConfig: homepageRuntimeConfig,
          });
      if (
        liveRead.usedLiveRead &&
        !activeGeoContext &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery))
      ) {
        const requestedGeo = await requestGeoContext();
        if (requestedGeo) {
          activeGeoContext = requestedGeo;
          agentTurn = await requestCustomerAgentTurn(requestedGeo);
          liveRead = agentTurn?.search
            ? {
                candidateIds: agentTurn.search.candidates.map((candidate) => candidate.candidateId),
                rankedCandidates: agentTurn.search.candidates,
                recommendedCandidateIds: agentTurn.search.recommendations
                  .map((recommendation) => recommendation.candidateId)
                  .filter(Boolean),
                suggestedServiceId:
                  agentTurn.search.recommendations[0]?.candidateId ??
                  agentTurn.search.candidates[0]?.candidateId ??
                  null,
                queryUnderstandingSummary: agentTurn.search.query_understanding,
                semanticAssistSummary: agentTurn.search.semantic_assist,
                warnings: agentTurn.search.warnings,
                trustSummary: null,
                bookingRequestSummary: agentTurn.search.booking_context?.summary ?? null,
                bookingPathSummary: null,
                usedLiveRead: true,
              }
            : await getPublicBookingAssistantLiveReadRecommendation({
                query: effectiveQuery,
                sourcePage: sourcePath,
                locationHint: requestedGeo.locality ?? null,
                serviceCategory: null,
                selectedServiceId: selectedServiceId || null,
                userLocation: {
                  latitude: requestedGeo.latitude,
                  longitude: requestedGeo.longitude,
                },
                runtimeConfig: homepageRuntimeConfig,
              });
        } else {
          setGeoHint(content.ui.geoHint);
        }
      }

      let legacyPayload: BookingAssistantChatResponse | null = null;
      if (!liveRead.usedLiveRead) {
        legacyPayload = await requestLegacySearch(effectiveQuery, activeGeoContext);
        if (legacyPayload.should_request_location && !activeGeoContext) {
          const requestedGeo = await requestGeoContext();
          if (requestedGeo) {
            legacyPayload = await requestLegacySearch(effectiveQuery, requestedGeo);
          } else {
            setGeoHint(content.ui.geoHint);
          }
        }
      }

      const isLiveReadAuthoritative = liveRead.usedLiveRead;
      const hasLiveReadSearchGrounding =
        isLiveReadAuthoritative &&
        (liveRead.rankedCandidates.length > 0 ||
          liveRead.candidateIds.length > 0 ||
          Boolean(liveRead.semanticAssistSummary) ||
          liveRead.warnings.length > 0);
      const mergedResults = isLiveReadAuthoritative
        ? uniqueCandidateServices(liveRead.rankedCandidates, [], catalog)
        : uniqueCandidateServices([], legacyPayload?.matched_services ?? [], catalog);
      const shouldHoldResultsForLocation =
        !activeGeoContext &&
        hasLiveReadSearchGrounding &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery));
      const recommendationOrderedResults = shouldHoldResultsForLocation
        ? []
        : orderResultsByRecommendationIds(
            mergedResults,
            liveRead.recommendedCandidateIds,
          );
      const priorityIntentTerms =
        liveRead.queryUnderstandingSummary?.coreIntentTerms?.length
          ? liveRead.queryUnderstandingSummary.coreIntentTerms
          : liveRead.queryUnderstandingSummary?.expandedIntentTerms ?? [];
      const intentFilteredResults = shouldHoldResultsForLocation
        ? []
        : filterResultsByIntentTerms(
            recommendationOrderedResults,
            effectiveQuery,
            priorityIntentTerms,
          );
      const rankedResults =
        liveRead.recommendedCandidateIds.length > 0
          ? intentFilteredResults
          : prioritizeSearchResults(
              intentFilteredResults,
              activeGeoContext?.locality ?? null,
              effectiveQuery,
              priorityIntentTerms,
            );
      const prioritizedResults =
        rankedResults.length > 0 || !fastPreviewResults.length || shouldHoldResultsForLocation
          ? rankedResults
          : fastPreviewResults;

      const nextSuggestedId =
        prioritizedResults[0]?.id ??
        (hasLiveReadSearchGrounding
          ? liveRead.suggestedServiceId ?? ''
          : legacyPayload?.suggested_service_id ?? '');
      const nextAssistantSummary =
        agentTurn?.reply ||
        (hasLiveReadSearchGrounding
          ? buildLiveReadResultsSummary({
              rankedCount: prioritizedResults.length,
              warnings: liveRead.warnings,
              normalizedQuery:
                liveRead.queryUnderstandingSummary?.normalizedQuery ??
                liveRead.semanticAssistSummary?.normalizedQuery ??
                trimmedQuery.toLowerCase(),
              inferredLocation:
                liveRead.queryUnderstandingSummary?.inferredLocation ??
                liveRead.semanticAssistSummary?.inferredLocation ??
                null,
              inferredCategory: liveRead.semanticAssistSummary?.inferredCategory ?? null,
            })
          : legacyPayload?.reply ?? content.ui.noMatchBody);

      const nextIntentSuggestions = agentTurn?.suggestions?.length
        ? agentTurn.suggestions.slice(0, 3)
        : deriveChatSuggestionsFromFollowUps(
            trimmedQuery,
            deriveFollowUpQuestions(trimmedQuery, prioritizedResults, [
              ...liveRead.warnings,
              ...(liveRead.bookingPathSummary?.warnings ?? []),
              ...(liveRead.trustSummary?.warnings ?? []),
            ]),
          ).concat(deriveIntentSuggestions(trimmedQuery)).slice(0, 4);
      setResults(prioritizedResults);
      setSelectedServiceId((current) =>
        current && prioritizedResults.some((service) => service.id === current) ? current : '',
      );
      const agentSummary =
        prioritizedResults.length > 0 && (activeGeoContext?.locality || prioritizedResults.some((item) => isOnlineFriendlyService(item, trimmedQuery)))
          ? `${nextAssistantSummary} Prioritising nearby services and online-ready options first.`
          : nextAssistantSummary;
      setAssistantSummary(agentSummary);
      setAgentChatMessages((current) => [
        ...current,
        {
          id: createAgentChatMessageId('assistant'),
          role: 'assistant',
          content: agentSummary,
          resultIds: prioritizedResults.slice(0, 3).map((item) => item.id),
          suggestions: nextIntentSuggestions,
        },
      ]);
      if (prioritizedResults.length > 0) {
        trackHomepageSearchEvent('homepage_top_research_visible', {
          query: trimmedQuery,
          result_count: prioritizedResults.slice(0, 3).length,
          total_result_count: prioritizedResults.length,
          mode: rankedResults.length > 0 ? (isLiveReadAuthoritative ? 'live_read' : 'legacy') : 'fast_shortcut_final',
        });
      }
      setSearchWarnings([
        ...liveRead.warnings,
        ...(liveRead.bookingPathSummary?.warnings ?? []),
        ...(liveRead.trustSummary?.warnings ?? []),
        ...(rankedResults.length === 0 && fastPreviewResults.length > 0
          ? ['Showing fast BookedAI shortcut results while deeper ranking catches up.']
          : []),
      ]);
      setLiveReadBookingSummary(
        liveRead.usedLiveRead
          ? {
              serviceId: nextSuggestedId || liveRead.suggestedServiceId,
              nextStep: liveRead.bookingPathSummary?.nextStep ?? null,
              paymentAllowedBeforeConfirmation: Boolean(
                liveRead.bookingPathSummary?.paymentAllowedBeforeConfirmation,
              ),
              bookingPath: liveRead.bookingPathSummary?.pathType ?? null,
            }
          : null,
      );
      if (
        !activeGeoContext &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery))
      ) {
        setGeoHint(content.ui.geoHint);
      }
      if (!prioritizedResults.length && !hasLiveReadSearchGrounding) {
        setAssistantSummary(content.ui.noMatchBody);
      }
      if (prioritizedResults.length > 0 || hasLiveReadSearchGrounding) {
        setComposerCollapsed(true);
      }
    } catch (error) {
      trackHomepageSearchEvent('homepage_search_failed', {
        query: trimmedQuery,
        message: error instanceof Error ? error.message : 'Unable to search services right now.',
      });
      setSearchError(error instanceof Error ? error.message : 'Unable to search services right now.');
      setResults([]);
      setSelectedServiceId('');
      setLiveReadBookingSummary(null);
      setComposerCollapsed(false);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (!catalog) {
      return;
    }
    if (!initialQuery?.trim()) {
      return;
    }
    if (initialQueryRequestId <= 0 || lastHandledRequestId === initialQueryRequestId) {
      return;
    }

    setLastHandledRequestId(initialQueryRequestId);
    void runSearch(initialQuery.trim());
  }, [catalog, initialQuery, initialQueryRequestId, lastHandledRequestId]);

  useEffect(() => {
    const anonymousSessionId =
      bookingAssistantV1SessionIdRef.current ?? createPublicBookingAssistantSessionId();
    bookingAssistantV1SessionIdRef.current = anonymousSessionId;

    void primePublicBookingAssistantSession({
      sourcePage: sourcePath,
      anonymousSessionId,
    });
  }, [sourcePath]);

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(searchQuery);
  }

  function handleAttachmentPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    void (async () => {
      const mapped = await Promise.all(
        files.map(async (file) => {
          const lowerName = file.name.toLowerCase();
          const shouldExtractText =
            file.type.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.pdf') || file.type === 'application/pdf';

          let extractedText: string | null = null;
          if (shouldExtractText) {
            try {
              const rawText = file.type === 'application/pdf' || lowerName.endsWith('.pdf')
                ? await extractLightweightPdfText(file)
                : await file.text();
              const normalized = (rawText ?? '').replace(/\s+/g, ' ').trim();
              extractedText = normalized ? normalized.slice(0, 800) : null;
            } catch {
              extractedText = null;
            }
          }

          return {
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name,
            kind: file.type.startsWith('image/') ? ('image' as const) : ('file' as const),
            extractedText,
          };
        }),
      );

      setAttachedReferences((current) => {
        const next = [...current];
        mapped.forEach((item) => {
          if (!next.some((existing) => existing.id === item.id)) {
            next.push(item);
          }
        });
        return next;
      });
      trackHomepageSearchEvent('homepage_attachment_added', {
        attachment_count: mapped.length,
        attachment_kinds: mapped.map((item) => item.kind),
      });

      setComposerCollapsed(false);
    })();

    event.target.value = '';
  }

  function removeAttachedReference(id: string) {
    setAttachedReferences((current) => current.filter((item) => item.id !== id));
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) {
      setSubmitError('Select a result before continuing.');
      return;
    }

    const validationError = validateBookingForm({
      customerName,
      customerEmail,
      customerPhone,
      preferredSlot,
    });
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const slot = parsePreferredSlot(preferredSlot);
    if (!slot) {
      setSubmitError('Choose a valid preferred time.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');
    setResult(null);
    const normalizedCustomerEmail = customerEmail.trim() ? customerEmail.trim().toLowerCase() : null;
    const normalizedCustomerPhone = customerPhone.trim() || null;
    const normalizedNotes = notes.trim() || null;
    trackHomepageSearchEvent('homepage_booking_submitted', {
      service_id: selectedService.id,
      service_name: selectedService.name,
      booking_path: liveReadBookingSummary?.bookingPath ?? selectedService.booking_path_type ?? null,
      has_email: Boolean(normalizedCustomerEmail),
      has_phone: Boolean(normalizedCustomerPhone),
    });

    try {
      const finalizeAuthoritativeBookingIntent = async () => {
        const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
          sourcePage: sourcePath,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceCategory: selectedService.category,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          notes: normalizedNotes,
          requestedDate: slot.requestedDate,
          requestedTime: slot.requestedTime,
          timezone: 'Australia/Sydney',
          runtimeConfig: homepageRuntimeConfig,
        });

        const bookingResult = buildAuthoritativeBookingIntentResult({
          authoritativeResult,
          selectedService,
          requestedDate: slot.requestedDate,
          requestedTime: slot.requestedTime,
          customerEmail: normalizedCustomerEmail ?? '',
          nextStep:
            liveReadBookingSummary?.serviceId === selectedService.id
              ? liveReadBookingSummary.nextStep
              : selectedService.next_step ?? null,
        });

        setResult({
          ...bookingResult,
          crm_sync: bookingResult.crm_sync ?? authoritativeResult.crmSync ?? null,
        });
        setComposerCollapsed(true);
        void runPostBookingAutomation({
          bookingIntentId: authoritativeResult.bookingIntentId,
          bookingReference: bookingResult.booking_reference,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          selectedService,
          requestedDate: slot.requestedDate,
          requestedTime: slot.requestedTime,
          notes: normalizedNotes,
          paymentAllowedBeforeConfirmation:
            Boolean(
              (liveReadBookingSummary?.serviceId === selectedService.id &&
                liveReadBookingSummary.paymentAllowedBeforeConfirmation) ||
                authoritativeResult.trust.payment_allowed_now,
            ),
          bookingPath:
            liveReadBookingSummary?.serviceId === selectedService.id
              ? liveReadBookingSummary.bookingPath
              : authoritativeResult.trust.recommended_booking_path ?? bookingResult.workflow_status,
          paymentLink: bookingResult.payment_url,
          portalUrl: getBookingPortalUrl(bookingResult),
        })
          .then((automation) => {
            setResult((currentResult) => {
              if (!currentResult || currentResult.booking_reference !== bookingResult.booking_reference) {
                return currentResult;
              }

              return {
                ...currentResult,
                automation,
              };
            });
          })
          .catch(() => {
            // Best-effort orchestration should never block the captured booking state.
          });
      };

      if (isLiveReadMode) {
        await finalizeAuthoritativeBookingIntent();
        return;
      }

      void shadowPublicBookingAssistantLeadAndBookingIntent({
        sourcePage: sourcePath,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        customerName,
        customerEmail: normalizedCustomerEmail,
        customerPhone: normalizedCustomerPhone,
        notes: normalizedNotes,
        requestedDate: slot.requestedDate,
        requestedTime: slot.requestedTime,
        timezone: 'Australia/Sydney',
      });

      const response = await fetch(`${getApiBaseUrl()}/booking-assistant/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName.trim(),
          customer_email: normalizedCustomerEmail,
          customer_phone: normalizedCustomerPhone,
          requested_date: slot.requestedDate,
          requested_time: slot.requestedTime,
          timezone: 'Australia/Sydney',
          notes: normalizedNotes,
        }),
      });

      const rawResponseText = await response.text();
      let payload: (BookingAssistantSessionResponse & { detail?: string }) | null = null;
      if (rawResponseText) {
        try {
          payload = JSON.parse(rawResponseText) as BookingAssistantSessionResponse & { detail?: string };
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        const errorMessage = resolveApiErrorMessage(
          payload ?? rawResponseText,
          'Unable to create booking request.',
        );
        if (errorMessage === 'Selected service was not found') {
          throw new Error('This shortlist match should continue through the live booking flow, not the legacy catalog booking session.');
        }
        throw new Error(errorMessage);
      }

      if (!payload) {
        throw new Error('Booking request returned an empty response.');
      }

      setResult(payload);
      setComposerCollapsed(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create booking request.');
    } finally {
      setSubmitLoading(false);
    }
  }

  const uniqueWarnings = Array.from(new Set(searchWarnings));
  const resultCountLabel =
    results.length === 1 ? '1 ranked option' : `${results.length} ranked options`;
  const hasActiveQuery = Boolean(currentQuery.trim());
  const hasAssistantChatReply = agentChatMessages.some((message) => message.role === 'assistant');
  const hasChatInlineResults = agentChatMessages.some(
    (message) => message.role === 'assistant' && (message.resultIds?.length ?? 0) > 0,
  );
  const bookingOutcomeSteps = result ? buildBookingOutcomeSteps(result) : [];
  const enterpriseJourneySteps = useMemo(
    () =>
      buildEnterpriseJourneySteps({
        result,
        selectedService,
        customerEmail,
        customerPhone,
      }),
    [customerEmail, customerPhone, result, selectedService],
  );
  const operationTimeline = useMemo(
    () => (result ? buildOperationTimeline(result) : []),
    [result],
  );
  const communicationPreviewCards = useMemo(
    () =>
      result
        ? buildCommunicationPreviewCards({
            result,
            customerName,
            customerEmail,
            customerPhone,
          })
        : [],
    [customerEmail, customerName, customerPhone, result],
  );
  const workspaceSummary =
    (hasActiveQuery ? assistantSummary : '') || content.ui.shortlistBody || content.ui.resultsEmptyBody;
  const selectedServiceMeta = selectedService
    ? [selectedService.category, selectedService.location].filter(Boolean).join(' • ')
    : content.ui.bookingPanelHelper;
  const selectedServiceFlowNote = selectedService
    ? selectedService.why_this_matches ||
      selectedService.next_step ||
      selectedService.summary ||
      'This is the active match carried forward into booking.'
    : 'Choose a ranked result to continue.';
  const shortcutToneClasses = [
    'public-apple-shortcut-blue hover:bg-[#eef4ff]',
    'public-apple-shortcut-green hover:bg-[#eef9ee]',
    'public-apple-shortcut-amber hover:bg-[#fff3e6]',
    'public-apple-shortcut-purple hover:bg-[#f6f0ff]',
    'public-apple-shortcut-rose hover:bg-[#fff0f4]',
  ];
  const workspaceStatus = searchLoading
    ? {
        label: SEARCH_PROGRESS_STAGES[searchProgressStageIndex]?.label ?? 'Receiving your enquiry',
        detail: currentQuery
          ? `Searching live signals for "${currentQuery}". ${SEARCH_PROGRESS_STAGES[searchProgressStageIndex]?.detail ?? 'Preparing the best-fit shortlist.'}`
          : SEARCH_PROGRESS_STAGES[searchProgressStageIndex]?.detail ?? 'Receiving the request and preparing live search.',
        tone: 'public-apple-toolbar-pill--accent',
      }
    : searchError
      ? {
          label: 'Search needs attention',
          detail: searchError,
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        }
      : result
        ? {
            label: 'Booking path ready',
            detail: `Booking ${result.booking_reference} is ready with next steps and portal access.`,
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          }
        : hasActiveQuery
          ? {
              label: 'Shortlist ready',
              detail:
                results.length > 0
                  ? `${results.length} ranked option${results.length === 1 ? '' : 's'} ready above. Review, then continue.`
                  : "Let's refine — tell me suburb, preferred time, or service detail to find the best fit.",
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            }
          : {
              label: 'Ready to receive',
              detail: 'Type a natural-language request below. Results appear here.',
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            };
  const activeSearchPrompt = SEARCH_PROGRESS_PROMPTS[searchProgressStageIndex] ?? SEARCH_PROGRESS_PROMPTS[0];
  const followUpQuestions = useMemo(
    () => deriveFollowUpQuestions(currentQuery || searchQuery, results, uniqueWarnings),
    [currentQuery, searchQuery, results, uniqueWarnings],
  );
  const noResultSuggestions = useMemo(
    () => deriveNoResultSuggestions(currentQuery || searchQuery, uniqueWarnings),
    [currentQuery, searchQuery, uniqueWarnings],
  );
  const intentSuggestions = useMemo(
    () => deriveIntentSuggestions(currentQuery || searchQuery),
    [currentQuery, searchQuery],
  );
  const noResultReason = useMemo(
    () => deriveNoResultReason(currentQuery || searchQuery, uniqueWarnings),
    [currentQuery, searchQuery, uniqueWarnings],
  );
  const bookingFlowSteps = buildBookingFlowSteps({
    currentQuery,
    selectedService,
    result,
    submitLoading,
  });
  const customerFlowSteps = [
    {
      label: 'Ask',
      detail: currentQuery ? 'Request received' : 'Tell me what you need',
      state: currentQuery || result ? 'complete' : 'active',
    },
    {
      label: 'Match',
      detail: results.length > 0 ? `${results.length} option${results.length === 1 ? '' : 's'} ready` : 'Rank the best fit',
      state: result || selectedService ? 'complete' : results.length > 0 || searchLoading ? 'active' : 'pending',
    },
    {
      label: 'Book',
      detail: selectedService ? 'Booking brief ready' : 'Choose one match',
      state: result ? 'complete' : selectedService ? 'active' : 'pending',
    },
    {
      label: 'Confirm',
      detail: result ? result.booking_reference : 'Portal and follow-up',
      state: result ? 'active' : 'pending',
    },
  ] as const;
  const previewGoogleMapsUrl = previewService
    ? buildGoogleMapsSearchUrl({
        mapUrl: previewService.map_url,
        venueName: previewService.venue_name,
        location: previewService.location,
        serviceName: previewService.name,
      })
    : null;

  function focusBookingNameField() {
    window.setTimeout(() => {
      bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      customerNameInputRef.current?.focus();
      customerNameInputRef.current?.select();
    }, 120);
  }

  function commitServiceSelection(service: ServiceCatalogItem, options?: { openBooking?: boolean; focusNameField?: boolean }) {
    trackHomepageSearchEvent('homepage_result_selected', {
      service_id: service.id,
      service_name: service.name,
      open_booking: Boolean(options?.openBooking),
      booking_path: liveReadBookingSummary?.bookingPath ?? service.booking_path_type ?? null,
    });
    if (options?.openBooking) {
      trackHomepageSearchEvent('homepage_booking_started', {
        service_id: service.id,
        service_name: service.name,
        booking_path: liveReadBookingSummary?.bookingPath ?? service.booking_path_type ?? null,
      });
    }
    setSelectedServiceId(service.id);
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(Boolean(options?.openBooking));
    if (options?.focusNameField) {
      focusBookingNameField();
      return;
    }
  }

  function handleServiceSelect(service: ServiceCatalogItem) {
    commitServiceSelection(service);
  }

  function openServicePreview(service: ServiceCatalogItem) {
    trackHomepageSearchEvent('homepage_result_details_opened', {
      service_id: service.id,
      service_name: service.name,
    });
    setPreviewService(service);
  }

  function handlePreviewBook() {
    if (!previewService) {
      return;
    }

    commitServiceSelection(previewService, { openBooking: true, focusNameField: true });
    setPreviewService(null);
  }

  function handleVoiceSearch() {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionCtor =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    if (!SpeechRecognitionCtor) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (voiceListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';
    recognitionBaseQueryRef.current = searchQuery.trim();
    setVoiceError('');
    setVoiceListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((resultItem) => resultItem[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      const nextQuery = [recognitionBaseQueryRef.current, transcript].filter(Boolean).join(' ').trim();
      setSearchQuery(nextQuery);
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Please allow microphone permission and try again.'
          : 'Voice input could not start. Please try again.',
      );
    };

    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div
      id="bookedai-search-assistant"
      ref={bookingPanelRef}
      className="mx-auto max-w-[1440px]"
    >
      <style>
        {`
          @keyframes homepage-result-entry {
            0% {
              opacity: 0;
              transform: translateY(12px) scale(0.985);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            [data-homepage-result-entry="true"] {
              animation: none !important;
            }
          }
        `}
      </style>
      <div className="public-search-results-shell grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[#e5e7eb] bg-[#f8fafc] shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <div className="overflow-hidden rounded-[1.55rem] border border-[#e5e7eb] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
              <div className="border-b border-[#eef2f7] bg-[#fbfdff] px-3 py-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
                      <SparkIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Message BookedAI</div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">Search, compare, open details, then book in one thread.</div>
                    </div>
                  </div>
                  <div className={`max-w-full rounded-full border px-3 py-1.5 text-[11px] font-semibold ${workspaceStatus.tone}`}>
                    {workspaceStatus.label}
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#64748b]">{workspaceStatus.detail}</p>
              </div>
              <div className="max-h-[min(68vh,50rem)] space-y-4 overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">

            <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {customerFlowSteps.map((step, index) => {
                const tone =
                  step.state === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : step.state === 'active'
                      ? 'border-[#cfe1ff] bg-[#eef4ff] text-[#1a73e8]'
                      : 'border-[#e5e7eb] bg-white text-[#64748b]';
                const dot =
                  step.state === 'complete'
                    ? 'bg-emerald-500'
                    : step.state === 'active'
                      ? 'bg-[#1a73e8]'
                      : 'bg-slate-300';
                return (
                  <div key={step.label} className={`rounded-[1.1rem] border px-3 py-3 ${tone}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                        0{index + 1} {step.label}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-5">{step.detail}</div>
                  </div>
                );
              })}
            </div>

            {!hasActiveQuery ? (
              <div className="mb-5 rounded-[1.35rem] border border-[#eeeeef] bg-[#fafafa] px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                    <SparkIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Assistant-led search</div>
                    <div className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-[#111827]">
                      Start with what you need. I will ask for the missing signals before I rank results.
                    </div>
                    <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[#5f6368]">
                      This homepage is designed to turn messy service demand into a clear next step. Search starts like a conversation, then the booking path tightens as soon as area, timing, and fit are clear enough.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {[
                        'What service do you want?',
                        'Which area works best?',
                        'When do you need it?',
                      ].map((item) => (
                        <div key={item} className="rounded-[1rem] border border-[#eeeeef] bg-white px-3 py-3 text-sm font-medium text-[#334155]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentQuery ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#d2e3fc] bg-[#eef4ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                  {content.ui.resultsQueryLabel}: "{currentQuery}"
                </span>
                <span className="rounded-full border border-[#e5e9f0] bg-[#f8fafc] px-3 py-1 text-[10px] font-medium text-[#5f6368]">
                  {resultCountLabel}
                </span>
              </div>
            ) : null}

            {agentChatMessages.length > 0 ? (
              <div className="mb-5 space-y-3">
                {agentChatMessages.slice(-6).map((message) => {
                  const inlineResults = (message.resultIds ?? [])
                    .map((resultId) => resultById.get(resultId))
                    .filter((item): item is ServiceCatalogItem => Boolean(item));
                  const hasInlineResults = inlineResults.length > 0;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`${hasInlineResults ? 'max-w-[min(56rem,94%)]' : 'max-w-[min(44rem,92%)]'} rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-[0_8px_24px_rgba(60,64,67,0.05)] ${
                          message.role === 'user'
                            ? 'rounded-tr-[0.45rem] bg-[#111827] text-white'
                            : 'rounded-tl-[0.45rem] border border-[#dbe7fb] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] text-[#2f3d4f]'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8] ring-1 ring-[#dbe7fb]">
                              BookedAI answer
                            </span>
                            {hasInlineResults ? (
                              <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-100">
                                Live search result
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <div>{message.content}</div>
                        {inlineResults.length > 0 ? (
                          <div className="mt-3 grid gap-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[0.95rem] border border-[#e6edf8] bg-white/78 px-3 py-2">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">Top research</div>
                                <div className="mt-0.5 text-[11px] leading-5 text-[#64748b]">
                                  Review the best {inlineResults.length} option{inlineResults.length === 1 ? '' : 's'} in chat, then open details or book.
                                </div>
                              </div>
                              <span className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold text-[#475569] ring-1 ring-[#e5e7eb]">
                                {inlineResults.length} shown
                              </span>
                            </div>
                            {inlineResults.map((service) => {
                              const resultIndex = Math.max(0, results.findIndex((item) => item.id === service.id));
                              const confidencePresentation = getResultConfidencePresentation(service);
                              const resultFacts = buildSearchResultFacts(service, confidencePresentation.label);
                              const isBookedAiTenantMatch = isBookedAiChessTenantService(service);
                              const googleMapsUrl = buildGoogleMapsSearchUrl({
                                mapUrl: service.map_url,
                                venueName: service.venue_name,
                                location: service.location,
                                serviceName: service.name,
                              });
                              const providerUrl = service.source_url || service.booking_url || null;
                              const phoneHref = service.contact_phone
                                ? `tel:${service.contact_phone.replace(/[^\d+]/g, '')}`
                                : null;
                              const mailHref = `mailto:${catalog?.business_email ?? 'info@bookedai.au'}?subject=${encodeURIComponent(`Booking enquiry: ${service.name}`)}`;
                              const bookingNote =
                                service.why_this_matches ||
                                service.next_step ||
                                service.summary ||
                                'Ready to carry into booking once you confirm the fit.';
                              return (
                              <article
                                key={`${message.id}-${service.id}`}
                                className="rounded-[1rem] border border-[#e6edf8] bg-white px-3 py-3 text-left shadow-[0_8px_22px_rgba(60,64,67,0.04)]"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#64748b] ring-1 ring-[#e5e7eb]">
                                    Option {resultIndex + 1}
                                  </span>
                                  {service.featured ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                      Top match
                                    </span>
                                  ) : null}
                                  {isBookedAiTenantMatch ? (
                                    <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-800 ring-1 ring-emerald-200">
                                      BookedAI tenant
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#1a73e8]">
                                    {service.category}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => commitServiceSelection(service)}
                                      className="block max-w-full text-left text-sm font-semibold leading-5 text-[#111827] transition hover:text-[#1a73e8]"
                                    >
                                      <span className="line-clamp-2">{service.name}</span>
                                    </button>
                                    <div className="mt-1 line-clamp-1 text-[11px] font-medium leading-5 text-[#64748b]">
                                      {[service.venue_name, service.location || service.source_label].filter(Boolean).join(' • ') || 'BookedAI matched option'}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {resultFacts.map((item) => (
                                    <span
                                      key={`${message.id}-${service.id}-${item}`}
                                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                        item === confidencePresentation.label
                                          ? confidencePresentation.tone === 'tenant'
                                            ? 'bg-emerald-50 text-emerald-800'
                                            : 'bg-amber-50 text-amber-800'
                                          : 'bg-[#f8fafc] text-[#475569] ring-1 ring-[#e5e7eb]'
                                      }`}
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#475569]">
                                  {bookingNote}
                                </p>
                                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-[#edf1f7] pt-3">
                                  <button
                                    type="button"
                                    onClick={() => openServicePreview(service)}
                                    aria-label={`View details for ${service.name}`}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                  >
                                    <InfoIcon className="h-3.5 w-3.5" />
                                    Details
                                  </button>
                                  {googleMapsUrl ? (
                                    <a
                                      href={googleMapsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`Open Google Maps location for ${service.name}`}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                    >
                                      <MapPinIcon className="h-3.5 w-3.5" />
                                      Maps
                                    </a>
                                  ) : null}
                                  {providerUrl ? (
                                    <a
                                      href={providerUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label={`Open provider website for ${service.name}`}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                    >
                                      <LinkIcon className="h-3.5 w-3.5" />
                                      Provider
                                    </a>
                                  ) : null}
                                  {phoneHref ? (
                                    <a
                                      href={phoneHref}
                                      aria-label={`Call ${service.name}`}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                    >
                                      <PhoneIcon className="h-3.5 w-3.5" />
                                      Call
                                    </a>
                                  ) : null}
                                  <a
                                    href={mailHref}
                                    aria-label={`Email BookedAI about ${service.name}`}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                  >
                                    <MailIcon className="h-3.5 w-3.5" />
                                    Mail
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => commitServiceSelection(service)}
                                    aria-label={`Select ${service.name}`}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dedee3] bg-white px-2.5 text-[10px] font-semibold text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff]"
                                  >
                                    <CheckIcon className="h-3.5 w-3.5" />
                                    Select
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => commitServiceSelection(service, { openBooking: true, focusNameField: true })}
                                    aria-label={`Book ${service.name}`}
                                    className="inline-flex h-8 min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border border-[#111827] bg-[#111827] px-3 text-[10px] font-semibold text-white transition hover:bg-[#1f2937]"
                                  >
                                    <SparkIcon className="h-3.5 w-3.5" />
                                    Book
                                  </button>
                                </div>
                              </article>
                              );
                            })}
                          </div>
                        ) : null}
                        {message.suggestions?.length ? (
                          <div className="mt-3 rounded-[1rem] border border-[#e6edf8] bg-white/70 px-3 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                              Suggested chat refinements
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.suggestions.map((item) => (
                                <button
                                  key={`${message.id}-${item.query}`}
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery(item.query);
                                    void runSearch(item.query);
                                  }}
                                  className="rounded-full border border-[#dbe7fb] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1a73e8] transition hover:bg-[#f8fbff]"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {uniqueWarnings.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {uniqueWarnings.map((warning) => (
                  <span
                    key={warning}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700"
                  >
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}

            {geoHint ? (
              <div className="mb-3 rounded-[1rem] border border-[#dbe7fb] bg-[#f8fbff] px-3.5 py-3 text-sm leading-6 text-[#31507b]">
                {geoHint}
              </div>
            ) : null}

            {hasActiveQuery && assistantSummary && !hasAssistantChatReply ? (
              <div className="mb-5 flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f3d7a] text-white shadow-[0_10px_24px_rgba(15,61,122,0.18)]">
                  <SparkIcon className="h-4 w-4" />
                </div>
                <div className="max-w-[48rem] rounded-[1.35rem] rounded-tl-[0.45rem] border border-[#dbe7fb] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3 text-sm leading-6 text-[#2f3d4f] shadow-[0_8px_24px_rgba(7,27,64,0.04)]">
                  {assistantSummary}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {searchLoading ? (
                <div className="rounded-[1.5rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-5 py-5 lg:px-6 lg:py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    <span className="relative inline-flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1a73e8]/45" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#1a73e8]" />
                    </span>
                    {content.ui.resultsLoadingTitle}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                    {currentQuery
                      ? results.length > 0
                        ? `I found ${results.length} early match${results.length === 1 ? '' : 'es'} for "${currentQuery}" and I am still checking maps, booking paths, and fit.`
                        : `Searching for "${currentQuery}". I will show useful matches as soon as they are found, then keep refining in the background.`
                      : content.ui.resultsLoadingBody}
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-white shadow-[0_10px_24px_rgba(26,115,232,0.16)]">
                        <SparkIcon className="h-4 w-4" />
                      </div>
                      <div className="max-w-[44rem] rounded-[1.2rem] rounded-tl-[0.45rem] border border-[#dbe7fb] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(60,64,67,0.05)]">
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          I am searching now. If you add area, timing, budget, age, or preference in chat, I can tighten the results while they appear.
                        </p>
                      </div>
                    </div>
                    <div className="ml-11 space-y-2">
                      {followUpQuestions.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery((current) => `${current.trim()} ${item.suggestion}`.trim());
                            setComposerCollapsed(false);
                          }}
                          className="flex w-full items-start justify-between gap-3 rounded-[1.1rem] border border-[#e6edf8] bg-[#fbfdff] px-3 py-3 text-left transition hover:border-[#cfe1ff] hover:bg-[#f8fbff]"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-950">{item.question}</div>
                            <div className="mt-1 text-[11px] leading-5 text-slate-600">{item.suggestion}</div>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-semibold text-[#1a73e8]">
                            Add
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-20 rounded-[1rem] bg-[linear-gradient(180deg,#edf4ff_0%,#ffffff_100%)] ring-1 ring-[#dbe7fb]" />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Checking fit', 'Ranking options', 'Preparing next step'].map((label) => (
                      <div key={label} className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-medium text-[#0f3d7a]">
                        {label}
                      </div>
                    ))}
                  </div>
                  {(showDelayedSearchNudge || intentSuggestions.length > 0) ? (
                    <div className="mt-4 rounded-[1.1rem] border border-[#e6edf8] bg-[#fbfdff] px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">Try nearby searches</div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-600">{activeSearchPrompt}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {intentSuggestions.slice(0, 4).map((item) => (
                          <button
                            key={item.query}
                            type="button"
                            onClick={() => {
                              setSearchQuery(item.query);
                              void runSearch(item.query);
                            }}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-[#cfe1ff] hover:bg-[#f8fbff] hover:text-slate-950"
                          >
                            {item.label}: {item.query}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {searchError ? (
                <div className="rounded-[1.35rem] border border-[#f2b8b5] bg-[#fce8e6] px-4 py-4 text-sm leading-6 text-[#b3261e]">
                  {searchError}
                </div>
              ) : null}

              {!searchError && (!searchLoading || results.length > 0) && !hasChatInlineResults ? (
                <PartnerMatchShortlist
                  items={results}
                  batchSize={3}
                  className="space-y-4"
                  listClassName="space-y-3"
                  buttonClassName="public-apple-workspace-panel-soft rounded-[1.15rem] px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white"
                  resetKey={`${currentQuery}-${results.length}`}
                  buttonLabel="See more results"
                  emptyState={
                    <div className="public-apple-empty-state rounded-[1.2rem] px-4 py-12 text-center sm:px-8 lg:py-16">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                        {currentQuery ? content.ui.noMatchTitle : content.ui.resultsEmptyTitle}
                      </div>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#172033]/58">
                        {currentQuery ? content.ui.noMatchBody : content.ui.resultsEmptyBody}
                      </p>
                      {currentQuery ? (
                        <div className="mx-auto mt-4 max-w-3xl rounded-[1.1rem] border border-[#dfe8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 text-left">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">Why this is still broad</div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{noResultReason}</p>
                          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">Better next searches</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {noResultSuggestions.map((item) => (
                              <button
                                key={item.title + item.query}
                                type="button"
                                onClick={() => {
                                  setSearchQuery(item.query);
                                  void runSearch(item.query);
                                }}
                                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-[#cfe1ff] hover:bg-[#f8fbff] hover:text-slate-950"
                              >
                                {item.title}: {item.query}
                              </button>
                            ))}
                          </div>
                          {intentSuggestions.length > 0 ? (
                            <>
                              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">Nearby intent</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {intentSuggestions.slice(0, 4).map((item) => (
                                  <button
                                    key={item.query}
                                    type="button"
                                    onClick={() => {
                                      setSearchQuery(item.query);
                                      void runSearch(item.query);
                                    }}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-[#cfe1ff] hover:bg-[#f8fbff] hover:text-slate-950"
                                  >
                                    {item.label}: {item.query}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  }
                  renderMeta={({ visibleCount, totalCount }) => (
                    <div className="mb-1 flex items-start gap-3 rounded-[1.25rem] border border-[#e8edf3] bg-[#fbfdff] px-4 py-4 shadow-[0_8px_22px_rgba(60,64,67,0.04)]">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[#1a73e8]">
                        <SparkIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                              {content.ui.shortlistLabel}
                            </div>
                            <div className="mt-1 text-base font-semibold text-[#202124]">
                              {currentQuery ? `Best matches for "${currentQuery}"` : content.ui.resultsTitle}
                            </div>
                          </div>
                          <div className="rounded-full border border-[#e5e9f0] bg-white px-3 py-1 text-[11px] text-[#5f6368]">
                            {visibleCount} / {totalCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  renderItem={(service) => {
                    const resultIndex = Math.max(0, results.findIndex((item) => item.id === service.id));
                    const isSelected =
                      service.id === selectedServiceId || service.id === previewService?.id;
                    const footer = buildPartnerMatchActionFooterModelFromServiceItem(
                      service as BookingReadyServiceItem,
                      { selected: isSelected, includeSourceLink: true },
                    );
                    const confidencePresentation = getResultConfidencePresentation(service);
                    const resultFacts = buildSearchResultFacts(service, confidencePresentation.label);
                    const isBookedAiTenantMatch = isBookedAiChessTenantService(service);
                    const tenantCapabilitySummary = buildBookedAiTenantCapabilitySummary(service);
                    const providerUrl = service.source_url || service.booking_url || footer.links[0]?.href || null;
                    const googleMapsUrl = buildGoogleMapsSearchUrl({
                      mapUrl: service.map_url,
                      venueName: service.venue_name,
                      location: service.location,
                      serviceName: service.name,
                    });
                    const phoneHref = service.contact_phone
                      ? `tel:${service.contact_phone.replace(/[^\d+]/g, '')}`
                      : null;
                    const smsHref = service.contact_phone
                      ? `sms:${service.contact_phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(`Hi, I am interested in ${service.name}.`)}`
                      : null;
                    const compactActionClass =
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dedee3] bg-white text-[#3c4043] transition hover:border-[#c9c9d1] hover:bg-[#f8fbff] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40';
                    return (
                      <div
                        key={service.id}
                        data-homepage-result-entry="true"
                        style={getResultEntryStyle(resultIndex)}
                        className={`rounded-[1.35rem] border p-3 shadow-[0_12px_28px_rgba(60,64,67,0.06)] transition duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isSelected
                            ? 'border-[#cbd5e1] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.10)]'
                            : 'border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {service.image_url ? (
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-black/8 bg-slate-100 sm:h-[4.5rem] sm:w-[4.5rem]">
                              <img
                                src={service.image_url}
                                alt={service.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                              <div className="absolute left-1 top-1 rounded-full bg-white/88 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                                Photo
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[1rem] border border-[#e5e7eb] bg-[#f8fafc] text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748b] sm:h-[4.5rem] sm:w-[4.5rem]">
                              <span>{getServiceInitials(service)}</span>
                              <span className="mt-1 text-[7px] tracking-[0.12em] opacity-70">Preview</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b] ring-1 ring-[#e5e7eb]">
                                Option {resultIndex + 1}
                              </span>
                              {service.featured ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                  Top match
                                </span>
                              ) : null}
                              {isBookedAiTenantMatch ? (
                                <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800 ring-1 ring-emerald-200">
                                  BookedAI tenant
                                </span>
                              ) : null}
                              <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                                {service.category}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleServiceSelect(service)}
                              className={`mt-2 block max-w-full text-left text-[1rem] font-semibold leading-6 transition ${
                                isSelected ? 'text-[#111827]' : 'text-[#0f172a] hover:text-[#1a73e8]'
                              }`}
                            >
                              <span className="line-clamp-2">{service.name}</span>
                            </button>
                            <div className="mt-1 line-clamp-1 text-[12px] font-medium text-[#64748b]">
                              {[service.venue_name, service.location || service.source_label].filter(Boolean).join(' • ') || 'BookedAI matched option'}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {resultFacts.map((item) => (
                                <span
                                  key={`${service.id}-${item}`}
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    item === confidencePresentation.label
                                      ? confidencePresentation.tone === 'tenant'
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : 'bg-amber-50 text-amber-800'
                                      : 'bg-[#f8fafc] text-[#475569] ring-1 ring-[#e5e7eb]'
                                  }`}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                            {(service.why_this_matches || service.next_step) ? (
                              <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#475569]">
                                {service.why_this_matches || service.next_step}
                              </p>
                            ) : null}
                            {tenantCapabilitySummary ? (
                              <div className="mt-2 rounded-[0.95rem] border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                                <p className="line-clamp-2 text-[11px] font-medium leading-5 text-emerald-900">
                                  {tenantCapabilitySummary}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {BOOKEDAI_TENANT_CAPABILITY_CHIPS.slice(1, 7).map((item) => (
                                    <span
                                      key={`${service.id}-tenant-capability-${item}`}
                                      className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-700 ring-1 ring-emerald-100"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto border-t border-[#edf1f7] px-1 pt-3">
                          <button
                            type="button"
                            onClick={() => commitServiceSelection(service)}
                            aria-label={`Select ${service.name}`}
                            title="Select result"
                            className={`${compactActionClass} ${isSelected ? 'border-[#1a73e8] bg-[#eef4ff] text-[#1a73e8]' : ''}`}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          {providerUrl ? (
                            <a
                              href={providerUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open provider website for ${service.name}`}
                              title="Provider website"
                              className={compactActionClass}
                            >
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          {googleMapsUrl ? (
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open Google Maps location for ${service.name}`}
                              title="Google Maps"
                              className={compactActionClass}
                            >
                              <MapPinIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openServicePreview(service)}
                            aria-label={`View details for ${service.name}`}
                            title="View details"
                            className={compactActionClass}
                          >
                            <InfoIcon className="h-4 w-4" />
                          </button>
                          <a
                            href={`mailto:info@bookedai.au?subject=${encodeURIComponent(`Booking enquiry: ${service.name}`)}`}
                            aria-label={`Contact BookedAI about ${service.name}`}
                            title="Contact"
                            className={compactActionClass}
                          >
                            <MailIcon className="h-4 w-4" />
                          </a>
                          {phoneHref ? (
                            <a
                              href={phoneHref}
                              aria-label={`Call ${service.name}`}
                              title="Phone"
                              className={compactActionClass}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          {smsHref ? (
                            <a
                              href={smsHref}
                              aria-label={`Send SMS about ${service.name}`}
                              title="SMS"
                              className={compactActionClass}
                            >
                              <MessageIcon className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => commitServiceSelection(service, { openBooking: true, focusNameField: true })}
                            aria-label={`Book ${service.name}`}
                            title="Book this"
                            className="inline-flex h-9 min-w-[6.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#111827] bg-[#111827] px-3 text-[11px] font-semibold text-white transition hover:bg-[#1f2937]"
                          >
                            <SparkIcon className="h-4 w-4" />
                            {isBookedAiTenantMatch ? 'Book tenant' : 'Book'}
                          </button>
                        </div>
                      </div>
                    );
                  }}
                />
              ) : null}
              </div>
              </div>
              <div className="border-t border-[#eef2f7] bg-white px-3 py-3 sm:px-4">
                {attachedReferences.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedReferences.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => removeAttachedReference(item.id)}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-3 py-1.5 text-[11px] font-semibold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-white"
                        title="Remove attachment"
                      >
                        <AttachmentIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[12rem] truncate">{item.name}</span>
                        <span className="text-[#94a3b8]">x</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="rounded-[1.25rem] border border-[#dfe5ee] bg-[#f8fafc] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus-within:border-[#cbd5e1] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(148,163,184,0.12)]">
                  <div className="flex items-end gap-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      accept="image/*,.txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                      onChange={handleAttachmentPick}
                      className="hidden"
                      aria-label="Attach image text or file"
                    />
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      aria-label="Attach image text or file"
                      title="Attach image, text, or file"
                      className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fbff] hover:text-[#111827]"
                    >
                      <AttachmentIcon className="h-4 w-4" />
                    </button>
                    <textarea
                      ref={searchComposerRef}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={handleSearchComposerKeyDown}
                      placeholder="Ask for a service, area, timing, budget, or attach a reference..."
                      rows={1}
                      className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[15px] leading-6 text-[#111827] outline-none placeholder:text-[#8a94a6] sm:text-[1rem]"
                      aria-label="Ask BookedAI"
                    />
                    <div className="mb-1 flex shrink-0 items-center gap-1.5">
                      {voiceSupported ? (
                        <button
                          type="button"
                          onClick={handleVoiceSearch}
                          aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                          title={voiceListening ? 'Listening' : 'Voice'}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                            voiceListening
                              ? 'border-[#c9c9d1] bg-[#f0f0f2] text-[#111827]'
                              : 'border-[#e5e7eb] bg-white text-[#475569] hover:border-[#cbd5e1] hover:bg-[#f8fbff] hover:text-[#111827]'
                          }`}
                        >
                          <MicIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void runSearch(searchQuery)}
                        disabled={searchLoading || !searchQuery.trim()}
                        aria-label="Send search"
                        title="Send"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['Service', 'Area', 'Time', 'Budget'].map((item) => (
                      <span key={item} className="rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-medium text-[#64748b] ring-1 ring-[#e5e7eb]">
                        {item}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-[#94a3b8]">
                    Results scroll above. Enter sends, Shift+Enter adds a line.
                  </span>
                </div>
                {voiceError ? <div className="mt-2 text-xs text-rose-600">{voiceError}</div> : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="public-booking-sidebar min-w-0 rounded-[1.6rem] border border-[#e3e3e7] bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] xl:sticky xl:self-start">
          <div className="mb-3 hidden rounded-[1.2rem] border border-[#eeeeef] bg-[#fafafa] px-4 py-4 xl:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Booking flow</div>
            <div className="mt-2 text-base font-semibold text-[#202124]">
              One calm path from search to booking.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Search', 'Choose', 'Book'].map((item) => (
                <div key={item} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4b5563] ring-1 ring-[#e3e3e7]">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="public-apple-workspace-panel rounded-[1.15rem] px-3.5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-2 text-[1rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {selectedService ? selectedService.name : content.ui.bookingPanelEmpty}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#172033]/58">
                  {selectedService ? selectedServiceMeta : content.ui.resultsEmptyBody}
                </p>
              </div>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f5f7fb] text-[#6d28d9] ring-1 ring-slate-900/6 sm:inline-flex">
                <BrandButtonMark className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="hidden xl:block public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5 shadow-[0_8px_22px_rgba(60,64,67,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">Progress</div>
              <div className="rounded-full border border-[#e3e3e7] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5f6368]">
                {result ? 'Ready' : selectedService ? 'In motion' : 'Waiting'}
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {bookingFlowSteps.map((step, index) => {
                const toneClasses =
                  step.state === 'complete'
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
                    : step.state === 'active'
                      ? 'border-[#d2e3fc] bg-[#eef4ff] text-[#1a73e8]'
                      : 'border-slate-200 bg-white text-slate-500';
                const dotClasses =
                  step.state === 'complete'
                    ? 'bg-emerald-500'
                    : step.state === 'active'
                      ? 'bg-[#1a73e8]'
                      : 'bg-slate-300';

                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex w-7 flex-col items-center pt-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotClasses}`} />
                      {index < bookingFlowSteps.length - 1 ? (
                        <span className="mt-1 h-9 w-px bg-slate-200" />
                      ) : null}
                    </div>
                    <div className={`min-w-0 flex-1 rounded-[0.95rem] border px-3 py-2.5 ${toneClasses}`}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">{step.label}</div>
                      <div className="mt-1 text-sm leading-5">{step.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden xl:block public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5 shadow-[0_10px_28px_rgba(60,64,67,0.05)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">Follow-up</div>
            <div className="mt-3 space-y-2.5">
              {enterpriseJourneySteps.slice(0, 3).map((step) => (
                <div key={step.id} className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mt-1 text-sm font-semibold text-[#202124]">{step.title}</div>
                      <div className="mt-1 text-[12px] leading-5 text-[#5f6368]">{step.description}</div>
                    </div>
                    <div className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getEnterpriseStatusTone(step.status)}`}>
                      {getEnterpriseStatusLabel(step.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedService ? (
            <div className="public-apple-workspace-panel mt-3 rounded-[1.1rem] border-[1.5px] border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6fff9_100%)] px-3.5 py-3.5 shadow-[0_16px_34px_rgba(16,185,129,0.10)]">
              <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mt-2 text-sm font-semibold text-[#202124]">{selectedService.name}</div>
                    <div className="mt-1 text-xs text-[#5f6368]">
                      {selectedService.category} • A${selectedService.amount_aud} • {selectedService.duration_minutes} min
                    </div>
                  {selectedService.location ? (
                    <div className="mt-1 text-xs text-[#5f6368]">{selectedService.location}</div>
                  ) : null}
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-white px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-sm leading-6 text-emerald-900">
                    {selectedServiceFlowNote}
                  </div>
                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                    Best path
                  </div>
                </div>
                {currentQuery ? (
                  <div className="mt-2 inline-flex rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368] ring-1 ring-slate-900/6">
                    Query: "{currentQuery}"
                  </div>
                ) : null}
              </div>

              <div className="mt-3 rounded-[0.95rem] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Brief
                    </div>
                    <div className="mt-1 font-semibold">Confirm details for the selected match</div>
                    <div className="mt-1 text-xs leading-5 text-emerald-800">
                      Capture contact details, timing, and any decision-critical context. Reopen comparison only if the brief changes.
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                    Locked
                  </div>
                </div>
              </div>

              {isBookedAiChessTenantService(selectedService) ? (
                <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-white px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Tenant booking channels
                  </div>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">
                    This chess tenant can continue through BookedAI with Stripe payment, QR transfer/booking confirmation, calendar invite, email confirmation, WhatsApp Agent chat, and portal edits after booking.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BOOKEDAI_TENANT_CAPABILITY_CHIPS.slice(2).map((item) => (
                      <span
                        key={`selected-tenant-capability-${item}`}
                        className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-700 ring-1 ring-emerald-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!result ? (
                <button
                  type="button"
                  onClick={() => setBookingComposerOpen((current) => !current)}
                  className="public-apple-primary-button mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
                >
                  <SparkIcon className="h-4 w-4" />
                  {bookingComposerOpen ? 'Hide booking form' : 'Book this match'}
                </button>
              ) : null}
            </div>
          ) : null}

          {!result && !selectedService ? (
            <div className="mt-3 rounded-[1.1rem] border border-dashed border-[#d9dce3] bg-[#fbfbfc] px-4 py-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111827] ring-1 ring-[#e3e3e7]">
                <SparkIcon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold text-[#111827]">Booking form unlocks after a match is selected.</div>
              <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-[#6b7280]">
                Keep the flow conversational first. Once a result is chosen, BookedAI carries that context into the booking brief.
              </p>
              <div className="mt-4 space-y-2 text-left">
                {BOOKING_EMPTY_STEPS.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-[#eeeeef] bg-white px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f0f2] text-[11px] font-semibold text-[#4b5563]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-[#4b5563]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!result && selectedService ? (
            <div
              ref={bookingFormRef}
              className={`public-apple-workspace-panel mt-3 rounded-[1.1rem] p-3.5 shadow-[0_10px_28px_rgba(60,64,67,0.05)] ${
                selectedService && !bookingComposerOpen ? 'hidden' : ''
              }`}
            >
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#111827]">
                  {selectedService ? content.ui.bookingButton : content.ui.bookingPanelEmpty}
                </div>
                {selectedService ? (
                  <p className="mt-2 text-sm leading-6 text-[#172033]/62">
                    Complete the booking brief for <span className="font-semibold text-[#111827]">{selectedService.name}</span>. This match stays locked for the request.
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    ['1', 'Contact', 'Name plus email or phone'],
                    ['2', 'Preferred time', 'Pick the best slot'],
                    ['3', 'Next step', 'Portal, QR, and follow-up'],
                  ].map(([number, title, body]) => (
                    <div key={title} className="rounded-[0.95rem] border border-[#e5e7eb] bg-[#f8fafc] px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#1a73e8] ring-1 ring-[#dbe7fb]">
                          {number}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
                          {title}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] leading-5 text-[#64748b]">{body}</div>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.nameLabel}</span>
                  <input
                    ref={customerNameInputRef}
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                    autoComplete="name"
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.emailLabel}</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    autoComplete="email"
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.phoneLabel}</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    autoComplete="tel"
                    aria-describedby={customerPhoneHelperId}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>
                <div id={customerPhoneHelperId} className="-mt-2 text-[11px] leading-5 text-[#64748b]">
                  Email or phone is enough; phone enables SMS and WhatsApp updates.
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.dateTimeLabel}</span>
                  <input
                    type="datetime-local"
                    value={preferredSlot}
                    onChange={(event) => setPreferredSlot(event.target.value)}
                    required
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.notesLabel}</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={content.ui.notesPlaceholder}
                    className="public-apple-field w-full rounded-[0.95rem] px-4 py-3 text-sm outline-none transition"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-[0.95rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitLoading || !selectedService}
                  className="public-apple-primary-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.95rem] px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SparkIcon className="h-4 w-4" />
                  {submitLoading ? content.ui.bookingSubmitting : content.ui.bookingButton}
                </button>
                <a
                  href={buildTelegramCareUrl({ serviceName: selectedService?.name ?? null })}
                  target="_blank"
                  rel="noreferrer"
                  className="public-apple-secondary-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.95rem] px-5 text-sm font-semibold transition"
                >
                  <MessageIcon className="h-4 w-4" />
                  Need help in Telegram? Open BookedAI Manager Bot
                </a>
              </form>
            </div>
          ) : null}

          {result ? (
            <div className="public-apple-workspace-panel mt-3 space-y-3 rounded-[1.1rem] px-3.5 py-3.5">
              <div className="rounded-[1.2rem] bg-[linear-gradient(180deg,#5B8CFF_0%,#1A73E8_100%)] px-4 py-4 text-white shadow-[0_16px_36px_rgba(26,115,232,0.22)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92">
                      {content.ui.thankYouTitle}
                    </div>
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {content.ui.bookingSuccessTitle}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
                      {result.booking_reference}
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/86">
                      {content.ui.thankYouBody}
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/86">
                      Your booking code, portal QR, and follow-up path are ready. You can review, edit, reschedule, or ask for help from the same booking record.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">{result.confirmation_message}</p>
                    <div className="mt-3 inline-flex rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-semibold text-white/90 ring-1 ring-white/14">
                      Scan the QR or open the portal. This confirmation stays here as long as you need it.
                    </div>
                    <div className="mt-4 rounded-[1rem] bg-white/12 px-3 py-3 ring-1 ring-white/12">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                        Customer portal and edit flow
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/82">
                        Scan the QR or open the live portal to review booking details, edit the request, reschedule, cancel, or save this booking. The same portal link is included in the confirmation email and follow-up flow.
                      </p>
                      <a
                        href={getBookingPortalUrl(result)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#d2e3fc]"
                      >
                        portal.bookedai.au
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                          <path d="M6 4h6v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m10.5 4.5-5 5" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M12 9.5V12H4V4h2.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/82">
                        {['Review details', 'Edit and submit', 'Request reschedule', 'Request cancellation'].map((item) => (
                          <span key={item} className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/12">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-white p-2.5 text-[#202124] shadow-sm">
                    <img
                      src={getBookingQrCodeUrl(result)}
                      alt={`${content.ui.qrLabel} ${result.booking_reference} portal link`}
                      className="h-32 w-32 rounded-[1rem] bg-white object-cover"
                    />
                    <div className="mt-2 rounded-[0.85rem] bg-[#f8f9fa] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                      Scan to open booking
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Service</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.service.name}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Price</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.amount_label}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                    {content.ui.requestedSlotLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.requested_date}</div>
                  <div className="mt-0.5 text-xs text-[#5f6368]">{result.requested_time}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      title: 'Review booking',
                      body: 'Open the portal to review the current booking details and booking reference.',
                      label: 'Open portal',
                      href: getBookingPortalUrl(result),
                    },
                    {
                      title: 'Edit and submit',
                      body: 'Use the same portal flow to adjust details, then resubmit the booking request.',
                      label: 'Edit in portal',
                      href: getBookingPortalUrl(result, 'edit'),
                    },
                    {
                      title: 'Reschedule request',
                      body: 'If the time no longer works, request a new slot from the booking portal.',
                      label: 'Request reschedule',
                      href: getBookingPortalUrl(result, 'reschedule'),
                    },
                    {
                      title: 'Cancel request',
                      body: 'If plans changed, submit a cancellation request from the same managed flow.',
                      label: 'Request cancellation',
                      href: getBookingPortalUrl(result, 'cancel'),
                    },
                    {
                      title: 'Telegram care',
                      body: `Open BookedAI Manager Bot with booking ${result.booking_reference} ready in the new chat session for ${result.service.name}.`,
                      label: 'Open Telegram',
                      href: buildTelegramCareUrl({
                        bookingReference: result.booking_reference,
                        serviceName: result.service.name,
                      }),
                    },
                  ].map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4 transition hover:border-[#cfe1ff] hover:bg-[#f8fbff]"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                    <div className="mt-3 inline-flex rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1a73e8]">
                      {item.label}
                    </div>
                  </a>
                ))}
              </div>

              <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                  {content.ui.followUpLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#202124]">
                  {result.email_status === 'sent' ? 'Email sent' : 'Manual follow-up'}
                </div>
                <div className="mt-0.5 text-xs text-[#5f6368]">From info@bookedai.au to {result.contact_email}</div>
                <div className="mt-2 text-xs leading-5 text-[#5f6368]">
                  The confirmation email should include the same portal link, booking reference, payment path, and calendar action so the customer can review or edit later without losing context.
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {bookingOutcomeSteps.map((step) => (
                  <div key={step.label} className="public-apple-workspace-panel rounded-[0.95rem] px-3 py-3">
                    <div className="text-[11px] font-semibold text-[#202124]">{step.label}</div>
                    <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${step.tone}`}>
                      {step.value}
                    </div>
                  </div>
                ))}
              </div>

              {communicationPreviewCards.length > 0 ? (
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Communication drafts
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">
                    Customer-facing follow-up prepared from the booking result
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {communicationPreviewCards.map((card) => (
                      <div
                        key={card.id}
                        className={`rounded-[1rem] px-3 py-3 ${
                          card.tone === 'dark'
                            ? 'bg-slate-950 text-white'
                            : card.tone === 'success'
                              ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100'
                              : 'bg-slate-50 text-slate-900 ring-1 ring-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                              {card.channel}
                            </div>
                            <div className="mt-1 text-sm font-semibold">{card.title}</div>
                          </div>
                          <div className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">
                            {card.recipient}
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] leading-5 opacity-80">{card.summary}</div>
                        <pre className="mt-3 whitespace-pre-wrap break-words rounded-[0.9rem] bg-white/10 px-3 py-3 text-[11px] leading-5">
                          {card.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Delivery timeline
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      Traceable operations after booking capture
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Ops trace
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {operationTimeline.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1rem] bg-[#fbfbfd] px-3 py-3 ring-1 ring-slate-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-950">{item.title}</div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{item.detail}</div>
                          {item.reference ? (
                            <div className="mt-2 inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                              Ref: {item.reference}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getEnterpriseStatusTone(item.status)}`}
                        >
                          {getEnterpriseStatusLabel(item.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <a
                  href={getBookingPortalUrl(result)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open booking portal"
                  title="Portal"
                  className="public-apple-primary-button inline-flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <QrIcon className="h-4 w-4" />
                  <span>Portal</span>
                </a>
                {result.payment_url ? (
                  <a
                    href={result.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={
                      result.payment_status === 'stripe_checkout_ready'
                        ? 'Open payment'
                        : 'Open payment follow-up'
                    }
                    className="public-apple-primary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <SparkIcon className="h-4 w-4" />
                    <span>
                      {result.payment_status === 'stripe_checkout_ready' ? 'Stripe' : 'Payment'}
                    </span>
                  </a>
                ) : null}
                {result.payment_url ? (
                  <div className="inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600">
                    <SparkIcon className="h-4 w-4" />
                    <span>Payment</span>
                  </div>
                ) : null}
                <a
                  href={`mailto:${result.contact_email && result.contact_email.includes('@') ? result.contact_email : 'info@bookedai.au'}?subject=${encodeURIComponent(`BookedAI booking ${result.booking_reference}`)}`}
                  aria-label="Email booking confirmation"
                  title="Email"
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <MailIcon className="h-4 w-4" />
                  <span>Email</span>
                </a>
                {result.meeting_event_url || result.calendar_add_url ? (
                  <a
                    href={result.meeting_event_url ?? result.calendar_add_url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Add to calendar"
                    className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Add calendar</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Continue in chat"
                  onClick={focusSearchComposer}
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <MessageIcon className="h-4 w-4" />
                  <span>Chat</span>
                </button>
                <a
                  href={buildTelegramCareUrl({
                    bookingReference: result.booking_reference,
                    serviceName: result.service.name,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open Telegram booking care"
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <MessageIcon className="h-4 w-4" />
                  <span>Telegram</span>
                </a>
                <button
                  type="button"
                  aria-label="Return home"
                  onClick={returnToHomepageSearch}
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span>Home</span>
                </button>
              </div>

              <p className="text-xs leading-5 text-[#5f6368]">
                {result.meeting_status === 'scheduled'
                  ? 'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                  : result.calendar_add_url
                    ? 'A calendar action is ready immediately and is also included in the booking email. After payment, the booking stays logged for follow-up.'
                    : 'The booking is confirmed, the email is ready, and follow-up has already been prepared.'}
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {previewService ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f172a]/52 p-3 sm:items-center sm:p-5">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-0">
            <div className="bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4.5">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300/70 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[1.2rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {previewService.name}
                </div>
                <p className="mt-1 text-sm text-[#5f6368]">
                  {[previewService.category, previewService.location].filter(Boolean).join(' • ') || 'Reviewed inside the BookedAI shortlist'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewService(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-semibold text-[#1a73e8] ring-1 ring-white/70">{`A$${previewService.amount_aud}`}</span>
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-semibold text-[#5f6368] ring-1 ring-white/70">{previewService.duration_minutes} min</span>
              <span className="rounded-full bg-white/86 px-3 py-1.5 text-[11px] font-semibold text-[#5f6368] ring-1 ring-white/70">
                {previewService.booking_url ? 'Direct booking available' : 'BookedAI guided booking'}
              </span>
            </div>
            </div>

            <div className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5">
              <div className="text-sm font-semibold text-[#111827]">
                {previewService.venue_name || previewService.source_label || previewService.name}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#5f6368]">
                {previewService.location || 'Location details are confirmed during booking confirmation.'}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                {previewService.summary || 'BookedAI matched this option as a relevant next step for the enquiry.'}
              </p>
              {previewService.source_label ? (
                <div className="mt-3 inline-flex rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                  Source: {previewService.source_label}
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-[1.15rem] border border-[#dfe8f3] bg-[#f8fbff] px-4 py-3.5">
              <p className="mt-2 text-sm leading-6 text-[#31507b]">
                {previewService.why_this_matches ||
                  previewService.next_step ||
                  previewService.summary ||
                  'This match stays inside the same booking flow. Review the overview, then continue straight into the booking form.'}
              </p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPreviewService(null)}
                className="public-apple-secondary-button inline-flex h-11 items-center justify-center rounded-[1rem] px-5 text-sm font-semibold transition"
              >
                Back
              </button>
              {previewService.booking_url ? (
                <a
                  href={previewService.booking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="public-apple-secondary-button inline-flex h-11 items-center justify-center rounded-[1rem] px-5 text-sm font-semibold transition"
                >
                  Book on provider site
                </a>
              ) : null}
              {previewGoogleMapsUrl ? (
                <a
                  href={previewGoogleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="public-apple-secondary-button inline-flex h-11 items-center justify-center rounded-[1rem] px-5 text-sm font-semibold transition"
                >
                  Open Google Maps
                </a>
              ) : null}
              <button
                type="button"
                onClick={handlePreviewBook}
                className="public-apple-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] px-5 text-sm font-semibold transition"
              >
                <SparkIcon className="h-4 w-4" />
                Continue to booking
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}


    </div>
  );
}
