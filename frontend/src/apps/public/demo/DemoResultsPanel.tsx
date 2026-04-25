import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

import type { DemoBundleSuggestion, DemoPlacementRecommendation, DemoService } from './types';

function TrustChip(props: { label: string }) {
  return (
    <span className="bookedai-hover-lift inline-flex items-center rounded-full border border-white/8 bg-white/[0.035] px-3 py-1.5 text-[11px] font-medium text-slate-300">
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
      whileHover={{ y: -8, rotateX: 1.2, rotateY: -1.2 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`bookedai-glow-pulse bookedai-hover-lift bookedai-saas-card group overflow-hidden rounded-[26px] transition ${
        selected
          ? 'border-[#20F6B3]/40 bg-[linear-gradient(135deg,rgba(32,246,179,0.12),rgba(0,209,255,0.1))] shadow-[0_0_0_1px_rgba(32,246,179,0.12),0_24px_80px_rgba(0,0,0,0.28)]'
          : 'bg-[#0B1324]/82'
      }`}
    >
      <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-52 overflow-hidden bg-slate-900 lg:h-full">
          {service.imageUrl ? (
            <img
              src={service.imageUrl}
              alt={service.name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.08]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,246,179,0.18),transparent_42%),linear-gradient(135deg,#101B2F,#07111F)] px-6 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#BFFFEF]">
              Grandmaster Chess
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(7,12,22,0.42)_100%)]" />
          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
            {service.sourceLabel}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-[-0.04em] text-white">{service.name}</div>
              <div className="mt-1 text-sm text-slate-400">
                {[service.category, service.location].filter(Boolean).join(' • ') || 'Location on request'}
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-200">
              {selected ? 'Picked' : service.confidenceLabel}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="text-amber-300">★</span>
              <span>{service.rating.toFixed(1)}</span>
              <span className="text-slate-500">({service.reviewCount})</span>
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

          <div className="mt-4 text-sm leading-6 text-slate-300">{service.whyThisMatches ?? service.summary}</div>

          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open times</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {service.availabilitySlots.map((slot) => (
                <span
                  key={`${service.id}-${slot}`}
                  className="rounded-full border border-[#20F6B3]/15 bg-[#20F6B3]/8 px-3 py-1.5 text-xs font-medium text-[#C8FFF0]"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
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
              className="bookedai-saas-button-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
            >
              {!assessmentComplete ? <Lock className="h-4 w-4" /> : null}
              {assessmentComplete ? 'Book Now' : 'Assess first'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0B1324]/82"
        >
          <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="h-52 animate-pulse bg-[linear-gradient(90deg,#0d1a2f_0%,#15253d_50%,#0d1a2f_100%)]" />
            <div className="space-y-4 p-5 sm:p-6">
              <div className="h-6 w-2/3 animate-pulse rounded-full bg-white/8" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/6" />
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-white/8" />
                <div className="h-8 w-20 animate-pulse rounded-full bg-white/8" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-white/8" />
              </div>
              <div className="h-4 w-full animate-pulse rounded-full bg-white/6" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/6" />
              <div className="flex gap-2">
                <div className="h-8 w-28 animate-pulse rounded-full bg-[#20F6B3]/10" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-[#20F6B3]/10" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-[#20F6B3]/10" />
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
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-[#8EFCE0]" />
            Academy matches
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Search results become bookable after placement is complete.
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-300">
          {props.searching ? 'Updating' : `${props.results.length} results`}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {trustLabels.map((label) => (
          <TrustChip key={label} label={label} />
        ))}
      </div>

      {props.placement ? (
        <div className="mt-4 rounded-[24px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.10),rgba(0,209,255,0.08))] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EFCE0]">Recommended placement</div>
              <div className="mt-2 text-xl font-semibold text-white">{props.placement.class_label}</div>
              <div className="mt-1 text-sm text-slate-300">
                {props.placement.level} • {props.placement.suggested_plan.title}
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-200">
              {props.placement.suggested_plan.price_label}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {props.placement.available_slots.slice(0, 3).map((slot) => (
              <TrustChip key={slot.slot_id} label={`${slot.day} ${slot.time} • ${slot.seats_remaining} seats`} />
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            {props.placement.rationale.map((reason) => (
              <div key={reason} className="rounded-[16px] border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-200">
                {reason}
              </div>
            ))}
          </div>
        </div>
      ) : !props.searching && props.results.length ? (
        <div className="mt-4 rounded-[20px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {props.assessmentComplete
            ? 'Placement is still loading.'
            : 'Answer the intake questions in the left rail to unlock the class recommendation and booking.'}
        </div>
      ) : null}

      {props.bundleSuggestions.length ? (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EFCE0]">You may also need…</div>
          <div className="mt-3 grid gap-3">
            {props.bundleSuggestions.map((suggestion) => {
              const selected = props.selectedBundleIds.includes(suggestion.id);
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => props.onToggleBundleSuggestion(suggestion.id)}
                  className={`flex items-start justify-between gap-4 rounded-[20px] border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-[#20F6B3]/30 bg-[linear-gradient(135deg,rgba(32,246,179,0.10),rgba(0,209,255,0.08))]'
                      : 'border-white/10 bg-black/10 hover:border-[#20F6B3]/20'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{suggestion.title}</div>
                    <div className="mt-1 text-sm text-slate-300">{suggestion.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <TrustChip label={suggestion.priceLabel} />
                      <TrustChip label={suggestion.timingLabel} />
                      <TrustChip label={suggestion.trustLabel} />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                    {selected ? 'Added' : 'Add'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {props.searchError ? (
        <div className="mt-4 rounded-[20px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {props.searchError}
        </div>
      ) : null}

      {props.warnings.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {props.warnings.slice(0, 3).map((warning) => (
            <span key={warning} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
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
          <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 px-5 py-8 text-center text-sm text-slate-400">
            Start typing to see matches.
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <section className="bookedai-glow-pulse bookedai-saas-glass h-full rounded-[28px] p-5 sm:p-6">
      {panelContent}
    </section>
  );
}
