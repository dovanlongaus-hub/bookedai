import type { PricingConsultationResponse } from '../../../shared/contracts';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';
import type {
  ConsultationFlowMode,
  ConsultationFormState,
  ConsultationStep,
  OnboardingMode,
  Plan,
  PlanId,
} from './pricing-shared';

type PricingConsultationModalProps = {
  isOpen: boolean;
  flowMode: ConsultationFlowMode;
  consultationStep: ConsultationStep;
  plans: Plan[];
  selectedPlan: Plan;
  formState: ConsultationFormState;
  businessTypeSuggestions: string[];
  submitError: string;
  isSubmitting: boolean;
  result: PricingConsultationResponse | null;
  googleCalendarUrl: string | null;
  icsDownloadUrl: string | null;
  onClose: () => void;
  onCloseWithMessage: () => void;
  onSetConsultationStep: (step: ConsultationStep) => void;
  onSetSubmitError: (value: string) => void;
  onContactContinue: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPlanChange: (value: PlanId) => void;
  onCustomerPhoneChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onOnboardingModeChange: (value: OnboardingMode) => void;
  onCustomerEmailChange: (value: string) => void;
  onStartupReferralEligibleChange: (value: boolean) => void;
  onReferralPartnerChange: (value: string) => void;
  onReferralLocationChange: (value: string) => void;
  onBusinessNameChange: (value: string) => void;
  onBusinessTypeChange: (value: string) => void;
  onPreferredSlotChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  formatConsultationDateTime: (payload: PricingConsultationResponse) => string;
};

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

export function PricingConsultationModal({
  isOpen,
  flowMode,
  consultationStep,
  plans,
  selectedPlan,
  formState,
  businessTypeSuggestions,
  submitError,
  isSubmitting,
  result,
  googleCalendarUrl,
  icsDownloadUrl,
  onClose,
  onCloseWithMessage,
  onSetConsultationStep,
  onSetSubmitError,
  onContactContinue,
  onSubmit,
  onPlanChange,
  onCustomerPhoneChange,
  onCustomerNameChange,
  onOnboardingModeChange,
  onCustomerEmailChange,
  onStartupReferralEligibleChange,
  onReferralPartnerChange,
  onReferralLocationChange,
  onBusinessNameChange,
  onBusinessTypeChange,
  onPreferredSlotChange,
  onNotesChange,
  formatConsultationDateTime,
}: PricingConsultationModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <SectionCard className="relative max-h-[90vh] w-full max-w-3xl overflow-auto p-6 text-slate-700 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="booked-button-secondary absolute right-4 top-4 px-3 py-1 text-sm"
        >
          Close
        </button>

        <div className="max-w-2xl">
          <SignalPill variant="brand" className="px-4 py-2 text-[11px]">
            {flowMode === 'guided' ? 'Recommended package flow' : 'Plan booking flow'}
          </SignalPill>
          <h3 className="template-title mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {consultationStep === 'contact'
              ? `Book the ${selectedPlan.name} package`
              : consultationStep === 'calendar'
                ? 'Choose your onboarding time'
                : `${selectedPlan.name} onboarding reserved`}
          </h3>
          <p className="template-body mt-4 text-base leading-7">
            {consultationStep === 'contact'
              ? 'Share the essentials first. We use them to prepare your setup path, trial offer, confirmation email, and performance-based commercial follow-up.'
              : consultationStep === 'calendar'
                ? 'Your package details are captured. Pick the onboarding time and we will prepare calendar actions, email confirmation, and checkout for the plan you selected.'
                : 'Your package flow is ready. You can add it to your calendar, continue to payment, or close and return to the homepage.'}
          </p>
        </div>

        {consultationStep === 'contact' ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Selected plan</span>
              <select
                value={formState.planId}
                onChange={(event) => onPlanChange(event.target.value as PlanId)}
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.price}/mo after free subscription period)
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Phone number</span>
              <input
                type="tel"
                value={formState.customerPhone}
                onChange={(event) => onCustomerPhoneChange(event.target.value)}
                placeholder="Optional"
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Your name</span>
              <input
                type="text"
                value={formState.customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder="How should we address you?"
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Setup mode</span>
              <select
                value={formState.onboardingMode}
                onChange={(event) => onOnboardingModeChange(event.target.value as OnboardingMode)}
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              >
                <option value="online">Online setup</option>
                <option value="onsite">Onsite setup</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Work email</span>
              <input
                type="email"
                value={formState.customerEmail}
                onChange={(event) => onCustomerEmailChange(event.target.value)}
                placeholder="you@business.com.au"
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              />
            </label>

            <SectionCard as="label" tone="subtle" className="sm:col-span-2 flex items-start gap-3 px-4 py-4">
              <input
                type="checkbox"
                checked={formState.startupReferralEligible}
                onChange={(event) => onStartupReferralEligibleChange(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-[#2563eb]"
              />
              <span className="text-sm leading-6 text-slate-700">
                We are a startup team referred by an accelerator or incubator and want to claim the 3-month free offer.
              </span>
            </SectionCard>

            {formState.startupReferralEligible ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Accelerator or incubator</span>
                  <input
                    type="text"
                    value={formState.referralPartner}
                    onChange={(event) => onReferralPartnerChange(event.target.value)}
                    placeholder="Startmate, UNSW Founders, Stone & Chalk, Antler..."
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Startup city or hub</span>
                  <input
                    type="text"
                    value={formState.referralLocation}
                    onChange={(event) => onReferralLocationChange(event.target.value)}
                    placeholder="Sydney, Melbourne, Perth, Brisbane, Adelaide, Darwin..."
                    className="booked-field rounded-2xl px-4 py-3 text-sm"
                  />
                </label>
              </>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Business name</span>
              <input
                type="text"
                value={formState.businessName}
                onChange={(event) => onBusinessNameChange(event.target.value)}
                placeholder="Your company or venue"
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Business type</span>
              <input
                list="pricing-business-types"
                value={formState.businessType}
                onChange={(event) => onBusinessTypeChange(event.target.value)}
                placeholder="Choose one or enter your own"
                className="booked-field rounded-2xl px-4 py-3 text-sm"
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
                onClick={onContactContinue}
                className="booked-button inline-flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold"
              >
                Continue to installation calendar
                <ArrowIcon />
              </button>
              <p className="template-body text-sm leading-6">
                We will use this to send your onboarding confirmation, trial summary, and calendar invite.
              </p>
            </div>
          </div>
        ) : null}

        {consultationStep === 'calendar' ? (
          <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={onSubmit}>
            <SectionCard tone="subtle" className="sm:col-span-2 p-4 text-sm leading-6 text-slate-600">
              Package reserved for <span className="font-semibold text-slate-950">{formState.customerEmail}</span>.
              Choose the onboarding time below, then we will create the calendar step and prepare the selected commercial path. Setup, subscription, and performance-based commission stay clearly separated.
            </SectionCard>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Preferred time</span>
              <input
                type="datetime-local"
                value={formState.preferredSlot}
                onChange={(event) => onPreferredSlotChange(event.target.value)}
                className="booked-field rounded-2xl px-4 py-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Selected plan</span>
              <input
                value={`${selectedPlan.name} (${selectedPlan.price}/mo after ${formState.startupReferralEligible ? '3-month' : '30-day'} free subscription period)`}
                readOnly
                className="booked-field rounded-2xl px-4 py-3 text-sm text-slate-600"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Notes</span>
              <textarea
                value={formState.notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={4}
                placeholder="Anything helpful before the call, like channels, booking volume, or key integrations."
                className="booked-field rounded-[1.5rem] px-4 py-3 text-sm"
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
                  onSetSubmitError('');
                  onSetConsultationStep('contact');
                }}
                className="booked-button-secondary inline-flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-label="Book now and open payment + calendar"
                className="booked-button inline-flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Booking package flow...' : 'Confirm consultation and continue'}
                <ArrowIcon />
              </button>
            </div>
          </form>
        ) : null}

        {consultationStep === 'confirmed' && result ? (
          <SectionCard tone="subtle" className="mt-8 p-5 sm:p-6">
            <div className="template-kicker text-sm">Package reserved</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {result.plan_name} plan for {result.amount_label}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#2563eb]">{result.trial_summary}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Setup is handled separately from the monthly subscription, and performance-based commission is only confirmed after your rollout path is clear. Online launch setup may be waived for eligible early customers, while onsite rollout is quoted separately where needed.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Reference: {result.consultation_reference}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Preferred time: {formatConsultationDateTime(result)} {result.timezone}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Setup mode: {result.onboarding_mode === 'onsite' ? 'Onsite installation' : 'Online installation'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Email status: {result.email_status === 'sent' ? 'Sent' : 'Pending manual follow-up'}
            </p>
            {result.startup_offer_summary ? (
              <p className="mt-2 text-sm leading-6 text-[#2563eb]">{result.startup_offer_summary}</p>
            ) : null}
            {result.onsite_travel_fee_note ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">{result.onsite_travel_fee_note}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {googleCalendarUrl ? (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="booked-button inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  Add to Google Calendar
                  <ArrowIcon />
                </a>
              ) : null}

              {icsDownloadUrl ? (
                <a
                  href={icsDownloadUrl}
                  download={`bookedai-${result.consultation_reference}.ics`}
                  className="booked-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
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
                  className="booked-button-secondary inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
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
                  className="booked-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
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
                  className="booked-button inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                >
                  Continue to Stripe
                  <ArrowIcon />
                </a>
              ) : null}

              <button
                type="button"
                onClick={onCloseWithMessage}
                className="booked-button-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </SectionCard>
        ) : null}
      </SectionCard>
    </div>
  );
}
