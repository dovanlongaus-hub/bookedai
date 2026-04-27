import { AdminPortalSupportQueueItem, AdminTimelineEvent } from './types';

export type IntegrationLaneId =
  | 'crm'
  | 'messaging'
  | 'payments'
  | 'webhooks'
  | 'system';

export type IntegrationLaneSummary = {
  id: IntegrationLaneId;
  label: string;
  count: number;
  detail: string;
};

export type IntegrationAttentionItem = {
  id: string;
  lane: IntegrationLaneId;
  laneLabel: string;
  title: string;
  status: string;
  createdAt: string;
  detail: string;
};

export type BillingSupportSummary = {
  portalRequests: number;
  paymentAttention: number;
  unresolved: number;
  escalated: number;
  resolved: number;
};

export type AuditActivitySummary = {
  customerMessages: number;
  operatorActions: number;
  providerSignals: number;
  unresolvedQueueItems: number;
};

export type AuditChronologyItem = {
  id: string;
  kind: 'event' | 'queue';
  title: string;
  sourceLabel: string;
  status: string;
  createdAt: string;
  detail: string;
};

const integrationLaneLabels: Record<IntegrationLaneId, string> = {
  crm: 'CRM',
  messaging: 'Messaging',
  payments: 'Payments',
  webhooks: 'Webhooks',
  system: 'System',
};

function normalizeSignalParts(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

function statusNeedsAttention(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLowerCase();
  return (
    normalized.includes('failed') ||
    normalized.includes('error') ||
    normalized.includes('unauthorized') ||
    normalized.includes('retry') ||
    normalized.includes('manual_review') ||
    normalized.includes('requires_action') ||
    normalized.includes('follow_up') ||
    normalized.includes('hold')
  );
}

function classifyIntegrationLane(event: AdminTimelineEvent): IntegrationLaneId {
  const signal = normalizeSignalParts([
    event.source,
    event.event_type,
    event.workflow_status,
    typeof event.metadata?.provider === 'string' ? event.metadata.provider : null,
  ]);

  if (
    signal.includes('zoho') ||
    signal.includes('crm') ||
    signal.includes('deal') ||
    signal.includes('lead') ||
    signal.includes('contact')
  ) {
    return 'crm';
  }
  if (
    signal.includes('whatsapp') ||
    signal.includes('sms') ||
    signal.includes('email') ||
    signal.includes('twilio') ||
    signal.includes('sendgrid')
  ) {
    return 'messaging';
  }
  if (
    signal.includes('payment') ||
    signal.includes('invoice') ||
    signal.includes('checkout') ||
    signal.includes('stripe')
  ) {
    return 'payments';
  }
  if (
    signal.includes('webhook') ||
    signal.includes('callback') ||
    signal.includes('n8n') ||
    signal.includes('trigger')
  ) {
    return 'webhooks';
  }
  return 'system';
}

function deriveEventAttentionDetail(event: AdminTimelineEvent) {
  const metadata = event.metadata ?? {};
  const provider =
    typeof metadata.provider === 'string' && metadata.provider.trim()
      ? metadata.provider.trim()
      : null;
  const bookingReference =
    typeof metadata.booking_reference === 'string' && metadata.booking_reference.trim()
      ? metadata.booking_reference.trim()
      : null;
  const message = event.message_text?.trim() || event.ai_reply?.trim() || null;

  return [provider ? `Provider: ${provider}` : null, bookingReference, message]
    .filter(Boolean)
    .join(' • ');
}

function formatQueueDetail(item: AdminPortalSupportQueueItem) {
  return [
    item.booking_reference,
    item.customer_name,
    item.service_name,
    item.customer_note,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' • ');
}

export function buildIntegrationLaneSummaries(
  recentEvents: AdminTimelineEvent[],
  queueItems: AdminPortalSupportQueueItem[],
): IntegrationLaneSummary[] {
  const counts: Record<IntegrationLaneId, number> = {
    crm: 0,
    messaging: 0,
    payments: queueItems.filter((item) => item.source_kind === 'payment_attention').length,
    webhooks: 0,
    system: 0,
  };

  recentEvents.forEach((event) => {
    counts[classifyIntegrationLane(event)] += 1;
  });

  return [
    {
      id: 'crm',
      label: 'CRM sync',
      count: counts.crm,
      detail: 'Zoho-linked lead, contact, deal, and follow-up signals visible in this feed.',
    },
    {
      id: 'messaging',
      label: 'Messaging',
      count: counts.messaging,
      detail: 'Email, SMS, and WhatsApp touches remain visible before the team intervenes.',
    },
    {
      id: 'payments',
      label: 'Payment exceptions',
      count: counts.payments,
      detail: 'Payment follow-up stays grouped with provider posture instead of hiding in bookings.',
    },
    {
      id: 'webhooks',
      label: 'Webhooks and automations',
      count: counts.webhooks,
      detail: 'Callback, retry, and orchestration activity can be reviewed before a rerun.',
    },
  ];
}

export function buildIntegrationAttentionItems(
  recentEvents: AdminTimelineEvent[],
  queueItems: AdminPortalSupportQueueItem[],
): IntegrationAttentionItem[] {
  const eventItems = recentEvents
    .filter(
      (event) =>
        classifyIntegrationLane(event) !== 'system' || statusNeedsAttention(event.workflow_status),
    )
    .map((event) => {
      const lane = classifyIntegrationLane(event);
      return {
        id: `event:${event.id}`,
        lane,
        laneLabel: integrationLaneLabels[lane],
        title: event.event_type.replaceAll('_', ' '),
        status: event.workflow_status || 'observed',
        createdAt: event.created_at,
        detail:
          deriveEventAttentionDetail(event) ||
          `${integrationLaneLabels[lane]} activity surfaced in the recent event feed.`,
      };
    });

  const queueAttention = queueItems
    .filter(
      (item) =>
        item.source_kind === 'payment_attention' ||
        !item.resolution_status ||
        statusNeedsAttention(item.outbox_status),
    )
    .map((item): IntegrationAttentionItem => {
      const lane: IntegrationLaneId =
        item.source_kind === 'payment_attention' ? 'payments' : 'webhooks';
      return {
        id: `queue:${item.queue_item_id}`,
        lane,
        laneLabel: integrationLaneLabels[lane],
        title: item.request_type,
        status: item.resolution_status || item.outbox_status || 'open',
        createdAt: item.created_at,
        detail:
          formatQueueDetail(item) ||
          'Team follow-up remains open for this queue item.',
      };
    });

  return [...eventItems, ...queueAttention]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 6);
}

export function buildBillingSupportSummary(
  queueItems: AdminPortalSupportQueueItem[],
): BillingSupportSummary {
  return {
    portalRequests: queueItems.filter((item) => item.source_kind === 'portal_request').length,
    paymentAttention: queueItems.filter((item) => item.source_kind === 'payment_attention').length,
    unresolved: queueItems.filter((item) => !item.resolution_status).length,
    escalated: queueItems.filter((item) => item.resolution_status === 'escalated').length,
    resolved: queueItems.filter((item) => item.resolution_status === 'reviewed').length,
  };
}

export function buildAuditActivitySummary(
  recentEvents: AdminTimelineEvent[],
  queueItems: AdminPortalSupportQueueItem[],
): AuditActivitySummary {
  const customerMessages = recentEvents.filter((event) => {
    const signal = normalizeSignalParts([event.source, event.event_type]);
    return signal.includes('whatsapp') || signal.includes('sms') || signal.includes('email');
  }).length;

  const operatorActions = queueItems.filter(
    (item) => Boolean(item.resolution_status) || Boolean(item.action_request_id),
  ).length;

  const providerSignals = recentEvents.filter(
    (event) => classifyIntegrationLane(event) !== 'system',
  ).length;

  return {
    customerMessages,
    operatorActions,
    providerSignals,
    unresolvedQueueItems: queueItems.filter((item) => !item.resolution_status).length,
  };
}

export function buildAuditChronology(
  recentEvents: AdminTimelineEvent[],
  queueItems: AdminPortalSupportQueueItem[],
): AuditChronologyItem[] {
  const eventItems: AuditChronologyItem[] = recentEvents.map((event) => ({
    id: `event:${event.id}`,
    kind: 'event',
    title: event.event_type.replaceAll('_', ' '),
    sourceLabel: integrationLaneLabels[classifyIntegrationLane(event)],
    status: event.workflow_status || 'observed',
    createdAt: event.created_at,
    detail:
      deriveEventAttentionDetail(event) ||
      event.source ||
      'Recent activity is available for audit review.',
  }));

  const queueEntries: AuditChronologyItem[] = queueItems.map((item) => ({
    id: `queue:${item.queue_item_id}`,
    kind: 'queue',
    title: item.request_type,
    sourceLabel: item.source_kind === 'payment_attention' ? 'Payments' : 'Portal support',
    status: item.resolution_status || item.outbox_status || 'open',
    createdAt: item.created_at,
    detail:
      formatQueueDetail(item) ||
      'Queue context is available even before the team opens the booking detail panel.',
  }));

  return [...eventItems, ...queueEntries]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);
}
