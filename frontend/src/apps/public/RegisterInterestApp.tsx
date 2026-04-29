import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  Rocket,
} from 'lucide-react';

import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import { SectionCard } from '../../components/landing/ui/SectionCard';
import { SectionShell } from '../../components/landing/ui/SectionShell';
import { SignalPill } from '../../components/landing/ui/SignalPill';
import { submitPricingConsultation } from '../../shared/api';
import type {
  PricingConsultationRequest,
  PricingConsultationResponse,
} from '../../shared/contracts';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
  resolvePublicCtaAttribution,
} from '../../components/landing/attribution';
import {
  buildGoogleCalendarUrl,
  buildIcsDownloadUrl,
  buildInitialForm,
  businessTypeSuggestions,
  formatConsultationDateTime,
  parsePreferredSlot,
  plans,
  type ConsultationFormState,
  type OnboardingMode,
  type PlanId,
} from '../../components/landing/sections/pricing-shared';

type DeploymentModeId = 'standalone_website' | 'dedicated_customer_app' | 'linked_full_portal';
type OfferId = 'starter' | 'growth' | 'enterprise';

const registerNavItems = [
  { id: 'offer', label: 'Offer' },
  { id: 'registration-form', label: 'Register' },
  { id: 'next-steps', label: 'Next Steps' },
];

const deploymentModes: Array<{
  id: DeploymentModeId;
  title: string;
  body: string;
}> = [
  {
    id: 'standalone_website',
    title: 'Standalone website',
    body: 'Best when you want BookedAI live on your own website first — bookings, payments, and confirmations on day one.',
  },
  {
    id: 'dedicated_customer_app',
    title: 'Dedicated customer app',
    body: 'Best when you want a separate branded booking surface while BookedAI runs the orchestration behind it.',
  },
  {
    id: 'linked_full_portal',
    title: 'Linked full portal',
    body: 'Best when you want a fast public launch now plus the wider BookedAI workspace connected after rollout.',
  },
];

const nextStepCards = [
  {
    label: '1. Tell us about your bookings',
    detail: 'Share the basics so a founder can review fit and prep the live demo.',
  },
  {
    label: '2. We confirm a time',
    detail: 'You get an email, a calendar invite, and the next commercial step in one flow.',
  },
  {
    label: '3. Go live',
    detail: 'Launch standalone, in-app, or linked to the wider BookedAI workspace.',
  },
];

const conversionHighlights = [
  {
    label: 'Aligned commercial model',
    value: 'Pay only when we book',
    detail: 'Commission only applies to real bookings BookedAI captures or recovers.',
  },
  {
    label: 'Time to submit',
    value: 'About 2 minutes',
    detail: 'Built for mobile and QR traffic — only the details we actually need.',
  },
  {
    label: 'First reply',
    value: 'Within 24h',
    detail: 'A founder reviews the fit, then walks you through the live tenant proof.',
  },
];

const funnelStages = [
  {
    title: 'Tell us',
    body: 'Share your booked-revenue picture today.',
  },
  {
    title: 'Choose',
    body: 'Pick the engine, rollout mode, and setup path.',
  },
  {
    title: 'Go live',
    body: 'A founder confirms and walks you through the live demo.',
  },
];

const offerPackages: Array<{
  id: OfferId;
  title: string;
  badge: string;
  backendPlanId: PlanId;
  icon: typeof Rocket;
  headline: string;
  body: string;
  commissionNote: string;
  highlighted?: boolean;
}> = [
  {
    id: 'starter',
    title: 'Starter Engine',
    badge: 'Free',
    backendPlanId: 'basic',
    icon: BadgeCheck,
    headline: 'Solo or micro team launching BookedAI on a single channel.',
    body: 'Free SaaS at the bottom of the ladder. One channel, one service catalog, BookedAI Manager Bot, portal, payment QR, and email confirmations.',
    commissionNote: '0% commission. Pure SaaS at A$0 setup and A$79/mo.',
  },
  {
    id: 'growth',
    title: 'Growth Engine',
    badge: 'Most picked',
    backendPlanId: 'standard',
    icon: Rocket,
    headline: 'Established business ready to run BookedAI as the AI Revenue Engine.',
    body: 'All three channels (Telegram, WhatsApp, embed widget), booking-care queue, Stripe billing, CRM sync, booking activity history, and a monthly revenue summary.',
    commissionNote: 'A$499 onboarding plus 3% on net booked revenue BookedAI captures.',
    highlighted: true,
  },
  {
    id: 'enterprise',
    title: 'Enterprise Engine',
    badge: 'Premium',
    backendPlanId: 'pro',
    icon: Building2,
    headline: 'Multi-location, franchise, academy, or vertical platform.',
    body: 'Multi-tenant template, SSO, white-label widget, retention automation, SLA, and a named customer success manager.',
    commissionNote: 'A$2,500 to A$10,000 setup plus 5% on attributable revenue, floor and cap negotiated up front.',
  },
];

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

function buildRegistrationNotes(
  formState: ConsultationFormState,
  deploymentMode: DeploymentModeId,
  offerId: OfferId,
  businessWebsite: string,
) {
  const deploymentLabel =
    deploymentModes.find((mode) => mode.id === deploymentMode)?.title ?? deploymentMode;
  const offerLabel = offerPackages.find((offer) => offer.id === offerId)?.title ?? offerId;
  const fragments = [
    `BookedAI engine selected: ${offerLabel}`,
    `Deployment mode: ${deploymentLabel}`,
    `Business website: ${businessWebsite.trim()}`,
    'Commercial model: setup plus monthly plus commission only on real bookings BookedAI captures or recovers',
    formState.notes.trim() ? `Business notes: ${formState.notes.trim()}` : null,
  ];

  return fragments.filter(Boolean).join('\n');
}

function normalizeOfferId(value: string | null): OfferId | null {
  switch ((value || '').trim().toLowerCase()) {
    case 'starter':
    case 'starter-engine':
    case 'basic':
    case 'free':
    case 'freemium':
      return 'starter';
    case 'growth':
    case 'growth-engine':
    case 'standard':
    case 'launch10':
    case 'pro':
    case 'pro-max':
    case 'promax':
      return 'growth';
    case 'enterprise':
    case 'enterprise-engine':
    case 'advanced':
    case 'advance-customize':
    case 'advance_customize':
    case 'advanced-customize':
    case 'customize':
      return 'enterprise';
    default:
      return null;
  }
}

function normalizeDeploymentMode(value: string | null): DeploymentModeId | null {
  switch ((value || '').trim().toLowerCase()) {
    case 'standalone':
    case 'standalone_website':
    case 'website':
      return 'standalone_website';
    case 'app':
    case 'dedicated_app':
    case 'dedicated_customer_app':
      return 'dedicated_customer_app';
    case 'portal':
    case 'linked_portal':
    case 'linked_full_portal':
      return 'linked_full_portal';
    default:
      return null;
  }
}

function normalizeOnboardingMode(value: string | null): OnboardingMode | null {
  switch ((value || '').trim().toLowerCase()) {
    case 'online':
      return 'online';
    case 'onsite':
      return 'onsite';
    default:
      return null;
  }
}

export function RegisterInterestApp() {
  const [formState, setFormState] = useState<ConsultationFormState>(() =>
    buildInitialForm('standard'),
  );
  const [selectedOfferId, setSelectedOfferId] = useState<OfferId>('growth');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [deploymentMode, setDeploymentMode] = useState<DeploymentModeId>('standalone_website');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PricingConsultationResponse | null>(null);
  const [campaignPresetSummary, setCampaignPresetSummary] = useState<string | null>(null);
  const selectedOffer = useMemo(
    () => offerPackages.find((offer) => offer.id === selectedOfferId) ?? offerPackages[0],
    [selectedOfferId],
  );
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === formState.planId) ?? plans[0],
    [formState.planId],
  );
  const googleCalendarUrl = result ? buildGoogleCalendarUrl(result) : null;
  const icsDownloadUrl = result ? buildIcsDownloadUrl(result) : null;

  useEffect(() => {
    document.title = 'Talk to a BookedAI human | Register your interest';
  }, []);

  function updateFormState<K extends keyof ConsultationFormState>(
    key: K,
    value: ConsultationFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSelectedOffer(offerId: OfferId) {
    const offer = offerPackages.find((item) => item.id === offerId) ?? offerPackages[0];
    setSelectedOfferId(offer.id);
    updateFormState('planId', offer.backendPlanId);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const presetOffer =
      normalizeOfferId(params.get('plan')) ??
      normalizeOfferId(params.get('offer')) ??
      normalizeOfferId(params.get('package')) ??
      normalizeOfferId(params.get('pkg')) ??
      (params.get('source_detail') === 'homepage_qr' ? 'growth' : null);
    const presetDeployment =
      normalizeDeploymentMode(params.get('deployment')) ??
      normalizeDeploymentMode(params.get('mode')) ??
      (params.get('source_detail') === 'homepage_qr' ? 'standalone_website' : null);
    const presetOnboarding =
      normalizeOnboardingMode(params.get('setup')) ??
      normalizeOnboardingMode(params.get('onboarding'));

    const summaryParts: string[] = [];

    if (presetOffer) {
      const offer = offerPackages.find((item) => item.id === presetOffer);
      if (offer) {
        updateSelectedOffer(offer.id);
        summaryParts.push(offer.title);
      }
    }

    if (presetDeployment) {
      setDeploymentMode(presetDeployment);
      const deployment = deploymentModes.find((item) => item.id === presetDeployment);
      if (deployment) {
        summaryParts.push(deployment.title);
      }
    }

    if (presetOnboarding) {
      updateFormState('onboardingMode', presetOnboarding);
      summaryParts.push(presetOnboarding === 'onsite' ? 'Onsite setup' : 'Online setup');
    }

    setCampaignPresetSummary(
      summaryParts.length > 0 ? `Defaults applied from your link: ${summaryParts.join(' • ')}` : null,
    );
  }, []);

  function scrollToForm() {
    if (typeof window === 'undefined') {
      return;
    }

    const target = window.document.getElementById('registration-form');
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function openProductDemo() {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = 'https://product.bookedai.au/';
  }

  function openHomepage() {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = 'https://product.bookedai.au/';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    setResult(null);
    const normalizedPhoneDigits = formState.customerPhone.trim().replace(/\D/g, '');

    if (formState.customerName.trim().length < 2) {
      setSubmitError('We need your name so we know how to greet you.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formState.customerEmail.trim())) {
      setSubmitError('We need a valid email so we can send the confirmation and invite.');
      return;
    }

    if (normalizedPhoneDigits.length < 8) {
      setSubmitError('We need a phone number with at least 8 digits in case email bounces.');
      return;
    }

    if (formState.businessName.trim().length < 2) {
      setSubmitError('We need your business name so we know who we are setting up.');
      return;
    }

    if (businessWebsite.trim().length < 4) {
      setSubmitError('We need a website or app URL so we can review where BookedAI will run.');
      return;
    }

    if (formState.businessType.trim().length < 2) {
      setSubmitError('Pick or type the kind of business you run.');
      return;
    }

    if (formState.startupReferralEligible && formState.referralPartner.trim().length < 2) {
      setSubmitError('Tell us which accelerator or incubator referred you.');
      return;
    }

    const preferredSlot = parsePreferredSlot(formState.preferredSlot);
    if (!preferredSlot) {
      setSubmitError('Pick a valid time you would like to talk to a founder.');
      return;
    }

    const entryAttribution =
      resolvePublicCtaAttribution() ??
      buildPublicCtaAttribution({
        source_section: 'call_to_action',
        source_cta: 'start_free_trial',
        source_detail: 'register-interest-direct',
        source_plan_id: formState.planId,
        source_flow_mode: 'guided',
      });
    const submitAttribution = buildPublicCtaAttribution({
      source_section: 'call_to_action',
      source_cta: 'submit_pricing_consultation',
      source_detail: entryAttribution.source_cta,
      source_plan_id: formState.planId,
      source_flow_mode: 'guided',
    });

    setIsSubmitting(true);
    try {
      dispatchPublicCtaAttribution(submitAttribution);
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
        notes: buildRegistrationNotes(
          formState,
          deploymentMode,
          selectedOfferId,
          businessWebsite,
        ),
        source_page: entryAttribution.source_page,
        source_section: entryAttribution.source_section,
        source_cta: entryAttribution.source_cta,
        source_detail: `${entryAttribution.source_detail ?? 'register-interest'} > ${selectedOfferId} > ${deploymentMode}`,
        source_plan_id: formState.planId,
        source_flow_mode: 'guided',
        source_path: entryAttribution.source_path,
        source_referrer: entryAttribution.source_referrer,
      };
      const payload = await submitPricingConsultation(request);
      setResult(payload);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.document.getElementById('next-steps')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong on our side. Try again or email info@bookedai.au.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="booked-shell min-h-screen bg-apple-light pb-10 text-apple-near-black">
      <div className="relative z-10">
        <Header
          navItems={registerNavItems}
          onStartTrial={scrollToForm}
          onBookDemo={openProductDemo}
        />

        <SectionShell id="offer" className="pt-10 pb-8 sm:pt-14 lg:pt-18">
          <SectionCard className="relative overflow-hidden p-7 lg:p-9">
            <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <SignalPill className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-apple-blue">
                  Tell us about your booked revenue today
                </SignalPill>
                <h1 className="mt-5 max-w-[14ch] text-4xl font-semibold tracking-[-0.06em] text-apple-near-black sm:text-6xl">
                  Talk to a BookedAI human.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/72 sm:text-base sm:leading-8">
                  Two minutes of context, then a founder walks you through the live tenant proof and how BookedAI would run for your business.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {conversionHighlights.map((item) => (
                    <SectionCard key={item.label} tone="subtle" className="rounded-apple-large px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-black/56">
                        {item.label}
                      </div>
                      <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-apple-near-black">
                        {item.value}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/68">{item.detail}</p>
                    </SectionCard>
                  ))}
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={scrollToForm} className="booked-button">
                    Start free
                  </button>
                  <button
                    type="button"
                    onClick={openProductDemo}
                    className="booked-button-secondary"
                  >
                    Run the live demo
                  </button>
                  <button
                    type="button"
                    onClick={openHomepage}
                    className="booked-button-secondary"
                  >
                    See live tenant proof
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <SectionCard className="rounded-apple-large p-5 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/56">
                        How it runs
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-apple-near-black">
                        Three clear moves to live.
                      </div>
                    </div>
                    <SignalPill className="px-3 py-1 text-xs uppercase tracking-[0.14em] text-apple-blue">
                      Mobile first
                    </SignalPill>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {funnelStages.map((stage, index) => (
                      <div
                        key={stage.title}
                        className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-apple-large border border-black/8 bg-apple-white px-4 py-4"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-apple-blue text-sm font-semibold text-apple-white">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-apple-near-black">{stage.title}</div>
                          <p className="mt-1 text-sm leading-6 text-black/68">{stage.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {[
                  ['Entry point', 'Starter Engine is free SaaS at A$0 setup, A$79/mo'],
                  ['Aligned model', '3% on net booked revenue only on Growth Engine'],
                  ['Pay only when we book', 'Commission only on real bookings BookedAI captures or recovers'],
                ].map(([label, value]) => (
                  <SectionCard key={label} tone="subtle" className="rounded-apple-large p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/56">
                      {label}
                    </div>
                    <div className="mt-2 text-base font-semibold text-apple-near-black">{value}</div>
                  </SectionCard>
                ))}
              </div>
            </div>
          </SectionCard>
        </SectionShell>

        <SectionShell id="registration-form" className="py-8 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <SectionCard className="order-2 h-full p-6 lg:order-1 lg:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
                Launch routes
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
                Where will customers actually book first?
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/68">
                Pick the rollout mode that matches your real customer journey today.
              </p>

              <div className="mt-6 grid gap-3">
                {deploymentModes.map((mode) => {
                  const isSelected = deploymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDeploymentMode(mode.id)}
                      aria-pressed={isSelected}
                      className={[
                        'rounded-apple-large border px-5 py-4 text-left transition',
                        isSelected
                          ? 'border-apple-blue bg-apple-blue/5'
                          : 'border-black/8 bg-apple-white hover:border-apple-blue/40',
                      ].join(' ')}
                    >
                      <div className="text-sm font-semibold text-apple-near-black">{mode.title}</div>
                      <p className="mt-2 text-sm leading-6 text-black/68">{mode.body}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3">
                {nextStepCards.map((item) => (
                  <SectionCard key={item.label} tone="subtle" className="rounded-apple-large px-4 py-4">
                    <div className="text-sm font-semibold text-apple-near-black">{item.label}</div>
                    <p className="mt-2 text-sm leading-6 text-black/68">{item.detail}</p>
                  </SectionCard>
                ))}
              </div>

              <SectionCard tone="subtle" className="mt-6 rounded-apple-large px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-apple-blue">
                  Mobile first
                </div>
                <p className="mt-2 text-sm leading-6 text-black/72">
                  Only the details we actually need to follow up after a QR scan. Deeper rollout details can wait for the call.
                </p>
              </SectionCard>
            </SectionCard>

            <SectionCard className="order-1 p-6 lg:order-2 lg:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
                    Tell us about your bookings
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
                    Pick the engine and tell us where you book today.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-black/68">
                    Short form first. We confirm the rest on the call.
                  </p>
                </div>
                <SignalPill className="px-3 py-1 text-xs uppercase tracking-[0.14em] text-apple-blue">
                  Reply within 24h
                </SignalPill>
              </div>

              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
                {campaignPresetSummary ? (
                  <SectionCard tone="subtle" className="sm:col-span-2 rounded-apple-large px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-apple-blue">
                      From your link
                    </div>
                    <p className="mt-2 text-sm leading-6 text-black/72">{campaignPresetSummary}</p>
                  </SectionCard>
                ) : null}

                <div className="sm:col-span-2">
                  <div className="text-sm font-medium text-apple-near-black">BookedAI engines</div>
                  <p className="mt-1 text-xs text-black/56">
                    Free at the bottom, premium at the top. Aligned in the middle on real booked revenue.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {offerPackages.map((offer) => {
                      const isSelected = selectedOfferId === offer.id;
                      const OfferIcon = offer.icon;
                      return (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => updateSelectedOffer(offer.id)}
                          className={[
                            'group min-w-0 rounded-apple-large border px-3.5 py-3 text-left transition sm:px-4',
                            isSelected
                              ? 'border-apple-blue bg-apple-blue/5'
                              : 'border-black/8 bg-apple-white hover:border-apple-blue/40',
                          ].join(' ')}
                          aria-pressed={isSelected}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={[
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-standard',
                                isSelected ? 'bg-apple-blue text-apple-white' : 'bg-apple-light text-black/68',
                              ].join(' ')}
                              aria-hidden="true"
                            >
                              {isSelected ? <Check className="h-4 w-4" /> : <OfferIcon className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center justify-between gap-2">
                                <span className="line-clamp-2 min-w-0 text-sm font-semibold leading-5 text-apple-near-black">
                                  {offer.title}
                                </span>
                                <span
                                  className={[
                                    'shrink-0 rounded-apple-pill px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]',
                                    offer.highlighted
                                      ? 'bg-apple-blue/10 text-apple-blue'
                                      : 'bg-apple-light text-black/68',
                                  ].join(' ')}
                                >
                                  {offer.badge}
                                </span>
                              </span>
                              <span className="mt-1 line-clamp-2 block text-xs font-medium leading-5 text-apple-blue">
                                {offer.headline}
                              </span>
                            </span>
                          </div>
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-black/68">
                            {offer.body}
                          </div>
                          <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-apple-blue">
                            {offer.commissionNote}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Business name</span>
                  <input
                    type="text"
                    value={formState.businessName}
                    onChange={(event) => updateFormState('businessName', event.target.value)}
                    placeholder="Your company or venue"
                    required
                    minLength={2}
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                    autoComplete="organization"
                  />
                  <span className="text-xs text-black/56">So we know who we are setting up.</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Website or app URL</span>
                  <input
                    type="url"
                    value={businessWebsite}
                    onChange={(event) => setBusinessWebsite(event.target.value)}
                    placeholder="https://yourbusiness.com.au"
                    required
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                    inputMode="url"
                    autoComplete="url"
                  />
                  <span className="text-xs text-black/56">Where will BookedAI run on day one?</span>
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-apple-near-black">Business type</span>
                  <input
                    list="register-interest-business-types"
                    value={formState.businessType}
                    onChange={(event) => updateFormState('businessType', event.target.value)}
                    placeholder="Salon, clinic, tutoring, trades, hospitality..."
                    required
                    minLength={2}
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                  />
                  <datalist id="register-interest-business-types">
                    {businessTypeSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Work email</span>
                  <input
                    type="email"
                    value={formState.customerEmail}
                    onChange={(event) => updateFormState('customerEmail', event.target.value)}
                    placeholder="you@business.com.au"
                    required
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                    inputMode="email"
                    autoComplete="email"
                  />
                  <span className="text-xs text-black/56">We need an email so we can confirm and send the calendar invite.</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Phone number</span>
                  <input
                    type="tel"
                    value={formState.customerPhone}
                    onChange={(event) => updateFormState('customerPhone', event.target.value)}
                    placeholder="+61 ..."
                    required
                    minLength={8}
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <span className="text-xs text-black/56">In case email bounces.</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Your name</span>
                  <input
                    type="text"
                    value={formState.customerName}
                    onChange={(event) => updateFormState('customerName', event.target.value)}
                    placeholder="How should we address you?"
                    required
                    minLength={2}
                    className="booked-field min-h-[44px] rounded-apple-comfortable px-4 py-3 text-base sm:text-sm"
                    autoComplete="name"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Setup mode</span>
                  <select
                    value={formState.onboardingMode}
                    onChange={(event) =>
                      updateFormState('onboardingMode', event.target.value as OnboardingMode)
                    }
                    className="booked-field rounded-apple-comfortable px-4 py-3 text-sm"
                  >
                    <option value="online">Online setup</option>
                    <option value="onsite">Onsite setup</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-apple-near-black">Preferred time to talk</span>
                  <input
                    type="datetime-local"
                    value={formState.preferredSlot}
                    onChange={(event) => updateFormState('preferredSlot', event.target.value)}
                    required
                    className="booked-field rounded-apple-comfortable px-4 py-3 text-sm"
                  />
                </label>

                <details className="sm:col-span-2 rounded-apple-large border border-black/8 bg-apple-light px-4 py-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-apple-near-black">
                    Optional details
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-black/68">
                    Helpful only if it speeds up the rollout.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SectionCard as="label" tone="subtle" className="sm:col-span-2 flex items-start gap-3 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={formState.startupReferralEligible}
                        onChange={(event) =>
                          updateFormState('startupReferralEligible', event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-black/20 bg-apple-white text-apple-blue"
                      />
                      <span className="text-sm leading-6 text-black/72">
                        We are a startup team referred by an accelerator or incubator and would like to be considered for the 3-month free subscription offer.
                      </span>
                    </SectionCard>

                    {formState.startupReferralEligible ? (
                      <>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-apple-near-black">
                            Accelerator or incubator
                          </span>
                          <input
                            type="text"
                            value={formState.referralPartner}
                            onChange={(event) => updateFormState('referralPartner', event.target.value)}
                            placeholder="Startmate, UNSW Founders, Stone & Chalk..."
                            className="booked-field rounded-apple-comfortable px-4 py-3 text-sm"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-apple-near-black">Startup city or hub</span>
                          <input
                            type="text"
                            value={formState.referralLocation}
                            onChange={(event) => updateFormState('referralLocation', event.target.value)}
                            placeholder="Sydney, Melbourne, Brisbane..."
                            className="booked-field rounded-apple-comfortable px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : null}

                    <label className="flex flex-col gap-2 sm:col-span-2">
                      <span className="text-sm font-medium text-apple-near-black">Launch notes</span>
                      <textarea
                        value={formState.notes}
                        onChange={(event) => updateFormState('notes', event.target.value)}
                        rows={3}
                        placeholder="Key services, booking volume, or anything useful for setup."
                        className="booked-field rounded-apple-large px-4 py-3 text-sm"
                      />
                    </label>
                  </div>
                </details>

                <SectionCard tone="subtle" className="sm:col-span-2 rounded-apple-large px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-black/56">
                    Your selected path
                  </div>
                  <div className="mt-2 text-sm font-semibold text-apple-near-black">
                    {selectedOffer.title}, mapped to {selectedPlan.name},{' '}
                    {formState.onboardingMode === 'onsite' ? 'onsite' : 'online'} setup,{' '}
                    {deploymentModes.find((mode) => mode.id === deploymentMode)?.title.toLowerCase()} rollout.
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/68">
                    Commission only applies to real bookings BookedAI captures or recovers — not seats.
                  </p>
                </SectionCard>

                {submitError ? (
                  <div
                    role="alert"
                    className="sm:col-span-2 rounded-apple-large border border-apple-danger/30 bg-apple-danger/10 px-4 py-3 text-sm text-apple-danger"
                  >
                    {submitError}
                  </div>
                ) : null}

                <div className="sm:col-span-2 sticky bottom-0 left-0 right-0 z-10 flex flex-col gap-3 border-t border-black/5 bg-apple-light pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 -mx-4 px-4 sm:relative sm:mx-0 sm:px-0 sm:pt-0 sm:border-0 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="booked-button inline-flex min-h-[44px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        />
                        <span>Sending your interest...</span>
                      </>
                    ) : (
                      <>
                        Send my interest
                        <ArrowIcon />
                      </>
                    )}
                  </button>
                  <a
                    href="mailto:info@bookedai.au?subject=BookedAI%20setup%20enquiry"
                    className="booked-button-secondary inline-flex min-h-[44px] items-center justify-center"
                  >
                    Talk to a founder by email
                  </a>
                </div>
              </form>
            </SectionCard>
          </div>
        </SectionShell>

        <SectionShell id="next-steps" className="py-8 pb-14 lg:py-12 lg:pb-18">
          <SectionCard className="p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/56">
                  Next steps
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
                  Confirmation, calendar, and rollout — in one flow.
                </h2>
              </div>
              <SignalPill className="px-3 py-1 text-xs uppercase tracking-[0.14em] text-apple-blue">
                One conversation
              </SignalPill>
            </div>

            {result ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <SectionCard tone="subtle" className="rounded-apple-large p-5">
                  <div className="text-sm font-semibold text-apple-near-black">
                    {selectedOffer.title} — your interest is in.
                  </div>
                  <p className="mt-3 text-sm leading-6 text-apple-blue">{result.trial_summary}</p>
                  <p className="mt-3 text-sm leading-6 text-black/68">
                    Reference: {result.consultation_reference}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/68">
                    Preferred time: {formatConsultationDateTime(result)} {result.timezone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/68">
                    Email status: {result.email_status === 'sent' ? 'Sent' : 'Pending manual follow-up'}
                  </p>
                  {result.startup_offer_summary ? (
                    <p className="mt-2 text-sm leading-6 text-apple-blue">
                      {result.startup_offer_summary}
                    </p>
                  ) : null}
                  {result.onsite_travel_fee_note ? (
                    <p className="mt-2 text-sm leading-6 text-black/68">
                      {result.onsite_travel_fee_note}
                    </p>
                  ) : null}
                  <p className="mt-3 rounded-apple-large bg-apple-blue/5 px-4 py-3 text-sm leading-6 text-apple-near-black">
                    We will reach out within 24h. In the meantime, run the live demo to see BookedAI close a real booking.
                  </p>
                </SectionCard>

                <div className="grid gap-3">
                  {googleCalendarUrl ? (
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="booked-button inline-flex items-center justify-center gap-2"
                    >
                      Add to Google Calendar
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {icsDownloadUrl ? (
                    <a
                      href={icsDownloadUrl}
                      download={`bookedai-${result.consultation_reference}.ics`}
                      className="booked-button-secondary inline-flex items-center justify-center gap-2"
                    >
                      Download calendar invite
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {result.meeting_join_url ? (
                    <a
                      href={result.meeting_join_url}
                      target="_blank"
                      rel="noreferrer"
                      className="booked-button-secondary inline-flex items-center justify-center gap-2"
                    >
                      Open meeting link
                      <ArrowIcon />
                    </a>
                  ) : null}

                  {result.payment_url ? (
                    <a
                      href={result.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="booked-button inline-flex items-center justify-center gap-2"
                    >
                      Continue to payment
                      <ArrowIcon />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={openProductDemo}
                    className="booked-button-secondary inline-flex items-center justify-center"
                  >
                    Run the live demo
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  'Tell us about your bookings to lock in the engine and rollout path.',
                  'Get the confirmation email and a calendar-ready follow-up.',
                  'Move into payment only when the chosen rollout path is ready.',
                ].map((item, index) => (
                  <SectionCard key={item} tone="subtle" className="rounded-apple-large p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-black/56">
                      Step {index + 1}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black/72">{item}</p>
                  </SectionCard>
                ))}
              </div>
            )}
          </SectionCard>
        </SectionShell>

        <Footer onStartTrial={scrollToForm} onBookDemo={openProductDemo} />
      </div>
    </main>
  );
}
