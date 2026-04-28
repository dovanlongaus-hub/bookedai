import type { PricingConsultationResponse } from '../../../shared/contracts';

export type PlanId = 'basic' | 'standard' | 'pro';
export type PlanSlug = 'starter' | 'growth' | 'enterprise';
export type ConsultationFlowMode = 'full' | 'guided';
export type ConsultationStep = 'contact' | 'calendar' | 'confirmed';
export type OnboardingMode = 'online' | 'onsite';

export type PlanCta = {
  label: string;
  href: string;
};

export type Plan = {
  id: PlanId;
  slug: PlanSlug;
  name: string;
  tagline: string;
  setupFee: string;
  monthlyFee: string;
  commission: string;
  price: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  cta: PlanCta;
  introLabel: string;
  microcopy: string;
  supportingText?: string;
  features: string[];
  featured?: boolean;
  mostPopular?: boolean;
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
  'Free at the bottom, premium at the top, aligned in the middle on real booked revenue',
  'Setup fee, monthly, and commission stay clearly separated so buyers can scan the model in one pass',
  'Commission only applies to bookings BookedAI actually captures or recovers',
];

export const topOffers = [
  {
    eyebrow: 'Aligned incentives',
    title: 'Pay only when BookedAI books real revenue',
    body: 'Starter is free SaaS, Growth adds 3% on net booked revenue, and Enterprise is 5% with a negotiated floor and cap. We win when you do.',
  },
  {
    eyebrow: 'Commercial clarity',
    title: 'Setup, subscription, and commission are clearly separated',
    body: 'Onboarding scope is quoted up front, the monthly stays predictable, and performance commission is only introduced when the AI Revenue Engine is producing booked outcomes.',
  },
];

export const setupOptions = [
  {
    label: 'Self-serve onboarding (Starter)',
    detail: 'Solo and micro teams can launch BookedAI on their own without a setup fee, on one channel and one service catalog.',
  },
  {
    label: 'Guided onboarding (Growth)',
    detail: 'A$499 onboarding scopes catalog import, brand setup, and channel wiring across Telegram, WhatsApp, and the embed widget.',
  },
  {
    label: 'Custom rollout (Enterprise)',
    detail: 'A$2,500-A$10,000 custom rollout for multi-location, franchise, or vertical platform deployments needing SSO and dedicated CSM.',
  },
];

const registerInterestHref = '/register-interest';

export const plans: Plan[] = [
  {
    id: 'basic',
    slug: 'starter',
    name: 'Starter Engine',
    tagline: 'Solo / micro teams (1-3 staff)',
    setupFee: 'A$0 self-serve',
    monthlyFee: 'A$79/mo',
    commission: '0% (pure SaaS)',
    price: 'A$79',
    subtitle: 'Solo coach, single tradie, or 1-room clinic that wants a clean launch on one channel without a setup fee.',
    badge: 'Starter Engine',
    ctaLabel: 'Start free',
    cta: {
      label: 'Start free',
      href: `${registerInterestHref}?plan=starter`,
    },
    introLabel: 'Self-serve',
    microcopy:
      'Free SaaS at the bottom of the ladder. One channel, one service catalog, BookedAI Manager Bot, portal, payment QR, and email confirmations.',
    supportingText:
      'Capped at 50 booked/mo. Strong fit for proving demand capture before stepping up into the Growth tier.',
    features: [
      '1 channel (Telegram OR web widget)',
      '1 service catalog',
      'BookedAI Manager Bot + portal',
      'Payment QR + email confirmations',
      '50 booked/mo cap',
      'Self-serve onboarding, no setup fee',
    ],
  },
  {
    id: 'standard',
    slug: 'growth',
    name: 'Growth Engine',
    tagline: 'Established SME (4-25 staff)',
    setupFee: 'A$499 onboarding',
    monthlyFee: 'A$249/mo',
    commission: '3% on net booked revenue',
    price: 'A$249',
    subtitle: 'Salon, clinic, swim school, or tutoring centre ready to run BookedAI as the AI Revenue Engine across every channel.',
    badge: 'Most popular',
    ctaLabel: 'Start a 30-day pilot',
    cta: {
      label: 'Start a 30-day pilot',
      href: `${registerInterestHref}?plan=growth`,
    },
    introLabel: 'Aligned incentives',
    microcopy:
      'Growth adds a 3% commission on net booked revenue captured or recovered through BookedAI. We are aligned on real bookings, not seats.',
    supportingText:
      'Onboarding covers catalog import, brand wiring, and channel setup. Monthly tenant revenue summary email keeps the commercial story honest.',
    features: [
      'All 3 channels (Telegram + WhatsApp + embed widget)',
      'Revenue-ops agent queue + customer-care agent',
      'Audit ledger + Stripe billing',
      'CRM sync',
      'Monthly tenant revenue summary email',
      'A$499 onboarding + 3% on net booked revenue',
    ],
    featured: true,
    mostPopular: true,
  },
  {
    id: 'pro',
    slug: 'enterprise',
    name: 'Enterprise Engine',
    tagline: 'Multi-location / franchise / academy (25+ staff or 3+ locations)',
    setupFee: 'A$2,500-A$10,000 custom',
    monthlyFee: 'A$999+/mo',
    commission: '5% on attributable revenue (floor + cap negotiated)',
    price: 'A$999+',
    subtitle: 'Multi-location, franchise, academy, or vertical platform that needs the multi-tenant template, SSO, and a named CSM.',
    badge: 'Enterprise Engine',
    ctaLabel: 'Talk to founder',
    cta: {
      label: 'Talk to founder',
      href: `${registerInterestHref}?plan=enterprise`,
    },
    introLabel: 'Premium at the top',
    microcopy:
      'Custom rollout, vertical template config, SSO, white-label widget, retention/churn-rescue automation, SLA, and a named CSM.',
    supportingText:
      'Setup fee scoped per contract. 5% commission on attributable booked revenue with floor and cap negotiated up front.',
    features: [
      'Multi-tenant template + dedicated onboarding',
      'Admin reliability lane + audit ledger',
      'White-label widget + webhook + API access',
      'Retention / churn-rescue automation',
      'SLA + named CSM',
      'A$2,500-A$10,000 setup + 5% on attributable revenue',
    ],
  },
];

export const recommendations: Recommendation[] = [
  {
    label: 'Starter Engine',
    detail: 'Free SaaS, 1 channel, 50 bookings/mo cap',
  },
  {
    label: 'Growth Engine',
    detail: 'A$249/mo + 3% on net booked revenue',
    featured: true,
  },
  {
    label: 'Enterprise Engine',
    detail: 'A$999+/mo + 5% on attributable revenue',
  },
];

export const pricingSignals = [
  {
    label: 'Entry point',
    value: 'A$0 setup',
    detail: 'Starter Engine is free SaaS so solo and micro teams can launch BookedAI before committing to commission.',
  },
  {
    label: 'Buying ladder',
    value: 'Starter -> Growth -> Enterprise',
    detail: 'Step up only when AI Revenue Engine output justifies a deeper rollout, broader channels, and aligned commission.',
  },
  {
    label: 'Commercial model',
    value: 'Free at the bottom, aligned in the middle, premium at the top',
    detail: 'Setup, monthly, and commission stay separated. Commission only applies to bookings BookedAI captures or recovers.',
  },
];

export const visiblePlans = plans;
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
