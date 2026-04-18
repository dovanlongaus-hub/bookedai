import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  brandDescriptor,
  brandName,
  demoContent,
  type BookingAssistantContent,
} from '../data';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../../shared/config/api';
import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../../shared/config/publicBookingAssistant';
import {
  createPublicBookingAssistantSessionId,
  getPublicBookingAssistantLiveReadRecommendation,
  primePublicBookingAssistantSession,
  shadowPublicBookingAssistantLeadAndBookingIntent,
  shadowPublicBookingAssistantSearch,
} from './publicBookingAssistantV1';
import type { MatchCandidate } from '../../../shared/contracts';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  toBookingReadyServiceItem,
} from '../../../shared/presenters/partnerMatch';
import { PartnerMatchCard } from '../../../shared/components/PartnerMatchCard';
import { PartnerMatchActionFooter } from '../../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchShortlist } from '../../../shared/components/PartnerMatchShortlist';

type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  distance_km?: number | null;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  tags: string[];
  featured: boolean;
};

type BookingAssistantCatalogResponse = {
  status: string;
  business_email: string;
  stripe_enabled: boolean;
  services: ServiceCatalogItem[];
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
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
};

type ChatApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type UserGeoContext = {
  latitude: number;
  longitude: number;
  locality: string | null;
};

type BookingAssistantChatResponse = {
  status: string;
  reply: string;
  matched_services: ServiceCatalogItem[];
  matched_events: AIEventItem[];
  suggested_service_id: string | null;
  should_request_location: boolean;
};

type AIEventItem = {
  title: string;
  summary: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  venue_name: string | null;
  location: string | null;
  organizer: string | null;
  url: string;
  image_url: string | null;
  map_snapshot_url: string | null;
  map_url: string | null;
  source: string;
  source_priority: number;
  is_wsti_priority: boolean;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  matchedServices?: ServiceCatalogItem[];
  matchedEvents?: AIEventItem[];
};

type BookingAssistantDialogProps = {
  content: BookingAssistantContent;
  isOpen: boolean;
  onClose: () => void;
  standalone?: boolean;
  closeLabel?: string;
  layoutMode?: 'default' | 'product_app';
  entrySourcePath?: string | null;
};

type ProductSheetSnap = 'peek' | 'half' | 'full';
type ProductModuleTab = 'overview' | 'options' | 'details' | 'confirmed';

type BrowserSpeechRecognitionResult = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  results: BrowserSpeechRecognitionResult[];
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type ProcessStep = {
  id: string;
  title: string;
  detail: string;
  status: 'pending' | 'in_progress' | 'completed';
};

function buildFallbackCatalog(): BookingAssistantCatalogResponse {
  return {
    status: 'fallback',
    business_email: 'info@bookedai.au',
    stripe_enabled: true,
    services: demoContent.results.map((item, index) => ({
      id: `fallback-service-${index + 1}`,
      name: item.name,
      category: item.category,
      summary: item.summary,
      duration_minutes: 45,
      amount_aud: Number.parseInt(item.priceLabel.replace(/[^\d]/g, ''), 10) || 30,
      image_url: item.imageUrl,
      map_snapshot_url: null,
      venue_name: item.name,
      location: item.locationLabel,
      map_url: null,
      booking_url: '#assistant',
      tags: demoContent.quickFilters,
      featured: true,
    })),
  };
}

const popupShortcutTopics = [
  {
    label: 'Swim',
    prompt: 'Find the best swim lesson for a 7-year-old near Caringbah this weekend.',
  },
  {
    label: 'Housing',
    prompt:
      'I want a housing consultation about apartment or townhouse projects in Sydney and would like to book a call.',
  },
  {
    label: 'Salon',
    prompt: 'Book a haircut and colour consultation for Friday afternoon near me.',
  },
  {
    label: 'Clinic',
    prompt: 'I need a physio or skin clinic with weekend availability near me.',
  },
  {
    label: 'Restaurant',
    prompt: 'Find the best restaurant booking option for 6 people tonight.',
  },
];

function getSydneyToday() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

function formatEventDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Sydney',
    timeZoneName: 'short',
  }).format(parsed);
}

function extractImageUrl(value: string | null | undefined) {
  const imageUrl = value?.trim();
  if (!imageUrl) {
    return null;
  }

  const normalized = imageUrl.toLowerCase();
  if (
    normalized.startsWith('/bookedai-ui-shot-') ||
    normalized === '/wsti-logo.webp'
  ) {
    return null;
  }

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('/images/')
  ) {
    return imageUrl;
  }

  return null;
}

function extractServiceImageUrl(service: ServiceCatalogItem) {
  return extractImageUrl(service.image_url) ?? extractImageUrl(service.map_snapshot_url);
}

function extractEventImageUrl(event: AIEventItem) {
  return extractImageUrl(event.image_url) ?? extractImageUrl(event.map_snapshot_url);
}

function getServiceVisualLabel(service: ServiceCatalogItem) {
  return extractImageUrl(service.image_url) ? 'Provider image' : 'Google map location';
}

function getEventVisualLabel(event: AIEventItem) {
  return extractImageUrl(event.image_url) ? 'Event image' : 'Google map location';
}

const CHAT_RESULT_BATCH_SIZE = 3;

function curateServiceMatches(
  services: ServiceCatalogItem[],
  preferredOrder: string[] = [],
) {
  const deduped = Array.from(new Map(services.map((service) => [service.id, service])).values());
  if (!preferredOrder.length) {
    return deduped;
  }

  const order = new Map(preferredOrder.map((serviceId, index) => [serviceId, index]));
  return [...deduped].sort((left, right) => {
    const leftIndex = order.get(left.id);
    const rightIndex = order.get(right.id);
    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }
    if (leftIndex !== undefined) {
      return -1;
    }
    if (rightIndex !== undefined) {
      return 1;
    }
    return 0;
  });
}

function curateEventMatches(events: AIEventItem[]) {
  return Array.from(
    new Map(events.map((event) => [`${event.url}-${event.start_at}`, event])).values(),
  );
}

function buildLiveReadAssistantReply(params: {
  rankedCount: number;
  warnings: string[];
  normalizedQuery: string | null;
  inferredLocation: string | null;
  inferredCategory: string | null;
}) {
  const descriptor = params.normalizedQuery
    ?? [params.inferredCategory, params.inferredLocation].filter(Boolean).join(' in ')
    ?? null;

  if (!params.rankedCount) {
    const warningLine = params.warnings[0] ?? 'I could not find a strong relevant match for that request.';
    return descriptor
      ? `${warningLine} I stayed grounded to ${descriptor}, so I am not showing unrelated stored results.`
      : `${warningLine} I am not showing unrelated stored results.`;
  }

  const shownCount = Math.min(params.rankedCount, CHAT_RESULT_BATCH_SIZE);
  if (descriptor) {
    return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'} for ${descriptor}. Here are the top ${shownCount} to compare first.`;
  }

  return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'}. Here are the top ${shownCount} to compare first.`;
}

function validateBookingForm(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredSlot: string;
}) {
  const { customerName, customerEmail, customerPhone, preferredSlot } = params;
  const trimmedName = customerName.trim();
  const trimmedEmail = customerEmail.trim();
  const trimmedPhone = customerPhone.trim();

  if (trimmedName.length < 2) {
    return 'Enter a customer name with at least 2 characters.';
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

  if (!preferredSlot) {
    return 'Choose a preferred booking time.';
  }

  return null;
}

function parsePreferredSlot(preferredSlot: string) {
  const parsed = new Date(preferredSlot);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

  return {
    requestedDate: `${year}-${month}-${day}`,
    requestedTime: `${hours}:${minutes}`,
  };
}

function toDatetimeLocalValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildDefaultPreferredSlot() {
  const base = new Date();
  base.setMinutes(base.getMinutes() + 120);

  const rounded = new Date(base);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % 15;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + (15 - remainder));
  }

  return toDatetimeLocalValue(rounded.toISOString());
}

function buildEventBookingContext(event: AIEventItem, customerRequirement: string) {
  const lines = [
    `Event booking: ${event.title}`,
    `Event time: ${formatEventDate(event.start_at)}`,
  ];

  if (event.organizer) {
    lines.push(`Organizer: ${event.organizer}`);
  }

  if (event.venue_name || event.location) {
    lines.push(`Venue: ${[event.venue_name, event.location].filter(Boolean).join(' • ')}`);
  }

  if (customerRequirement.trim()) {
    lines.push(`Customer requirement: ${customerRequirement.trim()}`);
  }

  lines.push(`Event link: ${event.url}`);
  return lines.join('\n');
}

function getBookingRequirementConfig(
  service: ServiceCatalogItem | null,
  selectedEvent: AIEventItem | null,
) {
  if (selectedEvent) {
    return {
      label: 'Attendee or ticket detail',
      placeholder:
        'Optional: attendee count, ticket type, seating preference, or anything important for this event booking.',
    };
  }

  switch (service?.category) {
    case 'Salon':
      return {
        label: 'Style goal',
        placeholder: 'Optional: haircut style, colour idea, or event context.',
      };
    case 'Healthcare Service':
      return {
        label: 'Main concern',
        placeholder: 'Optional: symptom, pain area, or reason for the visit.',
      };
    case 'Food and Beverage':
    case 'Hospitality and Events':
      return {
        label: 'Group or occasion',
        placeholder: 'Optional: guest count, occasion, or preferred seating details.',
      };
    case 'Membership and Community':
      return {
        label: 'Membership context',
        placeholder: 'Optional: new signup, renewal, or the plan you want help with.',
      };
    case 'Housing and Property':
      return {
        label: 'Project of interest',
        placeholder:
          'Optional: suburb, budget, property type, buyer status, or the projects you want to discuss in the consultation.',
      };
    default:
      return {
        label: 'Extra detail',
        placeholder: 'Optional: anything helpful before we confirm the booking.',
      };
  }
}

function getSpeechRecognitionConstructor():
  | BrowserSpeechRecognitionConstructor
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return (
    browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
  );
}

function buildProcessSteps(params: {
  messages: ChatMessage[];
  selectedService: ServiceCatalogItem | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  requestedDate: string;
  requestedTime: string;
  loading: boolean;
  result: BookingAssistantSessionResponse | null;
}): ProcessStep[] {
  const {
    messages,
    selectedService,
    customerName,
    customerEmail,
    customerPhone,
    requestedDate,
    requestedTime,
    loading,
    result,
  } = params;
  const hasCustomerMessage = messages.some((message) => message.role === 'user');
  const hasBookingDetails =
    customerName.trim().length > 1 &&
    (customerEmail.trim().length > 3 || customerPhone.trim().replace(/\D/g, '').length >= 8) &&
    requestedDate.length > 0 &&
    requestedTime.length > 0;

  return [
    {
      id: 'intent',
      title: 'Understand the request',
      detail: hasCustomerMessage
        ? `${brandName} captured the customer need and context.`
        : 'Waiting for a customer message or voice note.',
      status: hasCustomerMessage ? 'completed' : 'in_progress',
    },
    {
      id: 'service',
      title: 'Match services',
      detail: selectedService
        ? `${selectedService.name} is ready for booking.`
        : 'Relevant services will appear here after the chat starts.',
      status: selectedService
        ? 'completed'
        : hasCustomerMessage
          ? 'in_progress'
          : 'pending',
    },
    {
      id: 'details',
      title: 'Prepare booking details',
      detail: hasBookingDetails
        ? 'Customer identity and preferred slot are complete.'
        : 'Collecting contact info, date, and time.',
      status: hasBookingDetails
        ? 'completed'
        : selectedService
          ? 'in_progress'
          : 'pending',
    },
    {
      id: 'confirm',
      title: 'Create booking outcome',
      detail: result
        ? `Booking ${result.booking_reference} is ready with payment and follow-up.`
        : loading
          ? 'Generating booking reference, payment link, and workflow handoff.'
          : `${brandName} will generate the booking package after submission.`,
      status: result ? 'completed' : loading ? 'in_progress' : 'pending',
    },
  ];
}

function getCompletedStepCount(steps: ProcessStep[]) {
  return steps.filter((step) => step.status === 'completed').length;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildServiceFitNotes(service: ServiceCatalogItem) {
  return service.tags.slice(0, 3).map((tag) => tag.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()));
}

function buildBestForLabel(service: ServiceCatalogItem, userQuery: string) {
  const lowered = userQuery.toLowerCase();
  const tokens = service.tags.map((tag) => tag.toLowerCase());
  const category = service.category.toLowerCase();
  if (lowered.includes('compare')) {
    return 'Side-by-side decision making';
  }
  if (tokens.some((tag) => ['wedding', 'bridal', 'event'].includes(tag))) {
    return 'Best for important occasions';
  }
  if (tokens.some((tag) => ['physio', 'injury', 'rehab', 'medical', 'doctor', 'clinic'].includes(tag))) {
    return 'Best for guided care and assessment';
  }
  if (tokens.some((tag) => ['group booking', 'group', 'party', 'guests', 'meeting'].includes(tag))) {
    return 'Best for groups and shared visits';
  }
  if (tokens.some((tag) => ['membership', 'renewal', 'signup', 'member'].includes(tag))) {
    return 'Best for joining or renewing';
  }
  if (category.includes('housing') || category.includes('property')) {
    return 'Best for project discovery and property consultation';
  }
  if (category.includes('print')) {
    return 'Best for signage, booths, and event branding';
  }
  if (service.duration_minutes <= 20) {
    return 'Best for a quick decision';
  }
  return 'Best for a standard booking need';
}

function buildDecisionBadge(
  service: ServiceCatalogItem,
  services: ServiceCatalogItem[],
  index: number,
  userQuery: string,
) {
  const durations = services.map((item) => item.duration_minutes);
  const amounts = services.map((item) => item.amount_aud);
  const minDuration = durations.length ? Math.min(...durations) : service.duration_minutes;
  const minAmount = amounts.length ? Math.min(...amounts) : service.amount_aud;

  if (index === 0) {
    return 'Best fit';
  }
  if (service.amount_aud === minAmount && services.length > 1) {
    return 'Best value';
  }
  if (service.duration_minutes === minDuration && services.length > 1) {
    return 'Fastest option';
  }
  if (
    (service.category.toLowerCase().includes('housing') ||
      service.category.toLowerCase().includes('property')) &&
    /(housing|property|project|apartment|home|investment)/i.test(userQuery)
  ) {
    return 'Project consult';
  }
  if (service.category.toLowerCase().includes('print') && userQuery.toLowerCase().includes('event')) {
    return 'Event-ready';
  }
  if (service.featured) {
    return 'Popular choice';
  }
  return 'Strong alternative';
}

function buildDecisionSummary(services: ServiceCatalogItem[], userQuery: string) {
  if (services.length < 2) {
    return null;
  }

  const [first, second] = services;
  if (userQuery.toLowerCase().includes('compare')) {
    return `Compare ${first.name} and ${second.name} on price, timing, and location before you book.`;
  }
  return `${first.name} is the current best fit, while ${second.name} is the strongest alternative if you want a second option before booking.`;
}

function buildServiceLocationLabel(service: ServiceCatalogItem) {
  return [service.venue_name, service.location].filter(Boolean).join(' • ') || 'Location confirmed during booking';
}

function buildServiceDistanceLabel(service: ServiceCatalogItem) {
  if (typeof service.distance_km === 'number' && Number.isFinite(service.distance_km)) {
    return `${service.distance_km.toFixed(service.distance_km >= 10 ? 0 : 1)} km`;
  }

  return service.location ?? service.venue_name ?? 'Distance on request';
}

function buildServiceNextStepLabel(service: ServiceCatalogItem) {
  if (service.category.toLowerCase().includes('housing') || service.category.toLowerCase().includes('property')) {
    return 'Book a consultation';
  }
  if (service.booking_url) {
    return 'Book online now';
  }
  return 'Lock in a time in chat';
}

function buildServiceConfidenceNotes(service: ServiceCatalogItem) {
  const isHousing = service.category.toLowerCase().includes('housing') || service.category.toLowerCase().includes('property');
  const notes = [
    service.booking_url
      ? isHousing
        ? 'Partner consultation link'
        : 'Direct booking link'
      : isHousing
        ? 'Project consult flow ready'
        : 'Chat booking flow ready',
  ];

  if (service.map_url || service.location || service.venue_name) {
    notes.push('Location details ready');
  }

  notes.push(service.featured ? 'Popular local choice' : 'Curated best-fit match');
  return notes;
}

function buildBookabilityLabel(service: ServiceCatalogItem) {
  if (service.category.toLowerCase().includes('housing') || service.category.toLowerCase().includes('property')) {
    return service.booking_url ? 'Consultation ready' : 'Project consult';
  }
  if (service.booking_url) {
    return 'Ready to book';
  }
  if (service.map_url && (service.location || service.venue_name)) {
    return 'Easy to confirm';
  }
  return 'Best for comparing';
}

function buildReadyToBookSummary(service: ServiceCatalogItem, userQuery: string) {
  const reasons = [
    buildBestForLabel(service, userQuery),
    buildServiceNextStepLabel(service),
  ];

  if (service.venue_name || service.location) {
    reasons.push(buildServiceLocationLabel(service));
  }

  return reasons.filter(Boolean).slice(0, 2).join(' • ');
}

function buildReadyToBookConfidence(service: ServiceCatalogItem, userQuery: string) {
  return [
    formatPrice(service.amount_aud),
    `${service.duration_minutes} min`,
    buildBestForLabel(service, userQuery),
  ]
    .filter(Boolean)
    .join(' • ');
}

function buildBookingOutcomeSteps(result: BookingAssistantSessionResponse) {
  return [
    {
      label: 'Confirmation email',
      value:
        result.email_status === 'sent'
          ? 'Sent to customer'
          : `Handled by ${result.contact_email}`,
      tone:
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
            ? 'Sent into ops workflow'
            : 'Queued for handoff',
      tone:
        result.meeting_status === 'scheduled' || result.workflow_status
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
    },
  ];
}

function buildBookingJourneySteps(params: {
  selectedService: ServiceCatalogItem | null;
  preferredSlot: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  result: BookingAssistantSessionResponse | null;
}) {
  const hasContact =
    params.customerName.trim().length > 1 &&
    (params.customerEmail.trim().length > 3 ||
      params.customerPhone.trim().replace(/\D/g, '').length >= 8);
  const hasSchedule = Boolean(params.preferredSlot);

  return [
    {
      id: 'details',
      label: 'Details',
      status: params.selectedService ? 'active' : 'pending',
    },
    {
      id: 'schedule',
      label: 'Schedule',
      status: hasContact && hasSchedule ? 'active' : params.selectedService ? 'pending' : 'pending',
    },
    {
      id: 'payment',
      label: 'Payment',
      status: params.result ? 'active' : hasContact && hasSchedule ? 'pending' : 'pending',
    },
  ] as const;
}

const productWelcomeSignals = [
  {
    label: 'Best-fit search',
    value: 'Finds the strongest local match from a natural message.',
  },
  {
    label: 'Booking cues',
    value: 'Shows price, duration, and location before the booking step.',
  },
  {
    label: 'Ready to book',
    value: 'Moves the chosen result straight into booking and checkout.',
  },
];

const productMicroSignals = ['Search', 'Select', 'Book'];

export function BookingAssistantDialog({
  content,
  isOpen,
  onClose,
  standalone = false,
  closeLabel,
  layoutMode = 'default',
  entrySourcePath = null,
}: BookingAssistantDialogProps) {
  const isProductAppLayout = standalone && layoutMode === 'product_app';
  const isDefaultPopupLayout = !standalone && layoutMode === 'default';
  const standaloneEyebrow = standalone ? brandDescriptor : 'Start Free Trial';
  const standaloneTitle = standalone ? `${brandName} booking assistant` : 'AI booking agent popup';
  const standaloneDescription = standalone
    ? 'Search, compare, and continue straight into booking.'
    : `Search services, chat by text or voice, then watch ${brandName} build the booking outcome live.`;
  const [catalog, setCatalog] = useState<BookingAssistantCatalogResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [userGeoContext, setUserGeoContext] = useState<UserGeoContext | null>(null);
  const [geoPromptState, setGeoPromptState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AIEventItem | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<BookingAssistantSessionResponse | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'chat' | 'booking'>('chat');
  const [productSheetSnap, setProductSheetSnap] = useState<ProductSheetSnap>('peek');
  const [productModuleTab, setProductModuleTab] = useState<ProductModuleTab>('overview');
  const [productSheetDragOffset, setProductSheetDragOffset] = useState(0);
  const [selectionAnimationKey, setSelectionAnimationKey] = useState(0);
  const [workflowHandoffKey, setWorkflowHandoffKey] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [liveReadSummary, setLiveReadSummary] = useState<{
    serviceId: string;
    semanticProvider: string | null;
    semanticProviderChain: string[];
    semanticFallbackApplied: boolean;
    availabilityState: string;
    bookingConfidence: string;
    recommendedBookingPath: string | null;
    pathType: string;
    nextStep: string;
    paymentAllowedBeforeConfirmation: boolean;
    warnings: string[];
    bookingRequestSummary: string | null;
  } | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const productSheetDragStateRef = useRef<{
    pointerId: number | null;
    startY: number;
    lastOffset: number;
    lastClientY: number;
    lastTimestamp: number;
    velocityY: number;
  }>({
    pointerId: null,
    startY: 0,
    lastOffset: 0,
    lastClientY: 0,
    lastTimestamp: 0,
    velocityY: 0,
  });
  const dialogBodyRef = useRef<HTMLDivElement | null>(null);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const bookingScrollRef = useRef<HTMLDivElement | null>(null);
  const bookingWorkflowSectionRef = useRef<HTMLDivElement | null>(null);
  const bookingOptionsSectionRef = useRef<HTMLDivElement | null>(null);
  const bookingDetailsSectionRef = useRef<HTMLFormElement | null>(null);
  const bookingConfirmedSectionRef = useRef<HTMLDivElement | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const minDate = getSydneyToday();
  const bookingAssistantV1Enabled = isPublicBookingAssistantV1Enabled();
  const bookingAssistantV1LiveReadEnabled = isPublicBookingAssistantV1LiveReadEnabled();
  const bookingAssistantV1SessionStartedRef = useRef(false);
  const bookingAssistantV1SessionIdRef = useRef<string | null>(null);
  const bookingAssistantV1SessionId =
    bookingAssistantV1SessionIdRef.current ?? createPublicBookingAssistantSessionId();
  bookingAssistantV1SessionIdRef.current = bookingAssistantV1SessionId;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();

    async function loadCatalog() {
      if (shouldUseLocalStaticPublicData()) {
        setCatalog(buildFallbackCatalog());
        setCatalogError('');
        setMessages([]);
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load service catalog');
        }

        const data = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(data);
        setMessages([]);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCatalog(buildFallbackCatalog());
          setCatalogError('');
          setMessages([]);
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, [isOpen]);

  async function requestGeoContext() {
    if (userGeoContext || geoPromptState === 'denied') {
      return userGeoContext;
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
          setUserGeoContext(nextContext);
          setGeoPromptState('granted');
          resolve(nextContext);
        },
        () => {
          setGeoPromptState('denied');
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 10 * 60 * 1000,
        },
      );
    });
  }

  async function requestChatReply(
    nextMessages: ChatMessage[],
    geoContext?: UserGeoContext | null,
  ) {
    const response = await fetch(`${getApiBaseUrl()}/booking-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: nextMessages[nextMessages.length - 1]?.content ?? '',
        conversation: nextMessages.map<ChatApiMessage>((item) => ({
          role: item.role,
          content: item.content,
        })),
        user_latitude: geoContext?.latitude ?? userGeoContext?.latitude ?? null,
        user_longitude: geoContext?.longitude ?? userGeoContext?.longitude ?? null,
        user_locality: geoContext?.locality ?? userGeoContext?.locality ?? null,
      }),
    });

    const payload = (await response.json()) as BookingAssistantChatResponse & {
      detail?: string;
    };
    if (!response.ok) {
      throw new Error(payload.detail || 'Unable to send message');
    }

    return payload;
  }

  useEffect(() => {
    if (!isOpen) {
      bookingAssistantV1SessionStartedRef.current = false;
      return;
    }

    setActiveMobilePanel('chat');
    setProductSheetSnap('peek');
    setProductModuleTab('overview');
    setPreferredSlot((current) => current || buildDefaultPreferredSlot());

    const previousOverflow = document.body.style.overflow;
    if (!standalone) {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (!standalone) {
        document.body.style.overflow = previousOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, standalone]);

  useEffect(() => {
    if (
      !isOpen ||
      (!bookingAssistantV1Enabled && !bookingAssistantV1LiveReadEnabled) ||
      bookingAssistantV1SessionStartedRef.current
    ) {
      return;
    }

    bookingAssistantV1SessionStartedRef.current = true;
    void primePublicBookingAssistantSession({
      anonymousSessionId: bookingAssistantV1SessionId,
      sourcePage:
        entrySourcePath ??
        (typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : '/'),
    });
  }, [
    isOpen,
    bookingAssistantV1Enabled,
    bookingAssistantV1LiveReadEnabled,
    entrySourcePath,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    window.addEventListener('orientationchange', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
      window.removeEventListener('orientationchange', updateViewportSize);
    };
  }, []);

  useEffect(() => {
    dialogBodyRef.current?.scrollTo({
      top: dialogBodyRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, result]);

  useEffect(() => {
    if (!voiceRepliesEnabled || !messages.length || typeof window === 'undefined') {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.role !== 'assistant') {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestMessage.content);
    utterance.lang = 'en-AU';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [messages, voiceRepliesEnabled]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedServiceId) {
      return;
    }

    if (!isProductAppLayout && isDefaultPopupLayout && viewportSize.width > 0 && viewportSize.width < 768) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (isProductAppLayout) {
        bookingScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (activeMobilePanel === 'booking') {
        customerNameInputRef.current?.focus();
      }
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [selectedServiceId, activeMobilePanel, isProductAppLayout, isDefaultPopupLayout, viewportSize.width]);

  useEffect(() => {
    if (!isProductAppLayout) {
      return;
    }

    setProductSheetDragOffset(0);
  }, [activeMobilePanel, isProductAppLayout, productSheetSnap]);

  const selectedService = useMemo(
    () =>
      catalog?.services.find((service) => service.id === selectedServiceId) ?? null,
    [catalog?.services, selectedServiceId],
  );
  const latestCustomerRequirement = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === 'user' && message.content.trim()) {
        return message.content.trim();
      }
    }

    return '';
  }, [messages]);
  const bookingRequirementConfig = useMemo(
    () => getBookingRequirementConfig(selectedService, selectedEvent),
    [selectedEvent, selectedService],
  );

  const latestSuggestedServices = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const matchedServices = messages[index]?.matchedServices;
      if (matchedServices?.length) {
        return curateServiceMatches(matchedServices);
      }
    }

    return [];
  }, [catalog?.services, messages]);
  const comparisonPair = useMemo(
    () => latestSuggestedServices.slice(0, 2),
    [latestSuggestedServices],
  );
  const hasConversationStarted = messages.length > 0 || chatLoading;
  const hasFirstSearchResult = useMemo(
    () =>
      messages.some(
        (message) =>
          message.role === 'assistant' &&
          ((message.matchedServices?.length ?? 0) > 0 ||
            (message.matchedEvents?.length ?? 0) > 0),
      ),
    [messages],
  );
  const shouldShowShortcutTopics = !hasConversationStarted && !hasFirstSearchResult;
  const showProductWelcomeState =
    isProductAppLayout && !hasConversationStarted && !hasFirstSearchResult;
  const isCompactMobileViewport =
    viewportSize.width > 0 &&
    viewportSize.width < 640 &&
    (viewportSize.width <= 390 || viewportSize.height <= 760);
  const isDefaultPopupMobileViewport =
    isDefaultPopupLayout && viewportSize.width > 0 && viewportSize.width < 768;
  const shouldUseCompactPopupMobileUI = isDefaultPopupMobileViewport && !isProductAppLayout;
  const hasSelectionReadyForBooking = Boolean(selectedServiceId || selectedEvent);
  const shouldHideCompactPopupSearchChrome =
    shouldUseCompactPopupMobileUI && hasConversationStarted && activeMobilePanel !== 'booking';
  const shouldShowCompactPopupTopStrip =
    shouldUseCompactPopupMobileUI && (!hasConversationStarted || activeMobilePanel === 'booking');
  const shouldCondenseProductChrome =
    isProductAppLayout &&
    (hasConversationStarted || hasSelectionReadyForBooking || productSheetSnap !== 'peek');
  const shouldHideProductSupportCopy =
    isProductAppLayout && (isCompactMobileViewport || hasConversationStarted);
  const shouldUseProductBottomNav = isProductAppLayout && isCompactMobileViewport;
  const shouldShowProductQuickToggle =
    isProductAppLayout &&
    !isCompactMobileViewport &&
    (hasConversationStarted || hasSelectionReadyForBooking || result);
  const shouldShowMobilePanelToggle =
    (isProductAppLayout && shouldShowProductQuickToggle) || isDefaultPopupMobileViewport;

  useEffect(() => {
    if (!isProductAppLayout || !isCompactMobileViewport) {
      return;
    }

    if (hasSelectionReadyForBooking) {
      setProductSheetSnap('peek');
      setActiveMobilePanel('chat');
      return;
    }

    if (!hasConversationStarted && !hasFirstSearchResult) {
      setProductSheetSnap('peek');
      setActiveMobilePanel('chat');
    }
  }, [
    hasConversationStarted,
    hasFirstSearchResult,
    hasSelectionReadyForBooking,
    isCompactMobileViewport,
    isProductAppLayout,
  ]);

  const processSteps = useMemo(
    () =>
      buildProcessSteps({
        messages,
        selectedService,
        customerName,
        customerEmail,
        customerPhone,
        requestedDate: preferredSlot,
        requestedTime: preferredSlot,
        loading,
        result,
      }),
    [
      customerEmail,
      customerPhone,
      customerName,
      loading,
      messages,
      preferredSlot,
      result,
      selectedService,
    ],
  );
  const completedStepCount = useMemo(
    () => getCompletedStepCount(processSteps),
    [processSteps],
  );
  const progressPercent = Math.round((completedStepCount / processSteps.length) * 100);
  const productBookingSheetPeek = shouldUseProductBottomNav
    ? 0
    : hasSelectionReadyForBooking
      ? 112
      : 92;
  const compactProductFooterOffset = shouldUseProductBottomNav
    ? hasSelectionReadyForBooking
      ? 132
      : 96
    : productBookingSheetPeek + 44;
  const productBookingSheetHalf = isCompactMobileViewport ? 236 : 352;
  const productSheetVisibleHeight =
    productSheetSnap === 'full'
      ? viewportSize.height || 0
      : productSheetSnap === 'half'
        ? productBookingSheetHalf
        : productBookingSheetPeek;
  const productSheetOpenRatio = Math.max(
    0,
    Math.min(
      1,
      productSheetVisibleHeight && viewportSize.height
        ? productSheetVisibleHeight /
            Math.max(viewportSize.height * 0.86, productSheetVisibleHeight)
        : productSheetSnap === 'full'
          ? 1
          : productSheetSnap === 'half'
            ? 0.64
            : 0.28,
    ),
  );
  const bookingJourneySteps = useMemo(
    () =>
      buildBookingJourneySteps({
        selectedService,
        preferredSlot,
        customerName,
        customerEmail,
        customerPhone,
        result,
      }),
    [customerEmail, customerName, customerPhone, preferredSlot, result, selectedService],
  );
  const currentFlowTab = useMemo<ProductModuleTab>(() => {
    if (result) {
      return 'confirmed';
    }
    if (hasSelectionReadyForBooking) {
      return 'details';
    }
    if (latestSuggestedServices.length > 0) {
      return 'options';
    }
    return 'overview';
  }, [hasSelectionReadyForBooking, latestSuggestedServices.length, result]);
  const productModuleTabs = useMemo(() => {
    const tabs: Array<{
      id: ProductModuleTab;
      label: string;
      badge?: string;
      disabled?: boolean;
    }> = [
      { id: 'overview', label: 'Flow' },
      {
        id: 'options',
        label: 'Options',
        badge: latestSuggestedServices.length ? `${latestSuggestedServices.length}` : undefined,
        disabled: !latestSuggestedServices.length,
      },
      {
        id: 'details',
        label: 'Details',
        disabled: !hasSelectionReadyForBooking,
      },
    ];

    if (result) {
      tabs.push({ id: 'confirmed', label: 'Confirmed' });
    }

    return tabs;
  }, [hasSelectionReadyForBooking, latestSuggestedServices.length, result]);

  useEffect(() => {
    if (!isProductAppLayout) {
      return;
    }

    setProductModuleTab(currentFlowTab);
  }, [currentFlowTab, isProductAppLayout]);

  function scrollToProductSection(tab: ProductModuleTab) {
    const sectionMap = {
      overview: bookingWorkflowSectionRef,
      options: bookingOptionsSectionRef,
      details: bookingDetailsSectionRef,
      confirmed: bookingConfirmedSectionRef,
    };

    const targetRef = sectionMap[tab];
    window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  function focusBookingDetails() {
    setActiveMobilePanel('booking');
    if (isProductAppLayout) {
      setProductSheetSnap('full');
      setProductModuleTab('details');
    }
    window.setTimeout(() => {
      if (isProductAppLayout) {
        bookingScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      customerNameInputRef.current?.focus();
    }, 120);
  }

  function focusPopupBookingDetails() {
    setActiveMobilePanel('booking');
    window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      customerNameInputRef.current?.focus();
    }, 120);
  }

  function handleProductSheetPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isProductAppLayout) {
      return;
    }

    productSheetDragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastOffset: 0,
      lastClientY: event.clientY,
      lastTimestamp: event.timeStamp,
      velocityY: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleProductSheetPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isProductAppLayout) {
      return;
    }

    const dragState = productSheetDragStateRef.current;
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - dragState.startY;
    const nextOffset =
      productSheetSnap === 'full'
        ? Math.max(0, deltaY)
        : Math.min(0, deltaY);

    const deltaTime = Math.max(1, event.timeStamp - dragState.lastTimestamp);
    dragState.velocityY = (event.clientY - dragState.lastClientY) / deltaTime;
    dragState.lastClientY = event.clientY;
    dragState.lastTimestamp = event.timeStamp;

    dragState.lastOffset = nextOffset;
    setProductSheetDragOffset(nextOffset);
  }

  function handleProductSheetPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!isProductAppLayout) {
      return;
    }

    const dragState = productSheetDragStateRef.current;
    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    const lastOffset = dragState.lastOffset;
    const velocityY = dragState.velocityY;

    if (velocityY <= -0.35 || lastOffset <= -120) {
      const nextSnap = productSheetSnap === 'peek' ? 'half' : 'full';
      setProductSheetSnap(nextSnap);
      setActiveMobilePanel('booking');
    } else if (velocityY >= 0.35 || lastOffset >= 72) {
      const nextSnap = productSheetSnap === 'full' ? 'half' : 'peek';
      setProductSheetSnap(nextSnap);
      setActiveMobilePanel(nextSnap === 'peek' ? 'chat' : 'booking');
    } else {
      setActiveMobilePanel(productSheetSnap === 'peek' ? 'chat' : 'booking');
    }

    productSheetDragStateRef.current = {
      pointerId: null,
      startY: 0,
      lastOffset: 0,
      lastClientY: 0,
      lastTimestamp: 0,
      velocityY: 0,
    };
    setProductSheetDragOffset(0);
  }

  async function sendChatMessage(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || chatLoading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: trimmedMessage,
      },
    ];

    setMessages(nextMessages);
    setChatInput('');
    setChatError('');
    setChatLoading(true);
    try {
      const liveReadPromise = bookingAssistantV1LiveReadEnabled
        ? getPublicBookingAssistantLiveReadRecommendation({
            query: trimmedMessage,
            sourcePage:
              entrySourcePath ??
              (typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : '/'),
            locationHint: userGeoContext?.locality ?? null,
            serviceCategory: selectedService?.category ?? null,
            selectedServiceId: selectedServiceId || null,
          })
        : Promise.resolve({
            candidateIds: [] as string[],
            rankedCandidates: [] as MatchCandidate[],
            suggestedServiceId: null,
            semanticAssistSummary: null,
            warnings: [] as string[],
            trustSummary: null,
            bookingRequestSummary: null,
            bookingPathSummary: null,
            usedLiveRead: false,
          });
      const shadowCandidateIdsPromise = bookingAssistantV1Enabled
        ? shadowPublicBookingAssistantSearch({
            query: trimmedMessage,
            sourcePage:
              entrySourcePath ??
              (typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : '/'),
            locationHint: userGeoContext?.locality ?? null,
            serviceCategory: selectedService?.category ?? null,
            selectedServiceId: selectedServiceId || null,
          })
        : Promise.resolve([] as string[]);

      let payload = await requestChatReply(nextMessages);
      if (
        payload.should_request_location &&
        !userGeoContext &&
        geoPromptState !== 'denied'
      ) {
        const geoContext = await requestGeoContext();
        if (geoContext) {
          payload = await requestChatReply(nextMessages, geoContext);
        }
      }

      const liveRead = await liveReadPromise;
      const shadowCandidateIds = await shadowCandidateIdsPromise;
      const v1CandidateIds = liveRead.usedLiveRead ? liveRead.candidateIds : shadowCandidateIds;
      const shadowMatchedServices = liveRead.usedLiveRead
        ? liveRead.rankedCandidates.map(toBookingReadyServiceItem)
        : v1CandidateIds
            .map((candidateId) =>
              catalog?.services.find((service) => service.id === candidateId) ?? null,
            )
            .filter((service): service is ServiceCatalogItem => Boolean(service));
      const candidatePriorityIds = liveRead.usedLiveRead ? liveRead.candidateIds : shadowCandidateIds;
      const mergedMatchedServices = liveRead.usedLiveRead
        ? curateServiceMatches(shadowMatchedServices, candidatePriorityIds)
        : curateServiceMatches(
            [...payload.matched_services, ...shadowMatchedServices],
            candidatePriorityIds,
          );
      const suggestedServiceId = liveRead.usedLiveRead
        ? liveRead.suggestedServiceId ?? shadowMatchedServices[0]?.id ?? null
        : payload.suggested_service_id ?? shadowMatchedServices[0]?.id ?? null;
      const assistantReply = liveRead.usedLiveRead
        ? buildLiveReadAssistantReply({
            rankedCount: mergedMatchedServices.length,
            warnings: liveRead.warnings,
            normalizedQuery: liveRead.semanticAssistSummary?.normalizedQuery ?? null,
            inferredLocation: liveRead.semanticAssistSummary?.inferredLocation ?? null,
            inferredCategory: liveRead.semanticAssistSummary?.inferredCategory ?? null,
          })
        : payload.reply;

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: assistantReply,
          matchedServices: mergedMatchedServices,
          matchedEvents: curateEventMatches(payload.matched_events),
        },
      ]);
      if (!payload.matched_events.length) {
        setSelectedEvent(null);
      }

      if (suggestedServiceId) {
        const shouldAutoSelectSuggestedService = !shouldUseCompactPopupMobileUI;

        if (shouldAutoSelectSuggestedService) {
          setSelectedServiceId(suggestedServiceId);
        } else {
          setSelectedServiceId('');
        }
        if (isProductAppLayout) {
          setProductModuleTab('options');
        }
        if (liveRead.usedLiveRead && liveRead.trustSummary && liveRead.bookingPathSummary) {
          setLiveReadSummary({
            serviceId: suggestedServiceId,
            semanticProvider: liveRead.semanticAssistSummary?.provider ?? null,
            semanticProviderChain: liveRead.semanticAssistSummary?.providerChain ?? [],
            semanticFallbackApplied: Boolean(liveRead.semanticAssistSummary?.fallbackApplied),
            availabilityState: liveRead.trustSummary.availabilityState,
            bookingConfidence: liveRead.trustSummary.bookingConfidence,
            recommendedBookingPath: liveRead.trustSummary.recommendedBookingPath,
            pathType: liveRead.bookingPathSummary.pathType,
            nextStep: liveRead.bookingPathSummary.nextStep,
            paymentAllowedBeforeConfirmation:
              liveRead.bookingPathSummary.paymentAllowedBeforeConfirmation,
            warnings: [
              ...liveRead.trustSummary.warnings,
              ...liveRead.bookingPathSummary.warnings,
            ],
            bookingRequestSummary: liveRead.bookingRequestSummary,
          });
        } else {
          setLiveReadSummary(null);
        }
        setSelectionAnimationKey((current) => current + 1);
        setWorkflowHandoffKey((current) => current + 1);
      } else {
        if (liveRead.usedLiveRead) {
          setSelectedServiceId('');
        }
        setLiveReadSummary(null);
      }
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : 'Unable to send message';
      setChatError(messageText);
    } finally {
      setChatLoading(false);
    }
  }

  function handleSelectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    setSelectedEvent(null);
    if (liveReadSummary?.serviceId !== serviceId) {
      setLiveReadSummary(null);
    }
    setSubmitError('');
    setResult(null);
    setActiveMobilePanel(shouldUseCompactPopupMobileUI ? 'booking' : 'chat');
    if (isProductAppLayout) {
      setProductSheetSnap('peek');
      setProductModuleTab('options');
    }
    setSelectionAnimationKey((current) => current + 1);
    setWorkflowHandoffKey((current) => current + 1);

    if (shouldUseCompactPopupMobileUI && activeMobilePanel !== 'booking') {
      focusPopupBookingDetails();
    }
  }

  function handleSelectEvent(event: AIEventItem) {
    setSelectedEvent(event);
    setPreferredSlot(toDatetimeLocalValue(event.start_at));
    setNotes(buildEventBookingContext(event, latestCustomerRequirement));
    setSubmitError('');
    setResult(null);
    setActiveMobilePanel(shouldUseCompactPopupMobileUI ? 'booking' : 'chat');
    if (isProductAppLayout) {
      setProductSheetSnap('peek');
      setProductModuleTab('details');
    }
    setSelectionAnimationKey((current) => current + 1);
    setWorkflowHandoffKey((current) => current + 1);

    if (shouldUseCompactPopupMobileUI && activeMobilePanel !== 'booking') {
      focusPopupBookingDetails();
    }
  }

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendChatMessage(chatInput);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) {
      setSubmitError('Select a service before creating the booking request.');
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
      setSubmitError('Choose a valid preferred booking time.');
      return;
    }

    setLoading(true);
    setSubmitError('');
    setResult(null);

    if (bookingAssistantV1Enabled) {
      void shadowPublicBookingAssistantLeadAndBookingIntent({
        sourcePage:
          entrySourcePath ??
          (typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : '/'),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        customerName,
        customerEmail: customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
        customerPhone: customerPhone.trim() || null,
        notes: notes.trim() || null,
        requestedDate: slot.requestedDate,
        requestedTime: slot.requestedTime,
        timezone: 'Australia/Sydney',
      });
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/booking-assistant/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
          customer_phone: customerPhone.trim() || null,
          requested_date: slot.requestedDate,
          requested_time: slot.requestedTime,
          timezone: 'Australia/Sydney',
          notes: notes.trim() || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Unable to create booking request');
      }

      setResult(payload as BookingAssistantSessionResponse);
      setProductModuleTab('confirmed');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create booking request';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceCapture() {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    setVoiceError('');

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-AU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      setChatInput(transcript);
      void sendChatMessage(transcript);
    };
    recognition.onerror = (event) => {
      setVoiceError(`Voice capture failed: ${event.error}`);
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={
        standalone
          ? isProductAppLayout
            ? 'h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,#dbeafe_0%,#eef4ff_18%,#ffffff_100%)]'
            : 'min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_38%),linear-gradient(180deg,#eef4fb_0%,#f8fafc_28%,#ffffff_100%)]'
          : 'fixed inset-0 z-50'
      }
    >
      {!standalone ? (
        <button
          type="button"
          aria-label="Close booking assistant"
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        />
      ) : null}

      <div
        className={
          standalone
            ? isProductAppLayout
              ? 'mx-auto flex h-full min-h-0 w-full items-stretch justify-center overflow-hidden px-0 py-0 sm:px-5 sm:py-5'
              : 'mx-auto flex min-h-screen w-full items-stretch justify-center p-0 sm:p-4'
            : 'absolute inset-0 mx-auto flex w-full items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6'
        }
      >
        <div
          className={`relative flex w-full flex-col overflow-hidden ${
            standalone
              ? isProductAppLayout
                ? 'h-full min-h-0 bg-transparent shadow-none sm:h-[min(84dvh,46rem)] sm:w-[min(100%,32rem)] lg:h-[min(82dvh,48rem)] lg:w-[min(100%,36rem)] xl:w-[min(100%,40rem)]'
                : 'min-h-screen bg-[#f8fafc] shadow-[0_35px_120px_rgba(15,23,42,0.35)] sm:min-h-0 sm:h-[min(96dvh,58rem)] sm:w-[min(94vw,30rem)] sm:rounded-[2rem] sm:border sm:border-white/20'
              : 'h-[100dvh] bg-[#f8fafc] shadow-[0_35px_120px_rgba(15,23,42,0.35)] sm:h-auto sm:max-h-[96dvh] sm:w-[min(90vw,88rem)] sm:rounded-[2rem] sm:border sm:border-white/20'
          }`}
        >
          <div
                className={
                  isProductAppLayout
                    ? 'relative mx-auto flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-0 border-slate-900/10 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] shadow-none sm:max-w-[34rem] sm:border sm:border-white/40 sm:rounded-[2.3rem] sm:shadow-[0_35px_120px_rgba(15,23,42,0.22)] sm:ring-1 sm:ring-black/5 lg:max-w-[38rem]'
                    : 'relative flex min-h-0 flex-1 flex-col'
                }
          >
            {isProductAppLayout ? (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0)_100%)] sm:h-24" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_60%)] sm:h-28" />
              </>
            ) : null}
          <div
            aria-hidden="true"
            className={isProductAppLayout ? 'hidden' : 'pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_58%)]'}
          />
          <div
            className={`border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-all ${
              hasConversationStarted
                ? isCompactMobileViewport
                  ? 'px-3 py-1.5 sm:px-6 sm:py-3'
                  : 'px-4 py-2 sm:px-6 sm:py-3'
                : 'px-4 py-3 sm:px-6 sm:py-4'
            } ${isProductAppLayout ? 'px-3 py-1.5 sm:px-3 sm:py-2' : ''} ${
              isProductAppLayout && isCompactMobileViewport ? 'hidden' : ''
            }`}
          >
            <div className={`flex items-center justify-between gap-2 ${isProductAppLayout ? '' : 'items-start'}`}>
              <div className="min-w-0">
                {isProductAppLayout ? (
                  <div className={`flex items-center justify-between gap-2 ${shouldCondenseProductChrome ? '' : 'sm:gap-3'}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white sm:h-8 sm:w-8">
                        AI
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-[12px] font-semibold tracking-tight text-slate-950">
                          {brandName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{catalogError ? 'Assistant offline' : 'Search to booking'}</span>
                        </div>
                      </div>
                    </div>
                    {!shouldHideProductSupportCopy ? (
                      <div className="hidden items-center gap-1.5 sm:flex">
                        {productMicroSignals.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div
                      className={`font-semibold uppercase tracking-[0.18em] text-sky-600 transition-all ${
                        shouldUseCompactPopupMobileUI
                          ? 'text-[9px]'
                          : hasConversationStarted
                          ? isCompactMobileViewport
                            ? 'text-[9px] sm:text-sm'
                            : 'text-[10px] sm:text-sm'
                          : 'text-[11px] sm:text-sm'
                      }`}
                    >
                      {standaloneEyebrow}
                    </div>
                    <h2
                      className={`mt-1 font-bold tracking-tight text-slate-950 transition-all ${
                        shouldUseCompactPopupMobileUI
                          ? 'hidden'
                          : hasConversationStarted && !isProductAppLayout
                          ? 'hidden sm:block sm:text-xl'
                          : 'text-base sm:text-2xl'
                      }`}
                    >
                      {standaloneTitle}
                    </h2>
                    <p
                      className={`mt-1 max-w-2xl text-xs text-slate-500 transition-all sm:text-sm ${
                        shouldUseCompactPopupMobileUI
                          ? 'hidden'
                          : hasConversationStarted && !isProductAppLayout
                            ? 'hidden sm:hidden'
                            : 'hidden sm:block'
                      }`}
                    >
                      {standaloneDescription}
                    </p>
                  </>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVoiceRepliesEnabled((current) => !current)}
                  className={`hidden rounded-full px-4 py-2 text-xs font-semibold transition sm:inline-flex ${
                    voiceRepliesEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  } ${isProductAppLayout ? 'sm:hidden' : ''}`}
                >
                  Voice replies {voiceRepliesEnabled ? 'On' : 'Off'}
                </button>
                {isProductAppLayout && !isCompactMobileViewport ? (
                  <button
                    type="button"
                    aria-label={voiceRepliesEnabled ? 'Voice on' : 'Voice off'}
                    onClick={() => setVoiceRepliesEnabled((current) => !current)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      voiceRepliesEnabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-semibold">{voiceRepliesEnabled ? 'V' : 'M'}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-full border border-slate-200 bg-white font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${
                    standalone
                      ? isProductAppLayout
                        ? 'h-8 w-8 px-0 py-0 text-[12px]'
                        : 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm'
                      : hasConversationStarted
                      ? isCompactMobileViewport
                        ? 'px-2 py-1 text-[11px] sm:px-4 sm:py-2 sm:text-sm'
                        : 'px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm'
                      : 'px-3 py-2 text-sm sm:px-4'
                  }`}
                >
                  {isProductAppLayout ? '←' : closeLabel ?? (standalone ? 'Back' : hasConversationStarted ? 'X' : 'Close')}
                </button>
              </div>
            </div>

            {isProductAppLayout && isCompactMobileViewport ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceRepliesEnabled((current) => !current)}
                  className={`flex min-h-9 items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-2 text-[10px] font-semibold transition ${
                    voiceRepliesEnabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                    <path d="M8 2.75a2 2 0 0 1 2 2v2.5a2 2 0 1 1-4 0v-2.5a2 2 0 0 1 2-2Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.75 7.5a3.25 3.25 0 1 0 6.5 0" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M8 10.75v2.5" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M6 13.25h4" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span>Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductSheetSnap('peek');
                    setActiveMobilePanel('chat');
                  }}
                  className="flex min-h-9 items-center justify-center gap-1.5 rounded-[1rem] border border-slate-200 bg-white px-2 py-2 text-[10px] font-semibold text-slate-700"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[9px] font-bold text-white">
                    B
                  </span>
                  <span className="truncate">BookedAI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductSheetSnap(hasSelectionReadyForBooking ? 'full' : 'half');
                    setProductModuleTab(hasSelectionReadyForBooking ? 'details' : 'overview');
                    setActiveMobilePanel('booking');
                  }}
                  className={`flex min-h-9 items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-2 text-[10px] font-semibold transition ${
                    hasSelectionReadyForBooking
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                    <path d="M3.25 4.25h9.5" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M4.5 2.75v3" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M11.5 2.75v3" strokeWidth="1.4" strokeLinecap="round" />
                    <rect x="3" y="4.75" width="10" height="8" rx="2" strokeWidth="1.4" />
                  </svg>
                  <span>Booking</span>
                </button>
              </div>
            ) : null}

            {shouldShowCompactPopupTopStrip ? (
              <div className="-mx-1 mt-1 overflow-x-auto pb-0.5 sm:hidden">
                <div className="flex min-w-max gap-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => setVoiceRepliesEnabled((current) => !current)}
                    className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition ${
                      voiceRepliesEnabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current">
                      <path d="M8 2.75a2 2 0 0 1 2 2v2.5a2 2 0 1 1-4 0v-2.5a2 2 0 0 1 2-2Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4.75 7.5a3.25 3.25 0 1 0 6.5 0" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M8 10.75v2.5" strokeWidth="1.4" strokeLinecap="round" />
                      <path d="M6 13.25h4" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span>Voice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMobilePanel('chat')}
                    className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition ${
                      activeMobilePanel === 'chat'
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSelectionReadyForBooking) {
                        focusPopupBookingDetails();
                      }
                    }}
                    disabled={!hasSelectionReadyForBooking}
                    className={`flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition ${
                      activeMobilePanel === 'booking'
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : !hasSelectionReadyForBooking
                          ? 'border-slate-200 bg-white text-slate-300'
                          : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>Booking</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className={`${
                !shouldShowMobilePanelToggle
                  ? 'hidden'
                  : `mt-1 flex items-center gap-2 ${
                      isProductAppLayout
                        ? ''
                        : `justify-between sm:hidden ${
                            hasConversationStarted
                              ? isCompactMobileViewport
                                ? 'mt-1'
                                : 'mt-1.5'
                              : 'mt-3'
                          }`
                    }`
              } ${shouldUseProductBottomNav || shouldUseCompactPopupMobileUI ? 'hidden' : ''}`}
            >
              <button
                type="button"
                onClick={() => setVoiceRepliesEnabled((current) => !current)}
                className={`rounded-full font-semibold transition ${isProductAppLayout ? 'hidden' : hasConversationStarted
                  ? isCompactMobileViewport
                    ? 'px-2 py-1 text-[10px]'
                    : 'px-2.5 py-1.5 text-[11px]'
                  : 'px-3 py-2 text-xs'} ${
                  voiceRepliesEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {hasConversationStarted
                  ? `Voice ${voiceRepliesEnabled ? 'On' : 'Off'}`
                  : `Voice ${voiceRepliesEnabled ? 'On' : 'Off'}`}
              </button>

              <div
                className={`grid flex-1 grid-cols-2 rounded-full bg-slate-100 ${isProductAppLayout ? 'p-[2px]' : hasConversationStarted
                  ? isCompactMobileViewport
                    ? 'p-[2px]'
                    : 'p-0.5'
                  : 'p-1'}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setProductSheetSnap('peek');
                    setActiveMobilePanel('chat');
                  }}
                  className={`rounded-full font-semibold transition ${isProductAppLayout ? 'px-2.5 py-1.5 text-[10px]' : hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'px-2.5 py-1 text-[10px]'
                      : 'px-3 py-1.5 text-[11px]'
                    : 'px-3 py-2 text-xs'} ${
                    activeMobilePanel === 'chat'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isProductAppLayout) {
                      setProductSheetSnap(hasSelectionReadyForBooking ? 'full' : 'half');
                      setProductModuleTab(hasSelectionReadyForBooking ? 'details' : 'overview');
                    }
                    setActiveMobilePanel('booking');
                  }}
                  disabled={isDefaultPopupMobileViewport && !hasSelectionReadyForBooking}
                  className={`relative rounded-full font-semibold transition ${isProductAppLayout ? 'px-2.5 py-1.5 text-[10px]' : hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'px-2.5 py-1 text-[10px]'
                      : 'px-3 py-1.5 text-[11px]'
                    : 'px-3 py-2 text-xs'} ${
                    activeMobilePanel === 'booking'
                      ? 'bg-slate-950 text-white'
                      : isDefaultPopupMobileViewport && !hasSelectionReadyForBooking
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-slate-600'
                  }`}
                >
                  Booking
                  {(isProductAppLayout || isDefaultPopupMobileViewport) && hasSelectionReadyForBooking ? (
                    <span
                      className={`ml-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-semibold ${
                        activeMobilePanel === 'booking'
                          ? 'bg-white/15 text-white'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      1
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>

            <div
              className={
                isProductAppLayout
                  ? 'flex min-h-0 flex-1 flex-col'
                  : 'grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.7fr)]'
              }
            >
            {isProductAppLayout ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.06),rgba(15,23,42,0.18))] transition-opacity duration-300"
                style={{ opacity: shouldUseProductBottomNav ? productSheetOpenRatio * 0.22 : productSheetOpenRatio * 0.5 }}
              />
            ) : null}
            <div
              className={`min-h-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] ${
                isProductAppLayout
                  ? 'relative z-0 flex flex-1'
                  : isDefaultPopupLayout
                    ? `${isDefaultPopupMobileViewport && activeMobilePanel === 'booking' ? 'hidden' : 'flex'} border-b border-slate-200 lg:border-b-0 lg:border-r`
                    : `border-b border-slate-200 lg:flex lg:border-b-0 lg:border-r ${
                        activeMobilePanel === 'chat' ? 'flex' : 'hidden'
                    }`
              }`}
              style={
                isProductAppLayout
                  ? {
                      filter: `blur(${productSheetOpenRatio * 0.35}px)`,
                      transform: `scale(${1 - productSheetOpenRatio * 0.004})`,
                      transition:
                        productSheetDragOffset !== 0
                          ? 'none'
                          : 'filter 220ms ease, transform 220ms ease',
                    }
                  : undefined
              }
            >
              <div
                className={`border-b border-slate-200 px-4 transition-all sm:px-6 ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'py-1.5 sm:py-2.5'
                      : 'py-2 sm:py-2.5'
                    : 'py-3 sm:py-4'
                } ${isProductAppLayout || shouldHideCompactPopupSearchChrome ? 'hidden' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className={`font-semibold text-slate-950 ${
                        hasConversationStarted
                          ? isCompactMobileViewport
                            ? 'text-[10px] sm:text-sm'
                            : 'text-[11px] sm:text-sm'
                          : 'text-sm'
                      }`}
                    >
                      {standalone ? `Chat with ${brandName}` : 'Live service search'}
                    </div>
                    {!hasConversationStarted ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {catalogError
                          ? 'Assistant offline'
                          : standalone
                            ? isProductAppLayout
                              ? `Ask naturally and let ${brandName} rank the strongest result for immediate booking.`
                              : 'Choose a vertical below or ask naturally like a real customer.'
                            : 'Assistant online and ready for any booking request'}
                      </div>
                    ) : (
                      <div
                        className={`text-slate-500 sm:mt-1 sm:text-[11px] ${
                          isCompactMobileViewport
                            ? 'mt-0 text-[9px]'
                            : 'mt-0.5 text-[10px]'
                        }`}
                      >
                        Results are pinned in the chat below for fast follow-through.
                      </div>
                    )}
                  </div>
                  <div
                    className={`rounded-full bg-emerald-50 font-medium text-emerald-700 ${
                      hasConversationStarted
                        ? isCompactMobileViewport
                          ? 'px-1.5 py-0.5 text-[9px]'
                          : 'px-2 py-0.5 text-[10px]'
                        : 'px-3 py-1 text-xs'
                    }`}
                  >
                    {catalogError ? 'Offline' : 'Online'}
                  </div>
                </div>

                {shouldShowShortcutTopics ? (
                  <div className={`flex gap-2 overflow-x-auto pb-1 ${isProductAppLayout ? 'mt-2' : 'mt-3'}`}>
                    {popupShortcutTopics.map((topic) => (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => void sendChatMessage(topic.prompt)}
                        className={`shrink-0 rounded-full border border-slate-200 bg-white font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 ${
                          isProductAppLayout ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
                        }`}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {isProductAppLayout && !isCompactMobileViewport ? (
                <div className={`border-b border-slate-200/80 bg-white/88 px-4 backdrop-blur ${
                  shouldCondenseProductChrome ? 'py-2' : 'py-3'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {hasSelectionReadyForBooking ? 'Booking is ready' : 'Search naturally'}
                      </div>
                      <div className="mt-1 line-clamp-1 text-[13px] font-semibold text-slate-950">
                        {hasSelectionReadyForBooking
                          ? selectedService?.name ?? selectedEvent?.title ?? 'Continue to booking'
                          : 'Ask like a customer and choose the best match.'}
                      </div>
                      {!shouldHideProductSupportCopy ? (
                        <div className="mt-1 text-[11px] leading-5 text-slate-500">
                          {hasSelectionReadyForBooking
                            ? 'The selected result stays attached to the booking sheet while the chat remains visible behind it.'
                            : 'Search chat, shortlist, and booking stay connected in one compact mobile flow.'}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      {hasSelectionReadyForBooking ? (
                        <button
                          type="button"
                          onClick={focusBookingDetails}
                          className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                        >
                          Continue
                        </button>
                      ) : (
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                          Revenue flow
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                ref={dialogBodyRef}
                className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 sm:px-6 sm:py-5 ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'py-2 sm:py-5'
                      : 'py-2.5 sm:py-5'
                    : 'py-3 sm:py-5'
                } ${isProductAppLayout ? 'px-4 py-3 sm:px-5' : ''} ${
                  showProductWelcomeState
                    ? isCompactMobileViewport
                      ? 'flex flex-col justify-start space-y-3'
                      : 'flex flex-col justify-center space-y-5'
                    : ''
                }`}
                style={
                  isProductAppLayout
                    ? { paddingBottom: `${compactProductFooterOffset}px` }
                    : undefined
                }
              >
                {showProductWelcomeState ? (
                  <div className={isCompactMobileViewport ? 'space-y-2.5' : 'space-y-3'}>
                    {isCompactMobileViewport ? (
                      <div className="rounded-[1.1rem] border border-slate-200 bg-white/94 px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Search bar
                            </div>
                            <div className="mt-1 text-[12px] font-semibold leading-4 text-slate-950">
                              Ask naturally. BookedAI keeps the best match ready below.
                            </div>
                          </div>
                          <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Live
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(155deg,#0f172a_0%,#111827_38%,#1d4ed8_100%)] p-4 text-white shadow-[0_18px_52px_rgba(15,23,42,0.18)]">
                        <div className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                          Native search flow
                        </div>
                        <div className="mt-3 text-[1.1rem] font-semibold leading-7 tracking-tight">
                          One message in. Best result out. Booking next.
                        </div>
                        <p className="mt-2 max-w-xs text-[12px] leading-5 text-slate-200">
                          Ask like a customer and let {brandName} keep the top result ready for booking.
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                          {productWelcomeSignals.map((signal) => (
                            <div
                              key={signal.label}
                              className="rounded-[1.1rem] bg-white/10 px-3 py-3 ring-1 ring-white/10 backdrop-blur"
                            >
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                                {signal.label}
                              </div>
                              <div className="mt-1 text-[11px] leading-4 text-slate-100">
                                {signal.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`rounded-[1.45rem] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] ${
                      isCompactMobileViewport ? 'p-3' : 'p-3.5'
                    } ${shouldUseProductBottomNav ? 'hidden' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Try a real search
                          </div>
                          <div className="mt-1 text-[13px] font-semibold text-slate-950">
                            Start with one tap or type below.
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Search first
                        </div>
                      </div>

                      <div className={`mt-3 ${
                        isCompactMobileViewport
                          ? '-mx-1 flex gap-2 overflow-x-auto px-1 pb-1'
                        : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                      }`}>
                        {popupShortcutTopics.map((topic) => (
                          <button
                            key={`welcome-${topic.label}`}
                            type="button"
                            onClick={() => void sendChatMessage(topic.prompt)}
                            className={`rounded-[1.1rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-left transition hover:border-slate-300 hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)] ${
                              isCompactMobileViewport
                                ? 'w-[82vw] max-w-[17rem] min-w-[13rem] shrink-0 px-3 py-2.5'
                                : 'px-3 py-3'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 text-sm font-semibold text-slate-950">{topic.label}</div>
                              <div className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                Search
                              </div>
                            </div>
                            <div className={`mt-2 text-[11px] text-slate-500 ${
                              isCompactMobileViewport ? 'line-clamp-2 leading-4' : 'line-clamp-3 leading-4'
                            }`}>
                              {topic.prompt}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className="space-y-3">
                    <div
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[90vw] break-words rounded-[1.5rem] px-4 py-3 text-sm leading-6 whitespace-pre-line sm:max-w-[88%] ${
                          message.role === 'user'
                            ? 'rounded-br-md bg-slate-950 text-white'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                        } ${isProductAppLayout ? 'px-3 py-2.5 text-[13px] leading-5' : ''}`}
                      >
                        {message.content}
                      </div>
                    </div>

                    {message.role === 'assistant' && message.matchedServices?.length ? (
                      <PartnerMatchShortlist
                        items={message.matchedServices}
                        batchSize={CHAT_RESULT_BATCH_SIZE}
                        resetKey={`${index}-${message.matchedServices.length}`}
                        listClassName="grid gap-2.5"
                        className=""
                        emptyState={null}
                        renderItem={(service, resultIndex) => {
                          const isSelected = service.id === selectedServiceId;
                          const decisionBadge = buildDecisionBadge(
                            service,
                            message.matchedServices ?? [],
                            resultIndex,
                            latestCustomerRequirement,
                          );
                          const bestForLabel = buildBestForLabel(service, latestCustomerRequirement);
                          const shortlistCard = buildPartnerMatchCardModelFromServiceItem(service, {
                            providerNameOverride: service.venue_name,
                            explanation: `Why it matches: ${bestForLabel}`,
                          });
                          const actionFooter = buildPartnerMatchActionFooterModelFromServiceItem(service, {
                            selected: isSelected,
                            providerNameOverride: service.venue_name,
                          });
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                handleSelectService(service.id);
                              }}
                              className={`overflow-hidden rounded-[1.35rem] border text-left transition ${
                                isSelected
                                  ? 'booking-card-picked border-slate-950 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
                              }`}
                            >
                              <div className={`${isProductAppLayout ? 'p-3.5' : isDefaultPopupMobileViewport ? 'p-3' : 'p-4'}`}>
                                <div className="mb-2.5">
                                  <PartnerMatchCard
                                    card={shortlistCard}
                                    tone={isSelected ? 'selected' : 'default'}
                                    badge={decisionBadge}
                                    trailingLabel={service.category}
                                  />
                                </div>
                                <div className={`line-clamp-2 text-[11px] leading-4 ${
                                  isSelected ? 'text-white/80' : 'text-slate-600'
                                }`}>
                                  {service.summary}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {[
                                    { label: 'Price', value: formatPrice(service.amount_aud) },
                                    { label: 'Duration', value: `${service.duration_minutes} min` },
                                    { label: 'Location', value: buildServiceLocationLabel(service) },
                                  ].map((fact) => (
                                    <div
                                      key={`${service.id}-${fact.label}`}
                                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 ${
                                        isSelected ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-70">
                                        {fact.label}
                                      </div>
                                      <div className="line-clamp-1 text-[10px] font-medium">
                                        {fact.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2.5">
                                  <PartnerMatchActionFooter
                                    model={actionFooter}
                                    tone={isSelected ? 'selected' : 'default'}
                                    onActionClick={(event) => event.stopPropagation()}
                                  />
                                </div>
                                {isSelected ? (
                                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[1.15rem] border border-emerald-400/30 bg-emerald-950/80 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold text-emerald-300">Selected — fill details to book</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); focusBookingDetails(); }}
                                      className="rounded-full bg-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-emerald-300"
                                    >
                                      Book now →
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        }}
                      />
                    ) : null}

                    {message.role === 'assistant' && message.matchedEvents?.length ? (
                      <div className="grid gap-2.5">
                        {message.matchedEvents.map((event) => {
                          const imageUrl = extractEventImageUrl(event);
                          return (
                            <div
                              key={`${event.url}-${event.start_at}`}
                              className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300"
                            >
                              {/* Compact event layout: badges + title + thumbnail */}
                              <div className="flex items-start gap-3">
                                {imageUrl ? (
                                  <div className="relative shrink-0 overflow-hidden rounded-xl border border-black/8 bg-slate-100" style={{ width: 68, height: 68 }}>
                                    <img src={imageUrl} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
                                  </div>
                                ) : (
                                  <div className="flex shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-[linear-gradient(135deg,#dbeafe,#dcfce7)] text-[9px] font-bold uppercase tracking-widest text-slate-500" style={{ width: 68, height: 68 }}>
                                    Event
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <div
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                        event.is_wsti_priority
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-sky-100 text-sky-700'
                                      }`}
                                    >
                                      {event.is_wsti_priority ? 'WSTI priority' : 'AI event'}
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500">
                                      {formatEventDate(event.start_at)}
                                    </div>
                                  </div>
                                  <div className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-5 text-slate-950">
                                    {event.title}
                                  </div>
                                  {event.organizer ? (
                                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                      by {event.organizer}
                                    </div>
                                  ) : null}
                                  {(event.venue_name || event.location) ? (
                                    <div className="mt-1 flex items-center gap-1 text-[12px] text-slate-600">
                                      <svg className="shrink-0 opacity-50" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                      <span className="line-clamp-1">{[event.venue_name, event.location].filter(Boolean).join(' • ')}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-500">
                                {event.summary}
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                <a
                                  href={event.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  View details
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleSelectEvent(event)}
                                  className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
                                >
                                  Book this event →
                                </button>
                                {event.map_url ? (
                                  <a
                                    href={event.map_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    Map
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}

                {chatLoading ? (
                  <div className="flex justify-start">
                    <div className="rounded-[1.5rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      {brandName} is thinking...
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                className={`border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:py-4 ${
                  isProductAppLayout
                    ? activeMobilePanel === 'booking'
                      ? 'sticky bottom-0 z-10 px-4 py-2.5 sm:px-5 sm:py-3'
                      : 'sticky bottom-0 z-10 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-5 sm:py-3'
                    : ''
                }`}
              >
                {isProductAppLayout && isCompactMobileViewport && hasSelectionReadyForBooking && selectedService ? (
                  <button
                    type="button"
                    onClick={focusBookingDetails}
                    className="mb-2.5 block w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Booking summary
                        </div>
                        <div className="mt-1 line-clamp-1 text-[12px] font-semibold text-slate-950">
                          {selectedService.name}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-semibold text-white">
                        Open
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        formatPrice(selectedService.amount_aud),
                        `${selectedService.duration_minutes} min`,
                        buildServiceDistanceLabel(selectedService),
                      ].map((fact) => (
                        <span
                          key={`${selectedService.id}-${fact}`}
                          className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </button>
                ) : null}
                {isDefaultPopupMobileViewport && hasSelectionReadyForBooking ? (
                  <div className="mb-2 rounded-[999px] border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-[12px] font-semibold text-slate-950">
                          {selectedService?.name ?? selectedEvent?.title ?? 'Ready to continue'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedService ? [
                            formatPrice(selectedService.amount_aud),
                            `${selectedService.duration_minutes} min`,
                            buildServiceDistanceLabel(selectedService),
                          ].map((fact) => (
                            <span
                              key={`popup-selected-${fact}`}
                              className="rounded-full bg-white px-2 py-0.5 text-[8px] font-medium text-slate-600 ring-1 ring-emerald-100"
                            >
                              {fact}
                            </span>
                          )) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={shouldUseCompactPopupMobileUI ? focusPopupBookingDetails : focusBookingDetails}
                        className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1.5 text-[9px] font-semibold text-white transition hover:bg-slate-800"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ) : null}
                <form onSubmit={handleChatSubmit}>
                  <label className="sr-only" htmlFor="assistant-chat-input">
                    Ask the booking assistant
                  </label>
                  <div className={`flex gap-2 ${
                    isProductAppLayout || shouldUseCompactPopupMobileUI
                      ? 'items-center'
                      : 'flex-col sm:flex-row sm:gap-3'
                  }`}>
                    <div className="relative min-w-0 flex-1">
                      <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${
                        isProductAppLayout || shouldUseCompactPopupMobileUI ? 'block' : 'hidden'
                      }`}>
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                          <path d="M4.25 4.75h7.5a1.75 1.75 0 0 1 1.75 1.75v3a1.75 1.75 0 0 1-1.75 1.75H8l-2.75 2v-2H4.25A1.75 1.75 0 0 1 2.5 9.5v-3a1.75 1.75 0 0 1 1.75-1.75Z" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <input
                        id="assistant-chat-input"
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder={
                          showProductWelcomeState
                            ? 'Try: best swim lesson near Caringbah this weekend'
                            : content.searchPlaceholder
                        }
                        className={`w-full rounded-2xl border border-slate-200 bg-white text-slate-700 outline-none transition focus:border-slate-400 ${
                          isProductAppLayout || shouldUseCompactPopupMobileUI
                            ? 'pl-9 pr-3 py-2.5 text-[13px]'
                            : 'px-4 py-3 text-sm'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={toggleVoiceCapture}
                      className={`rounded-full font-semibold transition ${
                        isListening
                          ? 'booking-listening bg-rose-600 text-white hover:bg-rose-500'
                          : 'border border-black/10 bg-white text-slate-700 hover:border-black/15 hover:bg-slate-50'
                      } ${isProductAppLayout || shouldUseCompactPopupMobileUI ? 'flex h-10 w-10 shrink-0 items-center justify-center px-0 py-0 text-[11px]' : 'w-full px-5 py-3 text-sm sm:w-auto'}`}
                    >
                      {isProductAppLayout || shouldUseCompactPopupMobileUI ? (
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                          <path d="M8 2.75a2 2 0 0 1 2 2v2.5a2 2 0 1 1-4 0v-2.5a2 2 0 0 1 2-2Z" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4.75 7.5a3.25 3.25 0 1 0 6.5 0" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M8 10.75v2.5" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M6 13.25h4" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      ) : isListening ? 'Listening...' : 'Talk'}
                    </button>
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className={`rounded-full bg-slate-950 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${
                        isProductAppLayout || shouldUseCompactPopupMobileUI ? 'flex h-10 min-w-10 shrink-0 items-center justify-center px-3 py-0 text-[11px]' : 'w-full px-5 py-3 text-sm sm:w-auto'
                      }`}
                    >
                      {isProductAppLayout || shouldUseCompactPopupMobileUI ? (
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                          <path d="M2.25 8 13 2.75l-2.75 10.5-2.5-3-3 .75L2.25 8Z" />
                        </svg>
                      ) : 'Send'}
                    </button>
                  </div>
                </form>

                {chatError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {chatError}
                  </div>
                ) : null}
                {voiceError ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {voiceError}
                  </div>
                ) : null}
                {catalogError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {catalogError}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              ref={bookingScrollRef}
                className={`min-h-0 overflow-y-auto overscroll-contain bg-[#f8fafc] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:py-5 ${
                isProductAppLayout
                  ? `absolute inset-x-0 bottom-0 z-20 flex max-h-[82%] w-full max-w-full flex-col overflow-hidden rounded-t-[1.5rem] border border-slate-200 bg-[#f8fafc] shadow-[0_-24px_60px_rgba(15,23,42,0.18)] ${
                      productSheetDragOffset !== 0 ? '' : 'transition-transform duration-300 ease-out'
                    } ${isCompactMobileViewport ? 'max-h-[76%] px-2 py-2' : ''} ${
                      shouldUseProductBottomNav ? 'pb-[calc(env(safe-area-inset-bottom)+4.5rem)]' : ''
                    } sm:left-3 sm:right-3 sm:mx-auto sm:max-h-[88%] sm:max-w-[calc(100%_-_1.5rem)] sm:rounded-t-[2rem] ${
                      isCompactMobileViewport ? '' : ''
                    }`
                  : isDefaultPopupLayout
                    ? `${isDefaultPopupMobileViewport && activeMobilePanel !== 'booking' ? 'hidden' : 'block'} border-t border-slate-200 lg:border-t-0`
                    : `lg:block ${activeMobilePanel === 'booking' ? 'block' : 'hidden'}`
              }`}
              style={
                isProductAppLayout
                  ? {
                      transform: `${productSheetSnap === 'full' ? 'translateY(0)' : `translateY(calc(100% - ${productSheetSnap === 'half' ? productBookingSheetHalf : productBookingSheetPeek}px))`} translateY(${productSheetDragOffset}px)`,
                      boxShadow: `0 -24px 60px rgba(15,23,42,${0.12 + productSheetOpenRatio * 0.16})`,
                    }
                  : undefined
              }
            >
              {isProductAppLayout && isCompactMobileViewport ? (
                <div className="sticky top-0 z-10 -mx-2 mb-1.5 border-b border-slate-200 bg-[#f8fafc]/96 px-2 pb-1.5 pt-1 backdrop-blur">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {productModuleTabs.map((tab) => (
                      <button
                        key={`compact-${tab.id}`}
                        type="button"
                        disabled={tab.disabled}
                        onClick={() => {
                          setProductModuleTab(tab.id);
                          setActiveMobilePanel('booking');
                          setProductSheetSnap(tab.id === 'confirmed' || tab.id === 'details' ? 'full' : 'half');
                          scrollToProductSection(tab.id);
                        }}
                        className={`flex min-h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[0.85rem] border px-2.5 py-1.5 text-center text-[10px] font-semibold transition ${
                          productModuleTab === tab.id
                            ? 'border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]'
                            : tab.disabled
                              ? 'border-slate-200 bg-white text-slate-300'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.badge ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                              productModuleTab === tab.id
                                ? 'bg-white/15 text-white'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {isProductAppLayout ? (
                <div
                  className={`mb-2 rounded-[1.25rem] border border-slate-200 bg-white/92 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ${
                    isCompactMobileViewport ? 'p-2.5' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setProductSheetSnap((current) =>
                      current === 'peek' ? 'half' : 'full',
                    );
                    setActiveMobilePanel('booking');
                  }}
                  onPointerDown={handleProductSheetPointerDown}
                  onPointerMove={handleProductSheetPointerMove}
                  onPointerUp={handleProductSheetPointerEnd}
                  onPointerCancel={handleProductSheetPointerEnd}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveMobilePanel('booking');
                    }
                  }}
                  >
                  {/* Drag handle + swipe hint */}
                  <div className="mb-2 flex flex-col items-center gap-1">
                    <div className="h-1.5 w-12 rounded-full bg-slate-900/12" />
                    {productSheetSnap === 'peek' && !hasSelectionReadyForBooking ? (
                      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Swipe up when you are ready to book
                      </div>
                    ) : null}
                  </div>
                  <div className={`flex items-center justify-between gap-3 ${
                    isCompactMobileViewport ? 'flex-wrap' : ''
                  }`}>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {hasSelectionReadyForBooking ? 'Selected service' : 'Booking flow'}
                      </div>
                      <div className={`mt-1 font-semibold text-slate-950 ${isCompactMobileViewport ? 'text-[12px]' : 'text-[13px]'}`}>
                        {hasSelectionReadyForBooking
                          ? (selectedService?.name ?? selectedEvent?.title ?? 'Ready to continue')
                          : 'Tap a result in chat to start booking.'}
                      </div>
                      {hasSelectionReadyForBooking && selectedService ? (
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {formatPrice(selectedService.amount_aud)} · {selectedService.duration_minutes} min
                        </div>
                      ) : null}
                    </div>
                    <div className={`flex shrink-0 items-center gap-2 ${isCompactMobileViewport ? 'w-full justify-between' : ''}`}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProductSheetSnap('peek');
                          setActiveMobilePanel('chat');
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        ← Chat
                      </button>
                      {hasSelectionReadyForBooking ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            focusBookingDetails();
                          }}
                          className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-800"
                        >
                          Book now →
                        </button>
                      ) : (
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">
                          Waiting
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`mt-2 text-slate-500 ${isCompactMobileViewport ? 'hidden' : 'text-[11px] leading-5'}`}>
                    {hasSelectionReadyForBooking
                      ? `Tap "Book now" to fill in your details, schedule a time, and complete payment.`
                      : `${brandName} moves from selected result to contact details, scheduling, and payment in one flow.`}
                  </div>
                  <div className={`mt-3 grid ${
                    isCompactMobileViewport && !hasSelectionReadyForBooking
                      ? 'hidden'
                      : isCompactMobileViewport
                        ? 'grid-cols-3 gap-1.5'
                        : 'grid-cols-1 gap-2 sm:grid-cols-3'
                  }`}>
                    {bookingJourneySteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`rounded-2xl border text-center ${
                          step.status === 'active'
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 bg-white text-slate-600'
                        } ${isCompactMobileViewport ? 'px-1.5 py-2' : 'px-2.5 py-2.5'}`}
                      >
                        <div className={`mx-auto flex items-center justify-center rounded-full font-semibold ${
                          step.status === 'active'
                            ? 'bg-white text-slate-950'
                            : 'bg-slate-100 text-slate-600'
                        } ${isCompactMobileViewport ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]'}`}>
                          {index + 1}
                        </div>
                        <div className={`mt-2 font-semibold ${isCompactMobileViewport ? 'text-[9px] leading-3' : 'text-[10px]'}`}>{step.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {isProductAppLayout ? (
                <div className={`sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200 bg-[#f8fafc]/96 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6 ${
                  isCompactMobileViewport ? 'hidden' : ''
                }`}>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {productModuleTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        disabled={tab.disabled}
                        onClick={() => {
                          setProductModuleTab(tab.id);
                          setActiveMobilePanel('booking');
                          setProductSheetSnap(tab.id === 'confirmed' || tab.id === 'details' ? 'full' : 'half');
                          scrollToProductSection(tab.id);
                        }}
                        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[1rem] border px-3 py-2 text-center text-[11px] font-semibold transition ${
                          productModuleTab === tab.id
                            ? 'border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]'
                            : tab.disabled
                              ? 'border-slate-200 bg-white text-slate-300'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.badge ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              productModuleTab === tab.id
                                ? 'bg-white/15 text-white'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                key={`workflow-panel-${selectedServiceId || selectedEvent?.url || 'idle'}-${workflowHandoffKey}`}
                ref={bookingWorkflowSectionRef}
                className="booking-handoff rounded-[1.75rem] border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {brandName} workflow
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      A visible process view of what the agent has already handled.
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {catalog?.stripe_enabled ? 'Stripe Ready' : 'Manual Payment'}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[#fbfbfd]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Workflow progress
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">
                        {completedStepCount} of {processSteps.length} steps completed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold tracking-tight text-slate-950">
                        {progressPercent}%
                      </div>
                      <div className="text-xs text-slate-500">completion</div>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#38bdf8_100%)] ${
                          selectedServiceId || selectedEvent ? 'booking-progress-nudge' : 'booking-progress-bar'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {processSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex gap-3 rounded-[1.4rem] border p-4 transition ${
                        step.status === 'completed'
                          ? 'border-emerald-100 bg-emerald-50/60'
                          : step.status === 'in_progress'
                            ? 'booking-step-live border-sky-100 bg-sky-50/70'
                            : 'border-slate-200 bg-[#fbfbfd]'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            step.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                            : step.status === 'in_progress'
                                ? 'booking-step-dot bg-sky-100 text-sky-700'
                                : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        {index < processSteps.length - 1 ? (
                          <div className="mt-2 h-full w-px bg-slate-200" />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {step.title}
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              step.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : step.status === 'in_progress'
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {step.status === 'completed'
                              ? 'Done'
                              : step.status === 'in_progress'
                                ? 'Live'
                                : 'Queued'}
                          </div>
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                key={`booking-panel-${selectedServiceId || selectedEvent?.url || 'empty'}-${selectionAnimationKey}`}
                ref={bookingPanelRef}
                className="booking-focus-in mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5"
              >
                <div ref={bookingOptionsSectionRef} className="h-0 w-0 overflow-hidden" aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      Best-fit shortlist
                    </div>
                    <div className={`mt-2 text-sm text-slate-500 ${shouldHideProductSupportCopy ? 'hidden' : ''}`}>
                      {selectedService
                        ? `${selectedService.name} is currently selected. Review the shortlist below, then continue to booking when you are ready.`
                        : `Review the top matched options below. ${brandName} keeps the strongest shortlist visible so users can compare before they book.`}
                    </div>
                  </div>
                </div>
                {selectedService && isProductAppLayout ? (
                  <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Selected for booking
                        </div>
                        <div className="mt-1 text-sm font-semibold text-emerald-950">
                          {selectedService.name}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-800">
                          {buildReadyToBookConfidence(selectedService, latestCustomerRequirement)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={focusBookingDetails}
                        className="rounded-full bg-slate-950 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(15,23,42,0.18)]"
                      >
                        Book now →
                      </button>
                    </div>
                  </div>
                ) : null}

                {latestSuggestedServices.length ? (
                  <PartnerMatchShortlist
                    items={latestSuggestedServices}
                    batchSize={CHAT_RESULT_BATCH_SIZE}
                    resetKey={latestSuggestedServices.map((service) => service.id).join('|')}
                    className="mt-4"
                    listClassName="grid gap-3"
                    emptyState={null}
                    renderMeta={({ visibleCount, totalCount }) =>
                      totalCount > CHAT_RESULT_BATCH_SIZE ? (
                        <div className="mb-3 flex justify-end">
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            Showing {visibleCount} of {totalCount}
                          </div>
                        </div>
                      ) : null
                    }
                    renderItem={(service, index) => {
                      const isSelected = service.id === selectedServiceId;
                      const decisionBadge = buildDecisionBadge(
                        service,
                        latestSuggestedServices,
                        index,
                        latestCustomerRequirement,
                      );
                      const bestForLabel = buildBestForLabel(service, latestCustomerRequirement);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            handleSelectService(service.id);
                            setActiveMobilePanel('booking');
                          }}
                          className={`rounded-[1.25rem] border p-4 text-left transition ${
                            isSelected
                              ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]'
                              : 'border-slate-200 bg-[#fbfbfd] text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  isSelected ? 'bg-white text-slate-950' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {decisionBadge}
                                </div>
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  isSelected ? 'bg-white/10 text-white' : 'bg-sky-50 text-sky-700'
                                }`}>
                                  {service.category}
                                </div>
                                <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  isSelected ? 'bg-emerald-300 text-slate-950' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {buildBookabilityLabel(service)}
                                </div>
                                <div className={`text-[11px] ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                                  {service.duration_minutes} min
                                </div>
                              </div>
                              <div className="mt-2 text-sm font-semibold">{service.name}</div>
                              <div className={`mt-1 line-clamp-2 text-[11px] leading-4 ${isSelected ? 'text-white/75' : 'text-slate-600'}`}>
                                {service.summary}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {[
                                  formatPrice(service.amount_aud),
                                  `${service.duration_minutes} min`,
                                  buildServiceLocationLabel(service),
                                ].map((fact) => (
                                  <div
                                    key={`${service.id}-compact-${fact}`}
                                    className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1.5 text-[10px] font-medium ${
                                      isSelected ? 'bg-white/10 text-white' : 'bg-white text-slate-700'
                                    }`}
                                  >
                                    <span className="line-clamp-1">{fact}</span>
                                  </div>
                                ))}
                              </div>
                              <div className={`mt-2.5 rounded-2xl px-3 py-2 text-xs ${
                                isSelected ? 'bg-white/10 text-white/85' : 'bg-amber-50 text-amber-900'
                              }`}>
                                <span className="font-semibold">Why it matches:</span> {bestForLabel}
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {buildServiceConfidenceNotes(service).slice(0, 2).map((note) => (
                                  <div
                                    key={`${service.id}-shortlist-confidence-${note}`}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                      isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {note}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-semibold">
                                {formatPrice(service.amount_aud)}
                              </div>
                              <div className={`mt-1 text-[11px] ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                                {isSelected ? 'Selected' : 'Tap to choose'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    }}
                  />
                ) : null}

                {comparisonPair.length >= 2 ? (
                  <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-[#fbfbfd] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Compare top options
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      {buildDecisionSummary(comparisonPair, latestCustomerRequirement)}
                    </div>
                    <div className="mt-3 grid gap-3">
                      {comparisonPair.map((service, index) => (
                        <div
                          key={`compare-${service.id}`}
                          className={`rounded-[1rem] border px-4 py-3 ${
                            service.id === selectedServiceId
                              ? 'border-slate-950 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                                {buildDecisionBadge(service, comparisonPair, index, latestCustomerRequirement)}
                              </div>
                              <div className="mt-1 text-sm font-semibold">{service.name}</div>
                              <div className="mt-2 text-xs opacity-80">
                                {buildBestForLabel(service, latestCustomerRequirement)}
                              </div>
                            </div>
                            <div className="text-right text-sm font-semibold">
                              {formatPrice(service.amount_aud)}
                            </div>
                          </div>
                          <div className="mt-2 text-xs opacity-80">
                            {service.duration_minutes} min
                            {(service.venue_name || service.location)
                              ? ` • ${[service.venue_name, service.location].filter(Boolean).join(' • ')}`
                              : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <form
                key={`booking-form-${selectedServiceId || selectedEvent?.url || 'empty'}-${selectionAnimationKey}`}
                ref={bookingDetailsSectionRef}
                className="booking-reveal mt-5 space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5"
                onSubmit={handleSubmit}
              >
                {isDefaultPopupMobileViewport ? (
                  <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-slate-200 bg-[#fbfbfd] px-3 py-2.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Booking details
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-slate-950">
                        Complete details after you are happy with the selected result.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMobilePanel('chat')}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      ← Chat
                    </button>
                  </div>
                ) : null}
                <div>
                  {/* Booking step header */}
                  <div className="mb-4 flex items-center gap-2">
                    {[
                      { step: 1, label: 'Service', done: Boolean(selectedService || selectedEvent) },
                      { step: 2, label: 'Details', done: false },
                      { step: 3, label: 'Confirm', done: Boolean(result) },
                    ].map(({ step, label, done }, index, arr) => (
                      <div key={step} className="flex flex-1 items-center gap-1.5">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                            done ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {done ? '✓' : step}
                          </div>
                          <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                            step === 2 ? 'text-slate-950' : 'text-slate-400'
                          }`}>{label}</span>
                        </div>
                        {index < arr.length - 1 ? (
                          <div className={`mb-3 h-px flex-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {content.formIntro ? (
                    <p className="mb-3 text-sm leading-6 text-slate-500">
                      {content.formIntro}
                    </p>
                  ) : null}
                  {selectedService ? (
                    <div className="mt-1 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{selectedService.name}</div>
                          <div className="mt-1 text-xs text-emerald-800">
                            {selectedService.category} • {selectedService.duration_minutes} min • {formatPrice(selectedService.amount_aud)}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">✓ Selected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Choose a result from the search panel to continue.
                    </div>
                  )}
                  {selectedService && isProductAppLayout ? (
                    <div className="mt-3 rounded-[1.35rem] border border-slate-200 bg-[#fbfbfd] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            Ready to book
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {selectedService.name}
                          </div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-500">
                            {buildReadyToBookSummary(selectedService, latestCustomerRequirement)}
                          </div>
                        </div>
                          <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            {buildBookabilityLabel(selectedService)}
                          </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Price
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {formatPrice(selectedService.amount_aud)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Duration
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-950">
                            {selectedService.duration_minutes} min
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Location
                          </div>
                          <div className="mt-1 text-[11px] font-medium leading-4 text-slate-700">
                            {buildServiceLocationLabel(selectedService)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Best for
                          </div>
                          <div className="mt-1 text-[11px] font-medium leading-4 text-slate-700">
                            {buildBestForLabel(selectedService, latestCustomerRequirement)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {selectedService && liveReadSummary?.serviceId === selectedService.id ? (
                    <div className="mt-3 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                      <div className="font-semibold">Prompt 5 live-read guidance</div>
                      <div className="mt-1 text-xs text-sky-800">
                        Availability: {liveReadSummary.availabilityState} • Confidence:{' '}
                        {liveReadSummary.bookingConfidence}
                      </div>
                      {(liveReadSummary.semanticProvider || liveReadSummary.semanticProviderChain.length > 0) ? (
                        <div className="mt-1 text-xs text-sky-800">
                          AI search:{' '}
                          {liveReadSummary.semanticFallbackApplied
                            ? `${liveReadSummary.semanticProvider ?? 'unknown'} fallback`
                            : liveReadSummary.semanticProvider ?? 'active'}
                          {liveReadSummary.semanticProviderChain.length > 0
                            ? ` • ${liveReadSummary.semanticProviderChain.join(' -> ')}`
                            : ''}
                        </div>
                      ) : null}
                      {liveReadSummary.bookingRequestSummary ? (
                        <div className="mt-1 text-xs text-sky-800">
                          Booking context: {liveReadSummary.bookingRequestSummary}
                        </div>
                      ) : null}
                      <div className="mt-2 text-xs text-sky-800">
                        Recommended path: {liveReadSummary.recommendedBookingPath ?? 'Not set'} •
                        CTA path: {liveReadSummary.pathType}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-sky-900">
                        {liveReadSummary.nextStep}
                      </p>
                      <p className="mt-2 text-xs text-sky-800">
                        Payment before confirmation:{' '}
                        {liveReadSummary.paymentAllowedBeforeConfirmation ? 'Allowed' : 'Blocked'}
                      </p>
                      {liveReadSummary.warnings.length > 0 ? (
                        <div className="mt-2 space-y-1 text-xs text-sky-800">
                          {Array.from(new Set(liveReadSummary.warnings)).map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedEvent ? (
                    <div className="mt-3 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{selectedEvent.title}</div>
                          <div className="mt-1 text-xs text-sky-800">
                            {formatEventDate(selectedEvent.start_at)}
                          </div>
                          {(selectedEvent.venue_name || selectedEvent.location) ? (
                            <div className="mt-1 text-xs text-sky-800">
                              {[selectedEvent.venue_name, selectedEvent.location]
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(null)}
                          className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                        >
                          Remove event link
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {isProductAppLayout ? (
                  <div className="rounded-[1.25rem] border border-slate-200 bg-[#fbfbfd] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Booking journey
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {bookingJourneySteps.map((step, index) => (
                        <div
                          key={`journey-${step.id}`}
                          className={`rounded-2xl px-3 py-3 text-center ${
                            step.status === 'active'
                              ? 'bg-slate-950 text-white'
                              : 'bg-white text-slate-600 ring-1 ring-slate-200'
                          }`}
                        >
                          <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                            step.status === 'active'
                              ? 'bg-white text-slate-950'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="mt-2 text-[11px] font-semibold">{step.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-slate-600">
                    <span className="mb-2 block font-medium text-slate-700">Name</span>
                    <input
                      ref={customerNameInputRef}
                      required
                      type="text"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="mb-2 block font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="Email address"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </label>
                </div>

                <label className="block text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Phone</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <span className="mt-2 block text-xs text-slate-500">
                    Enter either email or phone. You do not need both.
                  </span>
                </label>

                <label className="block text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">Preferred time</span>
                  <input
                    required
                    type="datetime-local"
                    value={preferredSlot}
                    onChange={(event) => setPreferredSlot(event.target.value)}
                    min={`${minDate}T08:00`}
                    step={900}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <span className="mt-2 block text-xs text-slate-500">
                    Auto-filled from the event when available, otherwise defaults to 2 hours from now.
                  </span>
                </label>

                <label className="block text-sm text-slate-600">
                  <span className="mb-2 block font-medium text-slate-700">
                    {bookingRequirementConfig.label}
                  </span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={bookingRequirementConfig.placeholder}
                    className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                {selectedService && !result ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-[#fbfbfd] px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Booking summary</div>
                        <div className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-slate-950">{selectedService.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {formatPrice(selectedService.amount_aud)} • {selectedService.duration_minutes} min
                          {selectedService.location ? ` • ${selectedService.location}` : ''}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        selectedService.booking_url ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {selectedService.booking_url ? 'Direct booking' : 'Chat confirm'}
                      </span>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || (!selectedService && !selectedEvent)}
                  className={`w-full rounded-full px-5 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    loading
                      ? 'bg-slate-700'
                      : selectedService || selectedEvent
                        ? 'bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] hover:brightness-110 shadow-[0_8px_24px_rgba(15,23,42,0.22)]'
                        : 'bg-slate-400'
                  }`}
                >
                  {loading ? 'Preparing your booking...' : content.submitLabel}
                </button>

                {isProductAppLayout && selectedService && !result ? (
                  <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-1 border-t border-slate-200 bg-white/92 px-5 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] backdrop-blur">
                    <div className="rounded-[1.15rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            Ready to book
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-slate-950">
                            {selectedService.name}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-500">
                            {formatPrice(selectedService.amount_aud)} • {selectedService.duration_minutes} min • {buildBestForLabel(selectedService, latestCustomerRequirement)}
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={loading || !selectedService}
                          className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? 'Preparing...' : 'Book now'}
                        </button>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 line-clamp-1 text-[10px] leading-4 text-slate-500">
                          {buildServiceLocationLabel(selectedService)}
                        </div>
                        <div className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                          {buildBookabilityLabel(selectedService)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </form>

              {result ? (
                <div
                  ref={bookingConfirmedSectionRef}
                  className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                >
                  {/* Thank You hero — prominent on all layouts */}
                  <div className="mb-5 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(155deg,#052e16_0%,#064e3b_48%,#0f766e_100%)] px-5 py-5 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-400/30">
                        <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                          All done
                        </div>
                        <div className="text-xl font-bold tracking-tight text-white">
                          Thank you!
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-100">
                      Your booking is confirmed. Check the details below and complete payment when ready.
                    </p>
                    {/* Primary CTA right here — most prominent spot */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.history.replaceState({}, '', '/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-4 w-full rounded-[1rem] bg-white px-4 py-3 text-center text-[12px] font-semibold text-slate-950 transition hover:bg-slate-50"
                    >
                      ← Back to Homepage
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#111827_38%,#0f766e_100%)] p-4 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                          Booking confirmed
                        </div>
                        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                          Booking reference
                        </div>
                        <div className="mt-1 text-2xl font-bold tracking-tight text-white">
                          {result.booking_reference}
                        </div>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-100">
                          {result.confirmation_message}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white p-2 shadow-sm">
                        <img
                          src={result.qr_code_url}
                          alt={`QR code for ${result.booking_reference}`}
                          className="h-24 w-24 rounded-xl bg-white object-cover"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-[1rem] bg-white/10 px-3 py-3 ring-1 ring-white/10">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
                          Service
                        </div>
                        <div className="mt-1 line-clamp-2 text-[12px] font-semibold text-white">
                          {result.service.name}
                        </div>
                      </div>
                      <div className="rounded-[1rem] bg-white/10 px-3 py-3 ring-1 ring-white/10">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
                          Price
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-white">
                          {result.amount_label}
                        </div>
                      </div>
                      <div className="rounded-[1rem] bg-white/10 px-3 py-3 ring-1 ring-white/10">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
                          Date & Time
                        </div>
                        <div className="mt-1 text-[12px] font-semibold text-white">
                          {result.requested_date}
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/70">{result.requested_time}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-2 text-slate-600 sm:grid-cols-2">
                    <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Requested slot
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-slate-950">
                        {result.requested_date}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        {result.requested_time}
                      </div>
                    </div>
                    <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Follow-up
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-slate-950">
                        {result.email_status === 'sent' ? 'Email sent' : 'Manual follow-up'}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">
                        {result.contact_email}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {buildBookingOutcomeSteps(result).map((step) => (
                      <div key={step.label} className="rounded-[1rem] bg-[#f5f5f7] px-3 py-3">
                        <div className="text-[11px] font-semibold text-slate-950">{step.label}</div>
                        <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${step.tone}`}>
                          {step.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <a
                      href={result.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-full rounded-[1rem] bg-slate-950 px-3 py-3.5 text-center text-[12px] font-semibold leading-4 text-white transition hover:bg-slate-800 shadow-sm"
                    >
                      {result.payment_status === 'stripe_checkout_ready'
                        ? 'Complete Payment via Stripe →'
                        : 'Confirm Payment by Email →'}
                    </a>
                    {result.meeting_event_url ? (
                      <a
                        href={result.meeting_event_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[1rem] border border-black/10 bg-white px-3 py-3 text-center text-[11px] font-semibold leading-4 text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                      >
                        View calendar event
                      </a>
                    ) : null}
                    {!result.meeting_event_url && result.calendar_add_url ? (
                      <a
                        href={result.calendar_add_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[1rem] border border-black/10 bg-white px-3 py-3 text-center text-[11px] font-semibold leading-4 text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                      >
                        Add to Google Calendar
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${result.contact_email}?subject=${encodeURIComponent(`${brandName} booking ${result.booking_reference}`)}`}
                      className="rounded-[1rem] border border-black/10 bg-white px-3 py-3 text-center text-[11px] font-semibold leading-4 text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                    >
                      Contact provider
                    </a>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    {result.meeting_status === 'scheduled'
                      ? 'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                      : result.calendar_add_url
                        ? 'A Google Calendar action is ready immediately and is also included in the confirmation email. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                      : 'Stripe returns the customer to the homepage after payment. Email confirmation is handled here, and the booking is already passed into the workflow for calendar or team follow-up.'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
