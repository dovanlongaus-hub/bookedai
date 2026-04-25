import { motion } from 'framer-motion';
import { Bot, CheckCircle2, Clock3, FileText, MailCheck, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';

import type { DemoBookingRecord, DemoBundleSuggestion, DemoPlacementRecommendation, DemoService } from './types';

function statusTone(paymentStatus: string) {
  const normalized = paymentStatus.trim().toLowerCase();
  if (normalized === 'paid') {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
  }
  if (normalized === 'pending' || normalized === 'awaiting_confirmation') {
    return 'border-sky-400/25 bg-sky-500/10 text-sky-100';
  }
  return 'border-white/10 bg-white/[0.05] text-slate-200';
}

function paymentLabel(booking: DemoBookingRecord) {
  if (booking.completionState === 'payment_opened') {
    return 'Checkout open';
  }
  if (booking.completionState === 'awaiting_confirmation') {
    return 'Awaiting confirmation';
  }
  if (booking.paymentStatus === 'paid') {
    return 'Paid';
  }
  return booking.paymentStatus;
}

function actionLabel(actionType: string) {
  return actionType
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function actionStatusTone(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'sent') {
    return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  }
  if (normalized === 'manual_review' || normalized === 'failed') {
    return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
  }
  if (normalized === 'in_progress') {
    return 'border-sky-400/20 bg-sky-500/10 text-sky-100';
  }
  return 'border-white/10 bg-black/10 text-slate-300';
}

function actionStatusIcon(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'sent') {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  if (normalized === 'manual_review' || normalized === 'failed') {
    return <TriangleAlert className="h-3.5 w-3.5" />;
  }
  return <Clock3 className="h-3.5 w-3.5" />;
}

export function DemoBookingPanel(props: {
  selectedService: DemoService | null;
  selectedBundles: DemoBundleSuggestion[];
  booking: DemoBookingRecord | null;
  placement: DemoPlacementRecommendation | null;
  preferredSlot: string;
  customerEmail: string;
  customerPhone: string;
  onOpenModal: () => void;
}) {
  return (
    <section className="bookedai-saas-glass rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Revenue workflow</div>
          <div className="mt-1 text-sm text-slate-400">Booking, payment, CRM, and parent follow-up.</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-300">
          {props.booking ? 'In progress' : 'Pick one'}
        </div>
      </div>

      {props.selectedService ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mt-5 rounded-[24px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.06))] p-4"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">Best pick</div>
          <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{props.selectedService.name}</div>
          <div className="mt-1 text-sm text-slate-300">
            {[props.selectedService.category, props.selectedService.location].filter(Boolean).join(' • ') || 'Location on request'}
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-300">
            {props.selectedService.nextStep ?? props.selectedService.summary}
          </div>
        </motion.div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/10 px-4 py-6 text-sm text-slate-400">
          Pick a result to keep going.
        </div>
      )}

      {props.placement ? (
        <div className="mt-5 rounded-[24px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.06))] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">Academy pathway</div>
          <div className="mt-2 text-base font-semibold text-white">{props.placement.class_label}</div>
          <div className="mt-1 text-sm text-slate-300">
            {props.placement.level} • {props.placement.suggested_plan.title} • {props.placement.suggested_plan.price_label}
          </div>
          {props.placement.retention_note ? (
            <div className="mt-3 rounded-[16px] border border-white/10 bg-black/10 px-3 py-3 text-sm text-slate-200">
              {props.placement.retention_note}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <div className="rounded-[18px] border border-white/10 bg-[#0A1222] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Requested slot</div>
          <div className="mt-2 text-sm text-white">{props.preferredSlot}</div>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-[#0A1222] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Autofill contact</div>
          <div className="mt-2 text-sm text-white">{props.customerEmail || props.customerPhone || 'Your details fill in automatically.'}</div>
        </div>
      </div>

      {props.selectedBundles.length ? (
        <div className="mt-5 rounded-[20px] border border-[#20F6B3]/15 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.05))] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EFCE0]">Combined booking</div>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/10 px-3 py-3">
              <div>
                <div className="text-sm font-medium text-white">{props.selectedService?.name ?? 'Primary service'}</div>
                <div className="mt-1 text-xs text-slate-400">Main booking</div>
              </div>
              <div className="text-sm font-semibold text-white">{props.selectedService?.priceLabel ?? 'Included'}</div>
            </div>
            {props.selectedBundles.map((bundle) => (
              <div key={bundle.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/10 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{bundle.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{bundle.timingLabel}</div>
                </div>
                <div className="text-sm font-semibold text-white">{bundle.priceLabel}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
        The demo keeps every step truthful: payment opens only when the API returns a checkout URL, otherwise the booking stays in confirmation follow-up.
      </div>

      <button
        type="button"
        onClick={props.onOpenModal}
        disabled={!props.selectedService || !props.placement}
        className="bookedai-saas-button-primary mt-5 inline-flex w-full items-center justify-center rounded-[18px] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {props.placement ? 'Book now' : 'Complete assessment first'}
      </button>

      {props.booking ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className="mt-5 space-y-4 rounded-[24px] border border-white/10 bg-[#09101D] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">Booking flow</div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{props.booking.bookingReference}</div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(props.booking.paymentStatus)}`}>
              {paymentLabel(props.booking)}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={props.booking.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white"
            >
              View booking
            </a>
            <a
              href={props.booking.checkoutUrl ?? props.booking.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#20F6B3_0%,#00D1FF_100%)] px-4 py-3 text-sm font-semibold text-[#08111F]"
            >
              {props.booking.checkoutUrl ? 'Open checkout' : 'Open booking'}
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Lead
              </div>
              <div className="mt-2 break-all text-sm text-white">{props.booking.authoritative.leadId ?? 'Created'}</div>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <RefreshCw className="h-3.5 w-3.5" />
                Intent
              </div>
              <div className="mt-2 break-all text-sm text-white">{props.booking.bookingIntentId}</div>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <MailCheck className="h-3.5 w-3.5" />
                CRM
              </div>
              <div className="mt-2 text-sm text-white">
                {props.booking.authoritative.crmSync ? 'Done' : 'Pending'}
              </div>
            </div>
          </div>

          {props.booking.paymentWarnings.length ? (
            <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {props.booking.paymentWarnings.join(' ')}
            </div>
          ) : null}

          {props.booking.reportPreview ? (
            <div className="rounded-[20px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.06))] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">
                <FileText className="h-3.5 w-3.5" />
                Parent report ready
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{props.booking.reportPreview.headline}</div>
              <div className="mt-2 text-sm leading-6 text-slate-200">{props.booking.reportPreview.summary}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] border border-white/10 bg-black/10 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Strengths</div>
                  <div className="mt-2 text-sm text-white">{props.booking.reportPreview.strengths[0] ?? 'Progress snapshot ready.'}</div>
                </div>
                <div className="rounded-[16px] border border-white/10 bg-black/10 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Next class</div>
                  <div className="mt-2 text-sm text-white">
                    {props.booking.reportPreview.next_class_suggestion.class_label} • {props.booking.reportPreview.next_class_suggestion.slot_label}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {props.booking.subscriptionIntent ? (
            <div className="rounded-[20px] border border-[#00D1FF]/20 bg-[linear-gradient(135deg,rgba(0,209,255,0.08),rgba(32,246,179,0.05))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9AE6FF]">
                    <Bot className="h-3.5 w-3.5" />
                    Revenue agent handoff
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {props.booking.subscriptionIntent.plan_label ?? props.booking.subscriptionIntent.plan_code}
                  </div>
                </div>
                <div className="rounded-full border border-[#00D1FF]/20 bg-black/20 px-3 py-1 text-xs font-medium text-[#BDEFFF]">
                  {props.booking.revenueAgentActions?.length ?? 0} actions
                </div>
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {props.booking.subscriptionIntent.status} • {props.booking.subscriptionIntent.amount_aud ? `$${props.booking.subscriptionIntent.amount_aud}/month` : 'Monthly plan'}
              </div>
              <div className="mt-3 rounded-[16px] border border-white/10 bg-black/10 px-3 py-3 text-sm leading-6 text-slate-200">
                The booking now hands off to revenue operations for confirmation, reminders, CRM sync, reporting, and retention review.
              </div>
              {props.booking.revenueAgentActions?.length ? (
                <div className="mt-4 grid gap-2">
                  {props.booking.revenueAgentActions.map((action) => (
                    <div key={action.action_run_id} className={`rounded-[14px] border px-3 py-2 text-sm ${actionStatusTone(action.status)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                          {actionStatusIcon(action.status)}
                          <span className="truncate">{actionLabel(action.action_type)}</span>
                        </span>
                        <span className="shrink-0 text-xs uppercase tracking-[0.12em] opacity-70">{action.status.replace('_', ' ')}</span>
                      </div>
                      {action.reason ? (
                        <div className="mt-1 text-xs leading-5 opacity-75">{action.reason}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </section>
  );
}
