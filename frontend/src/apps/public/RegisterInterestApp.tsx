import { FormEvent, useEffect, useMemo, useState } from 'react';

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
type OfferId = 'freemium' | 'launch10' | 'upgrade1' | 'upgrade2' | 'upgrade3';

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
    body: 'Best for SME teams that want to launch the live booking, payment, and email flow on their own website first.',
  },
  {
    id: 'dedicated_customer_app',
    title: 'Dedicated customer app',
    body: 'Best when the customer wants a separate branded app or cleaner booking surface while BookedAI handles the orchestration behind it.',
  },
  {
    id: 'linked_full_portal',
    title: 'Linked full portal',
    body: 'Best for teams that want the SME launch flow now and a wider BookedAI operator portal connected after rollout.',
  },
];

const nextStepCards = [
  {
    label: '1. Register',
    detail: 'Share the SME details BookedAI needs to review and start setup.',
  },
  {
    label: '2. Confirm',
    detail: 'We send email, calendar links, and the next commercial step in one flow.',
  },
  {
    label: '3. Go Live',
    detail: 'Launch standalone, in-app, or linked to the wider BookedAI portal.',
  },
];

const conversionHighlights = [
  {
    label: 'Free cohort',
    value: '10 SMEs',
    detail: 'Online setup waived for the first qualified launch customers.',
  },
  {
    label: 'Time to submit',
    value: '~2 min',
    detail: 'Short form built for QR traffic and mobile completion.',
  },
  {
    label: 'Commission trigger',
    value: 'Real bookings only',
    detail: 'Only when bookings complete through an installed BookedAI surface.',
  },
];

const funnelStages = [
  {
    title: 'Scan',
    body: 'QR or CTA opens the registration flow.',
  },
  {
    title: 'Choose',
    body: 'Pick package, rollout mode, and setup path.',
  },
  {
    title: 'Launch',
    body: 'BookedAI follows up, confirms, and gets the surface live.',
  },
];

const offerPackages: Array<{
  id: OfferId;
  title: string;
  badge: string;
  backendPlanId: PlanId;
  headline: string;
  body: string;
  commissionNote: string;
  highlighted?: boolean;
}> = [
  {
    id: 'freemium',
    title: 'Freemium',
    badge: 'Entry',
    backendPlanId: 'basic',
    headline: 'Best for first activation, plugin, popup, or website booking assistant.',
    body: 'A light entry path for SMEs that want BookedAI live on web or app surfaces first, then upgrade once real usage and booking patterns are visible.',
    commissionNote:
      'Commission only applies when a successful booking is completed through the BookedAI-installed plugin, website flow, app flow, or booking assistant popup.',
  },
  {
    id: 'launch10',
    title: 'Free Setup for First 10 SMEs',
    badge: 'Priority',
    backendPlanId: 'standard',
    headline: 'Online setup is waived for the first 10 qualified SME customers.',
    body: 'Requires enough business detail for BookedAI to review the SME quickly and begin online setup follow-up right away.',
    commissionNote:
      'No commission is charged unless BookedAI creates a real confirmed booking through the installed BookedAI booking flow.',
    highlighted: true,
  },
  {
    id: 'upgrade1',
    title: 'Pro',
    badge: 'Scale',
    backendPlanId: 'standard',
    headline: 'Best for SMEs ready to move from freemium into a stronger commercial rollout.',
    body: 'Ideal when you want a cleaner installed booking flow, better follow-up, and a more conversion-focused BookedAI setup after the first activation stage.',
    commissionNote:
      'Commission only applies to successful bookings attributed to BookedAI surfaces installed into the website, app, or popup.',
  },
  {
    id: 'upgrade2',
    title: 'Pro Max',
    badge: 'Growth',
    backendPlanId: 'pro',
    headline: 'Recommended for stronger booking, follow-up, automation, and conversion workflows.',
    body: 'Adds broader service journeys, deeper SME automation, and more operational depth once the initial proof-of-demand stage is passed.',
    commissionNote:
      'Commission starts only when real bookings close through the BookedAI-assisted installed flow.',
  },
  {
    id: 'upgrade3',
    title: 'Advance Customize',
    badge: 'Advanced',
    backendPlanId: 'pro',
    headline: 'Best for broader automation, multi-location logic, and deeper portal or workflow customization.',
    body: 'For SMEs and operators who need a more tailored BookedAI package after the early launch stage is working.',
    commissionNote:
      'Commission is tied only to confirmed bookings generated via the installed BookedAI experience, not generic external bookings.',
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
    `BookedAI offer selected: ${offerLabel}`,
    `Deployment mode: ${deploymentLabel}`,
    `Business website: ${businessWebsite.trim()}`,
    'Homepage offer: first 10 SMEs receive free online setup',
    'Commercial model: subscription or upgrade path plus commission only on successful bookings completed through the BookedAI-installed plugin, website flow, app flow, or booking assistant popup',
    'Subscription intent: customer wants to start the BookedAI trial now',
    formState.notes.trim() ? `Operator notes: ${formState.notes.trim()}` : null,
  ];

  return fragments.filter(Boolean).join('\n');
}

function normalizeOfferId(value: string | null): OfferId | null {
  switch ((value || '').trim().toLowerCase()) {
    case 'freemium':
    case 'free':
      return 'freemium';
    case 'launch10':
    case 'top10':
    case 'top-10':
    case 'first10':
    case 'first-10':
      return 'launch10';
    case 'upgrade1':
    case 'upgrade-1':
    case 'u1':
    case 'pro':
      return 'upgrade1';
    case 'upgrade2':
    case 'upgrade-2':
    case 'u2':
    case 'pro-max':
    case 'promax':
      return 'upgrade2';
    case 'upgrade3':
    case 'upgrade-3':
    case 'u3':
    case 'advance-customize':
    case 'advance_customize':
    case 'advanced-customize':
    case 'customize':
      return 'upgrade3';
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
  const [selectedOfferId, setSelectedOfferId] = useState<OfferId>('launch10');
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
      normalizeOfferId(params.get('offer')) ??
      normalizeOfferId(params.get('package')) ??
      normalizeOfferId(params.get('pkg')) ??
      (params.get('source_detail') === 'homepage_qr' ? 'launch10' : null);
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
      summaryParts.length > 0 ? `Campaign defaults applied: ${summaryParts.join(' • ')}` : null,
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
      setSubmitError('Enter your name so we can personalise the setup path.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formState.customerEmail.trim())) {
      setSubmitError('Enter a valid work email so we can send the confirmation and invite.');
      return;
    }

    if (normalizedPhoneDigits.length < 8) {
      setSubmitError('Enter a valid phone number with at least 8 digits.');
      return;
    }

    if (formState.businessName.trim().length < 2) {
      setSubmitError('Enter your business name.');
      return;
    }

    if (businessWebsite.trim().length < 4) {
      setSubmitError('Enter the SME website or app URL so we can review the setup surface.');
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
      setSubmitError('Choose a valid preferred setup time.');
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
        error instanceof Error ? error.message : 'Unable to submit your registration right now.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="booked-shell min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4f8_38%,#fbfcfd_100%)] pb-24 text-[#1d1d1f] md:pb-0">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.11),transparent_24%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.30)_0%,rgba(255,255,255,0)_30%,rgba(255,255,255,0.44)_100%)]" />

      <div className="relative z-10">
        <Header
          navItems={registerNavItems}
          onStartTrial={scrollToForm}
          onBookDemo={openProductDemo}
        />

        <SectionShell id="offer" className="pt-10 pb-8 sm:pt-14 lg:pt-18">
          <SectionCard className="relative overflow-hidden p-7 lg:p-9">
            <div className="absolute inset-x-[16%] top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.15),transparent_72%)] blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div>
                <SignalPill className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#1459c7]">
                  SME launch registration
                </SignalPill>
                <h1 className="mt-5 max-w-[11ch] text-4xl font-semibold tracking-[-0.06em] text-[#1d1d1f] sm:text-6xl">
                  Register your SME and get BookedAI live faster.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/68 sm:text-base sm:leading-8">
                  Pick a package, share your SME details, and let BookedAI continue with setup,
                  confirmation, and launch follow-up.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {conversionHighlights.map((item) => (
                    <SectionCard key={item.label} tone="subtle" className="rounded-[1.35rem] px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {item.label}
                      </div>
                      <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                        {item.value}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/66">{item.detail}</p>
                    </SectionCard>
                  ))}
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" onClick={scrollToForm} className="booked-button">
                    Claim Free Setup
                  </button>
                  <button
                    type="button"
                    onClick={openProductDemo}
                    className="booked-button-secondary"
                  >
                    Open Product Demo
                  </button>
                  <button
                    type="button"
                    onClick={openHomepage}
                    className="booked-button-secondary"
                  >
                    Open Live Product
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <SectionCard className="rounded-[1.75rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-5 shadow-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Registration funnel
                      </div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        Scan to live in 3 clear moves.
                      </div>
                    </div>
                    <SignalPill className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#1459c7]">
                      Mobile first
                    </SignalPill>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {funnelStages.map((stage, index) => (
                      <div
                        key={stage.title}
                        className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[1.2rem] border border-black/6 bg-white px-4 py-4"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{stage.title}</div>
                          <p className="mt-1 text-sm leading-6 text-black/66">{stage.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {[
                  ['Starting price', '49$+ public entry plan for SME launches'],
                  ['Subscription', '30-day free trial available now on BookedAI plans'],
                  ['Commercial model', 'Commission is only charged after a real booking is completed through the BookedAI-installed plugin, website, app, or booking assistant popup'],
                ].map(([label, value]) => (
                  <SectionCard key={label} tone="subtle" className="rounded-[1.5rem] p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
                  </SectionCard>
                ))}

                <SectionCard
                  tone="subtle"
                  className="rounded-[1.65rem] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.95)_0%,rgba(240,253,250,0.95)_100%)] p-5"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Why this page converts
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    Sales copy stays on the homepage. This page is built to turn QR scans and CTA
                    clicks into real SME setup conversations.
                  </p>
                </SectionCard>
              </div>
            </div>
          </SectionCard>
        </SectionShell>

        <SectionShell id="registration-form" className="py-8 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <SectionCard className="order-2 h-full p-6 lg:order-1 lg:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Launch routes
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                Choose the fastest way to go live.
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/66">
                Pick the rollout mode that matches where your customers will actually book first.
              </p>

              <div className="mt-6 grid gap-3">
                {deploymentModes.map((mode) => {
                  const isSelected = deploymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDeploymentMode(mode.id)}
                      className={[
                        'rounded-[1.45rem] border px-5 py-4 text-left transition',
                        isSelected
                          ? 'border-[#1459c7] bg-[#eff6ff] shadow-[0_12px_30px_rgba(37,99,235,0.10)]'
                          : 'border-black/8 bg-white hover:border-[#1459c7]/35 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="text-sm font-semibold text-slate-950">{mode.title}</div>
                      <p className="mt-2 text-sm leading-6 text-black/66">{mode.body}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3">
                {nextStepCards.map((item) => (
                  <SectionCard key={item.label} tone="subtle" className="rounded-[1.35rem] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                    <p className="mt-2 text-sm leading-6 text-black/66">{item.detail}</p>
                  </SectionCard>
                ))}
              </div>

              <SectionCard
                tone="subtle"
                className="mt-6 rounded-[1.4rem] border border-cyan-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96)_0%,rgba(236,254,255,0.96)_100%)] px-4 py-4"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Mobile conversion hint
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Form fields are intentionally front-loaded with the minimum details BookedAI needs
                  to follow up online quickly after a QR scan.
                </p>
              </SectionCard>
            </SectionCard>

            <SectionCard className="order-1 p-6 lg:order-2 lg:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Registration form
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                    Choose the right BookedAI package and register now.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-black/66">
                    Short form first. Deeper rollout details can be confirmed in follow-up.
                  </p>
                </div>
                <SignalPill className="bg-emerald-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                  10 SME priority
                </SignalPill>
              </div>

              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                {campaignPresetSummary ? (
                  <SectionCard
                    tone="subtle"
                    className="sm:col-span-2 rounded-[1.35rem] border border-cyan-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.96)_0%,rgba(236,254,255,0.96)_100%)] px-4 py-4"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      QR campaign preset
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{campaignPresetSummary}</p>
                  </SectionCard>
                ) : null}

                <div className="sm:col-span-2">
                  <div className="text-sm font-medium text-slate-700">BookedAI packages</div>
                  <div className="mt-3 grid gap-3">
                    {offerPackages.map((offer) => {
                      const isSelected = selectedOfferId === offer.id;
                      return (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => updateSelectedOffer(offer.id)}
                          className={[
                            'rounded-[1.55rem] border px-5 py-4 text-left transition',
                            isSelected
                              ? 'border-[#1459c7] bg-[#eff6ff] shadow-[0_12px_30px_rgba(37,99,235,0.10)]'
                              : 'border-black/8 bg-white hover:border-[#1459c7]/35 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-slate-950">
                                {offer.title}
                              </div>
                              <div className="mt-1 text-sm font-medium text-[#1459c7]">
                                {offer.headline}
                              </div>
                            </div>
                            <SignalPill
                              className={[
                                'px-3 py-1 text-[10px] uppercase tracking-[0.14em]',
                                offer.highlighted
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700',
                              ].join(' ')}
                            >
                              {offer.badge}
                            </SignalPill>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-black/66">{offer.body}</p>
                          <p className="mt-2 text-sm leading-6 text-[#1459c7]">
                            {offer.commissionNote}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Business name</span>
                  <input
                    type="text"
                    value={formState.businessName}
                    onChange={(event) => updateFormState('businessName', event.target.value)}
                    placeholder="Your company or venue"
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Website or app URL</span>
                  <input
                    type="url"
                    value={businessWebsite}
                    onChange={(event) => setBusinessWebsite(event.target.value)}
                    placeholder="https://yourbusiness.com.au"
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Business type</span>
                  <input
                    list="register-interest-business-types"
                    value={formState.businessType}
                    onChange={(event) => updateFormState('businessType', event.target.value)}
                    placeholder="Salon, clinic, tutoring, trades, hospitality..."
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                  <datalist id="register-interest-business-types">
                    {businessTypeSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Work email</span>
                  <input
                    type="email"
                    value={formState.customerEmail}
                    onChange={(event) => updateFormState('customerEmail', event.target.value)}
                    placeholder="you@business.com.au"
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Phone number</span>
                  <input
                    type="tel"
                    value={formState.customerPhone}
                    onChange={(event) => updateFormState('customerPhone', event.target.value)}
                    placeholder="+61 ..."
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Your name</span>
                  <input
                    type="text"
                    value={formState.customerName}
                    onChange={(event) => updateFormState('customerName', event.target.value)}
                    placeholder="How should we address you?"
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Setup mode</span>
                  <select
                    value={formState.onboardingMode}
                    onChange={(event) =>
                      updateFormState('onboardingMode', event.target.value as OnboardingMode)
                    }
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  >
                    <option value="online">Online setup</option>
                    <option value="onsite">Onsite setup</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Preferred setup time</span>
                  <input
                    type="datetime-local"
                    value={formState.preferredSlot}
                    onChange={(event) => updateFormState('preferredSlot', event.target.value)}
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <details className="sm:col-span-2 rounded-[1.45rem] border border-black/8 bg-slate-50 px-4 py-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                    Optional details
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Add these only if they help BookedAI prepare the rollout faster.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SectionCard as="label" tone="subtle" className="sm:col-span-2 flex items-start gap-3 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={formState.startupReferralEligible}
                        onChange={(event) =>
                          updateFormState('startupReferralEligible', event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-[#2563eb]"
                      />
                      <span className="text-sm leading-6 text-slate-700">
                        We are a startup team referred by an accelerator or incubator and want to claim
                        the 3-month free subscription offer if eligible.
                      </span>
                    </SectionCard>

                    {formState.startupReferralEligible ? (
                      <>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            Accelerator or incubator
                          </span>
                          <input
                            type="text"
                            value={formState.referralPartner}
                            onChange={(event) => updateFormState('referralPartner', event.target.value)}
                            placeholder="Startmate, UNSW Founders, Stone & Chalk..."
                            className="booked-field rounded-2xl px-4 py-3 text-sm"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-slate-700">Startup city or hub</span>
                          <input
                            type="text"
                            value={formState.referralLocation}
                            onChange={(event) => updateFormState('referralLocation', event.target.value)}
                            placeholder="Sydney, Melbourne, Brisbane..."
                            className="booked-field rounded-2xl px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : null}

                    <label className="flex flex-col gap-2 sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">Launch notes</span>
                      <textarea
                        value={formState.notes}
                        onChange={(event) => updateFormState('notes', event.target.value)}
                        rows={3}
                        placeholder="Key services, booking volume, or anything useful for setup."
                        className="booked-field rounded-[1.5rem] px-4 py-3 text-sm"
                      />
                    </label>
                  </div>
                </details>

                <SectionCard tone="subtle" className="sm:col-span-2 rounded-[1.45rem] px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Your selected path
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {selectedOffer.title}, mapped to {selectedPlan.name},{' '}
                    {formState.onboardingMode === 'onsite' ? 'onsite' : 'online'} setup,{' '}
                    {deploymentModes.find((mode) => mode.id === deploymentMode)?.title.toLowerCase()} rollout.
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/66">
                    Commission is only charged when there is a real booking completed through the
                    BookedAI-installed plugin, website integration, app integration, or booking
                    assistant popup.
                  </p>
                </SectionCard>

                {submitError ? (
                  <div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="booked-button inline-flex min-h-12 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Submitting registration...' : 'Register SME and Continue'}
                    <ArrowIcon />
                  </button>
                  <a
                    href="mailto:info@bookedai.au?subject=BookedAI%20SME%20Setup%20Registration"
                    className="booked-button-secondary inline-flex min-h-12 items-center justify-center"
                  >
                    Email Instead
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Next steps
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                  Confirmation, payment, and onboarding stay in one flow.
                </h2>
              </div>
              <SignalPill className="px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#1459c7]">
                BookedAI-owned conversion
              </SignalPill>
            </div>

            {result ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <SectionCard tone="subtle" className="rounded-[1.55rem] p-5">
                  <div className="text-sm font-semibold text-slate-950">
                    {selectedOffer.title} registration confirmed
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#2563eb]">{result.trial_summary}</p>
                  <p className="mt-3 text-sm leading-6 text-black/66">
                    Reference: {result.consultation_reference}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/66">
                    Preferred time: {formatConsultationDateTime(result)} {result.timezone}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/66">
                    Email status: {result.email_status === 'sent' ? 'Sent' : 'Pending manual follow-up'}
                  </p>
                  {result.startup_offer_summary ? (
                    <p className="mt-2 text-sm leading-6 text-[#2563eb]">
                      {result.startup_offer_summary}
                    </p>
                  ) : null}
                  {result.onsite_travel_fee_note ? (
                    <p className="mt-2 text-sm leading-6 text-black/66">
                      {result.onsite_travel_fee_note}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-[#1459c7]">
                    Commission only becomes payable when a real booking is completed through the
                    BookedAI-installed website flow, plugin, app, or booking assistant popup.
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
                      Download ICS
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
                      Open Meeting Link
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
                      Continue to Payment
                      <ArrowIcon />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={openHomepage}
                    className="booked-button-secondary inline-flex items-center justify-center"
                  >
                    Return to Homepage
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  'Register your SME to secure the launch offer and trial path.',
                  'Receive the onboarding email and the calendar-ready follow-up.',
                  'Continue into payment only when the chosen rollout path is ready.',
                ].map((item, index) => (
                  <SectionCard key={item} tone="subtle" className="rounded-[1.45rem] p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Step {index + 1}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black/66">{item}</p>
                  </SectionCard>
                ))}
              </div>
            )}
          </SectionCard>
        </SectionShell>

        <Footer onStartTrial={scrollToForm} onBookDemo={openProductDemo} />

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/8 bg-white/92 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Ready to launch
              </div>
              <div className="truncate text-sm font-semibold text-slate-950">
                Claim the free SME setup spot
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToForm}
              className="booked-button inline-flex min-h-11 shrink-0 items-center justify-center px-4 text-sm font-semibold"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
