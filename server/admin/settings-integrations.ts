import "server-only";

import { fetchBackendEnvelope, fetchBackendResponse } from "@/server/admin/backend-api";

type IntegrationProviderStatusItem = {
  provider: string;
  status: string;
  sync_mode: string;
  updated_at?: string | null;
  safe_config?: {
    provider?: string | null;
    enabled?: boolean | null;
    configured_fields?: string[] | null;
    label?: string | null;
    notes?: string[] | null;
  } | null;
};

type IntegrationAttentionTriageSnapshot = {
  status: string;
  triage_lanes: {
    immediate_action: Array<{
      source: string;
      issue_type: string;
      severity: string;
      item_count: number;
      latest_at?: string | null;
      recommended_action: string;
    }>;
    monitor: Array<{
      source: string;
      issue_type: string;
      severity: string;
      item_count: number;
      latest_at?: string | null;
      recommended_action: string;
    }>;
    stable: Array<{
      source: string;
      issue_type: string;
      severity: string;
      item_count: number;
      latest_at?: string | null;
      recommended_action: string;
    }>;
  };
  source_slices: Array<{
    source: string;
    open_items: number;
    highest_severity: string;
    manual_review_count: number;
    failed_count: number;
    pending_count: number;
    latest_at?: string | null;
    operator_note: string;
  }>;
  retry_posture: {
    queued_retries: number;
    manual_review_backlog: number;
    failed_records: number;
    latest_retry_at?: string | null;
    hold_recommended: boolean;
    operator_note: string;
  };
};

type IntegrationCrmRetryBacklogSnapshot = {
  status: string;
  checked_at?: string | null;
  summary: {
    retrying_records: number;
    manual_review_records: number;
    failed_records: number;
    hold_recommended: boolean;
    operator_note: string;
  };
  items: Array<{
    record_id: string | number;
    provider: string;
    entity_type: string;
    local_entity_id: string;
    external_entity_id?: string | null;
    sync_status: string;
    retry_count: number;
    latest_error_code?: string | null;
    latest_error_message?: string | null;
    latest_error_retryable?: boolean | null;
    latest_error_at?: string | null;
    last_synced_at?: string | null;
    created_at?: string | null;
    recommended_action: string;
  }>;
};

type IntegrationReconciliationDetailsSnapshot = {
  status: string;
  checked_at?: string | null;
  summary: {
    attention_required_sections: number;
    monitoring_sections: number;
    healthy_sections: number;
  };
  sections: Array<{
    area: string;
    status: string;
    total_count: number;
    pending_count: number;
    manual_review_count: number;
    failed_count: number;
    latest_at?: string | null;
    recommended_action: string;
  }>;
};

type IntegrationRuntimeActivityItem = {
  source: string;
  item_id: string;
  title: string;
  status: string;
  detail?: string | null;
  attempt_count?: number | null;
  occurred_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  external_ref?: string | null;
};

type IntegrationOutboxBacklogSnapshot = {
  status: string;
  checked_at?: string | null;
  summary: {
    failed_events: number;
    retrying_events: number;
    pending_events: number;
    hold_recommended: boolean;
    operator_note: string;
  };
  items: Array<{
    outbox_event_id: string | number;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    status: string;
    attempt_count: number;
    last_error?: string | null;
    last_error_at?: string | null;
    processed_at?: string | null;
    available_at?: string | null;
    idempotency_key?: string | null;
    created_at?: string | null;
    recommended_action: string;
  }>;
};

type ZohoConnectionSuccess = {
  provider: string;
  status: string;
  token_source?: string | null;
  api_base_url?: string | null;
  requested_module?: string | null;
  requested_module_found?: boolean | null;
  module_count?: number | null;
  field_count?: number | null;
  safe_config?: {
    provider?: string | null;
    enabled?: boolean | null;
    configured_fields?: string[] | null;
    label?: string | null;
    notes?: string[] | null;
  } | null;
};

type ProvidersEnvelope = {
  items: IntegrationProviderStatusItem[];
};

type IntegrationCredentialOverviewItem = {
  provider: string;
  label: string;
  status: string;
  enabled: boolean;
  configuredFieldCount: number;
  configuredFields: string[];
  notes: string[];
  recommendedAction: string;
};

function buildCredentialOverview(
  providers: IntegrationProviderStatusItem[],
  zohoConnection: {
    provider: string;
    status: string;
    safeConfig: {
      provider?: string | null;
      enabled?: boolean | null;
      configured_fields?: string[] | null;
      label?: string | null;
      notes?: string[] | null;
    } | null;
  },
) {
  const overview = providers.map((provider) => {
    const configuredFields = provider.safe_config?.configured_fields ?? [];
    const notes = provider.safe_config?.notes ?? [];
    const isEnabled = Boolean(provider.safe_config?.enabled);
    const normalizedStatus = String(provider.status || "unknown").toLowerCase();

    let recommendedAction = "Inspect provider posture before changing rollout state.";
    if (normalizedStatus === "connected" && isEnabled) {
      recommendedAction = "Provider looks configured enough for current posture; monitor runtime and reconciliation health.";
    } else if (normalizedStatus === "unconfigured" || configuredFields.length === 0) {
      recommendedAction = "Credential-safe summary shows missing configuration fields.";
    } else if (normalizedStatus === "paused") {
      recommendedAction = "Provider is intentionally paused; confirm this matches rollout intent before resuming.";
    }

    return {
      provider: provider.provider,
      label: provider.safe_config?.label || provider.provider,
      status: provider.status,
      enabled: isEnabled,
      configuredFieldCount: configuredFields.length,
      configuredFields,
      notes,
      recommendedAction,
    } satisfies IntegrationCredentialOverviewItem;
  });

  const hasZohoProvider = overview.some((item) => item.provider === "zoho_crm");
  if (!hasZohoProvider) {
    const configuredFields = zohoConnection.safeConfig?.configured_fields ?? [];
    overview.unshift({
      provider: zohoConnection.provider,
      label: zohoConnection.safeConfig?.label || "Zoho CRM connection",
      status: zohoConnection.status,
      enabled: Boolean(zohoConnection.safeConfig?.enabled),
      configuredFieldCount: configuredFields.length,
      configuredFields,
      notes: zohoConnection.safeConfig?.notes ?? [],
      recommendedAction:
        zohoConnection.status === "connected"
          ? "Zoho CRM credentials resolved successfully; keep monitoring sync and webhook lanes."
          : "Zoho CRM still needs credential or configuration work before operator trust is high.",
    });
  }

  return overview.sort((left, right) => left.provider.localeCompare(right.provider));
}

function buildFallbackSnapshot() {
  return {
    providers: [] as IntegrationProviderStatusItem[],
    attentionTriage: {
      status: "unavailable",
      triage_lanes: {
        immediate_action: [],
        monitor: [],
        stable: [],
      },
      source_slices: [],
      retry_posture: {
        queued_retries: 0,
        manual_review_backlog: 0,
        failed_records: 0,
        latest_retry_at: null,
        hold_recommended: false,
        operator_note: "Integration operator snapshot is currently unavailable from the backend runtime.",
      },
    } satisfies IntegrationAttentionTriageSnapshot,
    crmRetryBacklog: {
      status: "unavailable",
      checked_at: null,
      summary: {
        retrying_records: 0,
        manual_review_records: 0,
        failed_records: 0,
        hold_recommended: false,
        operator_note: "CRM retry backlog is not available from the backend runtime.",
      },
      items: [],
    } satisfies IntegrationCrmRetryBacklogSnapshot,
    reconciliation: {
      status: "unavailable",
      checked_at: null,
      summary: {
        attention_required_sections: 0,
        monitoring_sections: 0,
        healthy_sections: 0,
      },
      sections: [],
    } satisfies IntegrationReconciliationDetailsSnapshot,
    runtimeActivity: [] as IntegrationRuntimeActivityItem[],
    outboxBacklog: {
      status: "unavailable",
      checked_at: null,
      summary: {
        failed_events: 0,
        retrying_events: 0,
        pending_events: 0,
        hold_recommended: false,
        operator_note: "Outbox backlog is not available from the backend runtime.",
      },
      items: [],
    } satisfies IntegrationOutboxBacklogSnapshot,
    zohoConnection: {
      status: "unavailable",
      provider: "zoho_crm",
      message: "Zoho CRM connection posture is not available from the backend runtime.",
      requestedModule: "Leads",
      requestedModuleFound: false,
      moduleCount: 0,
      fieldCount: 0,
      tokenSource: null,
      apiBaseUrl: null,
      safeConfig: {
        provider: "zoho_crm",
        enabled: false,
        configured_fields: [],
        label: "Zoho CRM connection",
        notes: [],
      },
    },
    credentialOverview: [] as IntegrationCredentialOverviewItem[],
    writeAuthority: {
      providerPosture: "tenant_portal" as const,
      operatorNote:
        "Provider posture writes still belong to the tenant integrations workspace. Admin settings mirrors the runtime state here for investigation and release control without bypassing tenant membership rules.",
    },
  };
}

export async function getAdminSettingsIntegrationsSnapshot(tenantSlug: string) {
  const query = `?tenant_ref=${encodeURIComponent(tenantSlug)}`;
  const fallback = buildFallbackSnapshot();

  const [providersEnvelope, attentionTriage, crmRetryBacklog, reconciliation, runtimeActivity, outboxBacklog, zohoConnectionResponse] = await Promise.all([
    fetchBackendEnvelope<ProvidersEnvelope>(`/v1/integrations/providers/status${query}`),
    fetchBackendEnvelope<IntegrationAttentionTriageSnapshot>(`/v1/integrations/attention/triage${query}`),
    fetchBackendEnvelope<IntegrationCrmRetryBacklogSnapshot>(`/v1/integrations/crm-sync/backlog${query}`),
    fetchBackendEnvelope<IntegrationReconciliationDetailsSnapshot>(`/v1/integrations/reconciliation/details${query}`),
    fetchBackendEnvelope<IntegrationRuntimeActivityItem[]>(`/v1/integrations/runtime-activity${query}`),
    fetchBackendEnvelope<IntegrationOutboxBacklogSnapshot>(`/v1/integrations/outbox/backlog${query}`),
    fetchBackendResponse<ZohoConnectionSuccess>(`/v1/integrations/providers/zoho-crm/connection-test${query}&module=Leads`),
  ]);

  const zohoConnection = zohoConnectionResponse.ok
    ? {
        status: zohoConnectionResponse.data.status || "connected",
        provider: zohoConnectionResponse.data.provider || "zoho_crm",
        message: "Zoho CRM connection test completed.",
        requestedModule: zohoConnectionResponse.data.requested_module || "Leads",
        requestedModuleFound: Boolean(zohoConnectionResponse.data.requested_module_found),
        moduleCount: Number(zohoConnectionResponse.data.module_count || 0),
        fieldCount: Number(zohoConnectionResponse.data.field_count || 0),
        tokenSource: zohoConnectionResponse.data.token_source || null,
        apiBaseUrl: zohoConnectionResponse.data.api_base_url || null,
        safeConfig: zohoConnectionResponse.data.safe_config ?? fallback.zohoConnection.safeConfig,
      }
    : {
        status:
          zohoConnectionResponse.status === 409
            ? "unconfigured"
            : zohoConnectionResponse.status === 422
              ? "configuration_error"
              : "unavailable",
        provider: "zoho_crm",
        message: zohoConnectionResponse.message || fallback.zohoConnection.message,
        requestedModule: "Leads",
        requestedModuleFound: false,
        moduleCount: 0,
        fieldCount: 0,
        tokenSource: null,
        apiBaseUrl: null,
        safeConfig:
          typeof zohoConnectionResponse.details === "object" &&
          zohoConnectionResponse.details !== null &&
          "safe_config" in zohoConnectionResponse.details
            ? ((zohoConnectionResponse.details as { safe_config?: ZohoConnectionSuccess["safe_config"] }).safe_config ??
              fallback.zohoConnection.safeConfig)
            : fallback.zohoConnection.safeConfig,
      };

  const credentialOverview = buildCredentialOverview(providersEnvelope?.items ?? fallback.providers, zohoConnection);

  return {
    providers: providersEnvelope?.items ?? fallback.providers,
    attentionTriage: attentionTriage ?? fallback.attentionTriage,
    crmRetryBacklog: crmRetryBacklog ?? fallback.crmRetryBacklog,
    reconciliation: reconciliation ?? fallback.reconciliation,
    runtimeActivity: runtimeActivity ?? fallback.runtimeActivity,
    outboxBacklog: outboxBacklog ?? fallback.outboxBacklog,
    zohoConnection,
    credentialOverview,
    writeAuthority: fallback.writeAuthority,
  };
}

export type AdminSettingsIntegrationsSnapshot = Awaited<ReturnType<typeof getAdminSettingsIntegrationsSnapshot>>;
