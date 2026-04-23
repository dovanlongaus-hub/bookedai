type AdminCallScheduledSyncInput = {
  tenantId: string;
  leadId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  serviceName?: string | null;
  scheduledFor?: string | null;
  ownerName?: string | null;
  note?: string | null;
  externalContactId?: string | null;
  externalDealId?: string | null;
  actorUserId?: string;
};

type CallScheduledSyncResult = {
  status:
    | "skipped"
    | "synced"
    | "pending"
    | "manual_review_required"
    | "failed"
    | "error";
  details?: Record<string, unknown>;
};

function normalizeApiBaseUrl() {
  return process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
}

export async function syncAdminCallScheduledToZoho(
  input: AdminCallScheduledSyncInput,
): Promise<CallScheduledSyncResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  if (!apiBaseUrl) {
    return { status: "skipped", details: { reason: "missing_public_api_url" } };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-sync/call-scheduled`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(process.env.ADMIN_API_TOKEN
          ? { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        lead_id: input.leadId,
        full_name: input.fullName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        source: input.source ?? null,
        service_name: input.serviceName ?? null,
        scheduled_for: input.scheduledFor ?? null,
        owner_name: input.ownerName ?? null,
        note: input.note ?? null,
        external_contact_id: input.externalContactId ?? null,
        external_deal_id: input.externalDealId ?? null,
        actor_context: {
          channel: "admin",
          role: "TENANT_ADMIN",
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
      status: (payload?.data?.sync_status as CallScheduledSyncResult["status"]) || "synced",
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
