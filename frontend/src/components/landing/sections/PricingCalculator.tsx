/**
 * <PricingCalculator /> — Lane 7 P10 ROI estimator.
 *
 * Renders ABOVE the 3 tier cards in <PricingSection />. Three sliders +
 * one dropdown drive a live revenue uplift readout, a recommended tier,
 * and a per-tier cost-recovery breakdown.
 *
 * Math:
 *   - leakedMonthly  = weeklyMissed * avgValue * 4.33
 *   - capturedMonthly = leakedMonthly * conversionLift
 *   - capturedAnnual  = capturedMonthly * 12
 *   - daysToRecover (Starter)  = (79 / capturedMonthly) * 30
 *   - daysToRecover (Growth)   = ((249 + 499/12) + (capturedMonthly * 0.03)) → uses
 *       monthly fee + amortised setup against capturedMonthly net of commission.
 *
 * Tier thresholds (as per spec):
 *   - Starter:    weeklyMissed < 50 AND avgValue < 200
 *   - Growth:     50..200 weekly OR 200..1000 avgValue
 *   - Enterprise: weeklyMissed > 200 OR avgValue > 1000
 *
 * Constraints:
 *   - Zero arbitrary hex; only design tokens via CSS variables / template classes.
 *   - Mobile-first: sliders are native <input type="range"> with ≥ 44px hit area.
 *   - AUD locale-safe currency rendering.
 */
import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useId,
  useMemo,
  useState,
} from 'react';

import { AnimatedNumber } from '../../../shared/components/AnimatedNumber';
import { AppleCTA } from '../ui/AppleCTA';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';
import type { PlanId, PlanSlug } from './pricing-shared';

type ConversionOption = {
  label: string;
  value: number;
  caption: string;
};

const CONVERSION_OPTIONS: ConversionOption[] = [
  {
    label: '35% (BookedAI baseline)',
    value: 0.35,
    caption: 'BookedAI baseline lift across live tenants.',
  },
  {
    label: '25% (conservative)',
    value: 0.25,
    caption: 'Conservative ramp for early launch weeks.',
  },
  {
    label: '50% (high-touch tier)',
    value: 0.5,
    caption: 'High-touch Enterprise rollout with concierge follow-up.',
  },
];

const VERTICAL_OPTIONS = [
  { value: 'yoga', label: 'Yoga / Pilates' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'clinic', label: 'Clinic / Allied health' },
  { value: 'tutoring', label: 'Tutoring / Academy' },
  { value: 'swim', label: 'Swim school' },
  { value: 'trade', label: 'Trade / Home services' },
  { value: 'other', label: 'Other service business' },
] as const;

type VerticalValue = (typeof VERTICAL_OPTIONS)[number]['value'];

const DEFAULTS = {
  weeklyMissed: 25,
  avgValue: 240,
  conversionLift: 0.35,
  vertical: 'yoga' as VerticalValue,
} as const;

const STARTER_MONTHLY_FEE = 79;
const STARTER_SETUP_FEE = 0;
const GROWTH_MONTHLY_FEE = 249;
const GROWTH_SETUP_FEE = 499;
const GROWTH_COMMISSION_RATE = 0.03;
const WEEKS_PER_MONTH = 4.33;

const audCurrencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const formatAud = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) {
    return audCurrencyFormatter.format(0);
  }
  return audCurrencyFormatter.format(Math.round(n));
};

const formatInteger = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) {
    return '0';
  }
  return new Intl.NumberFormat('en-AU').format(Math.round(n));
};

type RecommendedTier = {
  planId: PlanId;
  slug: PlanSlug;
  name: string;
  caption: string;
  ctaLabel: string;
  ctaHref: string;
};

const TIERS: Record<PlanSlug, RecommendedTier> = {
  starter: {
    planId: 'basic',
    slug: 'starter',
    name: 'Starter Engine',
    caption:
      'Low enquiry volume + lower ticket size — start free SaaS on one channel and prove the lift.',
    ctaLabel: 'Start free',
    ctaHref: '/register-interest?plan=starter',
  },
  growth: {
    planId: 'standard',
    slug: 'growth',
    name: 'Growth Engine',
    caption:
      'Mid-market enquiry volume with steady ticket size — Growth captures the most uplift per dollar.',
    ctaLabel: 'Start a 30-day pilot',
    ctaHref: '/register-interest?plan=growth',
  },
  enterprise: {
    planId: 'pro',
    slug: 'enterprise',
    name: 'Enterprise Engine',
    caption:
      'High-volume or high-ticket — Enterprise rollout adds SLA, white-label, and a named CSM.',
    ctaLabel: 'Talk to a founder',
    ctaHref: '/register-interest?plan=enterprise',
  },
};

function pickTier(weeklyMissed: number, avgValue: number): RecommendedTier {
  if (weeklyMissed > 200 || avgValue > 1000) {
    return TIERS.enterprise;
  }
  if (weeklyMissed < 50 && avgValue < 200) {
    return TIERS.starter;
  }
  return TIERS.growth;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

const sliderInputStyle: CSSProperties = {
  minHeight: '44px',
  width: '100%',
  accentColor: 'var(--apple-blue)',
};

const sliderRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: '44px',
  gap: '12px',
};

const selectStyle: CSSProperties = {
  minHeight: '44px',
  width: '100%',
  borderRadius: '12px',
  border: '1px solid var(--apple-paper-blue-200)',
  background: 'var(--apple-paper-blue-50)',
  color: 'var(--apple-near-black)',
  padding: '0 12px',
  fontSize: '14px',
};

export function PricingCalculator() {
  const weeklyMissedId = useId();
  const avgValueId = useId();
  const conversionId = useId();
  const verticalId = useId();

  const [weeklyMissed, setWeeklyMissed] = useState<number>(DEFAULTS.weeklyMissed);
  const [avgValue, setAvgValue] = useState<number>(DEFAULTS.avgValue);
  const [conversionLift, setConversionLift] = useState<number>(DEFAULTS.conversionLift);
  const [vertical, setVertical] = useState<VerticalValue>(DEFAULTS.vertical);

  const handleWeeklyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setWeeklyMissed(clamp(Number(event.target.value), 0, 200));
  }, []);

  const handleAvgValueChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAvgValue(clamp(Number(event.target.value), 50, 2000));
  }, []);

  const handleConversionChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = Number(event.target.value);
      const match = CONVERSION_OPTIONS.find((option) => option.value === next);
      setConversionLift(match ? match.value : DEFAULTS.conversionLift);
    },
    [],
  );

  const handleVerticalChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const next = event.target.value as VerticalValue;
      const match = VERTICAL_OPTIONS.find((option) => option.value === next);
      setVertical(match ? match.value : DEFAULTS.vertical);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setWeeklyMissed(DEFAULTS.weeklyMissed);
    setAvgValue(DEFAULTS.avgValue);
    setConversionLift(DEFAULTS.conversionLift);
    setVertical(DEFAULTS.vertical);
  }, []);

  const leakedMonthly = useMemo(
    () => weeklyMissed * avgValue * WEEKS_PER_MONTH,
    [weeklyMissed, avgValue],
  );
  const capturedMonthly = useMemo(
    () => leakedMonthly * conversionLift,
    [leakedMonthly, conversionLift],
  );
  const capturedAnnual = useMemo(() => capturedMonthly * 12, [capturedMonthly]);

  const recommendedTier = useMemo(
    () => pickTier(weeklyMissed, avgValue),
    [weeklyMissed, avgValue],
  );

  const conversionCaption = useMemo(
    () =>
      CONVERSION_OPTIONS.find((option) => option.value === conversionLift)?.caption ??
      CONVERSION_OPTIONS[0].caption,
    [conversionLift],
  );

  const verticalLabel = useMemo(
    () =>
      VERTICAL_OPTIONS.find((option) => option.value === vertical)?.label ??
      'service business',
    [vertical],
  );

  const starterRecoveryDays = useMemo(() => {
    if (capturedMonthly <= 0) {
      return null;
    }
    return ((STARTER_MONTHLY_FEE + STARTER_SETUP_FEE) / capturedMonthly) * 30;
  }, [capturedMonthly]);

  const growthRecoveryDays = useMemo(() => {
    if (capturedMonthly <= 0) {
      return null;
    }
    const amortisedMonthlyCost = GROWTH_MONTHLY_FEE + GROWTH_SETUP_FEE / 12;
    const netMonthlyValue =
      capturedMonthly * (1 - GROWTH_COMMISSION_RATE) - amortisedMonthlyCost;
    if (netMonthlyValue <= 0) {
      return null;
    }
    return (amortisedMonthlyCost / netMonthlyValue) * 30;
  }, [capturedMonthly]);

  const enterpriseSummary = 'Talk to a founder';

  return (
    <SectionCard
      as="section"
      tone="base"
      className="mt-12 rounded-[2rem] p-6 sm:p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SignalPill className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Estimate your revenue uplift
          </SignalPill>
          <h3 className="template-title mt-4 text-2xl font-semibold tracking-tight text-[var(--apple-near-black)] sm:text-3xl">
            Tell us your missed-enquiry numbers — we&apos;ll show you what BookedAI
            captures.
          </h3>
          <p className="template-body mt-3 max-w-xl text-sm leading-6 sm:text-base">
            Move the sliders below. Numbers update live so you can see the leak,
            the lift, and how quickly BookedAI pays for itself.
          </p>

          <div className="mt-6 grid gap-5">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor={weeklyMissedId}
                  className="text-sm font-semibold text-[var(--apple-near-black)]"
                >
                  Weekly missed enquiries
                </label>
                <span className="text-base font-semibold text-[var(--apple-blue)]">
                  <AnimatedNumber value={weeklyMissed} formatter={formatInteger} />
                </span>
              </div>
              <div style={sliderRowStyle}>
                <input
                  id={weeklyMissedId}
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={weeklyMissed}
                  onChange={handleWeeklyChange}
                  aria-label="Weekly missed enquiries"
                  style={sliderInputStyle}
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                e.g. unanswered messages, calls you didn&apos;t return, web forms not
                followed up.
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label
                  htmlFor={avgValueId}
                  className="text-sm font-semibold text-[var(--apple-near-black)]"
                >
                  Average booking value (A$)
                </label>
                <span className="text-base font-semibold text-[var(--apple-blue)]">
                  <AnimatedNumber value={avgValue} formatter={formatAud} />
                </span>
              </div>
              <div style={sliderRowStyle}>
                <input
                  id={avgValueId}
                  type="range"
                  min={50}
                  max={2000}
                  step={10}
                  value={avgValue}
                  onChange={handleAvgValueChange}
                  aria-label="Average booking value"
                  style={sliderInputStyle}
                />
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Average paid ticket size — including upsell and recurring.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={conversionId}
                  className="text-sm font-semibold text-[var(--apple-near-black)]"
                >
                  Conversion lift estimate
                </label>
                <select
                  id={conversionId}
                  value={conversionLift}
                  onChange={handleConversionChange}
                  style={selectStyle}
                  className="mt-2"
                >
                  {CONVERSION_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {conversionCaption}
                </p>
              </div>

              <div>
                <label
                  htmlFor={verticalId}
                  className="text-sm font-semibold text-[var(--apple-near-black)]"
                >
                  Vertical
                </label>
                <select
                  id={verticalId}
                  value={vertical}
                  onChange={handleVerticalChange}
                  style={selectStyle}
                  className="mt-2"
                >
                  {VERTICAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Shapes the copy below; calculator math stays the same.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-slate-500">
                Defaults reflect a typical {verticalLabel.toLowerCase()} operator with
                ~25 weekly missed enquiries.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-semibold text-[var(--apple-blue)] underline-offset-4 hover:underline"
                style={{ minHeight: '44px' }}
                data-testid="pricing-calculator-reset"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <SectionCard
            tone="subtle"
            className="rounded-[1.5rem] px-5 py-5"
          >
            <div className="template-kicker text-[11px]">Revenue you&apos;re leaking now</div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-[var(--apple-near-black)]">
              <AnimatedNumber value={leakedMonthly} formatter={formatAud} />
              <span className="ml-2 text-base font-medium text-slate-600">/ month</span>
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Based on {formatInteger(weeklyMissed)} missed enquiries / week ×{' '}
              {formatAud(avgValue)} average ticket × 4.33 weeks.
            </div>
          </SectionCard>

          <SectionCard
            tone="base"
            className="rounded-[1.5rem] px-5 py-5"
          >
            <div className="template-kicker text-[11px]">Revenue BookedAI captures</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-[var(--apple-near-black)] sm:text-4xl">
              <AnimatedNumber value={capturedMonthly} formatter={formatAud} />
              <span className="ml-2 text-base font-medium text-slate-600">/ month</span>
            </div>
            <div className="mt-1 text-sm font-medium text-[var(--apple-blue)]">
              <AnimatedNumber value={capturedAnnual} formatter={formatAud} /> / year
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-600">
              Applied at the {Math.round(conversionLift * 100)}% conversion lift you selected.
            </div>
          </SectionCard>

          <SectionCard
            tone="subtle"
            className="rounded-[1.5rem] px-5 py-5"
          >
            <div className="template-kicker text-[11px]">Pays for BookedAI in</div>
            <div className="mt-3 grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[var(--apple-near-black)]">
                  Starter (A$79/mo, A$0 setup)
                </span>
                <span className="text-sm font-semibold text-[var(--apple-blue)]">
                  {starterRecoveryDays === null ? (
                    'Add inputs to estimate'
                  ) : (
                    <>
                      <AnimatedNumber
                        value={Math.max(0, starterRecoveryDays)}
                        formatter={formatInteger}
                      />
                      <span className="ml-1">days</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[var(--apple-near-black)]">
                  Growth (A$249/mo, A$499 setup, 3%)
                </span>
                <span className="text-sm font-semibold text-[var(--apple-blue)]">
                  {growthRecoveryDays === null ? (
                    'Lift not yet net-positive'
                  ) : (
                    <>
                      <AnimatedNumber
                        value={Math.max(0, growthRecoveryDays)}
                        formatter={formatInteger}
                      />
                      <span className="ml-1">days</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-[var(--apple-near-black)]">
                  Enterprise (negotiated)
                </span>
                <span className="text-sm font-semibold text-[var(--apple-blue)]">
                  {enterpriseSummary}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            tone="base"
            className="rounded-[1.5rem] border border-[var(--apple-paper-blue-200)] px-5 py-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="template-kicker text-[11px]">Recommended tier</div>
              <SignalPill className="bg-[var(--apple-paper-blue-100)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--apple-paper-blue-navy-900)]">
                {recommendedTier.name}
              </SignalPill>
            </div>
            <p
              className="mt-3 text-sm leading-6 text-slate-700"
              data-testid="pricing-calculator-recommended-caption"
            >
              {recommendedTier.caption}
            </p>
            <div className="mt-4">
              <AppleCTA
                label={recommendedTier.ctaLabel}
                href={recommendedTier.ctaHref}
                intent="primary"
                size="lg"
                analyticsId={`pricing_calculator_${recommendedTier.slug}_cta`}
                fullWidth
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </SectionCard>
  );
}

export default PricingCalculator;
