export type TenantActivity = {
  last_updated_at?: string | null;
  last_updated_by?: string | null;
  summary: string;
};

export type TenantTeamSnapshot = {
  summary: {
    total_members: number;
    active_members: number;
    invited_members: number;
    admin_members: number;
    finance_members: number;
  };
  role_counts?: Record<string, number>;
  status_counts?: Record<string, number>;
  activity?: TenantActivity;
  invite_activity?: Array<{
    id: string;
    summary: string;
    created_at?: string | null;
    recipient_email?: string | null;
    delivery_status?: string | null;
  }>;
};

export type TenantBillingSnapshot = {
  activity?: TenantActivity;
  subscription: {
    status: string;
    plan_code?: string | null;
    current_period_end?: string | null;
  };
  collection: {
    has_billing_account: boolean;
    has_active_subscription: boolean;
    can_charge: boolean;
    recommended_action: string;
    operator_note: string;
  };
  invoice_summary: {
    total_invoices: number;
    open_invoices: number;
    paid_invoices: number;
    currency: string;
  };
  gateway?: {
    provider: string;
    checkout_enabled: boolean;
    portal_enabled: boolean;
    customer_id_present: boolean;
    note: string;
  };
};

export type TenantIntegrationsSnapshot = {
  activity?: TenantActivity;
  providers: Array<{
    provider: string;
    status: string;
    sync_mode: string;
  }>;
  attention: Array<{
    source: string;
    issue_type: string;
    severity: string;
    item_count: number;
    recommended_action: string;
  }>;
  crm_retry_backlog: {
    summary: {
      retrying_records: number;
      manual_review_records: number;
      failed_records: number;
      operator_note: string;
    };
  };
};

export type TenantInvestigationTimelineItem = {
  id: string;
  occurredAt: string;
  source: "auth" | "billing" | "crm" | "integrations";
  title: string;
  description: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
};

function normalizeTimelineTimestamp(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date(0).toISOString();
}

export function buildTenantInvestigationTimeline(input: {
  team: TenantTeamSnapshot | null;
  billing: TenantBillingSnapshot | null;
  integrations: TenantIntegrationsSnapshot | null;
}) {
  const items: TenantInvestigationTimelineItem[] = [];

  if (input.team?.activity) {
    items.push({
      id: "team-activity",
      occurredAt: normalizeTimelineTimestamp(input.team.activity.last_updated_at),
      source: "auth",
      title: "Team posture updated",
      description: input.team.activity.summary,
      tone: "info",
    });
  }

  for (const invite of input.team?.invite_activity ?? []) {
    items.push({
      id: `invite-${invite.id}`,
      occurredAt: normalizeTimelineTimestamp(invite.created_at, input.team?.activity?.last_updated_at),
      source: "auth",
      title: invite.recipient_email ? `Invite for ${invite.recipient_email}` : "Team invite activity",
      description: invite.summary,
      tone: invite.delivery_status === "failed" ? "warning" : "default",
    });
  }

  if (input.billing?.activity) {
    items.push({
      id: "billing-activity",
      occurredAt: normalizeTimelineTimestamp(
        input.billing.activity.last_updated_at,
        input.billing.subscription.current_period_end,
      ),
      source: "billing",
      title: "Billing posture reviewed",
      description: input.billing.activity.summary,
      tone: input.billing.collection.can_charge ? "success" : "warning",
    });
  }

  if (input.billing) {
    items.push({
      id: "billing-summary",
      occurredAt: normalizeTimelineTimestamp(
        input.billing.activity?.last_updated_at,
        input.billing.subscription.current_period_end,
      ),
      source: "billing",
      title: `Subscription ${input.billing.subscription.status}`,
      description: input.billing.collection.recommended_action,
      tone: input.billing.collection.can_charge ? "success" : "warning",
    });
  }

  if (input.integrations?.activity) {
    items.push({
      id: "integrations-activity",
      occurredAt: normalizeTimelineTimestamp(input.integrations.activity.last_updated_at),
      source: "integrations",
      title: "Integration posture updated",
      description: input.integrations.activity.summary,
      tone: "info",
    });
  }

  if (input.integrations) {
    const backlog =
      input.integrations.crm_retry_backlog.summary.retrying_records +
      input.integrations.crm_retry_backlog.summary.manual_review_records +
      input.integrations.crm_retry_backlog.summary.failed_records;

    items.push({
      id: "crm-backlog",
      occurredAt: normalizeTimelineTimestamp(input.integrations.activity?.last_updated_at),
      source: "crm",
      title: backlog > 0 ? `${backlog} CRM records need attention` : "CRM retry backlog is clear",
      description: input.integrations.crm_retry_backlog.summary.operator_note,
      tone: backlog > 0 ? "warning" : "success",
    });
  }

  for (const signal of input.integrations?.attention ?? []) {
    items.push({
      id: `attention-${signal.source}-${signal.issue_type}`,
      occurredAt: normalizeTimelineTimestamp(input.integrations?.activity?.last_updated_at),
      source: signal.source === "crm_retry_backlog" ? "crm" : "integrations",
      title: `${signal.source.replaceAll("_", " ")} needs review`,
      description: `${signal.item_count} item(s) • ${signal.recommended_action}`,
      tone:
        signal.severity === "critical"
          ? "danger"
          : signal.severity === "warning"
            ? "warning"
            : "info",
    });
  }

  return items
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0, 12);
}
