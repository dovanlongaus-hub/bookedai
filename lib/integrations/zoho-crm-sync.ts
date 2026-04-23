export type ZohoCrmSyncStatusRecord = {
  id: number;
  entity_type: string;
  provider: string;
  sync_status: string;
  local_entity_id: string;
  external_entity_id?: string | null;
  last_synced_at?: string | null;
  created_at?: string | null;
  latest_error_code?: string | null;
  latest_error_message?: string | null;
  latest_error_retryable?: boolean | null;
  latest_error_at?: string | null;
  retry_count?: number;
};

type SyncStatusResult = {
  enabled: boolean;
  provider: string;
  entityType: string;
  localEntityId: string;
  record: ZohoCrmSyncStatusRecord | null;
  details?: Record<string, unknown>;
};

type RetrySyncResult = {
  status: "synced" | "pending" | "retrying" | "manual_review_required" | "failed" | "error";
  details?: Record<string, unknown>;
};

function normalizeApiBaseUrl() {
  return process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
}

function authHeaders() {
  const headers: Record<string, string> = {};
  if (process.env.ADMIN_API_TOKEN) {
    headers.Authorization = `Bearer ${process.env.ADMIN_API_TOKEN}`;
  }
  return headers;
}

export async function getZohoCrmSyncStatus(input: {
  tenantId: string;
  entityType: string;
  localEntityId: string;
  provider?: string;
}): Promise<SyncStatusResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  const provider = (input.provider || "zoho_crm").trim().toLowerCase();
  if (!apiBaseUrl) {
    return {
      enabled: false,
      provider,
      entityType: input.entityType,
      localEntityId: input.localEntityId,
      record: null,
      details: { reason: "missing_public_api_url" },
    };
  }

  const query = new URLSearchParams({
    entity_type: input.entityType,
    local_entity_id: input.localEntityId,
    provider,
  });

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-sync/status?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...authHeaders(),
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          data?: { record?: ZohoCrmSyncStatusRecord | null };
          error?: { code?: string; message?: string; details?: Record<string, unknown> };
        }
      | null;

    if (!response.ok) {
      return {
        enabled: true,
        provider,
        entityType: input.entityType,
        localEntityId: input.localEntityId,
        record: null,
        details: {
          statusCode: response.status,
          error: payload?.error ?? null,
        },
      };
    }

    return {
      enabled: true,
      provider,
      entityType: input.entityType,
      localEntityId: input.localEntityId,
      record: payload?.data?.record ?? null,
    };
  } catch (error) {
    return {
      enabled: true,
      provider,
      entityType: input.entityType,
      localEntityId: input.localEntityId,
      record: null,
      details: {
        reason: "request_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

export async function retryZohoCrmSyncRecord(input: {
  tenantId: string;
  crmSyncRecordId: number;
  actorUserId?: string;
}): Promise<RetrySyncResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      status: "error",
      details: { reason: "missing_public_api_url" },
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-sync/retry`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        crm_sync_record_id: input.crmSyncRecordId,
        actor_context: {
          channel: "admin",
          role: "integration_retry",
          tenant_id: input.tenantId,
          actor_id: input.actorUserId ?? null,
          deployment_mode: "headless_api",
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: {
            sync_status?: string;
            crm_sync_record_id?: number | null;
            external_entity_id?: string | null;
            warnings?: string[];
          };
          error?: { code?: string; message?: string; details?: Record<string, unknown> };
        }
      | null;

    if (!response.ok) {
      return {
        status: "error",
        details: {
          statusCode: response.status,
          error: payload?.error ?? null,
        },
      };
    }

    return {
      status: (payload?.data?.sync_status as RetrySyncResult["status"]) || "retrying",
      details: {
        crmSyncRecordId: payload?.data?.crm_sync_record_id ?? null,
        externalEntityId: payload?.data?.external_entity_id ?? null,
        warnings: payload?.data?.warnings ?? [],
      },
    };
  } catch (error) {
    return {
      status: "error",
      details: {
        reason: "request_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}
