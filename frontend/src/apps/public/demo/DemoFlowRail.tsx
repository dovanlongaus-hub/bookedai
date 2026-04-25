import { motion } from 'framer-motion';
import { Check, CircleDot, CreditCard, FileText, MessageSquareText, Trophy, UserCheck } from 'lucide-react';

import type { DemoBookingRecord, DemoFlowStage } from './types';

const FLOW_STEPS: Array<{
  id: DemoFlowStage;
  label: string;
  helper: string;
  Icon: typeof MessageSquareText;
}> = [
  {
    id: 'chat',
    label: 'Intent',
    helper: 'Parent asks naturally',
    Icon: MessageSquareText,
  },
  {
    id: 'assessment',
    label: 'Assess',
    helper: 'Skill check',
    Icon: UserCheck,
  },
  {
    id: 'placement',
    label: 'Place',
    helper: 'Class and plan',
    Icon: Trophy,
  },
  {
    id: 'booking',
    label: 'Book',
    helper: 'Lead + intent',
    Icon: CreditCard,
  },
  {
    id: 'report',
    label: 'Retain',
    helper: 'Portal + report',
    Icon: FileText,
  },
];

export function DemoFlowRail(props: {
  stage: DemoFlowStage;
  booking: DemoBookingRecord | null;
  compact?: boolean;
}) {
  const activeIndex = FLOW_STEPS.findIndex((step) => step.id === props.stage);
  const progressIndex = Math.max(activeIndex, 0);

  return (
    <div
      className={`bookedai-saas-glass rounded-[24px] p-3 ${
        props.compact ? 'overflow-x-auto' : ''
      }`}
      aria-label="Demo flow progress"
    >
      <div className={props.compact ? 'flex min-w-[680px] items-center gap-2' : 'grid gap-2'}>
        {FLOW_STEPS.map((step, index) => {
          const complete = index < progressIndex || (step.id === 'report' && props.booking?.reportPreview);
          const active = index === progressIndex;
          const Icon = step.Icon;

          return (
            <motion.div
              key={step.id}
              initial={false}
              animate={{
                borderColor: active || complete ? 'rgba(32,246,179,0.32)' : 'rgba(255,255,255,0.1)',
                backgroundColor: active
                  ? 'rgba(32,246,179,0.1)'
                  : complete
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.025)',
              }}
              className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${
                props.compact ? 'min-w-[128px] flex-1' : ''
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  complete
                    ? 'border-[#20F6B3]/30 bg-[#20F6B3]/14 text-[#BFFFEF]'
                    : active
                      ? 'border-[#00D1FF]/30 bg-[#00D1FF]/12 text-[#BDEFFF]'
                      : 'border-white/10 bg-black/20 text-slate-400'
                }`}
              >
                {complete ? <Check className="h-4 w-4" /> : active ? <CircleDot className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{step.label}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{step.helper}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
