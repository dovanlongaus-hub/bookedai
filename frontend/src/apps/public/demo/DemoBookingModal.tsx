import { AnimatePresence, motion } from 'framer-motion';

import type { DemoBookingRecord, DemoService } from './types';

export type DemoBookingModalStep = 'details' | 'payment' | 'success';

function formatSlot(value: string) {
  if (!value) {
    return 'Next available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function ProgressBar(props: { step: DemoBookingModalStep }) {
  const steps: DemoBookingModalStep[] = ['details', 'payment', 'success'];
  const activeIndex = steps.indexOf(props.step);

  return (
    <div className="space-y-3">
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <motion.div
          initial={false}
          animate={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-[linear-gradient(135deg,#20F6B3_0%,#00D1FF_100%)]"
        />
      </div>
      <div className="flex justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        <span>Details</span>
        <span>Pay</span>
        <span>Done</span>
      </div>
    </div>
  );
}

function getSuccessStateCopy(booking: DemoBookingRecord | null, serviceName: string | null, preferredSlot: string) {
  const reference = booking?.bookingReference ?? 'your booking';
  const service = serviceName ?? 'your service';
  const slot = formatSlot(preferredSlot);

  if (booking?.completionState === 'payment_opened') {
    return {
      title: 'Payment opened',
      body: `Finish secure checkout for ${reference}. Your ${service} request stays attached to ${slot}.`,
      email: `Your booking for ${service} is ready. Finish payment to lock ${slot}.`,
      sms: `Payment link ready for ${service}. Ref ${reference}. Complete checkout to lock it in.`,
      cta: 'Close',
    };
  }

  if (booking?.completionState === 'paid') {
    return {
      title: "You're booked",
      body: `Ref ${reference} is confirmed.`,
      email: `Your booking for ${service} is confirmed for ${slot}. Receipt and booking link are ready.`,
      sms: `Confirmed: ${service}. Ref ${reference}. Check details in your booking link.`,
      cta: 'Done',
    };
  }

  return {
    title: 'Request sent',
    body: `Ref ${reference} is waiting for provider confirmation. We will send the next payment step as soon as it is ready.`,
    email: `We received your ${service} request for ${slot}. Confirmation and payment details will follow shortly.`,
    sms: `Request received for ${service}. Ref ${reference}. We will send the next step soon.`,
    cta: 'Done',
  };
}

export function DemoBookingModal(props: {
  open: boolean;
  step: DemoBookingModalStep;
  selectedService: DemoService | null;
  booking: DemoBookingRecord | null;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerEmail: string;
  setCustomerEmail: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  preferredSlot: string;
  setPreferredSlot: (value: string) => void;
  submitError: string;
  submitting: boolean;
  paymentProcessing: boolean;
  onClose: () => void;
  onConfirmDetails: () => void;
  onConfirmPayment: () => void;
}) {
  const previewEmail = props.customerEmail.trim().toLowerCase();
  const previewPhone = props.customerPhone.trim();
  const successCopy = getSuccessStateCopy(
    props.booking,
    props.selectedService?.name ?? null,
    props.preferredSlot,
  );

  return (
    <AnimatePresence>
      {props.open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#020611]/70 backdrop-blur-sm"
            onClick={props.onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-3 top-1/2 z-50 mx-auto grid max-h-[calc(100vh-1.5rem)] max-w-5xl -translate-y-1/2 gap-6 overflow-y-auto rounded-[28px] border border-white/10 bg-[#09111E]/96 p-5 shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inset-x-4 md:grid-cols-[minmax(0,1.15fr)_360px] md:rounded-[32px] md:p-6"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8EFCE0]">Book now</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {props.selectedService ? `Book ${props.selectedService.name}` : 'Confirm your booking'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Check the details. Pay. Done.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={props.onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300"
                >
                  ×
                </button>
              </div>

              <ProgressBar step={props.step} />

              {props.step === 'details' ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={props.customerName}
                      onChange={(event) => props.setCustomerName(event.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-[18px] border border-white/10 bg-[#0D1728] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      type="datetime-local"
                      value={props.preferredSlot}
                      onChange={(event) => props.setPreferredSlot(event.target.value)}
                      className="w-full rounded-[18px] border border-white/10 bg-[#0D1728] px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={props.customerEmail}
                      onChange={(event) => props.setCustomerEmail(event.target.value)}
                      placeholder="Email"
                      className="w-full rounded-[18px] border border-white/10 bg-[#0D1728] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      value={props.customerPhone}
                      onChange={(event) => props.setCustomerPhone(event.target.value)}
                      placeholder="Phone"
                      className="w-full rounded-[18px] border border-white/10 bg-[#0D1728] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">Saved on this device</div>
                      <div className="mt-1 text-xs text-slate-400">Less typing next time.</div>
                    </div>
                    <div className="rounded-full border border-[#20F6B3]/20 bg-[#20F6B3]/10 px-3 py-1 text-xs font-semibold text-[#C8FFF0]">
                      Fast checkout
                    </div>
                  </div>

                  {props.submitError ? (
                    <div className="rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      {props.submitError}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={props.onConfirmDetails}
                      disabled={props.submitting}
                      className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#20F6B3_0%,#00D1FF_100%)] px-5 py-3 text-sm font-semibold text-[#08111F] disabled:opacity-60"
                    >
                      {props.submitting ? 'Getting payment...' : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : null}

              {props.step === 'payment' ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.08))] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Payment ready</div>
                        <div className="mt-1 text-sm text-slate-300">
                          {props.booking?.checkoutUrl
                            ? 'Open the secure payment step and finish checkout.'
                            : props.booking?.paymentOption === 'invoice_after_confirmation'
                              ? 'This provider confirms first. We will send the payment step next.'
                              : 'The booking is created. Open the next payment step when it is ready.'}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-slate-200">
                        {props.booking?.paymentStatus ?? 'pending'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-[#0D1728] p-5">
                    <div className="text-sm font-semibold text-white">Your booking</div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Service</div>
                        <div className="mt-2 text-white">{props.selectedService?.name ?? 'Selected service'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Price</div>
                        <div className="mt-2 text-white">{props.selectedService?.priceLabel ?? 'TBC'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Requested time</div>
                        <div className="mt-2 text-white">{formatSlot(props.preferredSlot)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    {props.booking?.checkoutUrl ? (
                      <a
                        href={props.booking.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-slate-400 underline decoration-white/15 underline-offset-4"
                      >
                        Open secure payment page
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Payment will follow after provider confirmation.</span>
                    )}

                    <button
                      type="button"
                      onClick={props.onConfirmPayment}
                      disabled={props.paymentProcessing}
                      className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#20F6B3_0%,#00D1FF_100%)] px-5 py-3 text-sm font-semibold text-[#08111F] disabled:opacity-60"
                    >
                      {props.paymentProcessing
                        ? 'Opening...'
                        : props.booking?.checkoutUrl
                          ? 'Open payment'
                          : 'Continue'}
                    </button>
                  </div>
                </div>
              ) : null}

              {props.step === 'success' ? (
                <div className="space-y-5">
                  <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.12),rgba(0,209,255,0.08))] px-6 py-10 text-center">
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="flex h-18 w-18 items-center justify-center rounded-full bg-[#20F6B3]/18 text-[#B6FFF0]"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current">
                        <path d="m5 12 4.2 4.2L19 6.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <div className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-white">{successCopy.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{successCopy.body}</div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-[#0D1728] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">Email preview</div>
                      <div className="mt-3 text-sm font-medium text-white">To: {previewEmail || 'customer@email.com'}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">{successCopy.email}</div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-[#0D1728] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">SMS preview</div>
                      <div className="mt-3 text-sm font-medium text-white">To: {previewPhone || '+61 ...'}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">{successCopy.sms}</div>
                    </div>
                  </div>

                  {props.booking?.reportPreview ? (
                    <div className="rounded-[24px] border border-[#20F6B3]/20 bg-[linear-gradient(135deg,rgba(32,246,179,0.08),rgba(0,209,255,0.06))] p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8EFCE0]">Parent report preview</div>
                      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
                        {props.booking.reportPreview.headline}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-200">
                        {props.booking.reportPreview.summary}
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Focus next</div>
                          <div className="mt-2 text-sm text-white">
                            {props.booking.reportPreview.focus_areas[0] ?? 'Structured progress review'}
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Homework</div>
                          <div className="mt-2 text-sm text-white">
                            {props.booking.reportPreview.homework[0] ?? 'Practice tasks will appear here'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-100">
                        {props.booking.reportPreview.parent_cta}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={props.onClose}
                      className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#20F6B3_0%,#00D1FF_100%)] px-5 py-3 text-sm font-semibold text-[#08111F]"
                    >
                      {successCopy.cta}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="overflow-hidden rounded-[22px] bg-[#0D1728]">
                {props.selectedService?.imageUrl ? (
                  <img src={props.selectedService.imageUrl} alt={props.selectedService.name} className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 bg-white/5" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{props.selectedService?.name ?? 'Selected service'}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {[props.selectedService?.category, props.selectedService?.location].filter(Boolean).join(' • ') || 'Ready to book'}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[18px] border border-white/10 bg-[#0D1728] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Price</div>
                  <div className="mt-2 text-lg font-semibold text-white">{props.selectedService?.priceLabel ?? 'TBC'}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-[#0D1728] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Requested slot</div>
                  <div className="mt-2 text-sm text-white">{formatSlot(props.preferredSlot)}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-[#0D1728] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Customer</div>
                  <div className="mt-2 text-sm text-white">{props.customerName || 'Ready to fill'}</div>
                  <div className="mt-1 text-xs text-slate-400">{previewEmail || previewPhone || 'We will send the confirmation here.'}</div>
                </div>
              </div>
            </aside>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
