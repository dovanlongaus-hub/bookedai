import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  brandDescriptor,
  brandName,
  demoContent,
  type BookingAssistantContent,
} from '../data';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../../shared/config/api';
import { resolveApiErrorMessage } from '../../../shared/api/client';
import { isPublicBookingAssistantV1LiveReadEnabled } from '../../../shared/config/publicBookingAssistant';
import {
  createPublicBookingAssistantLeadAndBookingIntent,
  getPublicBookingAssistantLiveReadRecommendation,
  shouldFallbackToLegacyBookingSession,
  shadowPublicBookingAssistantLeadAndBookingIntent,
} from '../assistant/publicBookingAssistantV1';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  toBookingReadyServiceItem,
} from '../../../shared/presenters/partnerMatch';
import { PartnerMatchCard } from '../../../shared/components/PartnerMatchCard';
import { PartnerMatchActionFooter } from '../../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchShortlist } from '../../../shared/components/PartnerMatchShortlist';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SignalPill } from '../ui/SignalPill';

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
  tags: string[];
  featured: boolean;
};

type BookingAssistantCatalogResponse = {
  status: string;
  business_email: string;
  stripe_enabled: boolean;
  services: ServiceCatalogItem[];
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

type BookingAssistantChatResponse = {
  status: string;
  reply: string;
  matched_services: ServiceCatalogItem[];
  matched_events: AIEventItem[];
  suggested_service_id: string | null;
  should_request_location: boolean;
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
  portal_url?: string;
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

type ChatApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type UserGeoContext = {
  latitude: number;
  longitude: number;
  locality: string | null;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  matchedServices?: ServiceCatalogItem[];
  matchedEvents?: AIEventItem[];
};

type BookingAssistantSectionProps = {
  content: BookingAssistantContent;
  onOpenAssistant: () => void;
};

const starterPrompts = [
  'Find a facial in Sydney under $150',
  'Book a haircut and colour consultation for Friday afternoon',
  'I need physio for shoulder pain near Parramatta',
  'Book a restaurant table for 6 tomorrow night',
  'Find a private dining or team dinner venue in Sydney',
  'I want a housing consultation about apartment or townhouse projects',
  'How do I renew my RSL membership?',
  'Find a quick after-work facial or haircut near Sydney CBD',
  'Compare two facial options in Sydney under $150',
  'What AI events are coming up at WSTI and Western Sydney Startup Hub?',
  'Find AI events at WSTI this week and recommend the next step',
  'Find signage or expo booth printing for an event in Sydney',
];

const CHAT_RESULT_BATCH_SIZE = 3;

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

function extractEventImageUrl(event: AIEventItem) {
  return extractImageUrl(event.image_url) ?? extractImageUrl(event.map_snapshot_url);
}

function extractServiceImageUrl(service: ServiceCatalogItem) {
  return extractImageUrl(service.image_url) ?? extractImageUrl(service.map_snapshot_url);
}

function getServiceVisualLabel(service: ServiceCatalogItem) {
  return extractImageUrl(service.image_url) ? 'Provider image' : 'Google map location';
}

function getEventVisualLabel(event: AIEventItem) {
  return extractImageUrl(event.image_url) ? 'Event image' : 'Google map location';
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

function curateServiceMatches(services: ServiceCatalogItem[]) {
  return Array.from(new Map(services.map((service) => [service.id, service])).values());
}

function curateEventMatches(events: AIEventItem[]) {
  return Array.from(
    new Map(events.map((event) => [`${event.url}-${event.start_at}`, event])).values(),
  );
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSydneyToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
  }).format(new Date());
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

function buildJustInTimeLocationMessage() {
  return 'Turn on location on this device so I can narrow nearby matches in real time instead of showing broad Australia-wide results.';
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

function buildServiceFitNotes(service: ServiceCatalogItem) {
  if (service.tags.length) {
    return service.tags
      .slice(0, 3)
      .map((tag) => tag.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase()));
  }

  return [service.category, `${service.duration_minutes} min`];
}

function buildBestForLabel(service: ServiceCatalogItem, userQuery: string) {
  const lowered = userQuery.toLowerCase();
  const tags = service.tags.map((tag) => tag.toLowerCase());
  const category = service.category.toLowerCase();

  if (lowered.includes('compare')) {
    return 'Side-by-side decision making';
  }
  if (tags.some((tag) => ['group', 'party', 'guests', 'meeting'].includes(tag))) {
    return 'Groups, events, and shared bookings';
  }
  if (tags.some((tag) => ['membership', 'renewal', 'signup', 'member'].includes(tag))) {
    return 'Joining, renewing, or onboarding';
  }
  if (category.includes('housing') || category.includes('property')) {
    return 'Project discovery and property consultation';
  }
  if (category.includes('print')) {
    return 'Expo booths, signage, and branded materials';
  }
  if (category.includes('healthcare')) {
    return 'Guided care and first-step assessment';
  }
  if (service.duration_minutes <= 20) {
    return 'A quick next step';
  }
  return 'A strong all-round booking fit';
}

function buildDecisionBadge(
  service: ServiceCatalogItem,
  services: ServiceCatalogItem[],
  index: number,
  userQuery: string,
) {
  const lowered = userQuery.toLowerCase();
  const minDuration = Math.min(...services.map((item) => item.duration_minutes));
  const minAmount = Math.min(...services.map((item) => item.amount_aud));

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
    /(housing|property|project|apartment|home|investment)/i.test(lowered)
  ) {
    return 'Project consult';
  }
  if (service.category.toLowerCase().includes('print') && lowered.includes('event')) {
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
  const lowered = userQuery.toLowerCase();
  if (lowered.includes('compare')) {
    return `Compare ${first.name} against ${second.name} on price, timing, and location before you book.`;
  }
  return `${first.name} is the strongest fit right now, while ${second.name} is the main alternative if you want a second option before booking.`;
}

function buildServiceLocationLabel(service: ServiceCatalogItem) {
  return [service.venue_name, service.location].filter(Boolean).join(' • ') || 'Location confirmed during booking';
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
            ? 'Sent into team flow'
            : 'Queued for follow-up',
      tone:
        result.meeting_status === 'scheduled' || result.workflow_status
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
    },
  ];
}

export function BookingAssistantSection({
  content,
  onOpenAssistant,
}: BookingAssistantSectionProps) {
  const isLiveReadMode = isPublicBookingAssistantV1LiveReadEnabled();
  const [catalog, setCatalog] = useState<BookingAssistantCatalogResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [compareServiceIds, setCompareServiceIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AIEventItem | null>(null);
  const [selectionAnimationKey, setSelectionAnimationKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [chatError, setChatError] = useState('');
  const [userGeoContext, setUserGeoContext] = useState<UserGeoContext | null>(null);
  const [geoPromptState, setGeoPromptState] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [showInlineBooking, setShowInlineBooking] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'chat' | 'booking'>('chat');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState<BookingAssistantSessionResponse | null>(null);
  const selectedMatchRef = useRef<HTMLDivElement | null>(null);
  const inlineBookingRef = useRef<HTMLDivElement | null>(null);
  const bookingNameInputRef = useRef<HTMLInputElement | null>(null);
  const minDate = getSydneyToday();

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      if (shouldUseLocalStaticPublicData()) {
        setCatalog(buildFallbackCatalog());
        setCatalogError('');
        setMessages([]);
        setSelectedServiceId('');
        setCompareServiceIds([]);
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(resolveApiErrorMessage(payload, 'Unable to load service catalog.'));
        }

        const payload = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(payload);
        setMessages([]);
        setSelectedServiceId('');
        setCompareServiceIds([]);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCatalog(buildFallbackCatalog());
          setCatalogError('');
          setMessages([]);
        }
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

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
    const response = await fetch(`${getApiBaseUrl()}/chat/send`, {
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
      throw new Error(resolveApiErrorMessage(payload, 'Unable to send message.'));
    }

    return payload;
  }

  const highlightedServices = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const matchedServices = messages[index]?.matchedServices;
      if (matchedServices?.length) {
        return curateServiceMatches(matchedServices);
      }
    }

    return [];
  }, [catalog?.services, messages]);

  const selectedService =
    highlightedServices.find((service) => service.id === selectedServiceId) ??
    catalog?.services.find((service) => service.id === selectedServiceId) ??
    null;

  const compareServices = useMemo(
    () =>
      compareServiceIds
        .map((serviceId) => highlightedServices.find((service) => service.id === serviceId))
        .filter((service): service is ServiceCatalogItem => Boolean(service))
        .slice(0, 2),
    [compareServiceIds, highlightedServices],
  );

  const latestAssistantSelection = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role !== 'assistant') {
        continue;
      }

      if (message.matchedServices?.length || message.matchedEvents?.length) {
        return message;
      }
    }

    return null;
  }, [messages]);

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

  useEffect(() => {
    if (!showInlineBooking || bookingNotes.trim()) {
      return;
    }
    if (latestCustomerRequirement) {
      setBookingNotes(latestCustomerRequirement);
    }
  }, [showInlineBooking, latestCustomerRequirement, bookingNotes]);

  useEffect(() => {
    if (showInlineBooking || selectedServiceId || selectedEvent || bookingResult) {
      setActivePreviewTab('booking');
      return;
    }

    setActivePreviewTab('chat');
  }, [showInlineBooking, selectedServiceId, selectedEvent, bookingResult]);

  useEffect(() => {
    if (!showInlineBooking) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inlineBookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      bookingNameInputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [showInlineBooking, selectedServiceId, selectedEvent]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: message,
      },
    ];

    setMessages(nextMessages);
    setChatInput('');
    setChatError('');
    setActivePreviewTab('chat');
    setLoading(true);

    try {
      const liveReadPromise = getPublicBookingAssistantLiveReadRecommendation({
        query: message,
        sourcePage: '/pitch-deck',
        locationHint: userGeoContext?.locality ?? null,
        serviceCategory: selectedService?.category ?? null,
        selectedServiceId: selectedServiceId || null,
        userLocation: userGeoContext
          ? {
              latitude: userGeoContext.latitude,
              longitude: userGeoContext.longitude,
            }
          : null,
      });
      let payload = await requestChatReply(nextMessages);
      if (
        payload.should_request_location &&
        !userGeoContext &&
        geoPromptState !== 'denied'
      ) {
        const geoContext = await requestGeoContext();
        if (geoContext) {
          payload = await requestChatReply(nextMessages, geoContext);
        } else {
          setMessages((current) => [
            ...current,
            {
              role: 'assistant',
              content: buildJustInTimeLocationMessage(),
            },
          ]);
        }
      }

      const liveRead = await liveReadPromise;
      const hasLiveReadSearchGrounding =
        liveRead.rankedCandidates.length > 0 ||
        liveRead.candidateIds.length > 0 ||
        Boolean(liveRead.semanticAssistSummary) ||
        liveRead.warnings.length > 0;
      const liveReadMatchedServices = liveRead.rankedCandidates.map(toBookingReadyServiceItem);
      const mergedMatchedServices = hasLiveReadSearchGrounding
        ? curateServiceMatches(liveReadMatchedServices)
        : curateServiceMatches(payload.matched_services);
      const assistantReply = hasLiveReadSearchGrounding
        ? liveRead.bookingPathSummary?.nextStep ?? liveRead.warnings[0] ?? payload.reply
        : payload.reply;
      const nextSuggestedServiceId = hasLiveReadSearchGrounding
        ? liveRead.suggestedServiceId ?? mergedMatchedServices[0]?.id ?? null
        : payload.suggested_service_id ?? mergedMatchedServices[0]?.id ?? null;

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

      setSelectedServiceId(nextSuggestedServiceId ?? '');
      const nextCompareIds = mergedMatchedServices
        .slice(0, 2)
        .map((service) => service.id);
      setCompareServiceIds(nextCompareIds);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(chatInput);
  }

  function handleOpenInlineBooking() {
    setShowInlineBooking(true);
    setActivePreviewTab('booking');
    setBookingError('');
    setBookingResult(null);
    setSelectionAnimationKey((current) => current + 1);
    if (selectedEvent) {
      setPreferredSlot(toDatetimeLocalValue(selectedEvent.start_at));
      setBookingNotes(buildEventBookingContext(selectedEvent, latestCustomerRequirement));
      return;
    }
    if (!preferredSlot) {
      setPreferredSlot(buildDefaultPreferredSlot());
    }
    if (!bookingNotes.trim() && latestCustomerRequirement) {
      setBookingNotes(latestCustomerRequirement);
    }
  }

  function handleSelectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    setSelectedEvent(null);
    setShowInlineBooking(true);
    setActivePreviewTab('booking');
    setBookingError('');
    setBookingResult(null);
    setSelectionAnimationKey((current) => current + 1);
    if (!preferredSlot) {
      setPreferredSlot(buildDefaultPreferredSlot());
    }
    if (!bookingNotes.trim() && latestCustomerRequirement) {
      setBookingNotes(latestCustomerRequirement);
    }
    window.setTimeout(() => {
      selectedMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  function handleSelectEvent(event: AIEventItem) {
    setSelectedEvent(event);
    setShowInlineBooking(true);
    setActivePreviewTab('booking');
    setBookingError('');
    setBookingResult(null);
    setSelectionAnimationKey((current) => current + 1);
    setPreferredSlot(toDatetimeLocalValue(event.start_at));
    setBookingNotes(buildEventBookingContext(event, latestCustomerRequirement));
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedService) {
      setBookingError('Select a matched service before continuing to booking.');
      return;
    }

    const validationError = validateBookingForm({
      customerName,
      customerEmail,
      customerPhone,
      preferredSlot,
    });
    if (validationError) {
      setBookingError(validationError);
      return;
    }

    const slot = parsePreferredSlot(preferredSlot);
    if (!slot) {
      setBookingError('Choose a valid preferred booking time.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingResult(null);

    const normalizedCustomerEmail = customerEmail.trim() ? customerEmail.trim().toLowerCase() : null;
    const normalizedCustomerPhone = customerPhone.trim() || null;
    const normalizedNotes = bookingNotes.trim() || latestCustomerRequirement || null;
    const sourcePage = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';

    try {
      if (isLiveReadMode) {
        try {
          const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
            sourcePage,
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

          setBookingResult(
            buildAuthoritativeBookingIntentResult({
              authoritativeResult,
              selectedService,
              requestedDate: slot.requestedDate,
              requestedTime: slot.requestedTime,
              customerEmail: normalizedCustomerEmail ?? '',
              nextStep: selectedService.booking_url ? 'Use the provider booking path after callback confirmation.' : null,
            }),
          );
          setActivePreviewTab('booking');
          return;
        } catch (error) {
          if (!shouldFallbackToLegacyBookingSession(error)) {
            throw error;
          }
        }
      }

      void shadowPublicBookingAssistantLeadAndBookingIntent({
        sourcePage,
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

      const payload = (await response.json()) as BookingAssistantSessionResponse & {
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload, 'Unable to create booking request.'));
      }

      setBookingResult(payload);
      setActivePreviewTab('booking');
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : 'Unable to create booking request.',
      );
    } finally {
      setBookingLoading(false);
    }
  }

  const previewSignals = [
    {
      label: 'Live mode',
      value: loading ? 'Searching' : bookingResult ? 'Booked' : selectedService ? 'Matched' : 'Ready',
      detail: 'demo responds with chat-first booking flow',
    },
    {
      label: 'Visible matches',
      value: `${highlightedServices.length || 0}`,
      detail: 'shortlist cards remain decision-ready',
    },
    {
      label: 'Current focus',
      value: activePreviewTab === 'booking' ? 'Booking' : 'Chat',
      detail: 'chat and booking stay in one proof surface',
    },
  ];

  const previewSteps = [
    'Ask naturally',
    'Review best-fit shortlist',
    'Continue to booking',
  ];

  return (
    <>
      <section id="booking-assistant" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <SectionCard className="p-7 lg:p-8">
            <SectionHeading
              kicker={content.kicker}
              kickerClassName={content.kickerClassName}
              title={content.title}
              body={content.body}
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {previewSignals.map((item) => (
                <SectionCard key={item.label} as="article" tone="subtle" className="rounded-[1.3rem] px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                    {item.value}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
                </SectionCard>
              ))}
            </div>

            <SectionCard className="mt-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                    Live-flow preview
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Graphic-led product proof, not just a text demo.
                  </div>
                </div>
                <SignalPill className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#1459c7]">
                  Interactive
                </SignalPill>
              </div>

              <div className="mt-5 grid gap-3">
                {previewSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-[1.05rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3 text-sm text-black/72">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>{step}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {['Chat-first', 'Shortlist-ready', 'Booking-connected'].map((item) => (
                  <SignalPill key={item} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#1459c7]">
                    {item}
                  </SignalPill>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenAssistant}
                className="booked-button-secondary mt-6 w-full px-5 py-3 text-sm font-semibold"
              >
                Open Full Assistant
              </button>
            </SectionCard>
          </SectionCard>

          <div className="mx-auto min-w-0 w-full max-w-[560px]">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:p-5">
              <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.16),transparent_72%)] blur-3xl" />
              <div className="relative">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Product preview
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {brandName} assistant live surface
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SignalPill className="bg-emerald-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                      {loading ? 'Searching' : 'Live'}
                    </SignalPill>
                    <SignalPill className="bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                      {messages.length} messages
                    </SignalPill>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-[420px]">
                  <div className="animate-[floatPhone_6s_ease-in-out_infinite] rounded-[2.75rem] bg-[linear-gradient(180deg,#111827_0%,#020617_100%)] p-3 shadow-[0_38px_100px_rgba(15,23,42,0.34)]">
                    <div className="rounded-[2.15rem] bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_20%,#f8fafc_100%)] p-3">
                      <div className="mx-auto mb-3 flex h-7 w-36 items-center justify-center rounded-full bg-slate-950">
                        <div className="h-2.5 w-16 rounded-full bg-slate-700" />
                      </div>
                      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{brandName} Assistant</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {brandDescriptor}
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Live
                        </div>
                      </div>

                      <div className="border-b border-slate-200 bg-[#fffaf5] px-3 py-3">
                        <div className="grid grid-cols-2 gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <button
                            type="button"
                            onClick={() => setActivePreviewTab('chat')}
                            className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                              activePreviewTab === 'chat'
                                ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                                : 'text-slate-500'
                            }`}
                          >
                            Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => setActivePreviewTab('booking')}
                            className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                              activePreviewTab === 'booking'
                                ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                                : 'text-slate-500'
                            }`}
                          >
                            Booking
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <SignalPill className="bg-slate-100 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                            Search
                          </SignalPill>
                          <SignalPill className="bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-800">
                            Match
                          </SignalPill>
                          <SignalPill className="bg-emerald-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                            Book
                          </SignalPill>
                        </div>

                        <div className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] font-medium text-amber-900">
                          {activePreviewTab === 'chat'
                            ? 'Discovery mode: ask, compare, and pick the strongest match.'
                            : 'Booking mode: review the selected service, then continue into the form below.'}
                        </div>
                      </div>

                      {activePreviewTab === 'chat' ? (
                        <>
                          <div className="border-b border-slate-200 bg-[#fffaf5] px-3 py-3">
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {starterPrompts.map((prompt) => (
                                <button
                                  key={prompt}
                                  type="button"
                                  onClick={() => void sendMessage(prompt)}
                                  className="shrink-0 rounded-full border border-amber-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="max-h-[28rem] min-h-[24rem] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fcfcfe_0%,#f8fafc_100%)] px-3 py-4">
                            {messages.map((message, index) => (
                              <div key={`${message.role}-${index}`} className="space-y-3">
                                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`flex max-w-[88%] items-end gap-2 ${
                                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                  >
                                    <div
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                        message.role === 'user'
                                          ? 'bg-slate-200 text-slate-700'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {message.role === 'user' ? 'You' : 'AI'}
                                    </div>
                                    <div
                                      className={`break-words rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${
                                        message.role === 'user'
                                          ? 'rounded-br-md bg-[linear-gradient(135deg,#111827_0%,#1f2937_100%)] text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 whitespace-pre-line shadow-sm'
                                      }`}
                                    >
                                      {message.content}
                                    </div>
                                  </div>
                                </div>

                                {message.role === 'assistant' && message.matchedServices?.length ? (
                                  <PartnerMatchShortlist
                                    items={message.matchedServices}
                                    batchSize={CHAT_RESULT_BATCH_SIZE}
                                    resetKey={`${index}-${message.matchedServices.length}`}
                                    className="space-y-2"
                                    listClassName="grid gap-2"
                                    buttonLabel="More results"
                                    buttonClassName="booked-button-secondary"
                                    emptyState={null}
                                    renderMeta={({ visibleCount, totalCount }) =>
                                      totalCount > CHAT_RESULT_BATCH_SIZE ? (
                                        <div className="flex justify-end">
                                          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                            Showing {visibleCount} of {totalCount}
                                          </div>
                                        </div>
                                      ) : null
                                    }
                                    renderItem={(service, resultIndex) => {
                                      const isSelected = selectedServiceId === service.id;
                                      const latestUserQuery =
                                        [...messages.slice(0, index)]
                                          .reverse()
                                          .find((entry) => entry.role === 'user')
                                          ?.content ?? latestCustomerRequirement;
                                      const decisionBadge = buildDecisionBadge(
                                        service,
                                        message.matchedServices ?? [],
                                        resultIndex,
                                        latestUserQuery,
                                      );
                                      const bestForLabel = buildBestForLabel(service, latestUserQuery);
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
                                          onClick={() => handleSelectService(service.id)}
                                          className={`overflow-hidden rounded-[1.2rem] border text-left transition ${
                                            isSelected
                                              ? 'booking-card-picked border-slate-950 bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]'
                                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                                          }`}
                                        >
                                          <div className="p-3">
                                            <PartnerMatchCard
                                              card={shortlistCard}
                                              tone={isSelected ? 'selected' : 'default'}
                                              badge={decisionBadge}
                                              trailingLabel={service.category}
                                            />
                                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                              {[
                                                { label: 'Price', value: formatPrice(service.amount_aud) },
                                                { label: 'Duration', value: `${service.duration_minutes} min` },
                                                { label: 'Location', value: buildServiceLocationLabel(service) },
                                              ].map((fact) => (
                                                <div
                                                  key={`${service.id}-${fact.label}`}
                                                  className={`rounded-[0.95rem] px-3 py-2 ${
                                                    isSelected ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-700'
                                                  }`}
                                                >
                                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                                                    {fact.label}
                                                  </div>
                                                  <div className="mt-1 text-xs leading-5 font-medium">
                                                    {fact.value}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              {buildServiceFitNotes(service).map((note) => (
                                                <span
                                                  key={`${service.id}-${note}`}
                                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                                    isSelected ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-800'
                                                  }`}
                                                >
                                                  {note}
                                                </span>
                                              ))}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleSelectService(service.id);
                                                }}
                                                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                                  isSelected
                                                    ? 'bg-white text-slate-950 hover:bg-slate-100'
                                                    : 'bg-slate-950 text-white hover:bg-slate-800'
                                                }`}
                                              >
                                                {isSelected ? 'Selected' : 'Select this'}
                                              </button>
                                              <span
                                                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                                  isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'
                                                }`}
                                              >
                                                {buildBookabilityLabel(service)}
                                              </span>
                                            </div>
                                            <PartnerMatchActionFooter
                                              model={actionFooter}
                                              tone={isSelected ? 'selected' : 'default'}
                                              onActionClick={(event) => event.stopPropagation()}
                                            />
                                          </div>
                                        </button>
                                      );
                                    }}
                                  />
                                ) : null}

                                {message.role === 'assistant' && message.matchedEvents?.length ? (
                                  <PartnerMatchShortlist
                                    items={message.matchedEvents}
                                    batchSize={CHAT_RESULT_BATCH_SIZE}
                                    resetKey={`${index}-${message.matchedEvents.length}`}
                                    className="space-y-2"
                                    listClassName="grid gap-2"
                                    buttonLabel="More events"
                                    buttonClassName="booked-button-secondary"
                                    emptyState={null}
                                    renderMeta={({ visibleCount, totalCount }) =>
                                      totalCount > CHAT_RESULT_BATCH_SIZE ? (
                                        <div className="flex justify-end">
                                          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                            Showing {visibleCount} of {totalCount}
                                          </div>
                                        </div>
                                      ) : null
                                    }
                                    renderItem={(event) => {
                                      const imageUrl = extractEventImageUrl(event);
                                      return (
                                        <div
                                          key={`${event.url}-${event.start_at}`}
                                          className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-slate-300"
                                        >
                                          {imageUrl ? (
                                            <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-100">
                                              <img
                                                src={imageUrl}
                                                alt={event.title}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                              />
                                              <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800">
                                                {getEventVisualLabel(event)}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex aspect-[16/8] w-full items-end bg-[linear-gradient(135deg,#dbeafe_0%,#ecfeff_48%,#dcfce7_100%)] p-3">
                                              <div className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                                                {event.is_wsti_priority ? 'WSTI featured event' : 'Sydney AI event'}
                                              </div>
                                            </div>
                                          )}
                                          <div className="p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <div
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                                  event.is_wsti_priority
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-sky-100 text-sky-700'
                                                }`}
                                              >
                                                {event.is_wsti_priority ? 'WSTI' : 'AI event'}
                                              </div>
                                              <div className="text-[11px] text-slate-500">
                                                {formatEventDate(event.start_at)}
                                              </div>
                                            </div>
                                            <div className="mt-2 text-sm font-semibold text-slate-950">
                                              {event.title}
                                            </div>
                                            {event.organizer ? (
                                              <div className="mt-1 text-xs font-medium text-slate-600">
                                                Hosted by {event.organizer}
                                              </div>
                                            ) : null}
                                            {(event.venue_name || event.location) && (
                                              <div className="mt-2 rounded-[0.95rem] bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                                <span className="font-semibold">Venue:</span>{' '}
                                                {[event.venue_name, event.location].filter(Boolean).join(' • ')}
                                              </div>
                                            )}
                                            <p className="mt-3 text-xs leading-5 text-slate-600">
                                              {event.summary}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              <a
                                                href={event.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white"
                                              >
                                                View event details
                                              </a>
                                              <button
                                                type="button"
                                                onClick={() => handleSelectEvent(event)}
                                                className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
                                              >
                                                Use this event
                                              </button>
                                              {event.map_url ? (
                                                <a
                                                  href={event.map_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                                >
                                                  Open Google map
                                                </a>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  />
                                ) : null}
                              </div>
                            ))}

                            {loading ? (
                              <div className="flex justify-start">
                                <div className="max-w-[28rem] rounded-[1.2rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                  <div className="font-semibold text-slate-900">{brandName} is finding the best match...</div>
                                  <div className="mt-1 leading-6 text-slate-600">
                                    Checking intent, locality, and shortlist quality now. Best next input: add suburb, timing, or who this is for if you want a tighter match.
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="border-t border-slate-200 bg-[#fffaf5] p-3">
                            <div
                              key={`selected-match-${selectedServiceId || selectedEvent?.url || 'empty'}-${selectionAnimationKey}`}
                              ref={selectedMatchRef}
                              className={`rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm ${
                                selectedService || selectedEvent ? 'booking-focus-in' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    Selected match
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-950">
                                    {selectedService?.name ?? 'No selection yet'}
                                  </div>
                                </div>
                                {selectedService ? (
                                  <div className="shrink-0 text-sm font-bold text-slate-950">
                                    {formatPrice(selectedService.amount_aud)}
                                  </div>
                                ) : null}
                              </div>

                              {selectedService ? (
                                <>
                                  <div className="mt-2 text-xs text-slate-500">
                                    {selectedService.category} • {selectedService.duration_minutes} min
                                  </div>
                                  <p className="mt-3 text-xs leading-5 text-slate-600">
                                    {selectedService.summary}
                                  </p>
                                  <div className="mt-3 rounded-[1rem] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                                    <span className="font-semibold">Why this is ready:</span> {buildBestForLabel(selectedService, latestCustomerRequirement)}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setActivePreviewTab('booking')}
                                      className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                                    >
                                      Switch to booking
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleOpenInlineBooking}
                                      className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                      Continue below
                                    </button>
                                  </div>
                                </>
                              ) : (
                                  <div className="mt-2 text-xs leading-5 text-slate-500">
                                    Start with any booking request above. Once {brandName} finds the right option, the strongest match will stay pinned here for quick review.
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="border-t border-slate-200 bg-white p-3">
                            <form onSubmit={handleSubmit}>
                              <div className="flex items-center gap-2 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-2">
                                <input
                                  type="text"
                                  value={chatInput}
                                  onChange={(event) => setChatInput(event.target.value)}
                                  placeholder={content.searchPlaceholder}
                                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none"
                                />
                                <button
                                  type="submit"
                                  disabled={loading || !chatInput.trim()}
                                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {loading ? '...' : 'Send'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="min-h-[32rem] bg-[linear-gradient(180deg,#fcfcfe_0%,#f8fafc_100%)] px-3 py-4">
                          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                                  Booking tab
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">
                                  {selectedService ? selectedService.name : 'Waiting for a selected service'}
                                </div>
                              </div>
                              <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                {selectedService ? 'Ready' : 'Idle'}
                              </div>
                            </div>

                            {selectedService ? (
                              <>
                                <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
                                  {extractServiceImageUrl(selectedService) ? (
                                    <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-100">
                                      <img
                                        src={extractServiceImageUrl(selectedService) ?? ''}
                                        alt={selectedService.name}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-800">
                                        {getServiceVisualLabel(selectedService)}
                                      </div>
                                    </div>
                                  ) : null}
                                  <div className="grid gap-2 p-3">
                                    <div className="rounded-[1rem] bg-white px-3 py-3 text-xs leading-5 text-slate-700">
                                      <span className="font-semibold text-slate-900">Why users book this:</span>{' '}
                                      {buildBestForLabel(selectedService, latestCustomerRequirement)}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {buildServiceConfidenceNotes(selectedService).map((note) => (
                                        <span
                                          key={`booking-tab-confidence-${note}`}
                                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700"
                                        >
                                          {note}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                  {[
                                    { label: 'Category', value: selectedService.category },
                                    { label: 'Duration', value: `${selectedService.duration_minutes} min` },
                                    { label: 'Price', value: formatPrice(selectedService.amount_aud) },
                                    { label: 'Location', value: buildServiceLocationLabel(selectedService) },
                                  ].map((fact) => (
                                    <div
                                      key={`booking-tab-${fact.label}`}
                                      className="rounded-[1rem] bg-slate-50 px-3 py-3 text-xs text-slate-700"
                                    >
                                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        {fact.label}
                                      </div>
                                      <div className="mt-1 leading-5 font-medium text-slate-800">
                                        {fact.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                                  <span className="font-semibold">Next action:</span> confirm details in the booking form below, then continue to payment and confirmation.
                                </div>

                                <div className="mt-4 grid gap-2">
                                  {[
                                    'Customer details',
                                    'Preferred time',
                                    bookingResult ? 'Booking reference and payment ready' : 'Payment and confirmation follow-up',
                                  ].map((item, index) => (
                                    <div key={item} className="flex items-center gap-3 rounded-[1rem] bg-[#f8fafc] px-3 py-3">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-semibold text-white">
                                        {index + 1}
                                      </div>
                                      <div className="text-xs font-medium text-slate-700">{item}</div>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={handleOpenInlineBooking}
                                    className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                                  >
                                    Continue to booking
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePreviewTab('chat')}
                                    className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    Back to chat
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="mt-4 rounded-[1rem] bg-[#f8fafc] px-4 py-4 text-sm leading-6 text-slate-600">
                                Pick a service in the chat tab first. Once selected, this booking tab becomes the clear next step and stays synced with the form below.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(chatError || catalogError) && (
                <div className="mt-4 space-y-3">
                  {chatError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {chatError}
                    </div>
                  ) : null}
                  {catalogError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {catalogError}
                    </div>
                  ) : null}
                </div>
              )}

              {showInlineBooking ? (
                <div
                  key={`inline-booking-${selectedServiceId || selectedEvent?.url || 'empty'}-${selectionAnimationKey}`}
                  ref={inlineBookingRef}
                  className="booking-reveal mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Continue to booking
                      </div>
                      <div className="mt-2 text-xl font-semibold text-slate-950">
                        Complete the booking without leaving the demo
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        The request from the chat is carried straight into this form so the user can confirm details and go to payment immediately.
                      </p>
                    </div>
                    {selectedService ? (
                      <div className="max-w-md rounded-[1.25rem] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <div className="flex items-start gap-3">
                          {extractServiceImageUrl(selectedService) ? (
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] border border-amber-200 bg-white">
                              <img
                                src={extractServiceImageUrl(selectedService) ?? ''}
                                alt={selectedService.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <div className="font-semibold">{selectedService.name}</div>
                            <div className="mt-1 text-xs text-amber-800">
                              {selectedService.category} • {selectedService.duration_minutes} min • {formatPrice(selectedService.amount_aud)}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-amber-900">
                              {buildBestForLabel(selectedService, latestCustomerRequirement)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {selectedEvent ? (
                    <div className="mt-4 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
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

                  <form className="mt-5 space-y-4" onSubmit={handleBookingSubmit}>
                    {selectedService ? (
                      <div className="rounded-[1.25rem] border border-slate-200 bg-[#f8fafc] p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Booking summary
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {[
                            { label: 'Chosen service', value: selectedService.name },
                            { label: 'Decision points', value: `${formatPrice(selectedService.amount_aud)} • ${selectedService.duration_minutes} min` },
                            { label: 'Fulfilment', value: bookingResult ? 'Email + payment + workflow ready' : 'Email and payment prepared next' },
                          ].map((fact) => (
                            <div key={fact.label} className="rounded-[1rem] bg-white px-3 py-3 text-xs text-slate-700">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {fact.label}
                              </div>
                              <div className="mt-1 leading-5 font-medium text-slate-800">{fact.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-slate-600">
                        <span className="mb-2 block font-medium text-slate-700">Name</span>
                        <input
                          ref={bookingNameInputRef}
                          required
                          type="text"
                          value={customerName}
                          onChange={(event) => setCustomerName(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </label>
                      <label className="block text-sm text-slate-600">
                        <span className="mb-2 block font-medium text-slate-700">
                          Email
                        </span>
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
                        min={`${minDate}T08:00`}
                        step={900}
                        value={preferredSlot}
                        onChange={(event) => setPreferredSlot(event.target.value)}
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
                        value={bookingNotes}
                        onChange={(event) => setBookingNotes(event.target.value)}
                        placeholder={bookingRequirementConfig.placeholder}
                        className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    {bookingError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {bookingError}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        disabled={bookingLoading || !selectedService}
                        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bookingLoading ? 'Preparing booking...' : 'Create booking and continue to payment'}
                      </button>
                    </div>
                  </form>

                  {bookingResult ? (
                    <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Booking ready
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">
                        {bookingResult.booking_reference}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {bookingResult.confirmation_message}
                      </p>
                      <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">Customer follow-up:</span>{' '}
                        {bookingResult.email_status === 'sent'
                          ? `Confirmation email has been sent and the next payment step is ready for the customer now.`
                          : `Booking is queued for manual email follow-up via ${bookingResult.contact_email}.`}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {buildBookingOutcomeSteps(bookingResult).map((step) => (
                          <div key={step.label} className="rounded-[1rem] bg-white/80 px-3 py-3 text-xs text-slate-700">
                            <div className="font-semibold text-slate-900">{step.label}</div>
                            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 font-semibold ${step.tone}`}>
                              {step.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        {bookingResult.meeting_event_url ? (
                          <a
                            href={bookingResult.meeting_event_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View calendar event
                          </a>
                        ) : null}
                        {!bookingResult.meeting_event_url && bookingResult.calendar_add_url ? (
                          <a
                            href={bookingResult.calendar_add_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Add to Google Calendar
                          </a>
                        ) : null}
                        <a
                          href={bookingResult.payment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          {bookingResult.payment_status === 'stripe_checkout_ready'
                            ? 'Continue to Stripe'
                            : 'Confirm payment by email'}
                        </a>
                        <a
                          href={`mailto:${bookingResult.contact_email}?subject=${encodeURIComponent(`${brandName} booking ${bookingResult.booking_reference}`)}`}
                          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Contact {bookingResult.contact_email}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            window.history.replaceState({}, '', '/');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Return to homepage
                        </button>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-600">
                        {bookingResult.meeting_status === 'scheduled'
                          ? 'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                          : bookingResult.calendar_add_url
                            ? 'A Google Calendar action is ready immediately and is also included in the confirmation email. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                          : 'After payment, Stripe returns the customer to the homepage. Email confirmation is handled here, and the booking is already passed into the workflow for calendar or team follow-up.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </section>
        <style>{`
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        `}</style>
    </>
  );
}
