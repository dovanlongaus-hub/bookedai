import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import { brandShortIconPath, demoContent } from '../../components/landing/data';
import { apiV1 } from '../../shared/api';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../shared/config/api';
import { resolveApiErrorMessage } from '../../shared/api/client';
import { isPublicBookingAssistantV1LiveReadEnabled } from '../../shared/config/publicBookingAssistant';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import { PartnerMatchShortlist } from '../../shared/components/PartnerMatchShortlist';
import type { MatchCandidate } from '../../shared/contracts';
import {
  createPublicBookingAssistantLeadAndBookingIntent,
  createPublicBookingAssistantSessionId,
  getPublicBookingAssistantLiveReadRecommendation,
  primePublicBookingAssistantSession,
  shadowPublicBookingAssistantLeadAndBookingIntent,
} from '../../components/landing/assistant/publicBookingAssistantV1';
import type { HomepageContent } from './homepageContent';

type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  contact_phone?: string | null;
  source_url?: string | null;
  tags: string[];
  featured: boolean;
  distance_km?: number | null;
  source_type?: string | null;
  source_label?: string | null;
  why_this_matches?: string | null;
  price_posture?: string | null;
  booking_path_type?: string | null;
  next_step?: string | null;
  availability_state?: string | null;
  booking_confidence?: string | null;
  trust_signal?: string | null;
};

type BookingAssistantCatalogResponse = {
  status: string;
  business_email: string;
  stripe_enabled: boolean;
  services: ServiceCatalogItem[];
};

type BookingAssistantChatResponse = {
  status: string;
  reply: string;
  matched_services: ServiceCatalogItem[];
  suggested_service_id: string | null;
  should_request_location: boolean;
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
  portal_url: string;
  service: ServiceCatalogItem;
  amount_aud: number;
  amount_label: string;
  requested_date: string;
  requested_time: string;
  timezone: string;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string;
  qr_code_url: string;
  email_status: 'sent' | 'pending_manual_followup';
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  calendar_add_url: string | null;
  confirmation_message: string;
  contact_email: string;
  workflow_status: string | null;
  crm_sync?: {
    lead?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    contact?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    deal?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    task?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    warning_codes?: string[];
  } | null;
  automation?: {
    paymentIntent?: {
      status: string;
      paymentIntentId?: string | null;
      warnings: string[];
      checkoutUrl?: string | null;
    } | null;
    lifecycleEmail?: {
      status: string;
      messageId?: string | null;
      warnings: string[];
    } | null;
    sms?: {
      status: string;
      messageId?: string | null;
      provider?: string | null;
      warnings: string[];
    } | null;
    whatsapp?: {
      status: string;
      messageId?: string | null;
      provider?: string | null;
      warnings: string[];
    } | null;
  } | null;
};

type UserGeoContext = {
  latitude: number;
  longitude: number;
  locality: string | null;
};

type HomepageSearchExperienceProps = {
  content: HomepageContent;
  sourcePath: string;
  initialQuery: string | null;
  initialQueryRequestId: number;
};

type LiveReadBookingSummary = {
  serviceId: string | null;
  nextStep: string | null;
  paymentAllowedBeforeConfirmation: boolean;
  bookingPath: string | null;
};
const bookedAiShortIconSrc = brandShortIconPath;

type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BookingOutcomeStep = {
  label: string;
  value: string;
  tone: string;
};

type BookingFlowStep = {
  id: string;
  label: string;
  detail: string;
  state: 'pending' | 'active' | 'complete';
};

type EnterpriseJourneyStatus = 'completed' | 'in_progress' | 'attention' | 'pending';

type OperationTimelineItem = {
  id: string;
  title: string;
  detail: string;
  status: EnterpriseJourneyStatus;
  reference?: string | null;
};

type CommunicationPreviewCard = {
  id: string;
  title: string;
  channel: string;
  tone: 'dark' | 'light' | 'success';
  recipient: string;
  summary: string;
  body: string;
};

type EnterpriseJourneyStep = {
  id: string;
  title: string;
  description: string;
  status: EnterpriseJourneyStatus;
  channel?: string;
};

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 3v3M19.5 4.5h-3M4.5 16.5h3M6 15v3" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m5 12 4.2 4.2L19 6.5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" strokeWidth="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" strokeWidth="1.8" />
      <path d="M15 15h2v2h-2zM18 14h2v2h-2zM16 18h4v2h-4zM14 16h2v4h-2z" strokeWidth="1.8" />
    </svg>
  );
}

function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m4 11 8-6 8 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5v8h11v-8" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="6" width="16" height="12" rx="2.5" strokeWidth="1.8" />
      <path d="m5.5 8 6.5 5 6.5-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="9" y="4" width="6" height="10" rx="3" strokeWidth="1.8" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronUpDownIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m8 10 4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 14-4 4-4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandButtonMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <img src={bookedAiShortIconSrc} alt="" aria-hidden="true" className={`${className} object-contain`} />;
}

function buildBookingOutcomeSteps(result: BookingAssistantSessionResponse): BookingOutcomeStep[] {
  const lifecycleEmailStatus = normalizeAutomationStatus(result.automation?.lifecycleEmail?.status);
  const smsStatus = normalizeAutomationStatus(result.automation?.sms?.status);
  const whatsappStatus = normalizeAutomationStatus(result.automation?.whatsapp?.status);

  return [
    {
      label: 'Confirmation email',
      value:
        lifecycleEmailStatus === 'sent' || lifecycleEmailStatus === 'delivered'
          ? 'Sent to customer'
          : lifecycleEmailStatus === 'queued'
            ? 'Queued for follow-up'
            : result.email_status === 'sent'
          ? 'Sent to customer'
          : `Handled by ${result.contact_email}`,
      tone:
        lifecycleEmailStatus === 'sent' ||
        lifecycleEmailStatus === 'delivered' ||
        result.email_status === 'sent'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Payment',
      value:
        result.payment_status === 'stripe_checkout_ready'
          ? 'Checkout ready now'
          : 'Payment follow-up required',
      tone:
        result.payment_status === 'stripe_checkout_ready'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Calendar and workflow',
      value:
        result.meeting_status === 'scheduled'
          ? 'Calendar event sent'
          : result.calendar_add_url
            ? 'Calendar link ready'
            : result.workflow_status
              ? 'Sent into ops workflow'
              : 'Queued for handoff',
      tone:
        result.meeting_status === 'scheduled' || result.workflow_status
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
    },
    {
      label: 'SMS and WhatsApp',
      value:
        smsStatus === 'sent' ||
        whatsappStatus === 'sent' ||
        smsStatus === 'delivered' ||
        whatsappStatus === 'delivered'
          ? 'Messaging sent'
          : smsStatus === 'queued' || whatsappStatus === 'queued'
            ? 'Messaging queued'
            : 'Awaiting phone-based follow-up',
      tone:
        smsStatus === 'sent' ||
        whatsappStatus === 'sent' ||
        smsStatus === 'delivered' ||
        whatsappStatus === 'delivered'
          ? 'bg-emerald-50 text-emerald-700'
          : smsStatus === 'queued' || whatsappStatus === 'queued'
            ? 'bg-sky-50 text-sky-700'
            : 'bg-slate-100 text-slate-600',
    },
  ];
}

function normalizeSyncStatus(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function normalizeAutomationStatus(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function deriveCommunicationLaneStatus(
  lane:
    | {
        status?: string | null;
        warnings?: string[];
      }
    | null
    | undefined,
): EnterpriseJourneyStatus {
  const status = normalizeAutomationStatus(lane?.status);
  if (!status) {
    return 'pending';
  }
  if (['sent', 'delivered'].includes(status)) {
    return 'completed';
  }
  if (['queued', 'opened', 'unknown', 'pending'].includes(status)) {
    return 'in_progress';
  }
  if (['failed', 'error'].includes(status) || (lane?.warnings?.length ?? 0) > 0) {
    return 'attention';
  }
  return 'in_progress';
}

function deriveCrmSyncStatus(result: BookingAssistantSessionResponse | null): EnterpriseJourneyStatus {
  if (!result?.crm_sync) {
    return 'pending';
  }

  const statuses = [
    normalizeSyncStatus(result.crm_sync.lead?.sync_status),
    normalizeSyncStatus(result.crm_sync.contact?.sync_status),
    normalizeSyncStatus(result.crm_sync.deal?.sync_status),
    normalizeSyncStatus(result.crm_sync.task?.sync_status),
  ].filter(Boolean);

  if (!statuses.length) {
    return 'pending';
  }
  if (statuses.some((status) => ['failed', 'manual_review_required'].includes(status))) {
    return 'attention';
  }
  if (statuses.every((status) => status === 'synced')) {
    return 'completed';
  }
  if (statuses.some((status) => ['retrying', 'pending'].includes(status))) {
    return 'in_progress';
  }
  return 'in_progress';
}

function getEnterpriseStatusTone(status: EnterpriseJourneyStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'in_progress':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'attention':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function getEnterpriseStatusLabel(status: EnterpriseJourneyStatus) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'attention':
      return 'Needs review';
    default:
      return 'Pending';
  }
}

function buildV1ActorContext() {
  return {
    channel: 'public_web' as const,
    tenant_ref: null,
    deployment_mode: 'standalone_app' as const,
  };
}

function derivePaymentOptionForAutomation(params: {
  paymentAllowedBeforeConfirmation: boolean;
  bookingPath: string | null;
}) {
  if (params.paymentAllowedBeforeConfirmation) {
    return 'stripe_card' as const;
  }

  if (params.bookingPath === 'book_on_partner_site') {
    return 'partner_checkout' as const;
  }

  return 'invoice_after_confirmation' as const;
}

function buildOperationTimeline(result: BookingAssistantSessionResponse): OperationTimelineItem[] {
  const paymentStatus = normalizeAutomationStatus(result.automation?.paymentIntent?.status);
  const emailStatus = normalizeAutomationStatus(result.automation?.lifecycleEmail?.status);
  const smsStatus = normalizeAutomationStatus(result.automation?.sms?.status);
  const whatsappStatus = normalizeAutomationStatus(result.automation?.whatsapp?.status);
  const crmStatus = deriveCrmSyncStatus(result);

  return [
    {
      id: 'booking-captured',
      title: 'Booking captured',
      detail: `Booking reference ${result.booking_reference} was created for ${result.service.name}.`,
      status: 'completed',
      reference: result.booking_reference,
    },
    {
      id: 'payment-intent',
      title: 'Payment intent',
      detail:
        paymentStatus === 'pending'
          ? 'Payment intent is recorded and awaiting downstream checkout orchestration.'
          : paymentStatus
            ? `Payment intent returned status ${paymentStatus}.`
            : 'Payment automation has not returned a payment intent state yet.',
      status:
        result.payment_status === 'stripe_checkout_ready'
          ? 'completed'
          : result.automation?.paymentIntent
            ? 'in_progress'
            : 'pending',
      reference: result.automation?.paymentIntent?.paymentIntentId ?? null,
    },
    {
      id: 'email-dispatch',
      title: 'Confirmation email',
      detail:
        emailStatus === 'sent' || emailStatus === 'delivered'
          ? 'Lifecycle confirmation email completed successfully.'
          : emailStatus === 'queued'
            ? 'Lifecycle email is queued or recorded for follow-up.'
            : result.contact_email
              ? `Email handoff remains tied to ${result.contact_email}.`
              : 'No email recipient was supplied for this flow.',
      status: deriveCommunicationLaneStatus(result.automation?.lifecycleEmail),
      reference: result.automation?.lifecycleEmail?.messageId ?? null,
    },
    {
      id: 'sms-dispatch',
      title: 'SMS handoff',
      detail:
        smsStatus === 'sent' || smsStatus === 'delivered'
          ? 'SMS confirmation was sent successfully.'
          : smsStatus === 'queued'
            ? 'SMS was queued or recorded for operator follow-up.'
            : 'SMS is optional and only runs when a valid phone number is supplied.',
      status: deriveCommunicationLaneStatus(result.automation?.sms),
      reference: result.automation?.sms?.messageId ?? null,
    },
    {
      id: 'whatsapp-dispatch',
      title: 'WhatsApp handoff',
      detail:
        whatsappStatus === 'sent' || whatsappStatus === 'delivered'
          ? 'WhatsApp confirmation was sent successfully.'
          : whatsappStatus === 'queued'
            ? 'WhatsApp was queued or recorded for operator follow-up.'
            : 'WhatsApp is optional and only runs when a valid phone number is supplied.',
      status: deriveCommunicationLaneStatus(result.automation?.whatsapp),
      reference: result.automation?.whatsapp?.messageId ?? null,
    },
    {
      id: 'crm-sync',
      title: 'CRM linkage',
      detail:
        crmStatus === 'completed'
          ? 'CRM sync completed across lead, contact, deal, and task records.'
          : crmStatus === 'attention'
            ? 'CRM sync needs operator review or retry attention.'
            : 'CRM sync is still in progress or pending reconciliation.',
      status: crmStatus,
      reference:
        result.crm_sync?.deal?.external_entity_id ??
        result.crm_sync?.contact?.external_entity_id ??
        result.crm_sync?.lead?.external_entity_id ??
        null,
    },
  ];
}

function paymentReadyCopy(result: BookingAssistantSessionResponse) {
  return result.payment_status === 'stripe_checkout_ready'
    ? `Pay here: ${result.payment_url}`
    : 'Payment follow-up will be sent separately.';
}

function buildCommunicationPreviewCards(params: {
  result: BookingAssistantSessionResponse;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const { result, customerName, customerEmail, customerPhone } = params;
  const displayName = customerName.trim() || 'Customer';
  const normalizedEmail = customerEmail.trim().toLowerCase();
  const normalizedPhone = customerPhone.trim();
  const slotLine = `${result.requested_date} at ${result.requested_time} ${result.timezone}`;
  const serviceLabel = result.service.name;
  const paymentLine =
    result.payment_status === 'stripe_checkout_ready'
      ? `Payment link: ${result.payment_url}`
      : 'Payment will be completed after manual confirmation.';
  const calendarLine =
    result.meeting_event_url || result.calendar_add_url
      ? `Calendar link: ${result.meeting_event_url ?? result.calendar_add_url}`
      : 'Calendar invite will be completed by the operations team.';

  const cards: CommunicationPreviewCard[] = [];

  if (normalizedEmail) {
    cards.push({
      id: 'email',
      title: 'Confirmation email',
      channel: 'Email',
      tone: 'dark',
      recipient: normalizedEmail,
      summary: 'Enterprise-format confirmation with booking reference, payment, and calendar next step.',
      body: `Subject: Your ${serviceLabel} booking is in progress\n\nHi ${displayName},\n\nThanks for choosing ${serviceLabel}. Your booking reference is ${result.booking_reference}.\nRequested slot: ${slotLine}.\n${paymentLine}\n${calendarLine}\nPortal: ${getBookingPortalUrl(result)}\n\nBookedAI Revenue Ops`,
    });
  }

  if (normalizedPhone) {
    cards.push({
      id: 'sms',
      title: 'SMS follow-up',
      channel: 'SMS',
      tone: 'light',
      recipient: normalizedPhone,
      summary: 'Short-form operational reminder designed for high open rates.',
      body: `${displayName}, your ${serviceLabel} booking ref is ${result.booking_reference}. Slot: ${slotLine}. ${paymentReadyCopy(result)} Portal: ${getBookingPortalUrl(result)}`,
    });
    cards.push({
      id: 'whatsapp',
      title: 'WhatsApp handoff',
      channel: 'WhatsApp',
      tone: 'success',
      recipient: normalizedPhone,
      summary: 'Richer channel for payment nudges, reschedule help, and concierge follow-up.',
      body: `Hi ${displayName}, thanks for booking ${serviceLabel} with BookedAI.\nBooking reference: ${result.booking_reference}\nRequested slot: ${slotLine}\n${paymentLine}\nIf you need to reschedule or ask a question, reply here and our team will continue the conversation.`,
    });
  }

  return cards;
}

function buildEnterpriseJourneySteps(params: {
  result: BookingAssistantSessionResponse | null;
  selectedService: ServiceCatalogItem | null;
  customerEmail: string;
  customerPhone: string;
}) {
  const { result, selectedService, customerEmail, customerPhone } = params;
  const hasPhone = customerPhone.trim().replace(/\D/g, '').length >= 8;
  const hasEmail = customerEmail.trim().length > 3;
  const paymentReady = result?.payment_status === 'stripe_checkout_ready';
  const calendarReady = Boolean(result?.meeting_event_url || result?.calendar_add_url);
  const crmStatus = deriveCrmSyncStatus(result);
  const emailLaneStatus = deriveCommunicationLaneStatus(result?.automation?.lifecycleEmail);
  const smsLaneStatus = deriveCommunicationLaneStatus(result?.automation?.sms);
  const whatsappLaneStatus = deriveCommunicationLaneStatus(result?.automation?.whatsapp);
  const paymentIntentStatus = normalizeAutomationStatus(result?.automation?.paymentIntent?.status);
  const paymentWarnings = result?.automation?.paymentIntent?.warnings ?? [];

  return [
    {
      id: 'match',
      title: 'Search and matching',
      description: selectedService
        ? `${selectedService.name} is selected from the matched shortlist.`
        : 'BookedAI is still turning the request into a ranked shortlist.',
      status: selectedService ? 'completed' : 'in_progress',
      channel: 'Search',
    },
    {
      id: 'preview',
      title: 'Preview and decision',
      description: selectedService
        ? 'Price, duration, location, and trust signals are ready before checkout.'
        : 'Preview opens once a service is selected.',
      status: selectedService ? 'completed' : 'pending',
      channel: 'Preview',
    },
    {
      id: 'booking',
      title: 'Booking capture',
      description: result
        ? `Booking reference ${result.booking_reference} is stored and ready for downstream automation.`
        : 'Contact, preferred slot, and notes will create the booking record.',
      status: result ? 'completed' : selectedService ? 'in_progress' : 'pending',
      channel: 'Booking',
    },
    {
      id: 'email',
      title: 'Email confirmation',
      description: hasEmail
        ? emailLaneStatus === 'completed'
          ? `Confirmation email has been sent for ${customerEmail.trim().toLowerCase()}.`
          : emailLaneStatus === 'in_progress'
            ? `Confirmation email is queued for ${customerEmail.trim().toLowerCase()}.`
            : `Email follow-up requires operator review for ${customerEmail.trim().toLowerCase()}.`
        : 'Email remains optional until the customer provides an address.',
      status: !hasEmail ? 'pending' : result ? emailLaneStatus : 'pending',
      channel: 'Email',
    },
    {
      id: 'calendar',
      title: 'Calendar handoff',
      description: calendarReady
        ? 'Calendar action is ready for the customer and ops team.'
        : result
          ? 'Calendar follow-up is still required from ops.'
          : 'Calendar event will be prepared after the booking request is created.',
      status: calendarReady ? 'completed' : result ? 'attention' : 'pending',
      channel: 'Calendar',
    },
    {
      id: 'payment',
      title: 'Payment readiness',
      description: paymentReady
        ? 'Checkout link is ready for immediate payment.'
        : paymentIntentStatus
          ? paymentWarnings.length
            ? 'Payment intent is recorded, but provider checkout still needs additive orchestration.'
            : 'Payment intent is recorded and waiting on the next provider step.'
        : result
          ? 'Payment follow-up stays under operator control before confirmation.'
          : 'Payment step activates after the booking request is accepted.'
      ,
      status: paymentReady ? 'completed' : paymentIntentStatus ? 'in_progress' : result ? 'attention' : 'pending',
      channel: 'Payment',
    },
    {
      id: 'crm',
      title: 'CRM sync',
      description: result?.crm_sync
        ? 'Lead, contact, deal, and follow-up task sync are tracked from the booking write path.'
        : 'CRM linkage begins once the booking intent is written.',
      status: result ? crmStatus : 'pending',
      channel: 'CRM',
    },
    {
      id: 'messaging',
      title: 'SMS and WhatsApp follow-up',
      description: hasPhone
        ? smsLaneStatus === 'completed' || whatsappLaneStatus === 'completed'
          ? 'SMS and WhatsApp follow-up have usable outbound status for the same booking reference.'
          : smsLaneStatus === 'in_progress' || whatsappLaneStatus === 'in_progress'
            ? 'SMS and WhatsApp are queued or prepared from the provided phone number.'
            : 'Phone-provided follow-up can continue over SMS or WhatsApp with the same booking reference.'
        : 'SMS and WhatsApp stay on hold until the customer shares a valid phone number.',
      status: !hasPhone
        ? 'pending'
        : result
          ? smsLaneStatus === 'attention' || whatsappLaneStatus === 'attention'
            ? 'attention'
            : smsLaneStatus === 'completed' || whatsappLaneStatus === 'completed'
              ? 'completed'
              : smsLaneStatus === 'in_progress' || whatsappLaneStatus === 'in_progress'
                ? 'in_progress'
                : 'pending'
          : 'in_progress',
      channel: 'Messaging',
    },
    {
      id: 'thank-you',
      title: 'Thank-you and aftercare',
      description: result
        ? 'Thank-you state, portal access, and next-step guidance are ready immediately.'
        : 'Thank-you and aftercare content unlock after booking submission.',
      status: result ? 'completed' : 'pending',
      channel: 'Aftercare',
    },
  ] satisfies EnterpriseJourneyStep[];
}

function getBookingPortalUrl(result: BookingAssistantSessionResponse) {
  return (
    result.portal_url?.trim() ||
    `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(result.booking_reference)}`
  );
}

function buildBookingFlowSteps(params: {
  currentQuery: string;
  selectedService: ServiceCatalogItem | null;
  result: BookingAssistantSessionResponse | null;
  submitLoading: boolean;
}): BookingFlowStep[] {
  const trimmedQuery = params.currentQuery.trim();

  return [
    {
      id: 'search',
      label: 'Search intent',
      detail: trimmedQuery || 'Start with a natural-language search to build the shortlist.',
      state: trimmedQuery ? 'complete' : 'active',
    },
    {
      id: 'selected',
      label: 'Chosen match',
      detail: params.selectedService
        ? `${params.selectedService.name}${params.selectedService.location ? ` • ${params.selectedService.location}` : ''}`
        : 'Choose one ranked option from the shortlist to continue.',
      state: params.selectedService ? 'complete' : trimmedQuery ? 'active' : 'pending',
    },
    {
      id: 'request',
      label: 'BookedAI handoff',
      detail: params.result
        ? `Booking ${params.result.booking_reference} is ready with portal, follow-up, and next actions.`
        : params.submitLoading
          ? 'Submitting your booking request and preparing the handoff.'
          : params.selectedService
            ? 'Confirm your details below and BookedAI will create the booking request.'
            : 'The handoff activates after you select a result and confirm the request.',
      state: params.result ? 'complete' : params.submitLoading || params.selectedService ? 'active' : 'pending',
    },
  ];
}

function buildFallbackCatalog(): BookingAssistantCatalogResponse {
  return {
    status: 'fallback',
    business_email: 'hello@bookedai.au',
    stripe_enabled: true,
    services: demoContent.results.map((item, index) => ({
      id: `fallback-${index + 1}`,
      name: item.name,
      category: item.category,
      summary: item.summary,
      duration_minutes: 45,
      amount_aud: Number.parseInt(item.priceLabel.replace(/[^\d]/g, ''), 10) || 60,
      image_url: item.imageUrl,
      map_snapshot_url: null,
      venue_name: item.name,
      location: item.locationLabel,
      map_url: null,
      booking_url: '#',
      tags: demoContent.quickFilters,
      featured: true,
      distance_km: null,
    })),
  };
}

function buildDefaultPreferredSlot() {
  const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  const hours = `${next.getHours()}`.padStart(2, '0');
  const minutes = `${Math.floor(next.getMinutes() / 15) * 15}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parsePreferredSlot(value: string) {
  if (!value.includes('T')) {
    return null;
  }

  const [requestedDate, requestedTime] = value.split('T');
  if (!requestedDate || !requestedTime) {
    return null;
  }

  return { requestedDate, requestedTime };
}

function buildAuthoritativeBookingIntentResult(params: {
  authoritativeResult: Awaited<ReturnType<typeof createPublicBookingAssistantLeadAndBookingIntent>>;
  selectedService: ServiceCatalogItem;
  requestedDate: string;
  requestedTime: string;
  customerEmail: string;
  nextStep: string | null;
}): BookingAssistantSessionResponse {
  const { authoritativeResult, selectedService, requestedDate, requestedTime, customerEmail, nextStep } = params;
  const bookingReference =
    authoritativeResult.bookingReference?.trim() || authoritativeResult.bookingIntentId;
  const amountLabel =
    typeof selectedService.amount_aud === 'number' && Number.isFinite(selectedService.amount_aud)
      ? `A$${selectedService.amount_aud}`
      : 'TBC';
  const detailLine = nextStep?.trim() || authoritativeResult.warnings[0] || 'We will confirm the final slot with the provider.';

  return {
    status: 'ok',
    booking_reference: bookingReference,
    portal_url: `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(bookingReference)}`,
    service: selectedService,
    amount_aud: selectedService.amount_aud,
    amount_label: amountLabel,
    requested_date: requestedDate,
    requested_time: requestedTime,
    timezone: 'Australia/Sydney',
    payment_status: 'payment_follow_up_required',
    payment_url: '',
    qr_code_url: '',
    email_status: customerEmail.trim() ? 'sent' : 'pending_manual_followup',
    meeting_status: 'configuration_required',
    meeting_join_url: null,
    meeting_event_url: null,
    calendar_add_url: null,
    confirmation_message: `Booking request captured in v1. ${detailLine}`,
    contact_email: customerEmail.trim() || 'follow-up required',
    workflow_status: authoritativeResult.trust.recommended_booking_path ?? 'request_callback',
    crm_sync: authoritativeResult.crmSync ?? null,
  };
}

function validateBookingForm(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredSlot: string;
}) {
  const trimmedName = params.customerName.trim();
  const trimmedEmail = params.customerEmail.trim();
  const trimmedPhone = params.customerPhone.trim();

  if (trimmedName.length < 2) {
    return 'Enter a customer name before continuing.';
  }

  if (!trimmedEmail && !trimmedPhone) {
    return 'Enter an email address or phone number.';
  }

  if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return 'Enter a valid email address.';
  }

  if (trimmedPhone) {
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return 'Enter a valid phone number with at least 8 digits.';
    }
  }

  if (!parsePreferredSlot(params.preferredSlot)) {
    return 'Choose a valid preferred booking time.';
  }

  return '';
}

function dedupeServices(services: ServiceCatalogItem[]) {
  const seen = new Set<string>();
  return services.filter((service) => {
    if (!service.id || seen.has(service.id)) {
      return false;
    }
    seen.add(service.id);
    return true;
  });
}

function toServiceCatalogItem(candidate: MatchCandidate): ServiceCatalogItem {
  return {
    id: candidate.candidateId,
    name: candidate.serviceName,
    category: candidate.category ?? 'Service',
    summary: candidate.summary ?? candidate.explanation ?? '',
    duration_minutes: candidate.durationMinutes ?? 30,
    amount_aud: candidate.amountAud ?? 0,
    image_url: candidate.imageUrl ?? null,
    map_snapshot_url: null,
    venue_name: candidate.venueName ?? candidate.providerName ?? null,
    location: candidate.location ?? null,
    map_url: candidate.mapUrl ?? null,
    booking_url: candidate.bookingUrl ?? null,
    contact_phone: candidate.contactPhone ?? null,
    source_url: candidate.sourceUrl ?? null,
    tags: candidate.tags ?? [],
    featured: candidate.featured ?? false,
    distance_km: candidate.distanceKm ?? null,
    source_type: candidate.sourceType ?? null,
    source_label: candidate.sourceLabel ?? null,
    why_this_matches: candidate.whyThisMatches ?? null,
    price_posture: candidate.pricePosture ?? null,
    booking_path_type: candidate.bookingPathType ?? null,
    next_step: candidate.nextStep ?? null,
    availability_state: candidate.availabilityState ?? null,
    booking_confidence: candidate.bookingConfidence ?? null,
    trust_signal: candidate.trustSignal ?? null,
  };
}

function normalizeSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .toLowerCase();
}

function isOnlineFriendlyService(service: ServiceCatalogItem, query: string) {
  const serviceText = normalizeSearchText([
    service.name,
    service.category,
    service.summary,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);
  const queryText = query.trim().toLowerCase();
  const onlineKeywords = ['online', 'virtual', 'remote', 'telehealth', 'video', 'zoom', 'phone consult'];
  const queryPrefersOnline = onlineKeywords.some((keyword) => queryText.includes(keyword));
  const serviceSupportsOnline =
    onlineKeywords.some((keyword) => serviceText.includes(keyword)) ||
    (service.booking_url ? !service.location || service.location.toLowerCase().includes('online') : false);

  return queryPrefersOnline || serviceSupportsOnline ? serviceSupportsOnline : false;
}

function getLocationPriorityBucket(
  service: ServiceCatalogItem,
  locality: string | null,
  query: string,
) {
  const locationText = normalizeSearchText([service.location, service.venue_name, ...service.tags]);
  const localityMatch = locality ? locationText.includes(locality.trim().toLowerCase()) : false;
  const onlineFriendly = isOnlineFriendlyService(service, query);
  const hasExplicitLocation = Boolean(service.location?.trim() || service.venue_name?.trim());

  if (localityMatch) {
    return 0;
  }
  if (onlineFriendly) {
    return 1;
  }
  if (!locality && typeof service.distance_km === 'number') {
    return 2;
  }
  if (!hasExplicitLocation) {
    return 3;
  }
  return 4;
}

function resolvePriorityIntentTerms(query: string, intentTermsOverride?: string[] | null) {
  if (intentTermsOverride && intentTermsOverride.length > 0) {
    return Array.from(new Set(intentTermsOverride.map((term) => term.trim().toLowerCase()).filter(Boolean)));
  }

  return extractQueryIntentTerms(query);
}

function computeIntentPriorityScore(
  service: ServiceCatalogItem,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return 0;
  }

  const nameText = normalizeSearchText([service.name]);
  const summaryText = normalizeSearchText([service.summary]);
  const metadataText = normalizeSearchText([
    service.category,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);

  let score = 0;
  for (const term of intentTerms) {
    if (nameText.includes(term)) {
      score += 7;
      continue;
    }
    if (metadataText.includes(term)) {
      score += 4;
      continue;
    }
    if (summaryText.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function prioritizeSearchResults(
  services: ServiceCatalogItem[],
  locality: string | null,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  return [...services]
    .map((service, index) => ({
      service,
      index,
      intentScore: computeIntentPriorityScore(service, query, intentTermsOverride),
      bucket: getLocationPriorityBucket(service, locality, query),
      distance: typeof service.distance_km === 'number' ? service.distance_km : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
      if (left.intentScore !== right.intentScore) {
        return right.intentScore - left.intentScore;
      }
      if (left.bucket !== right.bucket) {
        return left.bucket - right.bucket;
      }
      if (left.service.featured !== right.service.featured) {
        return left.service.featured ? -1 : 1;
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.service);
}

function uniqueCandidateServices(
  rankedCandidates: MatchCandidate[],
  legacyMatches: ServiceCatalogItem[],
  _catalog: BookingAssistantCatalogResponse | null,
) {
  const v1Matches = rankedCandidates.map((candidate) => toServiceCatalogItem(candidate));
  const merged = [...v1Matches, ...legacyMatches];
  const normalized = merged.map<ServiceCatalogItem>((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    summary: item.summary,
    duration_minutes: item.duration_minutes,
    amount_aud: item.amount_aud,
    image_url: item.image_url,
    map_snapshot_url: item.map_snapshot_url,
    venue_name: item.venue_name,
    location: item.location,
    map_url: item.map_url,
    booking_url: item.booking_url,
    tags: item.tags,
    featured: item.featured,
    distance_km: item.distance_km ?? null,
    source_type: item.source_type ?? null,
    source_label: item.source_label ?? null,
    why_this_matches: item.why_this_matches ?? null,
    price_posture: item.price_posture ?? null,
    booking_path_type: item.booking_path_type ?? null,
    next_step: item.next_step ?? null,
    availability_state: item.availability_state ?? null,
    booking_confidence: item.booking_confidence ?? null,
    trust_signal: item.trust_signal ?? null,
  }));

  if (normalized.length > 0) {
    return dedupeServices(normalized);
  }

  return [];
}

function extractQueryIntentTerms(query: string) {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'around',
    'at',
    'book',
    'booking',
    'class',
    'classes',
    'find',
    'for',
    'get',
    'i',
    'in',
    'is',
    'looking',
    'lesson',
    'lessons',
    'me',
    'my',
    'near',
    'need',
    'of',
    'on',
    'option',
    'options',
    'please',
    'service',
    'services',
    'session',
    'sessions',
    'the',
    'to',
    'training',
    'tutor',
    'want',
    'with',
  ]);
  const locationWords = new Set([
    'sydney',
    'melbourne',
    'brisbane',
    'perth',
    'adelaide',
    'canberra',
    'wollongong',
    'parramatta',
    'nsw',
    'vic',
    'qld',
    'cbd',
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !stopWords.has(term) && !locationWords.has(term)),
    ),
  );
}

function filterResultsByIntentTerms(
  services: ServiceCatalogItem[],
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return services;
  }

  const strongMatches = services.filter((service) => {
    const primaryServiceText = normalizeSearchText([
      service.name,
      service.category,
      service.location,
      service.venue_name,
      ...service.tags,
    ]);
    return intentTerms.some((term) => primaryServiceText.includes(term));
  });
  if (strongMatches.length > 0) {
    return strongMatches;
  }

  const filtered = services.filter((service) => {
    const summaryText = normalizeSearchText([service.summary]);
    return intentTerms.some((term) => summaryText.includes(term));
  });

  return filtered.length > 0 ? filtered : services;
}

function orderResultsByRecommendationIds(
  services: ServiceCatalogItem[],
  recommendedCandidateIds: string[],
) {
  if (!recommendedCandidateIds.length) {
    return services;
  }

  const byId = new Map(services.map((service) => [service.id, service]));
  const ordered = recommendedCandidateIds
    .map((candidateId) => byId.get(candidateId) ?? null)
    .filter((service): service is ServiceCatalogItem => Boolean(service));

  if (!ordered.length) {
    return services;
  }

  const orderedIds = new Set(ordered.map((service) => service.id));
  const remainder = services.filter((service) => !orderedIds.has(service.id));
  return [...ordered, ...remainder];
}

function buildLiveReadResultsSummary(params: {
  rankedCount: number;
  warnings: string[];
  normalizedQuery: string | null;
  inferredLocation: string | null;
  inferredCategory: string | null;
}) {
  const normalizedQuery = params.normalizedQuery?.trim() || null;
  const inferredLocation = params.inferredLocation?.trim() || null;
  const normalizedQueryAlreadyCarriesLocation =
    Boolean(normalizedQuery && inferredLocation) &&
    normalizeSearchText([normalizedQuery]).includes(normalizeSearchText([inferredLocation]));
  const enrichedNormalizedQuery =
    normalizedQuery && inferredLocation && !normalizedQueryAlreadyCarriesLocation
      ? `${normalizedQuery} near ${inferredLocation.toLowerCase()}`
      : normalizedQuery;
  const descriptor =
    enrichedNormalizedQuery ||
    [params.inferredCategory, inferredLocation].filter(Boolean).join(' in ') ||
    null;

  if (!params.rankedCount) {
    const warningLine =
      params.warnings[0] ?? 'I could not find a strong relevant match for that request.';
    return descriptor
      ? `${warningLine} I stayed grounded to ${descriptor}, so I am not showing unrelated stored results.`
      : `${warningLine} I am not showing unrelated stored results.`;
  }

  const shownCount = Math.min(params.rankedCount, 3);
  if (descriptor) {
    return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'} for ${descriptor}. Here are the top ${shownCount} to compare first.`;
  }

  return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'}. Here are the top ${shownCount} to compare first.`;
}

function hasLocationPermissionWarning(warnings: string[]) {
  return warnings.some((warning) =>
    /location access is needed to (find services near you|rank nearby matches)/i.test(warning),
  );
}

function hasNearMeIntent(query: string) {
  return /\b(near me|nearby|close to me|around me|in my area)\b/i.test(query);
}

export function HomepageSearchExperience({
  content,
  sourcePath,
  initialQuery,
  initialQueryRequestId,
}: HomepageSearchExperienceProps) {
  const isLiveReadMode = isPublicBookingAssistantV1LiveReadEnabled();
  const [catalog, setCatalog] = useState<BookingAssistantCatalogResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [currentQuery, setCurrentQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<ServiceCatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [previewService, setPreviewService] = useState<ServiceCatalogItem | null>(null);
  const [assistantSummary, setAssistantSummary] = useState('');
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geoHint, setGeoHint] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredSlot, setPreferredSlot] = useState(buildDefaultPreferredSlot());
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<BookingAssistantSessionResponse | null>(null);
  const [bookingComposerOpen, setBookingComposerOpen] = useState(false);
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [geoContext, setGeoContext] = useState<UserGeoContext | null>(null);
  const [liveReadBookingSummary, setLiveReadBookingSummary] = useState<LiveReadBookingSummary | null>(null);
  const [lastHandledRequestId, setLastHandledRequestId] = useState(0);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const bookingFormRef = useRef<HTMLDivElement | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionBaseQueryRef = useRef('');
  const bookingAssistantV1SessionIdRef = useRef<string | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      if (shouldUseLocalStaticPublicData()) {
        setCatalog(buildFallbackCatalog());
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load service catalog.');
        }

        const payload = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(payload);
      } catch {
        if (!controller.signal.aborted) {
          setCatalog(buildFallbackCatalog());
        }
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialQuery?.trim()) {
      return;
    }

    setSearchQuery(initialQuery.trim());
  }, [initialQuery, initialQueryRequestId]);

  useEffect(() => {
    if (!currentQuery && !result) {
      setComposerCollapsed(false);
    }
  }, [currentQuery, result]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const speechRecognition =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    setVoiceSupported(Boolean(speechRecognition));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      setIsBottomBarVisible(true);
      return;
    }

    lastScrollYRef.current = window.scrollY;
    setIsBottomBarVisible(true);

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollYRef.current;

      if (nextScrollY <= 24 || delta < -8) {
        setIsBottomBarVisible(true);
      } else if (delta > 12 && nextScrollY > 140) {
        setIsBottomBarVisible(false);
      }

      lastScrollYRef.current = nextScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport && (searchLoading || voiceListening || !composerCollapsed)) {
      setIsBottomBarVisible(true);
    }
  }, [composerCollapsed, isMobileViewport, searchLoading, voiceListening]);

  useEffect(() => {
    if (!previewService || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewService(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewService]);

  const selectedService = useMemo(
    () => results.find((service) => service.id === selectedServiceId) ?? null,
    [results, selectedServiceId],
  );

  async function requestGeoContext() {
    if (geoContext) {
      return geoContext;
    }
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    return await new Promise<UserGeoContext | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextContext = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locality: null,
          };
          setGeoContext(nextContext);
          resolve(nextContext);
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 10 * 60 * 1000,
        },
      );
    });
  }

  async function requestLegacySearch(query: string, nextGeoContext?: UserGeoContext | null) {
    const response = await fetch(`${getApiBaseUrl()}/booking-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        conversation: [{ role: 'user', content: query }],
        user_latitude: nextGeoContext?.latitude ?? geoContext?.latitude ?? null,
        user_longitude: nextGeoContext?.longitude ?? geoContext?.longitude ?? null,
        user_locality: nextGeoContext?.locality ?? geoContext?.locality ?? null,
      }),
    });

    const rawResponseText = await response.text();
    let payload: (BookingAssistantChatResponse & { detail?: string }) | null = null;
    if (rawResponseText) {
      try {
        payload = JSON.parse(rawResponseText) as BookingAssistantChatResponse & { detail?: string };
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      throw new Error(payload?.detail || 'Unable to search services right now.');
    }

    if (!payload) {
      throw new Error('Unable to search services right now.');
    }

    return payload;
  }

  async function requestLegacyBookingSession(params: {
    serviceId: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    requestedDate: string;
    requestedTime: string;
    notes: string | null;
  }) {
    const response = await fetch(`${getApiBaseUrl()}/booking-assistant/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: params.serviceId,
        customer_name: params.customerName.trim(),
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        requested_date: params.requestedDate,
        requested_time: params.requestedTime,
        timezone: 'Australia/Sydney',
        notes: params.notes,
      }),
    });

    const rawResponseText = await response.text();
    let payload: (BookingAssistantSessionResponse & { detail?: string }) | null = null;
    if (rawResponseText) {
      try {
        payload = JSON.parse(rawResponseText) as BookingAssistantSessionResponse & { detail?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(payload?.detail || 'Unable to create booking session right now.');
    }

    if (!payload) {
      throw new Error('Unable to create booking session right now.');
    }

    return payload;
  }

  async function runPostBookingAutomation(params: {
    bookingIntentId: string;
    bookingReference: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    selectedService: ServiceCatalogItem;
    requestedDate: string;
    requestedTime: string;
    notes: string | null;
    paymentAllowedBeforeConfirmation: boolean;
    bookingPath: string | null;
    paymentLink?: string | null;
    portalUrl?: string | null;
  }) {
    const actorContext = buildV1ActorContext();
    const slotLabel = `${params.requestedDate} ${params.requestedTime} Australia/Sydney`;
    const paymentOption = derivePaymentOptionForAutomation({
      paymentAllowedBeforeConfirmation: params.paymentAllowedBeforeConfirmation,
      bookingPath: params.bookingPath,
    });
    const communicationVariables = {
      customer_name: params.customerName.trim(),
      service_name: params.selectedService.name,
      slot_label: slotLabel,
      booking_reference: params.bookingReference,
      business_name: params.selectedService.venue_name ?? 'BookedAI',
      venue_name: [params.selectedService.venue_name, params.selectedService.location].filter(Boolean).join(' • '),
      support_email: 'info@bookedai.au',
      payment_link: params.paymentLink?.trim() || '',
      manage_link: params.portalUrl?.trim() || '',
      timezone: 'Australia/Sydney',
      additional_note: params.notes?.trim() || '',
    };

    const automation: NonNullable<BookingAssistantSessionResponse['automation']> = {};

    try {
      const paymentIntentResponse = await apiV1.createPaymentIntent({
        booking_intent_id: params.bookingIntentId,
        selected_payment_option: paymentOption,
        actor_context: actorContext,
      });

      if ('data' in paymentIntentResponse) {
        automation.paymentIntent = {
          status: paymentIntentResponse.data.payment_status,
          paymentIntentId: paymentIntentResponse.data.payment_intent_id ?? null,
          warnings: paymentIntentResponse.data.warnings ?? [],
          checkoutUrl: paymentIntentResponse.data.checkout_url ?? null,
        };
      }
    } catch (error) {
      automation.paymentIntent = {
        status: 'error',
        paymentIntentId: null,
        warnings: [error instanceof Error ? error.message : 'Payment intent automation failed.'],
        checkoutUrl: null,
      };
    }

    if (params.customerEmail?.trim()) {
      try {
        const emailResponse = await apiV1.sendLifecycleEmail({
          template_key: 'bookedai_booking_confirmation',
          to: [params.customerEmail.trim().toLowerCase()],
          subject: null,
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            source_page: sourcePath,
          },
          actor_context: actorContext,
        });

        if ('data' in emailResponse) {
          automation.lifecycleEmail = {
            status: emailResponse.data.delivery_status,
            messageId: emailResponse.data.message_id ?? null,
            warnings: emailResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.lifecycleEmail = {
          status: 'error',
          messageId: null,
          warnings: [error instanceof Error ? error.message : 'Lifecycle email automation failed.'],
        };
      }
    }

    if (params.customerPhone?.trim()) {
      const phone = params.customerPhone.trim();

      try {
        const smsResponse = await apiV1.sendSmsMessage({
          to: phone,
          template_key: 'bookedai_booking_confirmation',
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            channel: 'sms',
          },
          actor_context: actorContext,
        });

        if ('data' in smsResponse) {
          automation.sms = {
            status: smsResponse.data.delivery_status,
            messageId: smsResponse.data.message_id ?? null,
            provider: smsResponse.data.provider ?? null,
            warnings: smsResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.sms = {
          status: 'error',
          messageId: null,
          provider: null,
          warnings: [error instanceof Error ? error.message : 'SMS automation failed.'],
        };
      }

      try {
        const whatsappResponse = await apiV1.sendWhatsAppMessage({
          to: phone,
          template_key: 'bookedai_booking_confirmation',
          variables: communicationVariables,
          context: {
            booking_intent_id: params.bookingIntentId,
            booking_reference: params.bookingReference,
            channel: 'whatsapp',
          },
          actor_context: actorContext,
        });

        if ('data' in whatsappResponse) {
          automation.whatsapp = {
            status: whatsappResponse.data.delivery_status,
            messageId: whatsappResponse.data.message_id ?? null,
            provider: whatsappResponse.data.provider ?? null,
            warnings: whatsappResponse.data.warnings ?? [],
          };
        }
      } catch (error) {
        automation.whatsapp = {
          status: 'error',
          messageId: null,
          provider: null,
          warnings: [error instanceof Error ? error.message : 'WhatsApp automation failed.'],
        };
      }
    }

    return automation;
  }

  async function runSearch(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setCurrentQuery(trimmedQuery);
    setSearchLoading(true);
    setSearchError('');
    setAssistantSummary('');
    setSearchWarnings([]);
    setGeoHint('');
    setLiveReadBookingSummary(null);
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(false);
    setComposerCollapsed(false);

    try {
      let activeGeoContext = geoContext;
      let liveRead = await getPublicBookingAssistantLiveReadRecommendation({
        query: trimmedQuery,
        sourcePage: sourcePath,
        locationHint: activeGeoContext?.locality ?? null,
        serviceCategory: null,
        selectedServiceId: selectedServiceId || null,
        userLocation: activeGeoContext
          ? { latitude: activeGeoContext.latitude, longitude: activeGeoContext.longitude }
          : null,
      });
      if (
        liveRead.usedLiveRead &&
        !activeGeoContext &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery))
      ) {
        const requestedGeo = await requestGeoContext();
        if (requestedGeo) {
          activeGeoContext = requestedGeo;
          liveRead = await getPublicBookingAssistantLiveReadRecommendation({
            query: trimmedQuery,
            sourcePage: sourcePath,
            locationHint: requestedGeo.locality ?? null,
            serviceCategory: null,
            selectedServiceId: selectedServiceId || null,
            userLocation: {
              latitude: requestedGeo.latitude,
              longitude: requestedGeo.longitude,
            },
          });
        } else {
          setGeoHint(content.ui.geoHint);
        }
      }

      let legacyPayload: BookingAssistantChatResponse | null = null;
      if (!liveRead.usedLiveRead) {
        legacyPayload = await requestLegacySearch(trimmedQuery, activeGeoContext);
        if (legacyPayload.should_request_location && !activeGeoContext) {
          const requestedGeo = await requestGeoContext();
          if (requestedGeo) {
            legacyPayload = await requestLegacySearch(trimmedQuery, requestedGeo);
          } else {
            setGeoHint(content.ui.geoHint);
          }
        }
      }

      const isLiveReadAuthoritative = liveRead.usedLiveRead;
      const hasLiveReadSearchGrounding =
        isLiveReadAuthoritative &&
        (liveRead.rankedCandidates.length > 0 ||
          liveRead.candidateIds.length > 0 ||
          Boolean(liveRead.semanticAssistSummary) ||
          liveRead.warnings.length > 0);
      const mergedResults = isLiveReadAuthoritative
        ? uniqueCandidateServices(liveRead.rankedCandidates, [], catalog)
        : uniqueCandidateServices([], legacyPayload?.matched_services ?? [], catalog);
      const shouldHoldResultsForLocation =
        !activeGeoContext &&
        hasLiveReadSearchGrounding &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery));
      const recommendationOrderedResults = shouldHoldResultsForLocation
        ? []
        : orderResultsByRecommendationIds(
            mergedResults,
            liveRead.recommendedCandidateIds,
          );
      const priorityIntentTerms =
        liveRead.queryUnderstandingSummary?.coreIntentTerms?.length
          ? liveRead.queryUnderstandingSummary.coreIntentTerms
          : liveRead.queryUnderstandingSummary?.expandedIntentTerms ?? [];
      const intentFilteredResults = shouldHoldResultsForLocation
        ? []
        : filterResultsByIntentTerms(
            recommendationOrderedResults,
            trimmedQuery,
            priorityIntentTerms,
          );
      const prioritizedResults =
        liveRead.recommendedCandidateIds.length > 0
          ? intentFilteredResults
          : prioritizeSearchResults(
              intentFilteredResults,
              activeGeoContext?.locality ?? null,
              trimmedQuery,
              priorityIntentTerms,
            );

      const nextSuggestedId =
        prioritizedResults[0]?.id ??
        (hasLiveReadSearchGrounding
          ? liveRead.suggestedServiceId ?? ''
          : legacyPayload?.suggested_service_id ?? '');
      const nextAssistantSummary = hasLiveReadSearchGrounding
        ? buildLiveReadResultsSummary({
            rankedCount: prioritizedResults.length,
            warnings: liveRead.warnings,
            normalizedQuery:
              liveRead.queryUnderstandingSummary?.normalizedQuery ??
              liveRead.semanticAssistSummary?.normalizedQuery ??
              trimmedQuery.toLowerCase(),
            inferredLocation:
              liveRead.queryUnderstandingSummary?.inferredLocation ??
              liveRead.semanticAssistSummary?.inferredLocation ??
              null,
            inferredCategory: liveRead.semanticAssistSummary?.inferredCategory ?? null,
          })
        : legacyPayload?.reply ?? content.ui.noMatchBody;

      setResults(prioritizedResults);
      setSelectedServiceId(nextSuggestedId);
      setAssistantSummary(
        prioritizedResults.length > 0 && (activeGeoContext?.locality || prioritizedResults.some((item) => isOnlineFriendlyService(item, trimmedQuery)))
          ? `${nextAssistantSummary} Prioritising nearby services and online-ready options first.`
          : nextAssistantSummary,
      );
      setSearchWarnings([
        ...liveRead.warnings,
        ...(liveRead.bookingPathSummary?.warnings ?? []),
        ...(liveRead.trustSummary?.warnings ?? []),
      ]);
      setLiveReadBookingSummary(
        liveRead.usedLiveRead
          ? {
              serviceId: liveRead.suggestedServiceId,
              nextStep: liveRead.bookingPathSummary?.nextStep ?? null,
              paymentAllowedBeforeConfirmation: Boolean(
                liveRead.bookingPathSummary?.paymentAllowedBeforeConfirmation,
              ),
              bookingPath: liveRead.bookingPathSummary?.pathType ?? null,
            }
          : null,
      );
      if (
        !activeGeoContext &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery))
      ) {
        setGeoHint(content.ui.geoHint);
      }
      if (!prioritizedResults.length && !hasLiveReadSearchGrounding) {
        setAssistantSummary(content.ui.noMatchBody);
      }
      if (prioritizedResults.length > 0 || hasLiveReadSearchGrounding) {
        setComposerCollapsed(true);
      }

      window.setTimeout(() => {
        bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search services right now.');
      setResults([]);
      setSelectedServiceId('');
      setLiveReadBookingSummary(null);
      setComposerCollapsed(false);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (!catalog) {
      return;
    }
    if (!initialQuery?.trim()) {
      return;
    }
    if (initialQueryRequestId <= 0 || lastHandledRequestId === initialQueryRequestId) {
      return;
    }

    setLastHandledRequestId(initialQueryRequestId);
    void runSearch(initialQuery.trim());
  }, [catalog, initialQuery, initialQueryRequestId, lastHandledRequestId]);

  useEffect(() => {
    const anonymousSessionId =
      bookingAssistantV1SessionIdRef.current ?? createPublicBookingAssistantSessionId();
    bookingAssistantV1SessionIdRef.current = anonymousSessionId;

    void primePublicBookingAssistantSession({
      sourcePage: sourcePath,
      anonymousSessionId,
    });
  }, [sourcePath]);

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(searchQuery);
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) {
      setSubmitError('Select a result before continuing.');
      return;
    }

    const validationError = validateBookingForm({
      customerName,
      customerEmail,
      customerPhone,
      preferredSlot,
    });
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const slot = parsePreferredSlot(preferredSlot);
    if (!slot) {
      setSubmitError('Choose a valid preferred time.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');
    setResult(null);
    const normalizedCustomerEmail = customerEmail.trim() ? customerEmail.trim().toLowerCase() : null;
    const normalizedCustomerPhone = customerPhone.trim() || null;
    const normalizedNotes = notes.trim() || null;

    try {
      if (isLiveReadMode) {
        const authoritativeResult = await createPublicBookingAssistantLeadAndBookingIntent({
          sourcePage: sourcePath,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceCategory: selectedService.category,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          notes: normalizedNotes,
          requestedDate: slot.requestedDate,
          requestedTime: slot.requestedTime,
          timezone: 'Australia/Sydney',
        });

        const shouldHydrateRichBookingSession =
          liveReadBookingSummary?.serviceId === selectedService.id &&
          liveReadBookingSummary.paymentAllowedBeforeConfirmation;

        let bookingResult: BookingAssistantSessionResponse;
        if (shouldHydrateRichBookingSession) {
          const payload = await requestLegacyBookingSession({
            serviceId: selectedService.id,
            customerName,
            customerEmail: normalizedCustomerEmail,
            customerPhone: normalizedCustomerPhone,
            requestedDate: slot.requestedDate,
            requestedTime: slot.requestedTime,
            notes: normalizedNotes,
          });
          bookingResult = payload;
        } else {
          bookingResult = buildAuthoritativeBookingIntentResult({
            authoritativeResult,
            selectedService,
            requestedDate: slot.requestedDate,
            requestedTime: slot.requestedTime,
            customerEmail: normalizedCustomerEmail ?? '',
            nextStep:
              liveReadBookingSummary?.serviceId === selectedService.id
                ? liveReadBookingSummary.nextStep
                : selectedService.next_step ?? null,
          });
        }

        setResult({
          ...bookingResult,
          crm_sync: bookingResult.crm_sync ?? authoritativeResult.crmSync ?? null,
        });
        setComposerCollapsed(true);
        void runPostBookingAutomation({
          bookingIntentId: authoritativeResult.bookingIntentId,
          bookingReference: bookingResult.booking_reference,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          selectedService,
          requestedDate: slot.requestedDate,
          requestedTime: slot.requestedTime,
          notes: normalizedNotes,
          paymentAllowedBeforeConfirmation:
            shouldHydrateRichBookingSession ||
            Boolean(
              (liveReadBookingSummary?.serviceId === selectedService.id &&
                liveReadBookingSummary.paymentAllowedBeforeConfirmation) ||
                authoritativeResult.trust.payment_allowed_now,
            ),
          bookingPath:
            liveReadBookingSummary?.serviceId === selectedService.id
              ? liveReadBookingSummary.bookingPath
              : authoritativeResult.trust.recommended_booking_path ?? bookingResult.workflow_status,
          paymentLink: bookingResult.payment_url,
          portalUrl: getBookingPortalUrl(bookingResult),
        })
          .then((automation) => {
            setResult((currentResult) => {
              if (!currentResult || currentResult.booking_reference !== bookingResult.booking_reference) {
                return currentResult;
              }

              return {
                ...currentResult,
                automation,
              };
            });
          })
          .catch(() => {
            // Best-effort orchestration should never block the captured booking state.
          });
        return;
      }

      void shadowPublicBookingAssistantLeadAndBookingIntent({
        sourcePage: sourcePath,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        customerName,
        customerEmail: normalizedCustomerEmail,
        customerPhone: normalizedCustomerPhone,
        notes: normalizedNotes,
        requestedDate: slot.requestedDate,
        requestedTime: slot.requestedTime,
        timezone: 'Australia/Sydney',
      });

      const response = await fetch(`${getApiBaseUrl()}/booking-assistant/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName.trim(),
          customer_email: normalizedCustomerEmail,
          customer_phone: normalizedCustomerPhone,
          requested_date: slot.requestedDate,
          requested_time: slot.requestedTime,
          timezone: 'Australia/Sydney',
          notes: normalizedNotes,
        }),
      });

      const rawResponseText = await response.text();
      let payload: (BookingAssistantSessionResponse & { detail?: string }) | null = null;
      if (rawResponseText) {
        try {
          payload = JSON.parse(rawResponseText) as BookingAssistantSessionResponse & { detail?: string };
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        throw new Error(
          resolveApiErrorMessage(
            payload ?? rawResponseText,
            'Unable to create booking request.',
          ),
        );
      }

      if (!payload) {
        throw new Error('Booking request returned an empty response.');
      }

      setResult(payload);
      setComposerCollapsed(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create booking request.');
    } finally {
      setSubmitLoading(false);
    }
  }

  function openBookingSuccessContactForm() {
    if (typeof window === 'undefined') {
      return;
    }

    const attribution = buildPublicCtaAttribution({
      source_section: 'booking_assistant',
      source_cta: 'book_demo',
      source_detail: result?.service.id
        ? `homepage_booking_success_contact:${result.service.id}`
        : 'homepage_booking_success_contact',
      source_flow_mode: 'guided',
    });
    const target = new URL('/register-interest', window.location.origin);
    target.searchParams.set('source_section', attribution.source_section);
    target.searchParams.set('source_cta', attribution.source_cta);
    target.searchParams.set(
      'source_detail',
      attribution.source_detail ?? 'homepage_booking_success_contact',
    );
    target.searchParams.set('source_path', sourcePath);

    dispatchPublicCtaAttribution(attribution);
    window.location.href = `${target.pathname}${target.search}`;
  }

  const uniqueWarnings = Array.from(new Set(searchWarnings));
  const resultCountLabel =
    results.length === 1 ? '1 ranked option' : `${results.length} ranked options`;
  const hasActiveQuery = Boolean(currentQuery.trim());
  const bookingOutcomeSteps = result ? buildBookingOutcomeSteps(result) : [];
  const enterpriseJourneySteps = useMemo(
    () =>
      buildEnterpriseJourneySteps({
        result,
        selectedService,
        customerEmail,
        customerPhone,
      }),
    [customerEmail, customerPhone, result, selectedService],
  );
  const operationTimeline = useMemo(
    () => (result ? buildOperationTimeline(result) : []),
    [result],
  );
  const communicationPreviewCards = useMemo(
    () =>
      result
        ? buildCommunicationPreviewCards({
            result,
            customerName,
            customerEmail,
            customerPhone,
          })
        : [],
    [customerEmail, customerName, customerPhone, result],
  );
  const workspaceSummary =
    (hasActiveQuery ? assistantSummary : '') || content.ui.shortlistBody || content.ui.resultsEmptyBody;
  const selectedServiceMeta = selectedService
    ? [selectedService.category, selectedService.location].filter(Boolean).join(' • ')
    : content.ui.bookingPanelHelper;
  const selectedServiceFlowNote = selectedService
    ? selectedService.why_this_matches ||
      selectedService.next_step ||
      selectedService.summary ||
      'This is the active match carried forward from your shortlist into the BookedAI booking flow.'
    : 'Choose a ranked search result and BookedAI will carry that selection into the booking request.';
  const shortcutToneClasses = [
    'public-apple-shortcut-blue hover:bg-[#eef4ff]',
    'public-apple-shortcut-green hover:bg-[#eef9ee]',
    'public-apple-shortcut-amber hover:bg-[#fff3e6]',
    'public-apple-shortcut-purple hover:bg-[#f6f0ff]',
    'public-apple-shortcut-rose hover:bg-[#fff0f4]',
  ];
  const workspaceStatus = searchLoading
    ? {
        label: 'Receiving your enquiry',
        detail: currentQuery
          ? `Searching live signals for "${currentQuery}" and preparing the best-fit shortlist.`
          : 'Receiving the request and preparing live search.',
        tone: 'public-apple-toolbar-pill--accent',
      }
    : searchError
      ? {
          label: 'Search needs attention',
          detail: searchError,
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        }
      : result
        ? {
            label: 'Booking path ready',
            detail: `Booking reference ${result.booking_reference} is ready with follow-up and portal access.`,
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          }
        : hasActiveQuery
          ? {
              label: 'Shortlist ready',
              detail:
                results.length > 0
                  ? `${results.length} ranked option${results.length === 1 ? '' : 's'} ready above. Review the shortlist, then continue to booking.`
                  : 'No strong match yet. Refine the request and search again.',
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            }
          : {
              label: 'Ready to receive',
              detail: 'Type a natural-language enquiry below. Results will appear above in the BookedAI booking flow.',
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            };
  const mobileStatusLabel = searchLoading
    ? 'Searching'
    : result
      ? 'Booked'
      : 'Ready';
  const bookingFlowSteps = buildBookingFlowSteps({
    currentQuery,
    selectedService,
    result,
    submitLoading,
  });

  function focusBookingNameField() {
    window.setTimeout(() => {
      bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      customerNameInputRef.current?.focus();
      customerNameInputRef.current?.select();
    }, 120);
  }

  function commitServiceSelection(service: ServiceCatalogItem, options?: { focusNameField?: boolean }) {
    setSelectedServiceId(service.id);
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(true);
    if (!isDesktopViewport) {
      setComposerCollapsed(true);
    }
    if (options?.focusNameField) {
      focusBookingNameField();
      return;
    }
    window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleServiceSelect(service: ServiceCatalogItem) {
    setPreviewService(service);
  }

  function handlePreviewBook() {
    if (!previewService) {
      return;
    }

    commitServiceSelection(previewService, { focusNameField: true });
    setPreviewService(null);
  }

  function handleVoiceSearch() {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionCtor =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    if (!SpeechRecognitionCtor) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (voiceListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';
    recognitionBaseQueryRef.current = searchQuery.trim();
    setVoiceError('');
    setVoiceListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((resultItem) => resultItem[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      const nextQuery = [recognitionBaseQueryRef.current, transcript].filter(Boolean).join(' ').trim();
      setSearchQuery(nextQuery);
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Please allow microphone permission and try again.'
          : 'Voice input could not start. Please try again.',
      );
    };

    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div
      id="bookedai-search-assistant"
      ref={bookingPanelRef}
      className={`mx-auto max-w-[1280px] ${isMobileViewport ? 'pb-28' : ''}`}
    >
      <div className="public-search-results-shell grid gap-4 xl:items-start">
        <section className="public-apple-workspace-shell min-w-0 overflow-hidden rounded-[1.5rem]">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            {currentQuery ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="public-apple-toolbar-pill public-apple-toolbar-pill--accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {content.ui.resultsQueryLabel}: "{currentQuery}"
                </span>
                <span className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-medium">
                  {resultCountLabel}
                </span>
              </div>
            ) : null}

            {uniqueWarnings.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {uniqueWarnings.map((warning) => (
                  <span
                    key={warning}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700"
                  >
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}

            {geoHint ? (
              <div className="public-apple-workspace-panel-soft mb-3 rounded-[0.95rem] px-3 py-2.5 text-sm leading-6 text-[#31507b]">
                {geoHint}
              </div>
            ) : null}

            {hasActiveQuery && assistantSummary ? (
              <div className="public-apple-workspace-panel-soft mb-3 rounded-[1rem] px-3.5 py-2.5 text-sm leading-6 text-[#172033]/72">
                {assistantSummary}
              </div>
            ) : null}

            <div className="space-y-3">
              {searchLoading ? (
                <div className="rounded-[1.15rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.resultsLoadingTitle}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                    {currentQuery
                      ? `Searching for "${currentQuery}" while BookedAI looks for the most suitable place and booking path.`
                      : content.ui.resultsLoadingBody}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Checking nearby area', 'Opening live search', 'Preparing booking options'].map((label) => (
                      <div key={label} className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-medium text-[#6d28d9]">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {searchError ? (
                <div className="rounded-[1.35rem] border border-[#f2b8b5] bg-[#fce8e6] px-4 py-4 text-sm leading-6 text-[#b3261e]">
                  {searchError}
                </div>
              ) : null}

              {!searchLoading && !searchError ? (
                <PartnerMatchShortlist
                  items={results}
                  batchSize={3}
                  className="space-y-4"
                  listClassName="space-y-3"
                  buttonClassName="public-apple-workspace-panel-soft rounded-[1.15rem] px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white"
                  resetKey={`${currentQuery}-${results.length}`}
                  buttonLabel="See more results"
                  emptyState={
                    <div className="public-apple-empty-state rounded-[1.2rem] px-4 py-10 text-center sm:px-8">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                        {currentQuery ? content.ui.noMatchTitle : content.ui.resultsEmptyTitle}
                      </div>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#172033]/58">
                        {currentQuery ? content.ui.noMatchBody : content.ui.resultsEmptyBody}
                      </p>
                    </div>
                  }
                  renderMeta={({ visibleCount, totalCount }) => (
                    <div className="public-apple-workspace-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-[1rem] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                          {content.ui.shortlistLabel}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#111827]">
                          {currentQuery ? `"${currentQuery}"` : content.ui.resultsTitle}
                        </div>
                      </div>
                      <div className="public-apple-toolbar-pill px-2.5 py-1 text-[11px]">
                        {visibleCount} / {totalCount}
                      </div>
                    </div>
                  )}
                  renderItem={(service) => {
                    const isSelected =
                      service.id === selectedServiceId || service.id === previewService?.id;
                    const card = buildPartnerMatchCardModelFromServiceItem(service as BookingReadyServiceItem, {
                      explanation: service.summary,
                    });
                    const footer = buildPartnerMatchActionFooterModelFromServiceItem(
                      service as BookingReadyServiceItem,
                      { selected: isSelected },
                    );
                    return (
                      <div
                        key={service.id}
                        className={`rounded-[1.2rem] border p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] ${
                          isSelected
                            ? 'border-[rgba(139,92,246,0.16)] bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)]'
                            : 'border-[#e8edf3] bg-white'
                        }`}
                      >
                        <PartnerMatchCard
                          card={card}
                          tone={isSelected ? 'selected' : 'default'}
                          badge={service.featured ? 'Top match' : null}
                          trailingLabel={service.category}
                          onClick={() => handleServiceSelect(service)}
                        />
                        <PartnerMatchActionFooter model={footer} tone={isSelected ? 'selected' : 'default'} />
                      </div>
                    );
                  }}
                />
              ) : null}
            </div>
          </div>
        </section>

        <aside className="public-apple-workspace-shell public-booking-sidebar min-w-0 rounded-[1.5rem] p-3 sm:p-4 xl:sticky xl:self-start">
          <div className="public-apple-workspace-panel rounded-[1.15rem] px-3.5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-2 text-[1rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {selectedService ? selectedService.name : content.ui.bookingPanelEmpty}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#172033]/58">
                  {selectedService ? selectedServiceMeta : content.ui.resultsEmptyBody}
                </p>
              </div>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f5f7fb] text-[#6d28d9] ring-1 ring-slate-900/6 sm:inline-flex">
                <BrandButtonMark className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                BookedAI flow
              </div>
              <div className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-semibold">
                {result ? 'Handoff ready' : selectedService ? 'Booking in progress' : 'Follow the shortlist'}
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {bookingFlowSteps.map((step, index) => {
                const toneClasses =
                  step.state === 'complete'
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
                    : step.state === 'active'
                      ? 'border-[#d2e3fc] bg-[#eef4ff] text-[#1a73e8]'
                      : 'border-slate-200 bg-white text-slate-500';
                const dotClasses =
                  step.state === 'complete'
                    ? 'bg-emerald-500'
                    : step.state === 'active'
                      ? 'bg-[#1a73e8]'
                      : 'bg-slate-300';

                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex w-7 flex-col items-center pt-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${dotClasses}`} />
                      {index < bookingFlowSteps.length - 1 ? (
                        <span className="mt-1 h-9 w-px bg-slate-200" />
                      ) : null}
                    </div>
                    <div className={`min-w-0 flex-1 rounded-[0.95rem] border px-3 py-2.5 ${toneClasses}`}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">{step.label}</div>
                      <div className="mt-1 text-sm leading-5">{step.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                Enterprise journey
              </div>
              <div className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-semibold">
                Search to aftercare
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {enterpriseJourneySteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                        {step.channel}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#202124]">{step.title}</div>
                      <div className="mt-1 text-[12px] leading-5 text-[#5f6368]">{step.description}</div>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getEnterpriseStatusTone(step.status)}`}
                    >
                      {getEnterpriseStatusLabel(step.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedService ? (
            <div className="public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.bookingPanelSelected}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#202124]">{selectedService.name}</div>
                  <div className="mt-1 text-xs text-[#5f6368]">
                    {selectedService.category} • A${selectedService.amount_aud} • {selectedService.duration_minutes} min
                  </div>
                  {selectedService.location ? (
                    <div className="mt-1 text-xs text-[#5f6368]">{selectedService.location}</div>
                  ) : null}
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <CheckIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 rounded-[0.95rem] border border-[#dfe8f3] bg-[#f8fbff] px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                  Following your selected search match
                </div>
                <div className="mt-1 text-sm leading-6 text-[#31507b]">
                  {selectedServiceFlowNote}
                </div>
                {currentQuery ? (
                  <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368] ring-1 ring-slate-900/6">
                    Search: "{currentQuery}"
                  </div>
                ) : null}
              </div>

              {!result && !isDesktopViewport ? (
                <button
                  type="button"
                  onClick={() => setBookingComposerOpen((current) => !current)}
                  className="public-apple-primary-button mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold lg:hidden"
                >
                  <SparkIcon className="h-4 w-4" />
                  {bookingComposerOpen ? 'Hide booking form' : content.ui.bookingButton}
                </button>
              ) : null}
            </div>
          ) : null}

          {!result ? (
            <div
              ref={bookingFormRef}
              className={`public-apple-workspace-panel mt-3 rounded-[1.1rem] p-3.5 ${
                selectedService && !bookingComposerOpen && !isDesktopViewport ? 'hidden' : ''
              }`}
            >
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#111827]">
                  {selectedService ? content.ui.bookingButton : content.ui.bookingPanelEmpty}
                </div>
                {selectedService ? (
                  <p className="mt-2 text-sm leading-6 text-[#172033]/62">
                    Complete the details below for <span className="font-semibold text-[#111827]">{selectedService.name}</span>. BookedAI will keep this selected match as the source of truth for the booking request.
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.nameLabel}</span>
                  <input
                    ref={customerNameInputRef}
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.emailLabel}</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.phoneLabel}</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.dateTimeLabel}</span>
                  <input
                    type="datetime-local"
                    value={preferredSlot}
                    onChange={(event) => setPreferredSlot(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.notesLabel}</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={content.ui.notesPlaceholder}
                    className="public-apple-field w-full rounded-[0.95rem] px-4 py-3 text-sm outline-none transition"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-[0.95rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitLoading || !selectedService}
                  className="public-apple-primary-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.95rem] px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SparkIcon className="h-4 w-4" />
                  {submitLoading ? content.ui.bookingSubmitting : content.ui.bookingButton}
                </button>
              </form>
            </div>
          ) : (
            <div className="public-apple-workspace-panel mt-3 space-y-3 rounded-[1.1rem] px-3.5 py-3.5">
              <div className="rounded-[1.1rem] bg-[linear-gradient(180deg,#8B5CF6_0%,#4F8CFF_100%)] px-4 py-4 text-white shadow-[0_14px_34px_rgba(139,92,246,0.2)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92">
                      {content.ui.thankYouTitle}
                    </div>
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {content.ui.bookingSuccessTitle}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
                      {result.booking_reference}
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/86">
                      {content.ui.thankYouBody}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">{result.confirmation_message}</p>
                    <div className="mt-4 rounded-[1rem] bg-white/12 px-3 py-3 ring-1 ring-white/12">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                        Customer portal
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/82">
                        Scan the QR or open the portal to review booking details, edit, cancel, or save this booking.
                      </p>
                      <a
                        href={getBookingPortalUrl(result)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#d2e3fc]"
                      >
                        portal.bookedai.au
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                          <path d="M6 4h6v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m10.5 4.5-5 5" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M12 9.5V12H4V4h2.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  {result.qr_code_url ? (
                    <div className="rounded-[1.2rem] bg-white p-2 text-[#202124] shadow-sm">
                      <img
                        src={result.qr_code_url}
                        alt={`${content.ui.qrLabel} ${result.booking_reference}`}
                        className="h-24 w-24 rounded-[0.9rem] bg-white object-cover"
                      />
                      <div className="mt-2 rounded-[0.85rem] bg-[#f8f9fa] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                        Scan to open booking
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-[1.2rem] bg-white/12 text-white/90 ring-1 ring-white/10">
                      <QrIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Service</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.service.name}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Price</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.amount_label}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                    {content.ui.requestedSlotLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.requested_date}</div>
                  <div className="mt-0.5 text-xs text-[#5f6368]">{result.requested_time}</div>
                </div>
              </div>

              <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                  {content.ui.followUpLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#202124]">
                  {result.email_status === 'sent' ? 'Email sent' : 'Manual follow-up'}
                </div>
                <div className="mt-0.5 text-xs text-[#5f6368]">{result.contact_email}</div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {bookingOutcomeSteps.map((step) => (
                  <div key={step.label} className="public-apple-workspace-panel rounded-[0.95rem] px-3 py-3">
                    <div className="text-[11px] font-semibold text-[#202124]">{step.label}</div>
                    <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${step.tone}`}>
                      {step.value}
                    </div>
                  </div>
                ))}
              </div>

              {communicationPreviewCards.length > 0 ? (
                <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Communication drafts
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">
                    Customer-facing follow-up prepared from the booking result
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {communicationPreviewCards.map((card) => (
                      <div
                        key={card.id}
                        className={`rounded-[1rem] px-3 py-3 ${
                          card.tone === 'dark'
                            ? 'bg-slate-950 text-white'
                            : card.tone === 'success'
                              ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-100'
                              : 'bg-slate-50 text-slate-900 ring-1 ring-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                              {card.channel}
                            </div>
                            <div className="mt-1 text-sm font-semibold">{card.title}</div>
                          </div>
                          <div className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold">
                            {card.recipient}
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] leading-5 opacity-80">{card.summary}</div>
                        <pre className="mt-3 whitespace-pre-wrap break-words rounded-[0.9rem] bg-white/10 px-3 py-3 text-[11px] leading-5">
                          {card.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Delivery timeline
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-950">
                      Traceable operations after booking capture
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Ops trace
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {operationTimeline.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1rem] bg-[#fbfbfd] px-3 py-3 ring-1 ring-slate-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-slate-950">{item.title}</div>
                          <div className="mt-1 text-[11px] leading-5 text-slate-600">{item.detail}</div>
                          {item.reference ? (
                            <div className="mt-2 inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                              Ref: {item.reference}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getEnterpriseStatusTone(item.status)}`}
                        >
                          {getEnterpriseStatusLabel(item.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {result.payment_url ? (
                  <a
                    href={result.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={
                      result.payment_status === 'stripe_checkout_ready'
                        ? 'Open payment'
                        : 'Open payment follow-up'
                    }
                    className="public-apple-primary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <SparkIcon className="h-4 w-4" />
                    <span>
                      {result.payment_status === 'stripe_checkout_ready' ? 'Stripe' : 'Payment'}
                    </span>
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Open contact form"
                  onClick={openBookingSuccessContactForm}
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <MailIcon className="h-4 w-4" />
                  <span>Email</span>
                </button>
                {result.meeting_event_url || result.calendar_add_url ? (
                  <a
                    href={result.meeting_event_url ?? result.calendar_add_url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Add to calendar"
                    className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Calendar</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Return home"
                  onClick={() => {
                    window.history.replaceState({}, '', '/');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span>Home</span>
                </button>
              </div>

              <p className="text-xs leading-5 text-[#5f6368]">
                {result.meeting_status === 'scheduled'
                  ? 'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                  : result.calendar_add_url
                    ? 'A calendar action is ready immediately and is also included in the booking email. After payment, the booking stays logged for follow-up.'
                    : 'The booking is confirmed, email handoff is ready, and operations follow-up has already been prepared.'}
              </p>
            </div>
          )}
        </aside>
      </div>

      {previewService ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f172a]/52 p-3 sm:items-center sm:p-5">
          <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                  Selected from BookedAI search
                </div>
                <div className="mt-3 text-[1.2rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {previewService.name}
                </div>
                <p className="mt-1 text-sm text-[#5f6368]">
                  {[previewService.category, previewService.location].filter(Boolean).join(' • ') || 'Reviewed inside the BookedAI shortlist'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewService(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                  Tenant overview
                </div>
                <div className="mt-2 text-sm font-semibold text-[#111827]">
                  {previewService.venue_name || previewService.source_label || previewService.name}
                </div>
                <p className="mt-1 text-sm leading-6 text-[#5f6368]">
                  {previewService.location || 'Location details are confirmed during booking handoff.'}
                </p>
                {previewService.source_label ? (
                  <div className="mt-3 inline-flex rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                    Source: {previewService.source_label}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                  Service snapshot
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1a73e8]">
                    A${previewService.amount_aud}
                  </span>
                  <span className="rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                    {previewService.duration_minutes} min
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#5f6368]">
                  {previewService.summary || 'BookedAI matched this option as a relevant next step for the enquiry.'}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[1.15rem] border border-[#dfe8f3] bg-[#f8fbff] px-4 py-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a73e8]">
                Why BookedAI surfaced this
              </div>
              <p className="mt-2 text-sm leading-6 text-[#31507b]">
                {previewService.why_this_matches ||
                  previewService.next_step ||
                  previewService.summary ||
                  'This match stays inside the same booking flow. Review the overview, then continue straight into the booking form.'}
              </p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPreviewService(null)}
                className="public-apple-secondary-button inline-flex h-11 items-center justify-center rounded-[1rem] px-5 text-sm font-semibold transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePreviewBook}
                className="public-apple-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] px-5 text-sm font-semibold transition"
              >
                <SparkIcon className="h-4 w-4" />
                Book
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`z-20 mt-4 px-0 transition-all duration-300 ${
          isMobileViewport
            ? `fixed inset-x-0 bottom-0 mt-0 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${
                isBottomBarVisible
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-[calc(100%+1rem)] opacity-0'
              }`
            : 'sticky bottom-2 sm:bottom-3'
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="public-apple-workspace-shell rounded-[1.3rem] p-2.5 sm:p-3">
          <div className={`flex flex-col ${isMobileViewport ? 'gap-2' : 'gap-2.5'}`}>
            <div className={`flex items-center justify-between gap-2 ${isMobileViewport ? 'flex-nowrap' : 'flex-wrap'}`}>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  isMobileViewport ? 'max-w-[6.5rem] shrink-0' : 'w-fit'
                } ${workspaceStatus.tone}`}
                title={workspaceStatus.label}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${searchLoading ? 'animate-pulse bg-current' : 'bg-current/70'}`} />
                <span className="truncate">{isMobileViewport ? mobileStatusLabel : workspaceStatus.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setComposerCollapsed((current) => !current)}
                aria-label={composerCollapsed ? 'Expand search' : 'Minimise search'}
                title={composerCollapsed ? 'Expand search' : 'Minimise search'}
                className={`public-search-topbar-button inline-flex shrink-0 items-center rounded-full ${
                  isMobileViewport ? 'h-9 w-9 justify-center px-0 py-0' : 'px-3 py-1 text-[11px] font-medium'
                }`}
              >
                {isMobileViewport ? (
                  <ChevronUpDownIcon className="h-4 w-4" />
                ) : (
                  composerCollapsed ? 'Expand search' : 'Minimise search'
                )}
              </button>
            </div>

            {(!composerCollapsed || isMobileViewport) ? (
              <>
                {!isMobileViewport ? (
                  <p className="text-sm leading-6 text-[#172033]/62">{workspaceStatus.detail}</p>
                ) : null}

                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#172033]/34">
                      <SearchIcon className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => {
                        setIsBottomBarVisible(true);
                        if (!searchQuery.trim()) {
                          setComposerCollapsed(false);
                        }
                      }}
                      placeholder={content.ui.searchPlaceholder}
                      className="public-apple-field h-11 w-full rounded-[1rem] pl-12 pr-4 text-[15px] outline-none transition"
                    />
                  </div>

                  <div className={`flex items-center gap-2 ${isMobileViewport ? 'shrink-0' : 'lg:shrink-0'}`}>
                    <button
                      type="button"
                      aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      title={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      onClick={handleVoiceSearch}
                      disabled={!voiceSupported}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border transition ${
                        voiceSupported
                          ? voiceListening
                            ? 'border-[#d2e3fc] bg-[#e8f0fe] text-[#1a73e8]'
                            : 'border-slate-900/8 bg-white/78 text-[#6d28d9] hover:bg-white'
                          : 'cursor-not-allowed border-[#eceff3] bg-[#f5f6f7] text-[#9aa0a6]'
                      }`}
                    >
                      <MicIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      aria-label="Send search"
                      className={`public-apple-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isMobileViewport ? 'w-11 px-0' : 'flex-1 px-4 lg:min-w-[9rem]'
                      }`}
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      <span className={isMobileViewport ? 'sr-only' : ''}>{content.ui.searchButton}</span>
                    </button>
                  </div>
                </div>

                {!composerCollapsed ? (
                  <>
                    {isMobileViewport ? (
                      <p className="text-[12px] leading-5 text-[#172033]/62">{workspaceStatus.detail}</p>
                    ) : null}

                    <div className="-mx-1 overflow-x-auto pb-1">
                      <div className="flex min-w-max gap-1.5 px-1 sm:min-w-0 sm:flex-wrap">
                        {content.searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.label}
                            type="button"
                            onClick={() => {
                              setSearchQuery(suggestion.query);
                              void runSearch(suggestion.query);
                            }}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none transition ${
                              shortcutToneClasses[
                                content.searchSuggestions.findIndex((item) => item.label === suggestion.label) %
                                  shortcutToneClasses.length
                              ]
                            }`}
                            title={suggestion.query}
                          >
                            <SearchIcon className="h-3 w-3" />
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {voiceError ? (
                  <p className="text-xs text-rose-700">{voiceError}</p>
                ) : voiceListening ? (
                  <p className="text-xs text-[#6d28d9]">Listening for voice input...</p>
                ) : null}
              </>
            ) : (
              <div className="public-search-collapsed-trigger flex items-center gap-2 rounded-[1rem] px-3 py-2 transition hover:bg-[#f8fafc]">
                <span className="pointer-events-none shrink-0 text-[#172033]/34">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => {
                    setIsBottomBarVisible(true);
                    if (!searchQuery.trim()) {
                      setComposerCollapsed(false);
                    }
                  }}
                  placeholder={content.ui.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#172033]/78 outline-none placeholder:text-[#172033]/42"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  aria-label="Send search"
                  className="public-apple-primary-button inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[0.95rem] px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposerCollapsed(false)}
                  className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d28d9] transition hover:bg-white"
                >
                  Expand
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
