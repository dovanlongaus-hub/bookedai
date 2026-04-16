import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { submitPricingConsultation } from '../../../shared/api';
import type { PricingConsultationRequest, PricingConsultationResponse } from '../../../shared/contracts';

type PlanId = 'basic' | 'standard' | 'pro';
type ConsultationFlowMode = 'full' | 'guided';
type ConsultationStep = 'contact' | 'calendar' | 'confirmed';
type OnboardingMode = 'online' | 'onsite';

type Plan = {
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

type Recommendation = {
  label: string;
  detail: string;
  featured?: boolean;
};

type ConsultationFormState = {
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

const highlightPoints = [
  '30 days of subscription free on every plan',
  'online setup included for launch customers',
  'simple monthly plans from A$79 with no long lock-in',
];

const topOffers = [
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

const setupOptions = [
  {
    label: 'Online setup',
    detail: 'Fastest option for most SMEs. Included for launch customers so you can get live quickly without extra setup friction.',
  },
  {
    label: 'Onsite setup',
    detail: 'Available for more complex teams, multi-location rollouts, or in-person training. Quoted separately after address confirmation.',
  },
];

const plans: Plan[] = [
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

const recommendations: Recommendation[] = [
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

const visiblePlans = plans.slice(0, 2);
const advancedPlan = plans[2];

const businessTypeSuggestions = [
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

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-5 w-5 text-cyan-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10.5l3.1 3.1L15.5 6.4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.25 10h11.5" />
      <path d="m10.75 4.5 5.25 5.5-5.25 5.5" />
    </svg>
  );
}

function toDatetimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildDefaultPreferredSlot() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(value);
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
    preferredDate: `${year}-${month}-${day}`,
    preferredTime: `${hours}:${minutes}`,
  };
}

function formatConsultationDateTime(payload: PricingConsultationResponse) {
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

function parseResultDate(payload: PricingConsultationResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildGoogleCalendarUrl(payload: PricingConsultationResponse) {
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

function buildIcsDownloadUrl(payload: PricingConsultationResponse) {
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

function buildInitialForm(planId: PlanId): ConsultationFormState {
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

function PlanCard({
  plan,
  onOpenConsultation,
}: {
  plan: Plan;
  onOpenConsultation: (planId: PlanId) => void;
}) {
  const cardClassName = plan.featured
    ? 'border-cyan-300/50 bg-[linear-gradient(180deg,rgba(8,47,73,0.92)_0%,rgba(14,116,144,0.22)_100%)] shadow-[0_32px_80px_rgba(6,182,212,0.24)] ring-1 ring-cyan-300/30'
    : 'border-white/10 bg-white/[0.05] shadow-[0_24px_60px_rgba(2,6,23,0.34)]';

  const badgeClassName = plan.featured
    ? 'bg-cyan-300/18 text-cyan-100 ring-1 ring-cyan-200/35'
    : 'bg-white/8 text-slate-200 ring-1 ring-white/10';

  const ctaClassName = plan.featured
    ? 'bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-50'
    : 'bg-cyan-400 text-slate-950 hover:-translate-y-0.5 hover:bg-cyan-300';

  return (
    <article
      className={`group relative overflow-hidden rounded-[2rem] border p-7 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_90px_rgba(8,145,178,0.18)] sm:p-8 ${cardClassName}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-cyan-300/12 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              {plan.introLabel}
            </div>
            <div className="text-xl font-semibold tracking-tight text-white">
              {plan.name}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{plan.subtitle}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${badgeClassName}`}
          >
            {plan.badge}
          </span>
        </div>

        <div className="mt-8 flex items-end gap-2">
          <div className="text-5xl font-semibold tracking-tight text-white">
            {plan.price}
          </div>
          <div className="pb-2 text-sm font-medium text-slate-400">/mo</div>
        </div>
        <p className="mt-2 text-sm font-semibold text-cyan-100">First 30 days free</p>
        <p className="mt-3 text-sm font-medium text-cyan-100">{plan.microcopy}</p>
        {plan.supportingText ? (
          <p className="mt-2 text-sm leading-6 text-slate-300">{plan.supportingText}</p>
        ) : (
          <div className="mt-2 h-12" aria-hidden="true" />
        )}

        <ul className="mt-8 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/12">
                <CheckIcon />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onOpenConsultation(plan.id)}
          className={`mt-8 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition ${ctaClassName}`}
        >
          {plan.ctaLabel}
          <ArrowIcon />
        </button>
      </div>
    </article>
  );
}

export function PricingSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flowMode, setFlowMode] = useState<ConsultationFlowMode>('full');
  const [consultationStep, setConsultationStep] = useState<ConsultationStep>('contact');
  const [showReturnMessage, setShowReturnMessage] = useState(false);
  const [formState, setFormState] = useState<ConsultationFormState>(() =>
    buildInitialForm('basic'),
  );
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PricingConsultationResponse | null>(null);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === formState.planId) ?? plans[0],
    [formState.planId],
  );
  const googleCalendarUrl = result ? buildGoogleCalendarUrl(result) : null;
  const icsDownloadUrl = result ? buildIcsDownloadUrl(result) : null;

  useEffect(() => {
    if (!showReturnMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowReturnMessage(false);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [showReturnMessage]);

  function openConsultation(planId: PlanId, mode: ConsultationFlowMode = 'full') {
    setFormState((current) => ({
      ...buildInitialForm(planId),
      customerName: current.customerName,
      customerEmail: current.customerEmail,
      customerPhone: current.customerPhone,
      businessName: current.businessName,
      businessType: current.businessType,
      onboardingMode: current.onboardingMode,
      startupReferralEligible: current.startupReferralEligible,
      referralPartner: current.referralPartner,
      referralLocation: current.referralLocation,
      notes: current.notes,
    }));
    setFlowMode(mode);
    setConsultationStep('contact');
    setSubmitError('');
    setResult(null);
    setShowReturnMessage(false);
    setIsDialogOpen(true);
  }

  function closeConsultation(options?: { showMessage?: boolean }) {
    setIsDialogOpen(false);
    setIsSubmitting(false);
    setSubmitError('');
    setConsultationStep('contact');
    if (options?.showMessage) {
      setShowReturnMessage(true);
      window.requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function handleContactContinue() {
    setSubmitError('');

    if (formState.customerName.trim().length < 2) {
      setSubmitError('Enter your name so we can personalise the recommendation.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formState.customerEmail.trim())) {
      setSubmitError('Enter a valid work email so we can send the calendar invite.');
      return;
    }

    if (formState.businessName.trim().length < 2) {
      setSubmitError('Enter your business name.');
      return;
    }

    if (formState.businessType.trim().length < 2) {
      setSubmitError('Choose or enter the type of SME you run.');
      return;
    }

    if (formState.startupReferralEligible && formState.referralPartner.trim().length < 2) {
      setSubmitError('Enter the accelerator or incubator that referred your startup.');
      return;
    }

    setConsultationStep('calendar');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    setResult(null);

    if (formState.customerName.trim().length < 2) {
      setSubmitError('Enter your name so we can confirm the consultation.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formState.customerEmail.trim())) {
      setSubmitError('Enter a valid work email for the Zoho invite and Stripe checkout.');
      return;
    }

    if (formState.businessName.trim().length < 2) {
      setSubmitError('Enter your business name.');
      return;
    }

    if (formState.businessType.trim().length < 2) {
      setSubmitError('Choose or enter the type of SME you run.');
      return;
    }

    if (formState.startupReferralEligible && formState.referralPartner.trim().length < 2) {
      setSubmitError('Enter the accelerator or incubator that referred your startup.');
      return;
    }

    const preferredSlot = parsePreferredSlot(formState.preferredSlot);
    if (!preferredSlot) {
      setSubmitError('Choose a valid preferred consultation time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const request: PricingConsultationRequest = {
        plan_id: formState.planId,
        customer_name: formState.customerName.trim(),
        customer_email: formState.customerEmail.trim(),
        customer_phone: formState.customerPhone.trim() || null,
        business_name: formState.businessName.trim(),
        business_type: formState.businessType.trim(),
        onboarding_mode: formState.onboardingMode,
        startup_referral_eligible: formState.startupReferralEligible,
        referral_partner: formState.referralPartner.trim() || null,
        referral_location: formState.referralLocation.trim() || null,
        preferred_date: preferredSlot.preferredDate,
        preferred_time: preferredSlot.preferredTime,
        timezone: 'Australia/Sydney',
        notes: formState.notes.trim() || null,
      };
      const payload = await submitPricingConsultation(request);
      setResult(payload);
      setConsultationStep('confirmed');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Unable to schedule your consultation right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative overflow-hidden bg-[#020617] px-6 py-24 text-white sm:py-28 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#030712_40%,#020617_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/3 h-72 bg-[radial-gradient(circle,rgba(14,165,233,0.16),transparent_58%)] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        {showReturnMessage ? (
          <div className="mx-auto mb-6 flex max-w-3xl items-start justify-between gap-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-sm text-cyan-50 shadow-[0_20px_60px_rgba(6,182,212,0.12)]">
            <p className="leading-6">
              Thanks, your request has been captured. You can keep exploring the homepage now, and
              the calendar invite plus confirmation email will continue from here.
            </p>
            <button
              type="button"
              onClick={() => setShowReturnMessage(false)}
              className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white/30"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-cyan-300/20 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[0_12px_40px_rgba(6,182,212,0.12)] backdrop-blur-xl">
            30-day free trial • simple SME pricing
          </div>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Simple pricing that feels easy to book now
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Start free for 30 days, then move to a clear monthly plan that fits your stage.
            We have lowered the entry price and simplified the offer so SMEs can decide faster.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Built for salons, clinics, swim schools, tutors, trades, hospitality, and other
            local businesses across Australia. Online rollout covers most teams, and we only
            quote extra when you need onsite support or a more custom implementation.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-cyan-300/20 bg-white/[0.06] p-7 shadow-[0_24px_80px_rgba(2,6,23,0.36)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">
                  Special offers first
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Three clear plans, one easy buying decision
                </h3>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-5 py-4 text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Starts from
                </div>
                <div className="mt-1 text-3xl font-semibold text-white">A$79/mo</div>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Pick the plan that matches your current volume and workflow. Every `Book` action
              takes you straight into the onboarding flow, timing selection, confirmation email,
              and payment preparation.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {topOffers.map((offer) => (
                <div
                  key={offer.title}
                  className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 px-5 py-5"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    {offer.eyebrow}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">{offer.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{offer.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,47,73,0.38)_0%,rgba(15,23,42,0.88)_100%)] p-7 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl sm:p-8">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">
              How setup works
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Keep launch simple, add complexity only if needed
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Most SMEs can launch online first. If your team needs onsite support, training,
              or a more hands-on rollout, we quote that separately so the base pricing stays clean.
            </p>
            <div className="mt-6 grid gap-3">
              {setupOptions.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-cyan-300/18 bg-slate-950/45 px-4 py-4"
                >
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{item.detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {highlightPoints.map((point) => (
                <span
                  key={point}
                  className="rounded-full border border-cyan-300/18 bg-slate-950/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
          {visiblePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onOpenConsultation={openConsultation} />
          ))}
          <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.96)_100%)] p-7 shadow-[0_24px_60px_rgba(2,6,23,0.34)] backdrop-blur-xl sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-cyan-300/10 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    For complex teams
                  </div>
                  <div className="text-xl font-semibold tracking-tight text-white">
                    {advancedPlan.name}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Multi-location, more custom automation, or broader operational rollout.
                  </p>
                </div>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 ring-1 ring-white/10">
                  Talk to us
                </span>
              </div>

              <div className="mt-8 text-4xl font-semibold tracking-tight text-white">
                Custom scope
              </div>
              <p className="mt-2 text-sm font-medium text-cyan-100">
                Usually starts from {advancedPlan.price}/mo after your 30-day free period
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                We keep advanced rollout off the main buying path so smaller SMEs can decide
                quickly, while larger operators can still get the right package.
              </p>

              <ul className="mt-8 space-y-3">
                {advancedPlan.features.slice(1).map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/12">
                      <CheckIcon />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => openConsultation(advancedPlan.id, 'guided')}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-transparent px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-cyan-200/60 hover:text-cyan-100"
              >
                Talk To Us About Pro
                <ArrowIcon />
              </button>
            </div>
          </article>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-[0_24px_80px_rgba(2,6,23,0.36)] backdrop-blur-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">
                Need help choosing?
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Choose the plan that matches where your business is today
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Starter is the lowest-risk entry and Growth is the best-value default for most SMEs.
                If your rollout is more complex, we can scope Pro with you separately.
              </p>
            </div>

            <div className="grid gap-3">
              {recommendations.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-[1.5rem] border px-5 py-4 transition ${
                    item.featured
                      ? 'border-cyan-300/35 bg-cyan-300/10 text-white shadow-[0_20px_60px_rgba(6,182,212,0.16)]'
                      : 'border-white/10 bg-slate-950/35 text-slate-200'
                  }`}
                >
                  <div className="text-lg font-semibold tracking-tight">{item.label}</div>
                  <div
                    className={`text-sm font-medium ${
                      item.featured ? 'text-cyan-100' : 'text-slate-400'
                    }`}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => openConsultation('standard', 'guided')}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                Book Recommended Plan
                <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[2rem] border border-white/10 bg-[#08111f] p-6 text-white shadow-[0_30px_100px_rgba(2,6,23,0.55)] sm:p-8">
            <button
              type="button"
              onClick={() => closeConsultation()}
              className="absolute right-4 top-4 rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Close
            </button>

            <div className="max-w-2xl">
              <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                {flowMode === 'guided' ? 'Recommended package flow' : 'Plan booking flow'}
              </div>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {consultationStep === 'contact'
                  ? `Book the ${selectedPlan.name} package`
                  : consultationStep === 'calendar'
                    ? 'Choose your onboarding time'
                    : `${selectedPlan.name} onboarding reserved`}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-300">
                {consultationStep === 'contact'
                  ? 'Share the essentials first. We use them to prepare your package onboarding, trial offer, confirmation email, and payment flow.'
                  : consultationStep === 'calendar'
                    ? 'Your package details are captured. Pick the onboarding time and we will prepare calendar actions, email confirmation, and Stripe checkout for the plan you selected.'
                    : 'Your package flow is ready. You can add it to your calendar, continue to Stripe, or close and return to the homepage.'}
              </p>
            </div>

            {consultationStep === 'contact' ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Selected plan</span>
                  <select
                    value={formState.planId}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        planId: event.target.value as PlanId,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.price}/mo after free subscription period)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Phone number</span>
                  <input
                    type="tel"
                    value={formState.customerPhone}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        customerPhone: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Your name</span>
                  <input
                    type="text"
                    value={formState.customerName}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                    placeholder="How should we address you?"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Setup mode</span>
                  <select
                    value={formState.onboardingMode}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        onboardingMode: event.target.value as OnboardingMode,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  >
                    <option value="online">Online setup</option>
                    <option value="onsite">Onsite setup</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Work email</span>
                  <input
                    type="email"
                    value={formState.customerEmail}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        customerEmail: event.target.value,
                      }))
                    }
                    placeholder="you@business.com.au"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="sm:col-span-2 flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-slate-950/35 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={formState.startupReferralEligible}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        startupReferralEligible: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
                  />
                  <span className="text-sm leading-6 text-slate-300">
                    We are a startup team referred by an accelerator or incubator and want to claim the 3-month free offer.
                  </span>
                </label>

                {formState.startupReferralEligible ? (
                  <>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-200">Accelerator or incubator</span>
                      <input
                        type="text"
                        value={formState.referralPartner}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            referralPartner: event.target.value,
                          }))
                        }
                        placeholder="Startmate, UNSW Founders, Stone & Chalk, Antler..."
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-slate-200">Startup city or hub</span>
                      <input
                        type="text"
                        value={formState.referralLocation}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            referralLocation: event.target.value,
                          }))
                        }
                        placeholder="Sydney, Melbourne, Perth, Brisbane, Adelaide, Darwin..."
                        className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                      />
                    </label>
                  </>
                ) : null}

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Business name</span>
                  <input
                    type="text"
                    value={formState.businessName}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        businessName: event.target.value,
                      }))
                    }
                    placeholder="Your company or venue"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-200">Business type</span>
                  <input
                    list="pricing-business-types"
                    value={formState.businessType}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        businessType: event.target.value,
                      }))
                    }
                    placeholder="Choose one or enter your own"
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                  <datalist id="pricing-business-types">
                    {businessTypeSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                {submitError ? (
                  <div className="sm:col-span-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {submitError}
                  </div>
                ) : null}

                <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleContactContinue}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300"
                  >
                    Continue to installation calendar
                    <ArrowIcon />
                  </button>
                  <p className="text-sm leading-6 text-slate-400">
                    We will use this to send your onboarding confirmation, trial offer summary, and calendar invite.
                  </p>
                </div>
              </div>
            ) : null}

            {consultationStep === 'calendar' ? (
              <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
                <div className="sm:col-span-2 rounded-[1.5rem] border border-cyan-300/20 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
                  Package reserved for <span className="font-semibold text-white">{formState.customerEmail}</span>.
                  Choose the onboarding time below, then we will create the calendar step and prepare payment for the selected plan. Subscription and setup are handled as separate commercial items.
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Preferred time</span>
                  <input
                    type="datetime-local"
                    value={formState.preferredSlot}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        preferredSlot: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Selected plan</span>
                  <input
                    value={`${selectedPlan.name} (${selectedPlan.price}/mo after ${formState.startupReferralEligible ? '3-month' : '30-day'} free subscription period)`}
                    readOnly
                    className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200 outline-none"
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-200">Notes</span>
                  <textarea
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Anything helpful before the call, like channels, booking volume, or key integrations."
                    className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                  />
                </label>

                {submitError ? (
                  <div className="sm:col-span-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {submitError}
                  </div>
                ) : null}

                <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError('');
                      setConsultationStep('contact');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] border border-white/15 px-5 py-4 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:text-cyan-100"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Booking package flow...' : 'Book now and open payment + calendar'}
                    <ArrowIcon />
                  </button>
                </div>
              </form>
            ) : null}

            {consultationStep === 'confirmed' && result ? (
              <div className="mt-8 rounded-[1.75rem] border border-cyan-300/20 bg-white/[0.04] p-5 sm:p-6">
                <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">
                  Package reserved
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {result.plan_name} plan for {result.amount_label}
                </div>
                <p className="mt-3 text-sm leading-6 text-cyan-100">{result.trial_summary}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Setup fee is treated separately from subscription. Online launch setup may be waived for eligible early customers, while onsite rollout is quoted separately where needed.
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Reference: {result.consultation_reference}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Preferred time: {formatConsultationDateTime(result)} {result.timezone}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Setup mode: {result.onboarding_mode === 'onsite' ? 'Onsite installation' : 'Online installation'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Email status: {result.email_status === 'sent' ? 'Sent' : 'Pending manual follow-up'}
                </p>
                {result.startup_offer_summary ? (
                  <p className="mt-2 text-sm leading-6 text-cyan-100">{result.startup_offer_summary}</p>
                ) : null}
                {result.onsite_travel_fee_note ? (
                  <p className="mt-2 text-sm leading-6 text-slate-300">{result.onsite_travel_fee_note}</p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  {googleCalendarUrl ? (
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Add to Google Calendar
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {icsDownloadUrl ? (
                    <a
                      href={icsDownloadUrl}
                      download={`bookedai-${result.consultation_reference}.ics`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:text-cyan-100"
                    >
                      Download ICS
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {result.meeting_join_url ? (
                    <a
                      href={result.meeting_join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
                    >
                      Open Zoho meeting
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {result.meeting_event_url ? (
                    <a
                      href={result.meeting_event_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:text-cyan-100"
                    >
                      View calendar event
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {result.payment_url ? (
                    <a
                      href={result.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      Continue to Stripe
                      <ArrowIcon />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => closeConsultation({ showMessage: true })}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:text-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
