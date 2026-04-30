import { useEffect } from 'react';
import { X, Waves } from 'lucide-react';

import { BookingAssistantDialog } from '../landing/assistant/BookingAssistantDialog';
import { bookingAssistantContent } from '../landing/data';
import type { PublicBookingAssistantRuntimeConfig } from '../landing/assistant/publicBookingAssistantV1';

type FutureSwimAskProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string | null;
};

const FUTURE_SWIM_ASK_CONTENT = {
  ...bookingAssistantContent,
  searchPlaceholder:
    "Tell me your child's age, centre, and goals — I'll suggest a Future Swim level and times.",
};

const RUNTIME_CONFIG: PublicBookingAssistantRuntimeConfig = {
  channel: 'public_web',
  tenantRef: 'future-swim',
  deploymentMode: 'standalone_app',
  widgetId: 'future-swim-ask',
  source: 'futureswim.bookedai.au',
};

const PARTNER_CONFIG = {
  services_endpoint: '/api/booking-assistant/catalog',
  booking_endpoint: '/api/v1/bookings/intents',
  portal_endpoint_prefix: '/portal',
  capabilities: ['whatsapp', 'telegram', 'email', 'calendar'],
  features: {
    monthly_reminder_default: true,
    post_booking_feedback: true,
  },
};

export const FUTURE_SWIM_QUICK_PROMPTS: string[] = [
  'My child is 3, nervous in the water — which centre and level should we start with?',
  'Find a beginner Learn-to-Swim class on Saturday morning at Caringbah.',
  'We want a warm-pool baby class near Leichhardt for a 9-month-old.',
  'My 8-year-old can swim 50m freestyle — is Pre-Squad at Rouse Hill available?',
];

export function FutureSwimAsk({ open, onOpenChange, initialQuery }: FutureSwimAskProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Future Swim Ask"
      className="fs-ask-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="fs-ask-shell">
        <div className="fs-ask-header">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
            >
              <Waves size={18} />
            </span>
            <div className="fs-ask-header-title">
              <strong>Future Swim Ask</strong>
              <span>Find your level + best time slots in seconds</span>
            </div>
          </div>
          <button
            type="button"
            className="fs-ask-close"
            aria-label="Close Future Swim Ask"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="fs-ask-body">
          <BookingAssistantDialog
            content={FUTURE_SWIM_ASK_CONTENT}
            isOpen
            standalone
            embedded
            hideCloseControl
            layoutMode="product_app"
            closeLabel="Future Swim Ask"
            entrySourcePath="/futureswim"
            initialQuery={initialQuery ?? null}
            runtimeConfig={RUNTIME_CONFIG}
            partnerConfig={PARTNER_CONFIG}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </div>
    </div>
  );
}
