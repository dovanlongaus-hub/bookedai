import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { BookingAssistantContent } from '../data';
import { getApiBaseUrl } from '../../../shared/config/api';

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
};

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

const popupShortcutTopics = [
  {
    label: 'AI Events',
    prompt: 'Show me the best AI events happening soon, especially WSTI events.',
  },
  {
    label: 'SME Services',
    prompt:
      'Help me compare salons, clinics, food bookings, event spaces, trades, and kids services anywhere in Australia.',
  },
  {
    label: 'Food',
    prompt: 'Help me find the best food or restaurant booking option for tonight.',
  },
  {
    label: 'Healthcare',
    prompt: 'I need a healthcare service and want the best match for my needs.',
  },
  {
    label: 'Services',
    prompt: 'Show me the best services available and help me choose quickly.',
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

function curateServiceMatches(services: ServiceCatalogItem[]) {
  return Array.from(new Map(services.map((service) => [service.id, service])).values());
}

function curateEventMatches(events: AIEventItem[]) {
  return Array.from(
    new Map(events.map((event) => [`${event.url}-${event.start_at}`, event])).values(),
  );
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
        ? 'BookedAI captured the customer need and context.'
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
          : 'BookedAI will generate the booking package after submission.',
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

export function BookingAssistantDialog({
  content,
  isOpen,
  onClose,
}: BookingAssistantDialogProps) {
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
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(true);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'chat' | 'booking'>('chat');
  const [selectionAnimationKey, setSelectionAnimationKey] = useState(0);
  const [workflowHandoffKey, setWorkflowHandoffKey] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const dialogBodyRef = useRef<HTMLDivElement | null>(null);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const minDate = getSydneyToday();

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
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
          setCatalogError('The live booking assistant is temporarily unavailable.');
        }
      }
    }

    loadCatalog();
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
      throw new Error(payload.detail || 'Unable to send message');
    }

    return payload;
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveMobilePanel('chat');
    setPreferredSlot((current) => current || buildDefaultPreferredSlot());

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

    const timeoutId = window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (activeMobilePanel === 'booking') {
        customerNameInputRef.current?.focus();
      }
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [selectedServiceId, activeMobilePanel]);

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
  const isCompactMobileViewport =
    viewportSize.width > 0 &&
    viewportSize.width < 640 &&
    (viewportSize.width <= 390 || viewportSize.height <= 760);

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
        setSelectionAnimationKey((current) => current + 1);
        setWorkflowHandoffKey((current) => current + 1);
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
    setSubmitError('');
    setResult(null);
    setActiveMobilePanel('booking');
    setSelectionAnimationKey((current) => current + 1);
    setWorkflowHandoffKey((current) => current + 1);
  }

  function handleSelectEvent(event: AIEventItem) {
    setSelectedEvent(event);
    setPreferredSlot(toDatetimeLocalValue(event.start_at));
    setNotes(buildEventBookingContext(event, latestCustomerRequirement));
    setSubmitError('');
    setResult(null);
    setActiveMobilePanel('booking');
    setSelectionAnimationKey((current) => current + 1);
    setWorkflowHandoffKey((current) => current + 1);
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
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close booking assistant"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      <div className="absolute inset-0 mx-auto flex w-full items-end justify-center p-0 sm:items-center sm:p-4 lg:p-6">
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8fafc] shadow-[0_35px_120px_rgba(15,23,42,0.35)] sm:h-auto sm:max-h-[96dvh] sm:w-[min(90vw,88rem)] sm:rounded-[2rem] sm:border sm:border-white/20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_58%)]"
          />
          <div
            className={`border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-all ${
              hasConversationStarted
                ? isCompactMobileViewport
                  ? 'px-3 py-1.5 sm:px-6 sm:py-3'
                  : 'px-4 py-2 sm:px-6 sm:py-3'
                : 'px-4 py-3 sm:px-6 sm:py-4'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`font-semibold uppercase tracking-[0.18em] text-sky-600 transition-all ${
                    hasConversationStarted
                      ? isCompactMobileViewport
                        ? 'text-[9px] sm:text-sm'
                        : 'text-[10px] sm:text-sm'
                      : 'text-[11px] sm:text-sm'
                  }`}
                >
                  Start Free Trial
                </div>
                <h2
                  className={`mt-1 font-bold tracking-tight text-slate-950 transition-all ${
                    hasConversationStarted
                      ? 'hidden sm:block sm:text-xl'
                      : 'text-base sm:text-2xl'
                  }`}
                >
                  AI booking agent popup
                </h2>
                <p
                  className={`mt-1 max-w-2xl text-xs text-slate-500 transition-all sm:text-sm ${
                    hasConversationStarted ? 'hidden sm:hidden' : 'hidden sm:block'
                  }`}
                >
                  Search services, chat by text or voice, then watch BookedAI build the
                  booking outcome live.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVoiceRepliesEnabled((current) => !current)}
                  className={`hidden rounded-full px-4 py-2 text-xs font-semibold transition sm:inline-flex ${
                    voiceRepliesEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Voice replies {voiceRepliesEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`rounded-full border border-slate-200 bg-white font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${
                    hasConversationStarted
                      ? isCompactMobileViewport
                        ? 'px-2 py-1 text-[11px] sm:px-4 sm:py-2 sm:text-sm'
                        : 'px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm'
                      : 'px-3 py-2 text-sm sm:px-4'
                  }`}
                >
                  {hasConversationStarted ? 'X' : 'Close'}
                </button>
              </div>
            </div>

            <div
              className={`flex items-center justify-between gap-3 sm:hidden ${
                hasConversationStarted
                  ? isCompactMobileViewport
                    ? 'mt-1'
                    : 'mt-1.5'
                  : 'mt-3'
              }`}
            >
              <button
                type="button"
                onClick={() => setVoiceRepliesEnabled((current) => !current)}
                className={`rounded-full font-semibold transition ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'px-2 py-1 text-[10px]'
                      : 'px-2.5 py-1.5 text-[11px]'
                    : 'px-3 py-2 text-xs'
                } ${
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
                className={`grid flex-1 grid-cols-2 rounded-full bg-slate-100 ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'p-[2px]'
                      : 'p-0.5'
                    : 'p-1'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveMobilePanel('chat')}
                  className={`rounded-full font-semibold transition ${
                    hasConversationStarted
                      ? isCompactMobileViewport
                        ? 'px-2.5 py-1 text-[10px]'
                        : 'px-3 py-1.5 text-[11px]'
                      : 'px-3 py-2 text-xs'
                  } ${
                    activeMobilePanel === 'chat'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobilePanel('booking')}
                  className={`rounded-full font-semibold transition ${
                    hasConversationStarted
                      ? isCompactMobileViewport
                        ? 'px-2.5 py-1 text-[10px]'
                        : 'px-3 py-1.5 text-[11px]'
                      : 'px-3 py-2 text-xs'
                  } ${
                    activeMobilePanel === 'booking'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Booking
                </button>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.7fr)]">
            <div
              className={`min-h-0 flex-col border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] lg:flex lg:border-b-0 lg:border-r ${
                activeMobilePanel === 'chat' ? 'flex' : 'hidden'
              }`}
            >
              <div
                className={`border-b border-slate-200 px-4 transition-all sm:px-6 ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'py-1.5 sm:py-2.5'
                      : 'py-2 sm:py-2.5'
                    : 'py-3 sm:py-4'
                }`}
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
                      Live service search
                    </div>
                    {!hasConversationStarted ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {catalogError
                          ? 'Assistant offline'
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
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {popupShortcutTopics.map((topic) => (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => void sendChatMessage(topic.prompt)}
                        className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div
                ref={dialogBodyRef}
                className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 sm:px-6 sm:py-5 ${
                  hasConversationStarted
                    ? isCompactMobileViewport
                      ? 'py-2 sm:py-5'
                      : 'py-2.5 sm:py-5'
                    : 'py-3 sm:py-5'
                }`}
              >
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
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>

                    {message.role === 'assistant' && message.matchedServices?.length ? (
                      <div className="grid gap-3">
                        {message.matchedServices.map((service, index) => {
                          const isSelected = service.id === selectedServiceId;
                          const serviceImageUrl = extractServiceImageUrl(service);
                          const fitNotes = buildServiceFitNotes(service);
                          const decisionBadge = buildDecisionBadge(
                            service,
                            message.matchedServices ?? [],
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
                              }}
                          className={`overflow-hidden rounded-[1.5rem] border text-left transition ${
                                isSelected
                                  ? 'booking-card-picked border-slate-950 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]'
                              }`}
                            >
                              <div className="p-4">
                                <div className="flex min-w-0 items-start justify-between gap-4">
                                  <div className="flex min-w-0 gap-3">
                                    {serviceImageUrl ? (
                                      <div
                                        className={`relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] border sm:block ${
                                          isSelected ? 'border-white/10 bg-white/10' : 'border-slate-200 bg-slate-100'
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
                                    </div>
                                    <div className="mt-2 text-base font-semibold">
                                      {service.name}
                                    </div>
                                    <div className={`mt-1 text-[11px] leading-5 ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                                      {buildServiceLocationLabel(service)}
                                    </div>
                                  </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-base font-semibold">
                                      {formatPrice(service.amount_aud)}
                                    </div>
                                    <div className={`mt-1 text-[11px] ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                                      {isSelected ? 'Selected option' : 'Top recommendation'}
                                    </div>
                                  </div>
                                </div>
                                <p
                                  className={`mt-3 text-sm leading-6 ${
                                    isSelected ? 'text-white/80' : 'text-slate-600'
                                  }`}
                                >
                                  {service.summary}
                                </p>
                                <div className={`mt-3 rounded-2xl px-3 py-2 text-xs ${
                                  isSelected ? 'bg-white/10 text-white/85' : 'bg-amber-50 text-amber-900'
                                }`}>
                                  <span className="font-semibold">Why it matches:</span> {bestForLabel}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {fitNotes.map((note) => (
                                    <div
                                      key={`${service.id}-${note}`}
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {note}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {[
                                    { label: 'Price', value: formatPrice(service.amount_aud) },
                                    { label: 'Duration', value: `${service.duration_minutes} min` },
                                    { label: 'Location', value: buildServiceLocationLabel(service) },
                                    { label: 'Next step', value: buildServiceNextStepLabel(service) },
                                  ].map((fact) => (
                                    <div
                                      key={`${service.id}-${fact.label}`}
                                      className={`rounded-2xl px-3 py-2 ${
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
                                    <div
                                      key={`${service.id}-confidence-${note}`}
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      {note}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <div
                                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                      isSelected ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'
                                    }`}
                                  >
                                    {isSelected ? 'Chosen for booking' : 'Choose this option'}
                                  </div>
                                  {service.map_url ? (
                                    <a
                                      href={service.map_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) => event.stopPropagation()}
                                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                        isSelected ? 'border border-white/20 bg-white/10 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'
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
                                      onClick={(event) => event.stopPropagation()}
                                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                        isSelected ? 'border border-white/20 bg-white/10 text-white' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                      }`}
                                    >
                                      Book now
                                    </a>
                                  ) : null}
                                  <div
                                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                                      isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {buildBookabilityLabel(service)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {message.role === 'assistant' && message.matchedEvents?.length ? (
                      <div className="grid gap-3">
                        {message.matchedEvents.map((event) => {
                          const imageUrl = extractEventImageUrl(event);
                          return (
                            <div
                              key={`${event.url}-${event.start_at}`}
                              className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:border-slate-300"
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
                                <div className="flex aspect-[16/8] w-full items-end bg-[linear-gradient(135deg,#dbeafe_0%,#ecfeff_48%,#dcfce7_100%)] p-4">
                                  <div className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                                    {event.is_wsti_priority ? 'WSTI featured event' : 'AI community event'}
                                  </div>
                                </div>
                              )}
                              <div className="p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                      event.is_wsti_priority
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-sky-100 text-sky-700'
                                    }`}
                                  >
                                    {event.is_wsti_priority ? 'WSTI priority' : 'AI event'}
                                  </div>
                                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                    Curated result
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {formatEventDate(event.start_at)}
                                  </div>
                                </div>
                                <div className="mt-2 text-base font-semibold text-slate-950">
                                  {event.title}
                                </div>
                                {event.organizer ? (
                                  <div className="mt-1 text-xs font-medium text-slate-600">
                                    Hosted by {event.organizer}
                                  </div>
                                ) : null}
                                {(event.venue_name || event.location) ? (
                                  <div className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                                    <span className="font-semibold">Venue:</span>{' '}
                                    {[event.venue_name, event.location].filter(Boolean).join(' • ')}
                                  </div>
                                ) : null}
                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                  {event.summary}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <a
                                    href={event.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white"
                                  >
                                    View details
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

                {chatLoading ? (
                  <div className="flex justify-start">
                    <div className="rounded-[1.5rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      BookedAI is thinking...
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:py-4">
                <form onSubmit={handleChatSubmit}>
                  <label className="sr-only" htmlFor="assistant-chat-input">
                    Ask the booking assistant
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="assistant-chat-input"
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder={content.searchPlaceholder}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={toggleVoiceCapture}
                      className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                        isListening
                          ? 'booking-listening bg-rose-600 text-white hover:bg-rose-500'
                          : 'border border-black/10 bg-white text-slate-700 hover:border-black/15 hover:bg-slate-50'
                      }`}
                    >
                      {isListening ? 'Listening...' : 'Talk'}
                    </button>
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Send
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
              className={`min-h-0 overflow-y-auto overscroll-contain bg-[#f8fafc] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:py-5 lg:block ${
                activeMobilePanel === 'booking' ? 'block' : 'hidden'
              }`}
            >
              <div
                key={`workflow-panel-${selectedServiceId || selectedEvent?.url || 'idle'}-${workflowHandoffKey}`}
                className="booking-handoff rounded-[1.75rem] border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      BookedAI workflow
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
                <div className="text-sm font-semibold text-slate-950">
                  Best-fit shortlist
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {selectedService
                    ? `${selectedService.name} is currently selected. Review the shortlist below, then continue to booking when you are ready.`
                    : 'Review the top matched options below. BookedAI keeps the strongest shortlist visible so users can compare before they book.'}
                </div>

                {latestSuggestedServices.length ? (
                  <div className="mt-4 grid gap-3">
                    {latestSuggestedServices.map((service, index) => {
                      const isSelected = service.id === selectedServiceId;
                      const fitNotes = buildServiceFitNotes(service);
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
                          <div className="flex items-start justify-between gap-4">
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
                              <div className={`mt-1 text-[11px] leading-5 ${isSelected ? 'text-white/60' : 'text-slate-500'}`}>
                                {buildServiceLocationLabel(service)}
                              </div>
                              <div className={`mt-2 text-xs leading-5 ${isSelected ? 'text-white/75' : 'text-slate-600'}`}>
                                {service.summary}
                              </div>
                              <div className={`mt-3 rounded-2xl px-3 py-2 text-xs ${
                                isSelected ? 'bg-white/10 text-white/85' : 'bg-amber-50 text-amber-900'
                              }`}>
                                <span className="font-semibold">Why it matches:</span> {bestForLabel}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {fitNotes.map((note) => (
                                  <div
                                    key={`${service.id}-${note}`}
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                      isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {note}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {[
                                  { label: 'Price', value: formatPrice(service.amount_aud) },
                                  { label: 'Duration', value: `${service.duration_minutes} min` },
                                  { label: 'Location', value: buildServiceLocationLabel(service) },
                                  { label: 'Next step', value: buildServiceNextStepLabel(service) },
                                ].map((fact) => (
                                  <div
                                    key={`${service.id}-shortlist-${fact.label}`}
                                    className={`rounded-2xl px-3 py-2 ${
                                      isSelected ? 'bg-white/10 text-white' : 'bg-white text-slate-700'
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
                    })}
                  </div>
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
                className="booking-reveal mt-5 space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5"
                onSubmit={handleSubmit}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    Booking details
                  </div>
                  {content.formIntro ? (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {content.formIntro}
                    </p>
                  ) : null}
                  {selectedService ? (
                    <div className="mt-3 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <div className="font-semibold">{selectedService.name}</div>
                      <div className="mt-1 text-xs text-emerald-800">
                        {selectedService.category} • {selectedService.duration_minutes} min • {formatPrice(selectedService.amount_aud)}
                      </div>
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

                <button
                  type="submit"
                  disabled={loading || !selectedService}
                  className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Preparing your booking...' : content.submitLabel}
                </button>
              </form>

              {result ? (
                <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Booking reference
                      </div>
                      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                        {result.booking_reference}
                      </div>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                        {result.confirmation_message}
                      </p>
                    </div>
                    <img
                      src={result.qr_code_url}
                      alt={`QR code for ${result.booking_reference}`}
                      className="h-28 w-28 rounded-2xl border border-slate-200 bg-white object-cover"
                    />
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
                      <div className="font-semibold text-slate-950">Service</div>
                      <div className="mt-1">{result.service.name}</div>
                    </div>
                    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
                      <div className="font-semibold text-slate-950">Price</div>
                      <div className="mt-1">{result.amount_label}</div>
                    </div>
                    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
                      <div className="font-semibold text-slate-950">Requested slot</div>
                      <div className="mt-1">
                        {result.requested_date} at {result.requested_time}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
                      <div className="font-semibold text-slate-950">Email follow-up</div>
                      <div className="mt-1">
                        {result.email_status === 'sent'
                          ? 'Confirmation email sent'
                          : `Manual follow-up via ${result.contact_email}`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {buildBookingOutcomeSteps(result).map((step) => (
                      <div key={step.label} className="rounded-2xl bg-[#f5f5f7] px-4 py-3">
                        <div className="font-semibold text-slate-950">{step.label}</div>
                        <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${step.tone}`}>
                          {step.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {result.meeting_event_url ? (
                      <a
                        href={result.meeting_event_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                      >
                        View calendar event
                      </a>
                    ) : null}
                    {!result.meeting_event_url && result.calendar_add_url ? (
                      <a
                        href={result.calendar_add_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                      >
                        Add to Google Calendar
                      </a>
                    ) : null}
                    <a
                      href={result.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {result.payment_status === 'stripe_checkout_ready'
                        ? 'Continue to Stripe'
                        : 'Confirm Payment by Email'}
                    </a>
                    <a
                      href={`mailto:${result.contact_email}?subject=BookedAI%20booking%20${result.booking_reference}`}
                      className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                    >
                      Contact {result.contact_email}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.history.replaceState({}, '', '/');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-black/15 hover:bg-slate-50"
                    >
                      Return to homepage
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
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
  );
}
