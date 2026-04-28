import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import { brandUploadedLogoPath } from '../../../components/landing/data';
import { LogoMark } from '../../../components/landing/ui/LogoMark';
import type { DemoFlowStage } from './types';

const STAGE_COPY: Record<DemoFlowStage, string> = {
  chat: 'Live intake',
  assessment: 'Match in progress',
  placement: 'Match ready',
  results: 'Service options',
  booking: 'Booking flow',
  report: 'Follow-up loop',
};

export function DemoHeader(props: { stage: DemoFlowStage }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-apple-dark-2 px-5 py-4 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-[10.5rem] max-w-[calc(100vw-3rem)] shrink-0 items-center overflow-hidden rounded-2xl bg-white px-1.5 shadow-[0_14px_32px_rgba(0,0,0,0.22)] sm:w-[12rem]">
          <LogoMark
            src={brandUploadedLogoPath}
            alt="BookedAI"
            className="h-10 w-full object-cover object-center"
          />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-[0.12em] text-white">BookedAI</div>
          <div className="mt-0.5 text-xs text-white/60">Live revenue engine — real operator, live Stripe</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/70">
        <span className="inline-flex items-center gap-2 rounded-full border border-apple-blue/20 bg-apple-blue/10 px-3 py-1.5 text-white">
          <ShieldCheck className="h-3.5 w-3.5 text-apple-blue" aria-hidden="true" />
          Live API-backed booking
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
          {STAGE_COPY[props.stage]}
          <ArrowRight className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
          Book, pay, follow up
        </span>
      </div>
    </motion.header>
  );
}
