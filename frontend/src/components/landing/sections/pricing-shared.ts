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
  'Commercial model stays readable from first scope call to paid rollout',
  'Entry path is intentionally low-friction, but still framed like a serious operating decision',
  'Higher tiers add automation, visibility, and workflow depth while commission stays tied to real booked revenue',
];

export const topOffers = [
  {
    eyebrow: 'Entry posture',
    title: 'Enter cleanly, then expand only when workflow depth is justified',
    body: 'The first package is designed to let teams prove fit and operating value before they commit to deeper automation or broader rollout scope.',
  },
  {
    eyebrow: 'Commercial clarity',
    title: 'Keep the buying story legible instead of hiding it behind pricing noise',
    body: 'The public pricing story is meant to show setup scope, monthly commitment, and performance upside in one clean sequence.',
  },
];

export const setupOptions = [
  {
    label: 'Online setup',
    detail: 'Default path for most teams. Faster to launch, easier to approve, and cleaner to scale once workflow fit is proven.',
  },
  {
    label: 'Onsite setup',
    detail: 'Used when operational complexity, multi-location rollout, or in-person enablement makes a higher-touch launch commercially sensible.',
  },
];

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Starter',
    price: '49$+',
    subtitle: 'Best for teams that want to prove demand capture and first workflow fit before expanding into a deeper operating rollout.',
    badge: 'Entry layer',
    ctaLabel: 'Review Starter',
    introLabel: 'Initial deployment',
    microcopy:
      'Use Starter when the goal is to validate fit, control first response, and establish a cleaner operating path without overcommitting early.',
    supportingText:
      'Strong fit when you need a credible first deployment path for website demand capture and a simple booking lane at a clear entry price.',
    features: [
      'AI website chat',
      'core enquiry capture',
      'simple booking follow-through',
      'starter activation path',
      '1 focused service workflow',
      'best for proving operating fit before expansion',
    ],
  },
  {
    id: 'standard',
    name: 'Pro',
    price: 'A$149',
    subtitle: 'The default paid plan for teams that want stronger qualification, guided booking, and a more visible conversion engine.',
    badge: 'Core operating plan',
    ctaLabel: 'Review Pro',
    introLabel: 'Growth layer',
    microcopy:
      'The clearest paid path for teams that want BookedAI to move from helpful surface into a repeatable revenue flow.',
    supportingText:
      'Strong fit for growing service teams that need more qualification discipline, follow-up visibility, and commercial clarity without moving into custom scope.',
    features: [
      'everything in Starter',
      'missed call SMS auto-reply',
      'guided booking flow',
      'SMS follow-up',
      'calendar integration',
      'weekly performance reporting',
    ],
    featured: true,
  },
  {
    id: 'pro',
    name: 'Pro Max',
    price: 'A$349',
    subtitle: 'For higher-volume or more complex service teams that need broader automation, deeper qualification, and multi-service or multi-location support.',
    badge: 'Scale layer',
    ctaLabel: 'Review Pro Max',
    introLabel: 'Scale posture',
    microcopy:
      'Built for businesses where operating depth, coordination, and commercial complexity justify a more advanced team workspace.',
    supportingText:
      'Best for multi-location clinics, hospitality groups, education providers, and service teams that need deeper automation and more visible business flow.',
    features: [
      'everything in Pro',
      'AI answers inbound calls',
      'advanced booking and reminder automation',
      'multi-service and multi-location support',
      'CRM or workflow integration',
      'team visibility dashboard',
    ],
  },
];

export const recommendations: Recommendation[] = [
  {
    label: 'Starter',
    detail: 'Validate fit',
  },
  {
    label: 'Pro',
    detail: 'Default paid path',
    featured: true,
  },
  {
    label: 'Pro Max',
    detail: 'Scale operations',
  },
];

export const pricingSignals = [
  {
    label: 'Entry point',
    value: '49$+',
    detail: 'Clear entry path for teams that want BookedAI live quickly without obscuring rollout scope',
  },
  {
    label: 'Buying ladder',
    value: 'Starter -> Pro -> Pro Max',
    detail: 'Move into higher-capability plans only as operating complexity and commercial upside deepen',
  },
  {
    label: 'Commercial model',
    value: 'Setup fee + monthly + commission',
    detail: 'Setup is scoped clearly, monthly plans stay predictable, and commission is tied only to real booked revenue',
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
  const packageName = payload.package_name || payload.plan_name;
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const details = [
    `BookedAI ${packageName} onboarding`,
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
    text: `BookedAI ${packageName} consultation`,
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
  const packageName = payload.package_name || payload.plan_name;
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const description = [
    `BookedAI ${packageName} onboarding`,
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
    `SUMMARY:BookedAI ${packageName} consultation`,
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
