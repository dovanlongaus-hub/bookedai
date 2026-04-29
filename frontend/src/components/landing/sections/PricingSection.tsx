import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { submitPricingConsultation } from '../../../shared/api';
import type { PricingConsultationRequest, PricingConsultationResponse } from '../../../shared/contracts';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
  type PublicCtaAttribution,
  type PublicCtaName,
} from '../attribution';
import { PricingCalculator } from './PricingCalculator';
import { PricingConsultationModal } from './PricingConsultationModal';
import { PricingPlanCard } from './PricingPlanCard';
import { PricingRecommendationPanel } from './PricingRecommendationPanel';
import {
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
    body: 'Choose Launch, Grow, or Scale based on how many channels, locations, and team controls you need.',
  },
  {
    title: 'Set up the booking path',
    body: 'BookedAI wires the page, service catalog, contact route, calendar, confirmation, portal, and follow-up path.',
  },
  {
    title: 'Run the full flow',
    body: 'Customers search, choose, submit booking details, receive thank-you, then continue through portal, payment, and care.',
  },
];

const pricingModelPillars = [
  {
    label: 'Setup',
    value: 'Clear scope',
    detail: 'You know what BookedAI will launch before the subscription starts.',
  },
  {
    label: 'Subscription',
    value: 'Simple monthly',
    detail: 'Monthly pricing maps to the package, not a long list of confusing modules.',
  },
  {
    label: 'Commission',
    value: 'Only on captured revenue',
    detail: 'Performance commission appears only where BookedAI is actively capturing or recovering bookings.',
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [flowMode, setFlowMode] = useState<ConsultationFlowMode>('full');
  const [consultationStep, setConsultationStep] = useState<ConsultationStep>('contact');
  const [showReturnMessage, setShowReturnMessage] = useState(false);
  const [pricingReturnNotice, setPricingReturnNotice] = useState<{
    title: string;
    body: string;
    tone: 'success' | 'warning';
  } | null>(null);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const search = new URLSearchParams(window.location.search);
    const pricingState = (search.get('pricing') ?? '').trim().toLowerCase();
    const plan = (search.get('plan') ?? 'Plan').trim() || 'Plan';
    const reference = (search.get('ref') ?? '').trim();

    if (pricingState === 'success') {
      setPricingReturnNotice({
        title: 'Plan booking complete',
        body: `${plan} plan ${reference || 'booking'} is confirmed. Stripe is complete and your onboarding email plus calendar flow are already in motion.`,
        tone: 'success',
      });
      return;
    }

    if (pricingState === 'cancelled') {
      setPricingReturnNotice({
        title: 'Plan payment not completed yet',
        body: `Your plan booking ${reference || 'reference'} is still saved. You can reopen pricing and continue payment when ready.`,
        tone: 'warning',
      });
      return;
    }

    setPricingReturnNotice(null);
  }, []);

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
        {pricingReturnNotice ? (
          <SectionCard
            tone="subtle"
            className={`mx-auto mb-6 flex max-w-3xl items-start justify-between gap-4 px-5 py-4 text-sm ${
              pricingReturnNotice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <div>
              <div className="text-base font-semibold text-slate-950">{pricingReturnNotice.title}</div>
              <p className="mt-2 leading-6">{pricingReturnNotice.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setPricingReturnNotice(null)}
              className="booked-button-secondary shrink-0 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              Dismiss
            </button>
          </SectionCard>
        ) : null}

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
            Simple packages • Real booking flow • Clear follow-up
          </SignalPill>
          <h2 className="template-title mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Choose the simplest BookedAI package that can win the next booking.
          </h2>
          <p className="template-body mx-auto mt-5 max-w-2xl text-lg leading-8">
            Three packages are enough: Launch, Grow, and Scale.
          </p>
          <p className="template-body mx-auto mt-4 max-w-3xl text-sm leading-6 sm:text-base">
            Each one shows what a customer can do: ask for a service, choose a match, submit booking details, receive a thank-you, and continue through portal, payment posture, email, SMS/WhatsApp, calendar, CRM, and care.
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
                  A buyer should understand the package and the customer journey in one glance.
                </div>
              </div>
              <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
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
                AI Revenue Engine pricing
              </p>
              <h3 className="template-title mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Launch, Grow, Scale
              </h3>
            </div>
              <p className="template-body mt-5 max-w-2xl text-base leading-7">
              Pick the package by how your business books today. Setup, monthly subscription, and performance commission stay separated so the offer is easy to approve.
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
                    Start with Launch for one clean booking path, move to Grow for managed multi-channel conversion, and use Scale when locations, templates, API, or SLA matter.
                  </div>
                </div>
                <SignalPill className="bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-600">
                  Aligned with bookings
                </SignalPill>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Commission applies only to bookings BookedAI captures or recovers.
              </p>
            </SectionCard>
          </SectionCard>

          <SectionCard className="p-7 sm:p-8">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--apple-blue)]">
              Onboarding scope
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--apple-near-black)]">
              Self-serve at the bottom, scoped onboarding in the middle, custom rollout at the top
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Launch can be self-serve. Grow includes managed onboarding for catalog import, brand, and channel wiring. Scale is a custom rollout for multi-location, franchise, or platform teams.
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

        <PricingCalculator />

        <div className="mt-12 text-center">
          <SignalPill className="inline-flex items-center justify-center px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
            Pick the engine that fits
          </SignalPill>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--apple-near-black)] sm:text-3xl">
            Three tiers, same revenue engine — pick the entry point that matches today.
          </h3>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {visiblePlans.map((plan) => (
            <PricingPlanCard
              key={plan.id}
              plan={plan}
              onOpenConsultation={(planId, sourceCta) =>
                openConsultation(planId, 'full', sourceCta)
              }
            />
          ))}
        </div>

        <p className="mt-6 text-center text-sm leading-6 text-slate-600 sm:text-base">
          Setup fees scoped after a 10-min call. Commission applies only to bookings BookedAI captures or recovers.
        </p>

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
