import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { BookingAssistantContent } from '../data';
import { getApiBaseUrl } from '../../../shared/config/api';
import { SectionHeading } from '../ui/SectionHeading';

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
  'Book a restaurant table for 6 tomorrow night',
  'I need physio for shoulder pain',
  'Find a dentist or skin clinic near me with weekend availability',
  'Book a haircut and colour consultation for Friday afternoon',
  'Find an event venue or private dining option for a team dinner',
  'Find me something under $50 near me',
  'How do I renew my RSL membership?',
  'Which service is best if I need something quick after work?',
  'Compare a cafe group booking and a restaurant table for 8 people',
  'What AI events are coming up at WSTI and Western Sydney Startup Hub?',
  'Tìm sự kiện AI tại WSTI tuần này và gợi ý bước tiếp theo',
];

const MAX_DISPLAYED_MATCHES = 4;

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
  return Array.from(new Map(services.map((service) => [service.id, service])).values()).slice(
    0,
    MAX_DISPLAYED_MATCHES,
  );
}

function curateEventMatches(events: AIEventItem[]) {
  return Array.from(
    new Map(events.map((event) => [`${event.url}-${event.start_at}`, event])).values(),
  ).slice(0, MAX_DISPLAYED_MATCHES);
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
  if (service.booking_url) {
    return 'Book online now';
  }
  return 'Lock in a time in chat';
}

function buildServiceConfidenceNotes(service: ServiceCatalogItem) {
  const notes = [service.booking_url ? 'Direct booking link' : 'Chat booking flow ready'];

  if (service.map_url || service.location || service.venue_name) {
    notes.push('Location details ready');
  }

  notes.push(service.featured ? 'Popular local choice' : 'Curated best-fit match');
  return notes;
}

function buildBookabilityLabel(service: ServiceCatalogItem) {
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
            ? 'Sent into ops workflow'
            : 'Queued for handoff',
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
      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load service catalog.');
        }

        const payload = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(payload);
        setMessages([]);
        setSelectedServiceId('');
        setCompareServiceIds([]);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCatalogError('The live booking assistant is temporarily unavailable.');
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
      throw new Error(payload.detail || 'Unable to send message.');
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
    setLoading(true);

    try {
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

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: payload.reply,
          matchedServices: curateServiceMatches(payload.matched_services),
          matchedEvents: curateEventMatches(payload.matched_events),
        },
      ]);

      if (!payload.matched_events.length) {
        setSelectedEvent(null);
      }

      if (payload.suggested_service_id) {
        setSelectedServiceId(payload.suggested_service_id);
      }
      const nextCompareIds = curateServiceMatches(payload.matched_services)
        .slice(0, 2)
        .map((service) => service.id);
      if (nextCompareIds.length) {
        setCompareServiceIds(nextCompareIds);
      }
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
          notes: bookingNotes.trim() || latestCustomerRequirement || null,
        }),
      });

      const payload = (await response.json()) as BookingAssistantSessionResponse & {
        detail?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || 'Unable to create booking request.');
      }

      setBookingResult(payload);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : 'Unable to create booking request.',
      );
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <section id="booking-assistant" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid min-w-0 gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#ffffff_42%,#f8fafc_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:p-8 lg:p-10">
          <SectionHeading {...content} />
          {content.formIntro ? (
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{content.formIntro}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              'Standalone phone demo',
              'Real service and event matching',
              'WSTI results ranked first',
            ].map((item) => (
              <div
                key={item}
                className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3">
            {[
              'The product demo sits in its own frame and does not share a content card.',
              'The chat stays simple while still surfacing real matches and next actions.',
              'It can answer booking, membership, hospitality, and WSTI event queries.',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.25rem] border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onOpenAssistant}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open full booking flow
            </button>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {catalogError ? 'Agent offline' : 'Live agent connected'}
            </div>
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-[#fffaf5] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="text-sm font-semibold text-slate-950">What users get in the chat</div>
            <div className="mt-3 grid gap-3">
              {[
                'A clear best-fit recommendation tied directly to the phone demo selection flow.',
                'Useful buying details like price, duration, venue, and map link instead of generic summaries.',
                'Professional answers across service discovery, comparison, booking, membership, hospitality, and WSTI event questions.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="min-w-0">
          <div className="mx-auto max-w-[520px] lg:mr-0 lg:ml-auto">
            <div className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Product demo frame
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                A standalone mobile experience that sits outside the main content card
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The demo is isolated in its own stage so the product reads like a real interface, not a block inside the page copy.
              </p>
            </div>

            <div className="rounded-[2.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)]">
              <div className="mx-auto w-full max-w-[400px]">
                <div className="animate-[floatPhone_6s_ease-in-out_infinite] rounded-[2.75rem] bg-[linear-gradient(180deg,#111827_0%,#020617_100%)] p-3 shadow-[0_38px_100px_rgba(15,23,42,0.34)]">
                  <div className="rounded-[2.15rem] bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_20%,#f8fafc_100%)] p-3">
                    <div className="mx-auto mb-3 flex h-7 w-36 items-center justify-center rounded-full bg-slate-950">
                      <div className="h-2.5 w-16 rounded-full bg-slate-700" />
                    </div>
                    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">BookedAI Assistant</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Simple, fast, and ready to guide the next step
                          </div>
                        </div>
                        <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Live
                        </div>
                      </div>

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
                              <div className="grid gap-2">
                                {message.matchedServices.map((service) => {
                                  const isSelected = selectedServiceId === service.id;
                                  const serviceImageUrl = extractServiceImageUrl(service);
                                  const latestUserQuery =
                                    [...messages.slice(0, index)]
                                      .reverse()
                                      .find((entry) => entry.role === 'user')
                                      ?.content ?? latestCustomerRequirement;
                                  const decisionBadge = buildDecisionBadge(
                                    service,
                                    message.matchedServices ?? [],
                                    (message.matchedServices ?? []).findIndex((item) => item.id === service.id),
                                    latestUserQuery,
                                  );
                                  const bestForLabel = buildBestForLabel(service, latestUserQuery);
                                  const fitNotes = buildServiceFitNotes(service);
                                  return (
                                    <div
                                      key={service.id}
                                      className={`overflow-hidden rounded-[1.2rem] border text-left transition ${
                                        isSelected
                                          ? 'booking-card-picked border-slate-950 bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]'
                                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex min-w-0 gap-3">
                                            {serviceImageUrl ? (
                                              <div
                                                className={`relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] border sm:block ${
                                                  isSelected
                                                    ? 'border-white/10 bg-white/10'
                                                    : 'border-slate-200 bg-slate-100'
                                                }`}
                                              >
                                                <img
                                                  src={serviceImageUrl}
                                                  alt={service.name}
                                                  className="h-full w-full object-cover"
                                                  loading="lazy"
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                                                  {getServiceVisualLabel(service)}
                                                </div>
                                              </div>
                                            ) : null}
                                            <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                                  isSelected
                                                    ? 'bg-white text-slate-950'
                                                    : 'bg-emerald-50 text-emerald-700'
                                                }`}
                                              >
                                                {decisionBadge}
                                              </span>
                                              <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                                  isSelected
                                                    ? 'bg-white/10 text-white'
                                                    : 'bg-sky-50 text-sky-700'
                                                }`}
                                              >
                                                {service.category}
                                              </span>
                                              <span
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                                  isSelected
                                                    ? 'bg-emerald-300 text-slate-950'
                                                    : 'bg-emerald-50 text-emerald-700'
                                                }`}
                                              >
                                                {buildBookabilityLabel(service)}
                                              </span>
                                            </div>
                                            <div className="mt-2 text-sm font-semibold">{service.name}</div>
                                            <div
                                              className={`mt-1 text-xs ${
                                                isSelected ? 'text-white/70' : 'text-slate-500'
                                              }`}
                                            >
                                              {buildServiceLocationLabel(service)}
                                            </div>
                                          </div>
                                          </div>
                                          <div className="shrink-0 text-sm font-semibold">
                                            {formatPrice(service.amount_aud)}
                                          </div>
                                        </div>
                                        <p
                                          className={`mt-2 text-xs leading-5 ${
                                            isSelected ? 'text-white/80' : 'text-slate-600'
                                          }`}
                                        >
                                          {service.summary}
                                        </p>
                                        <div
                                          className={`mt-3 rounded-[0.95rem] px-3 py-2 text-xs ${
                                            isSelected ? 'bg-white/10 text-white/85' : 'bg-amber-50 text-amber-900'
                                          }`}
                                        >
                                          <span className="font-semibold">Why it matches:</span> {bestForLabel}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {fitNotes.map((note) => (
                                            <span
                                              key={`${service.id}-${note}`}
                                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                                isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                              }`}
                                            >
                                              {note}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                          {[
                                            { label: 'Price', value: formatPrice(service.amount_aud) },
                                            {
                                              label: 'Duration',
                                              value: `${service.duration_minutes} min`,
                                            },
                                            {
                                              label: 'Location',
                                              value: buildServiceLocationLabel(service),
                                            },
                                            {
                                              label: 'Next step',
                                              value: buildServiceNextStepLabel(service),
                                            },
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
                                          {buildServiceConfidenceNotes(service).map((note) => (
                                            <span
                                              key={`${service.id}-confidence-${note}`}
                                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                                isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'
                                              }`}
                                            >
                                              {note}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleSelectService(service.id)}
                                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                              isSelected
                                                ? 'bg-white text-slate-950 hover:bg-slate-100'
                                                : 'bg-slate-950 text-white hover:bg-slate-800'
                                            }`}
                                          >
                                            {isSelected ? 'Selected' : 'Select this'}
                                          </button>
                                          {service.map_url ? (
                                            <a
                                              href={service.map_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                                isSelected
                                                  ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                                                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                                              }`}
                                            >
                                              Open Google map
                                            </a>
                                          ) : null}
                                          {service.booking_url ? (
                                            <a
                                              href={service.booking_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                                isSelected
                                                  ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                                                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                                              }`}
                                            >
                                              Book now
                                            </a>
                                          ) : null}
                                          <span
                                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                              isSelected
                                                ? 'bg-white/10 text-white'
                                                : 'bg-amber-50 text-amber-800'
                                            }`}
                                          >
                                            {buildBookabilityLabel(service)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}

                            {message.role === 'assistant' && message.matchedEvents?.length ? (
                              <div className="grid gap-2">
                                {message.matchedEvents.map((event) => {
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
                                          <div className="mt-1 text-xs text-slate-500">
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
                                })}
                              </div>
                            ) : null}
                          </div>
                        ))}

                        {loading ? (
                          <div className="flex justify-start">
                            <div className="rounded-[1.2rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                              BookedAI is finding the best match...
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
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {[
                                  { label: 'Price', value: formatPrice(selectedService.amount_aud) },
                                  {
                                    label: 'Duration',
                                    value: `${selectedService.duration_minutes} min`,
                                  },
                                  {
                                    label: 'Location',
                                    value: buildServiceLocationLabel(selectedService),
                                  },
                                  {
                                    label: 'Next step',
                                    value: buildServiceNextStepLabel(selectedService),
                                  },
                                ].map((fact) => (
                                  <div
                                    key={`selected-${fact.label}`}
                                    className="rounded-[1rem] bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                              <div className="mt-3 flex flex-wrap gap-2">
                                {buildServiceConfidenceNotes(selectedService).map((note) => (
                                  <span
                                    key={`selected-confidence-${note}`}
                                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                                  >
                                    {note}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {selectedService.map_url ? (
                                  <a
                                    href={selectedService.map_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    Open Google map
                                  </a>
                                ) : null}
                                {selectedService.booking_url ? (
                                  <a
                                    href={selectedService.booking_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                  >
                                    Book now
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={handleOpenInlineBooking}
                                  className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Continue to booking
                                </button>
                                <button
                                  type="button"
                                  onClick={onOpenAssistant}
                                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Open full flow
                                </button>
                              </div>

                              {compareServices.length >= 2 ? (
                                <div className="mt-4 rounded-[1rem] border border-slate-200 bg-[#fbfbfd] p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Compare top options
                                      </div>
                                      <div className="mt-1 text-xs leading-5 text-slate-600">
                                        {buildDecisionSummary(compareServices, latestCustomerRequirement)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid gap-2">
                                    {compareServices.map((service, compareIndex) => (
                                      <div
                                        key={`compare-${service.id}`}
                                        className={`rounded-[1rem] border px-3 py-3 ${
                                          service.id === selectedServiceId
                                            ? 'border-slate-950 bg-slate-950 text-white'
                                            : 'border-slate-200 bg-white text-slate-800'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                                              {buildDecisionBadge(service, compareServices, compareIndex, latestCustomerRequirement)}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold">{service.name}</div>
                                          </div>
                                          <div className="text-sm font-semibold">{formatPrice(service.amount_aud)}</div>
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
                            </>
                          ) : (
                            <div className="mt-2 text-xs leading-5 text-slate-500">
                              Start with any booking request above. Once BookedAI finds the right option, the strongest match will stay pinned here for quick review.
                            </div>
                          )}

                          {latestAssistantSelection?.matchedEvents?.length &&
                          !latestAssistantSelection.matchedServices?.length ? (
                            <div className="mt-3 rounded-[1rem] bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                              Live event results stay in the thread above with venue, time, and map actions so users can compare WSTI options without losing the chat flow.
                            </div>
                          ) : null}
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
                      <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <div className="font-semibold">{selectedService.name}</div>
                        <div className="mt-1 text-xs text-amber-800">
                          {selectedService.category} • {selectedService.duration_minutes} min • {formatPrice(selectedService.amount_aud)}
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
                          href={`mailto:${bookingResult.contact_email}?subject=BookedAI%20booking%20${bookingResult.booking_reference}`}
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
      </div>
      <style>{`
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </section>
  );
}
