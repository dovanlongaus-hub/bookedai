import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CircleDot, CreditCard, FileText, MessageSquareText, Search, UserCheck } from 'lucide-react';

import type { DemoBookingRecord, DemoFlowStage } from './types';

type FlowStep = {
  id: 'search' | 'match' | 'book' | 'pay' | 'followup';
  stages: DemoFlowStage[];
  label: string;
  helper: string;
  Icon: typeof MessageSquareText;
};

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'search',
    stages: ['chat'],
    label: 'Search',
    helper: 'Ask in plain words',
    Icon: Search,
  },
  {
    id: 'match',
    stages: ['assessment', 'placement', 'results'],
    label: 'Match',
    helper: 'Right service, right time',
    Icon: UserCheck,
  },
  {
    id: 'book',
    stages: ['booking'],
    label: 'Book',
    helper: 'Lock the slot',
    Icon: MessageSquareText,
  },
  {
    id: 'pay',
    stages: ['booking'],
    label: 'Pay',
    helper: 'Stripe deposit live',
    Icon: CreditCard,
  },
  {
    id: 'followup',
    stages: ['report'],
    label: 'Follow up',
    helper: 'Report and retain',
    Icon: FileText,
  },
];

function getActiveIndex(stage: DemoFlowStage, booking: DemoBookingRecord | null) {
  if (booking?.reportPreview) {
    return FLOW_STEPS.findIndex((step) => step.id === 'followup');
  }
  if (stage === 'booking' && booking?.checkoutUrl) {
    return FLOW_STEPS.findIndex((step) => step.id === 'pay');
  }
  if (stage === 'booking') {
    return FLOW_STEPS.findIndex((step) => step.id === 'book');
  }
  if (stage === 'assessment' || stage === 'placement' || stage === 'results') {
    return FLOW_STEPS.findIndex((step) => step.id === 'match');
  }
  if (stage === 'report') {
    return FLOW_STEPS.findIndex((step) => step.id === 'followup');
  }
  return 0;
}

export function DemoFlowRail(props: {
  stage: DemoFlowStage;
  booking: DemoBookingRecord | null;
  compact?: boolean;
}) {
  const activeIndex = getActiveIndex(props.stage, props.booking);
  const tabRefs = useRef<Array<HTMLLIElement | null>>([]);

  // Smoothly bring the active tab into view on the mobile bottom bar when the
  // active step changes (e.g. user advances from match -> book).
  useEffect(() => {
    if (!props.compact) {
      return;
    }
    const node = tabRefs.current[activeIndex];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex, props.compact]);

  if (props.compact) {
    return (
      <>
        {/* Mobile bottom-tab bar: sticky, safe-area aware, >= 44x44 tap targets.
            z-30 keeps it below modal dialogs (z-40 backdrop / z-50 panel). */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-apple-dark-2/95 backdrop-blur md:hidden"
          aria-label="Demo flow progress"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <ol
            role="tablist"
            className="mx-auto flex w-full max-w-[640px] items-stretch justify-between gap-1 overflow-x-auto px-2 pt-2 pb-2"
          >
            {FLOW_STEPS.map((step, index) => {
              const complete = index < activeIndex;
              const active = index === activeIndex;
              const Icon = step.Icon;
              const stateClasses = active
                ? 'bg-apple-blue text-white border-apple-blue'
                : complete
                  ? 'bg-apple-light text-apple-near-black border-apple-light'
                  : 'bg-white/5 text-white/60 border-white/10';
              return (
                <li
                  key={step.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Step ${index + 1} of ${FLOW_STEPS.length}: ${step.label}`}
                  tabIndex={active ? 0 : -1}
                  className={`template-chip flex h-11 min-h-[44px] flex-1 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-[14px] border px-2 py-1 text-xs font-semibold motion-safe:transition-colors duration-200 ${stateClasses}`}
                >
                  {complete ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : active ? (
                    <CircleDot className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="truncate text-xs leading-tight">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Tablet (md+) keeps the inline horizontal compact rail. */}
        <nav
          className="hidden rounded-[24px] border border-white/10 bg-apple-dark-2 p-3 md:block md:overflow-x-auto"
          aria-label="Demo flow progress"
        >
          <ol className="flex min-w-[640px] items-center gap-2">
            {FLOW_STEPS.map((step, index) => {
              const complete = index < activeIndex;
              const active = index === activeIndex;
              const Icon = step.Icon;

              return (
                <motion.li
                  key={step.id}
                  initial={false}
                  animate={{
                    borderColor: active || complete ? 'rgba(0, 113, 227, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: active
                      ? 'rgba(0, 113, 227, 0.12)'
                      : complete
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
                  }}
                  className="flex min-w-[120px] flex-1 items-center gap-3 rounded-[18px] border px-3 py-3 motion-safe:transition-all duration-200"
                  aria-current={active ? 'step' : undefined}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                      complete
                        ? 'border-apple-blue/30 bg-apple-blue/15 text-white'
                        : active
                          ? 'border-apple-blue/30 bg-apple-blue/15 text-white'
                          : 'border-white/10 bg-black/40 text-white/50'
                    }`}
                  >
                    {complete ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : active ? (
                      <CircleDot className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{step.label}</div>
                    <div className="mt-0.5 truncate text-xs text-white/60">{step.helper}</div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </nav>
      </>
    );
  }

  return (
    <nav
      className="rounded-[24px] border border-white/10 bg-apple-dark-2 p-3"
      aria-label="Demo flow progress"
    >
      <ol className="grid gap-2">
        {FLOW_STEPS.map((step, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;
          const Icon = step.Icon;

          return (
            <motion.li
              key={step.id}
              initial={false}
              animate={{
                borderColor: active || complete ? 'rgba(0, 113, 227, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: active
                  ? 'rgba(0, 113, 227, 0.12)'
                  : complete
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
              }}
              className="flex items-center gap-3 rounded-[18px] border px-3 py-3 motion-safe:transition-all duration-200"
              aria-current={active ? 'step' : undefined}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  complete
                    ? 'border-apple-blue/30 bg-apple-blue/15 text-white'
                    : active
                      ? 'border-apple-blue/30 bg-apple-blue/15 text-white'
                      : 'border-white/10 bg-black/40 text-white/50'
                }`}
              >
                {complete ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : active ? (
                  <CircleDot className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{step.label}</div>
                <div className="mt-0.5 truncate text-xs text-white/60">{step.helper}</div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}
