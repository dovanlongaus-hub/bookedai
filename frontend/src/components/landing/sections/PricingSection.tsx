import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { submitPricingConsultation } from '../../../shared/api';
import type { PricingConsultationRequest, PricingConsultationResponse } from '../../../shared/contracts';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
  type PublicCtaAttribution,
  type PublicCtaName,
} from '../attribution';
import { PricingConsultationModal } from './PricingConsultationModal';
import { PricingPlanCard } from './PricingPlanCard';
import { PricingRecommendationPanel } from './PricingRecommendationPanel';
import {
  advancedPlan,
  buildGoogleCalendarUrl,
  buildIcsDownloadUrl,
  buildInitialForm,
  businessTypeSuggestions,
  formatConsultationDateTime,
  highlightPoints,
  parsePreferredSlot,
  plans,
  pricingSignals,
  recommendations,
  setupOptions,
  topOffers,
  visiblePlans,
  type ConsultationFlowMode,
  type ConsultationFormState,
  type ConsultationStep,
  type OnboardingMode,
  type PlanId,
} from './pricing-shared';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';

const pricingFlow = [
  {
    title: 'Pick the package',
    body: 'Start with Freemium, claim the Top 10 SME launch offer, or choose the paid plan that matches your current revenue stage.',
  },
  {
    title: 'Confirm setup',
    body: 'Online first for most teams, onsite only when complexity justifies it.',
  },
  {
    title: 'Lock the close',
    body: 'Consultation, confirmation, and the commercial next step continue from one buying path.',
  },
];

const pricingModelPillars = [
  {
    label: 'Setup',
    value: 'Separate',
    detail: 'Quoted clearly so launch work does not blur with the monthly plan.',
  },
  {
    label: 'Subscription',
    value: 'Predictable',
    detail: 'Simple monthly pricing keeps the first paid decision easy to understand.',
  },
  {
    label: 'Commission',
    value: 'Performance-based',
    detail: 'Introduced only when the rollout context and revenue path are clear.',
  },
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

export function PricingSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flowMode, setFlowMode] = useState<ConsultationFlowMode>('full');
  const [consultationStep, setConsultationStep] = useState<ConsultationStep>('contact');
  const [showReturnMessage, setShowReturnMessage] = useState(false);
  const [consultationAttribution, setConsultationAttribution] =
    useState<PublicCtaAttribution | null>(null);
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

  function openConsultation(
    planId: PlanId,
    mode: ConsultationFlowMode = 'full',
    sourceCta: PublicCtaName = 'book_plan',
    sourceDetail?: string,
  ) {
    const nextAttribution = buildPublicCtaAttribution({
      source_section: 'pricing',
      source_cta: sourceCta,
      source_plan_id: planId,
      source_flow_mode: mode,
      source_detail: sourceDetail ?? null,
    });
    dispatchPublicCtaAttribution(nextAttribution);
    setConsultationAttribution(nextAttribution);
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
        source_page: consultationAttribution?.source_page ?? null,
        source_section: consultationAttribution?.source_section ?? null,
        source_cta: consultationAttribution?.source_cta ?? null,
        source_detail: consultationAttribution?.source_detail ?? null,
        source_plan_id: consultationAttribution?.source_plan_id ?? null,
        source_flow_mode: consultationAttribution?.source_flow_mode ?? null,
        source_path: consultationAttribution?.source_path ?? null,
        source_referrer: consultationAttribution?.source_referrer ?? null,
      };
      dispatchPublicCtaAttribution(
        buildPublicCtaAttribution({
          source_section: 'pricing',
          source_cta: 'submit_pricing_consultation',
          source_plan_id: formState.planId,
          source_flow_mode: flowMode,
          source_detail: consultationAttribution?.source_cta ?? null,
        }),
      );
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
      className="template-section relative overflow-hidden px-6 py-24 sm:py-28 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(249,115,22,0.12),transparent_22%),linear-gradient(180deg,#fcfaf6_0%,#f5f1e8_45%,#ede4d5_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/3 h-72 bg-[radial-gradient(circle,rgba(37,99,235,0.12),transparent_58%)] blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        {showReturnMessage ? (
          <SectionCard tone="subtle" className="mx-auto mb-6 flex max-w-3xl items-start justify-between gap-4 px-5 py-4 text-sm text-slate-700">
            <p className="leading-6">
              Thanks, your request has been captured. You can keep exploring the homepage now, and
              the calendar invite plus confirmation email will continue from here.
            </p>
            <button
              type="button"
              onClick={() => setShowReturnMessage(false)}
              className="booked-button-secondary shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              Dismiss
            </button>
          </SectionCard>
        ) : null}

        <div className="mx-auto max-w-4xl text-center">
          <SignalPill className="inline-flex items-center justify-center px-4 py-2 text-[11px] uppercase tracking-[0.24em]">
            Starter from 49$+ • Pro and Pro Max • commission on real booked revenue
          </SignalPill>
          <h2 className="template-title mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Package pricing that helps SMEs say yes quickly without losing commercial clarity
          </h2>
          <p className="template-body mx-auto mt-5 max-w-2xl text-lg leading-8">
            Start from 49$+, move into Pro when you need more guided booking power, then scale through a setup, plan, and commission model that stays easy to understand.
          </p>
          <p className="template-body mx-auto mt-4 max-w-3xl text-sm leading-6 sm:text-base">
            Built for salons, clinics, swim schools, tutors, trades, hospitality, and other
            local businesses across Australia. You can launch standalone on your website, as a dedicated booking app, or as a path linked into the broader BookedAI portal.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {pricingSignals.map((item) => (
              <SectionCard
                key={item.label}
                as="article"
                tone="subtle"
                className="px-5 py-4"
              >
                <div className="template-kicker text-[11px]">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {item.value}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
              </SectionCard>
            ))}
          </div>

          <SectionCard className="mt-5 rounded-[2rem] p-5 text-left lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-[11px]">Pricing flow graphic</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  The homepage should explain the offer clearly before the buyer ever opens the deeper product runtime.
                </div>
              </div>
              <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Fast scan
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {pricingFlow.map((item, index) => (
                <SectionCard key={item.title} as="article" tone="subtle" className="rounded-[1.4rem] px-5 py-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                </SectionCard>
              ))}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {pricingModelPillars.map((item) => (
                <SectionCard key={item.label} as="article" tone="subtle" className="rounded-[1.4rem] px-5 py-5">
                  <div className="template-kicker text-[11px]">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{item.value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
                </SectionCard>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <SectionCard className="p-7 sm:p-8">
            <div>
              <p className="template-kicker text-sm">
                Special offers first
              </p>
              <h3 className="template-title mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Freemium first, then Pro, then Pro Max as the revenue engine gets deeper
              </h3>
            </div>
            <p className="template-body mt-5 max-w-2xl text-base leading-7">
              Pick the package that matches your current volume and workflow. Every registration and booking action should take the buyer into the same onboarding flow, timing selection, confirmation path, and commercial handoff without hiding the setup or commission model.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {topOffers.map((offer) => (
                <SectionCard
                  key={offer.title}
                  tone="subtle"
                  className="px-5 py-5"
                >
                  <div className="template-kicker text-[11px]">
                    {offer.eyebrow}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{offer.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{offer.body}</div>
                </SectionCard>
              ))}
            </div>

            <SectionCard tone="subtle" className="mt-6 px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="template-kicker text-[11px]">
                    Buying story
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">
                    Start with Freemium or the Top 10 SME launch cohort, then expand into Pro or Pro Max once the conversion layer is proven.
                  </div>
                </div>
                <SignalPill className="bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                  Low friction
                </SignalPill>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Buyers should be able to see the launch offer, the setup path, the monthly plan, and the commission logic in one pass.
              </p>
            </SectionCard>
          </SectionCard>

          <SectionCard className="p-7 sm:p-8">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#1459c7]">
              How setup works
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#1d1d1f]">
              Keep launch simple, add complexity only if needed
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Most SMEs can launch online first, either as a standalone website flow or a dedicated booking app. If your team needs onsite support, training, or a more hands-on rollout, we quote that separately so the monthly plan stays clean and the performance model stays credible.
            </p>
            <div className="mt-6 grid gap-3">
              {setupOptions.map((item) => (
                <SectionCard
                  key={item.label}
                  className="rounded-[1.5rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 text-[#1d1d1f] shadow-none"
                >
                  <div className="text-sm font-semibold text-[#1d1d1f]">{item.label}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
                </SectionCard>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {highlightPoints.map((point) => (
                <SignalPill
                  key={point}
                  className="border-black/6 bg-white/72 px-3 py-2 text-xs text-[#1459c7]"
                >
                  {point}
                </SignalPill>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
          {visiblePlans.map((plan) => (
            <PricingPlanCard
              key={plan.id}
              plan={plan}
              onOpenConsultation={(planId, sourceCta) =>
                openConsultation(planId, 'full', sourceCta)
              }
            />
          ))}
          <SectionCard as="article" className="relative overflow-hidden p-7 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-cyan-300/10 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1459c7]">
                    For complex teams
                  </div>
                  <div className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
                    {advancedPlan.name}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Multi-location, deeper automation, or broader operational rollout that needs custom setup and commercial shaping.
                  </p>
                </div>
                <SignalPill className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1459c7] ring-1 ring-black/6">
                  Talk to us
                </SignalPill>
              </div>

              <div className="mt-8 text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                Custom scope
              </div>
              <p className="mt-2 text-sm font-medium text-[#1459c7]">
                Usually starts from {advancedPlan.price}/mo after your 1 month free period
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                We keep advanced rollout off the main buying path so smaller SMEs can decide
                quickly, while larger operators can still get the right package and performance model.
              </p>

              <ul className="mt-8 space-y-3">
                {advancedPlan.features.slice(1).map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-50">
                      <CheckIcon />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() =>
                  openConsultation(
                    advancedPlan.id,
                    'guided',
                    'book_advanced_plan',
                    'advanced_plan_card',
                  )}
                className="booked-button-secondary mt-8 flex w-full items-center justify-center gap-2"
              >
                Talk To Us About Pro Max
                <ArrowIcon />
              </button>
            </div>
          </SectionCard>
        </div>

        <PricingRecommendationPanel
          recommendations={recommendations}
          onOpenConsultation={(planId, sourceCta) =>
            openConsultation(planId, 'guided', sourceCta, 'recommendation_panel')
          }
        />
      </div>

      <PricingConsultationModal
        isOpen={isDialogOpen}
        flowMode={flowMode}
        consultationStep={consultationStep}
        plans={plans}
        selectedPlan={selectedPlan}
        formState={formState}
        businessTypeSuggestions={businessTypeSuggestions}
        submitError={submitError}
        isSubmitting={isSubmitting}
        result={result}
        googleCalendarUrl={googleCalendarUrl}
        icsDownloadUrl={icsDownloadUrl}
        onClose={() => closeConsultation()}
        onCloseWithMessage={() => closeConsultation({ showMessage: true })}
        onSetConsultationStep={setConsultationStep}
        onSetSubmitError={setSubmitError}
        onContactContinue={handleContactContinue}
        onSubmit={handleSubmit}
        onPlanChange={(value) =>
          setFormState((current) => ({
            ...current,
            planId: value,
          }))
        }
        onCustomerPhoneChange={(value) =>
          setFormState((current) => ({
            ...current,
            customerPhone: value,
          }))
        }
        onCustomerNameChange={(value) =>
          setFormState((current) => ({
            ...current,
            customerName: value,
          }))
        }
        onOnboardingModeChange={(value) =>
          setFormState((current) => ({
            ...current,
            onboardingMode: value,
          }))
        }
        onCustomerEmailChange={(value) =>
          setFormState((current) => ({
            ...current,
            customerEmail: value,
          }))
        }
        onStartupReferralEligibleChange={(value) =>
          setFormState((current) => ({
            ...current,
            startupReferralEligible: value,
          }))
        }
        onReferralPartnerChange={(value) =>
          setFormState((current) => ({
            ...current,
            referralPartner: value,
          }))
        }
        onReferralLocationChange={(value) =>
          setFormState((current) => ({
            ...current,
            referralLocation: value,
          }))
        }
        onBusinessNameChange={(value) =>
          setFormState((current) => ({
            ...current,
            businessName: value,
          }))
        }
        onBusinessTypeChange={(value) =>
          setFormState((current) => ({
            ...current,
            businessType: value,
          }))
        }
        onPreferredSlotChange={(value) =>
          setFormState((current) => ({
            ...current,
            preferredSlot: value,
          }))
        }
        onNotesChange={(value) =>
          setFormState((current) => ({
            ...current,
            notes: value,
          }))
        }
        formatConsultationDateTime={formatConsultationDateTime}
      />
    </section>
  );
}
