import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

import type { DemoBundleSuggestion, DemoPlacementRecommendation, DemoService } from './types';

function TrustChip(props: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/75">
      {props.label}
    </span>
  );
}

function ResultCard(props: {
  service: DemoService;
  selected: boolean;
  index: number;
  assessmentComplete: boolean;
  onSelect: (serviceId: string) => void;
  onBookNow: (serviceId: string) => void;
}) {
  const { service, selected, index, assessmentComplete, onSelect, onBookNow } = props;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`group overflow-hidden rounded-[26px] border motion-safe:transition-all duration-200 ${
        selected
          ? 'border-apple-blue/45 bg-apple-blue/10 shadow-[0_0_0_1px_rgba(0,113,227,0.18),0_24px_80px_rgba(0,0,0,0.4)]'
          : 'border-white/10 bg-apple-dark-2 hover:border-apple-blue/25'
      }`}
    >
      <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-52 overflow-hidden bg-black lg:h-full">
          {service.imageUrl ? (
            <img
              src={service.imageUrl}
              alt={`${service.name} — ${service.category}`}
              className="h-full w-full object-cover motion-safe:transition-transform duration-700 group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white/85"
              aria-hidden="true"
            >
              BookedAI
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" aria-hidden="true" />
          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {service.sourceLabel}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-[-0.04em] text-white">{service.name}</h3>
              <div className="mt-1 text-sm text-white/60">
                {[service.category, service.location].filter(Boolean).join(' • ') || 'Location on request'}
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/85">
              {selected ? 'Picked' : service.confidenceLabel}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="text-amber-300" aria-hidden="true">★</span>
              <span>{service.rating.toFixed(1)}</span>
              <span className="text-white/55">({service.reviewCount})</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="font-semibold text-white">{service.priceLabel}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span>{service.durationMinutes ? `${service.durationMinutes} min` : 'Flexible duration'}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <TrustChip label={service.providerCountLabel} />
            <TrustChip label={service.bookedTodayLabel} />
            <TrustChip label={service.ratingLabel} />
          </div>

          <p className="mt-4 text-sm leading-6 text-white/75">{service.whyThisMatches ?? service.summary}</p>

          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Open times</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {service.availabilitySlots.map((slot) => (
                <span
                  key={`${service.id}-${slot}`}
                  className="rounded-full border border-apple-blue/20 bg-apple-blue/10 px-3 py-1.5 text-xs font-medium text-white"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.14em] text-white/55">
              {service.nextStep ?? 'Ready to book'}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!assessmentComplete) {
                  return;
                }
                onSelect(service.id);
                onBookNow(service.id);
              }}
              disabled={!assessmentComplete}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-apple-blue px-5 py-2.5 text-sm font-semibold text-white shadow-[0_9px_22px_rgba(0,113,227,0.18)] motion-safe:transition-all duration-200 hover:bg-apple-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-apple-dark-2 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/50 disabled:shadow-none"
              aria-label={assessmentComplete ? `Continue to booking for ${service.name}` : 'Complete intake first'}
            >
              {!assessmentComplete ? <Lock className="h-4 w-4" aria-hidden="true" /> : null}
              {assessmentComplete ? 'Continue to booking' : 'Match first'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="overflow-hidden rounded-[26px] border border-white/10 bg-apple-dark-2"
        >
          <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="h-52 animate-pulse bg-white/[0.04]" />
            <div className="space-y-4 p-5 sm:p-6">
              <div className="h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/8" />
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-white/8" />
                <div className="h-8 w-20 animate-pulse rounded-full bg-white/8" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-white/8" />
              </div>
              <div className="h-4 w-full animate-pulse rounded-full bg-white/8" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/8" />
              <div className="flex gap-2">
                <div className="h-8 w-28 animate-pulse rounded-full bg-apple-blue/15" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-apple-blue/15" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-apple-blue/15" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DemoResultsPanel(props: {
  results: DemoService[];
  warnings: string[];
  bundleSuggestions: DemoBundleSuggestion[];
  selectedBundleIds: string[];
  placement: DemoPlacementRecommendation | null;
  assessmentComplete: boolean;
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
  onToggleBundleSuggestion: (bundleId: string) => void;
  searching: boolean;
  searchError: string;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  onBookNow: (serviceId: string) => void;
}) {
  const trustLabels = props.results[0]
    ? [props.results[0].providerCountLabel, props.results[0].bookedTodayLabel, props.results[0].ratingLabel]
    : ['3 providers available now', 'Booked 120 times today', '4.9 rating'];

  const panelContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-apple-blue" aria-hidden="true" />
            Operator matches
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Results become bookable once the intake is complete.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/75">
          {props.searching ? 'Updating' : `${props.results.length} results`}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {trustLabels.map((label) => (
          <TrustChip key={label} label={label} />
        ))}
      </div>

      {props.placement ? (
        <div className="mt-4 rounded-[24px] border border-apple-blue/25 bg-apple-blue/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-apple-blue">Recommended match</div>
              <h3 className="mt-2 text-xl font-semibold text-white">{props.placement.class_label}</h3>
              <div className="mt-1 text-sm text-white/75">
                {props.placement.level} • {props.placement.suggested_plan.title}
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/85">
              {props.placement.suggested_plan.price_label}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {props.placement.available_slots.slice(0, 3).map((slot) => (
              <TrustChip key={slot.slot_id} label={`${slot.day} ${slot.time} • ${slot.seats_remaining} seats`} />
            ))}
          </div>

          <ul className="mt-4 grid gap-2">
            {props.placement.rationale.map((reason) => (
              <li key={reason} className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : !props.searching && props.results.length ? (
        <div className="mt-4 rounded-[20px] border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {props.assessmentComplete
            ? 'Match is still loading.'
            : 'Answer the intake questions in the left rail to unlock the match and booking.'}
        </div>
      ) : null}

      {props.bundleSuggestions.length ? (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-apple-blue">You may also need…</div>
          <div className="mt-3 grid gap-3">
            {props.bundleSuggestions.map((suggestion) => {
              const selected = props.selectedBundleIds.includes(suggestion.id);
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => props.onToggleBundleSuggestion(suggestion.id)}
                  aria-pressed={selected}
                  className={`flex items-start justify-between gap-4 rounded-[20px] border px-4 py-3 text-left motion-safe:transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue/60 ${
                    selected
                      ? 'border-apple-blue/30 bg-apple-blue/10'
                      : 'border-white/10 bg-black/20 hover:border-apple-blue/25'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{suggestion.title}</div>
                    <div className="mt-1 text-sm text-white/75">{suggestion.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <TrustChip label={suggestion.priceLabel} />
                      <TrustChip label={suggestion.timingLabel} />
                      <TrustChip label={suggestion.trustLabel} />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/85">
                    {selected ? 'Added' : 'Add'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {props.searchError ? (
        <div className="mt-4 rounded-[20px] border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="alert">
          {props.searchError}
        </div>
      ) : null}

      {props.warnings.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.warnings.slice(0, 3).map((warning) => (
            <span key={warning} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75">
              {warning}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        {props.searching ? <ResultsSkeleton /> : null}

        {!props.searching
          ? props.results.map((service, index) => (
            <ResultCard
                key={service.id}
                service={service}
                selected={service.id === props.selectedServiceId}
                index={index}
                assessmentComplete={props.assessmentComplete}
                onSelect={props.onSelect}
                onBookNow={props.onBookNow}
              />
            ))
          : null}

        {!props.results.length && !props.searching ? (
          <div className="rounded-[24px] border border-dashed border-white/15 bg-black/20 px-5 py-8 text-center text-sm text-white/55">
            Start typing to see matches.
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <section className="h-full rounded-[28px] border border-white/10 bg-apple-dark-2 p-5 sm:p-6">
      {panelContent}
    </section>
  );
}
