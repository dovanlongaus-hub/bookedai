import type { PricingConsultationResponse } from '../../../shared/contracts';

export type PlanId = 'basic' | 'standard' | 'pro';
export type ConsultationFlowMode = 'full' | 'guided';
export type ConsultationStep = 'contact' | 'calendar' | 'confirmed';
export type OnboardingMode = 'online' | 'onsite';

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  introLabel: string;
  microcopy: string;
  supportingText?: string;
  features: string[];
  featured?: boolean;
};

export type Recommendation = {
  label: string;
  detail: string;
  featured?: boolean;
};

export type ConsultationFormState = {
  planId: PlanId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName: string;
  businessType: string;
  onboardingMode: OnboardingMode;
  startupReferralEligible: boolean;
  referralPartner: string;
  referralLocation: string;
  preferredSlot: string;
  notes: string;
};

export const highlightPoints = [
  '30 days of subscription free on every plan',
  'online setup included for launch customers',
  'simple monthly plans from A$79 with no long lock-in',
];

export const topOffers = [
  {
    eyebrow: 'Start small',
    title: 'Book now from A$79 per month',
    body: 'Lower entry pricing makes it easier for SMEs to start without a heavy decision or a big upfront commitment.',
  },
  {
    eyebrow: 'Keep it simple',
    title: 'One monthly fee, clear setup path',
    body: 'Most customers can launch online first. If you need onsite rollout, we quote it separately after we confirm your location and scope.',
  },
];

export const setupOptions = [
  {
    label: 'Online setup',
    detail: 'Fastest option for most SMEs. Included for launch customers so you can get live quickly without extra setup friction.',
  },
  {
    label: 'Onsite setup',
    detail: 'Available for more complex teams, multi-location rollouts, or in-person training. Quoted separately after address confirmation.',
  },
];

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Starter',
    price: 'A$79',
    subtitle: 'For smaller service businesses that want a clean, affordable first step.',
    badge: 'Easy Start',
    ctaLabel: 'Start Free',
    introLabel: 'Lowest monthly price',
    microcopy:
      '30 days free, then a simple low monthly fee. Online setup is included for launch customers.',
    supportingText:
      'Best when you need faster replies, lead capture, and one clear booking path without a complicated rollout.',
    features: [
      'AI website chat',
      'missed call SMS auto-reply',
      'basic lead capture',
      '1 business workflow',
      '1 calendar integration',
      'best fit for salons, tutors, clinics, and smaller trades teams',
    ],
  },
  {
    id: 'standard',
    name: 'Growth',
    price: 'A$149',
    subtitle: 'For growing local teams that want stronger automation without enterprise pricing.',
    badge: 'Best Value',
    ctaLabel: 'Book Most Popular',
    introLabel: 'Most balanced plan',
    microcopy:
      '30 days free, then one predictable monthly price. Designed to be the easiest yes for busy SMEs.',
    supportingText:
      'Strong fit when bookings are regular and you need better qualification, follow-up, and conversion.',
    features: [
      'everything in Starter',
      'AI answers inbound calls',
      'guided booking flows',
      '2-3 service journeys',
      'SMS follow-up',
      'weekly reporting',
    ],
    featured: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'A$249',
    subtitle: 'For multi-location or more complex teams that need broader automation.',
    badge: 'Advanced',
    ctaLabel: 'Book Pro',
    introLabel: 'More automation',
    microcopy:
      '30 days free. Built for operators who need more service logic, more locations, and deeper workflow support.',
    supportingText:
      'Strong fit for larger clinics, hospitality groups, education operators, and more complex trades workflows.',
    features: [
      'everything in Growth',
      'advanced booking flows',
      'multi-service and multi-location support',
      'CRM integration',
      'reminder automation',
      'lead qualification dashboard',
    ],
  },
];

export const recommendations: Recommendation[] = [
  {
    label: 'Starter',
    detail: 'Lowest risk',
  },
  {
    label: 'Growth',
    detail: 'Best value',
    featured: true,
  },
  {
    label: 'Pro',
    detail: 'Scale further',
  },
];

export const pricingSignals = [
  {
    label: 'Starting point',
    value: 'A$79/mo',
    detail: 'Low-friction entry for service businesses',
  },
  {
    label: 'Trial offer',
    value: '30 days free',
    detail: 'Move into rollout after confidence is clear',
  },
  {
    label: 'Rollout mode',
    value: 'Online first',
    detail: 'Onsite only when the business actually needs it',
  },
];

export const visiblePlans = plans.slice(0, 2);
export const advancedPlan = plans[2];

export const businessTypeSuggestions = [
  'Salon or beauty studio',
  'Restaurant, cafe, or catering',
  'Event or hospitality venue',
  'Healthcare or allied health clinic',
  'Kids services or tutoring',
  'Trades or home services',
  'Fitness, wellness, or memberships',
  'Pet grooming or boarding',
  'Professional services or consults',
];

function toDatetimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseResultDate(payload: PricingConsultationResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildDefaultPreferredSlot() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(value);
}

export function parsePreferredSlot(preferredSlot: string) {
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
    preferredDate: `${year}-${month}-${day}`,
    preferredTime: `${hours}:${minutes}`,
  };
}

export function formatConsultationDateTime(payload: PricingConsultationResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${payload.preferred_date} ${payload.preferred_time} ${payload.timezone}`;
  }

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function buildGoogleCalendarUrl(payload: PricingConsultationResponse) {
  const start = parseResultDate(payload);
  if (!start) {
    return null;
  }

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const details = [
    `BookedAI ${payload.plan_name} onboarding`,
    `Offer: ${payload.trial_summary}`,
    `Setup mode: ${payload.onboarding_mode === 'onsite' ? 'Onsite' : 'Online'}`,
    payload.meeting_join_url ? `Zoho meeting: ${payload.meeting_join_url}` : null,
    payload.meeting_event_url ? `Zoho event: ${payload.meeting_event_url}` : null,
    `Reference: ${payload.consultation_reference}`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `BookedAI ${payload.plan_name} consultation`,
    dates: `${formatUtc(start)}/${formatUtc(end)}`,
    details,
    location: payload.meeting_join_url || 'Online',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsDownloadUrl(payload: PricingConsultationResponse) {
  const start = parseResultDate(payload);
  if (!start) {
    return null;
  }

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const description = [
    `BookedAI ${payload.plan_name} onboarding`,
    `Offer: ${payload.trial_summary}`,
    `Setup mode: ${payload.onboarding_mode === 'onsite' ? 'Onsite' : 'Online'}`,
    payload.meeting_join_url ? `Zoho meeting: ${payload.meeting_join_url}` : null,
    payload.meeting_event_url ? `Zoho event: ${payload.meeting_event_url}` : null,
    `Reference: ${payload.consultation_reference}`,
  ]
    .filter(Boolean)
    .join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedAI//Pricing Consultation//EN',
    'BEGIN:VEVENT',
    `UID:${payload.consultation_reference}@bookedai.au`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:BookedAI ${payload.plan_name} consultation`,
    `DESCRIPTION:${description}`,
    `LOCATION:${payload.meeting_join_url || 'Online'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function buildInitialForm(planId: PlanId): ConsultationFormState {
  return {
    planId,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    businessName: '',
    businessType: '',
    onboardingMode: 'online',
    startupReferralEligible: false,
    referralPartner: '',
    referralLocation: '',
    preferredSlot: buildDefaultPreferredSlot(),
    notes: '',
  };
}
