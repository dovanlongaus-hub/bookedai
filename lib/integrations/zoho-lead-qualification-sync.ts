type AdminLeadQualificationSyncInput = {
  tenantId: string;
  leadId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  companyName?: string | null;
  dealName?: string | null;
  notes?: string | null;
  estimatedValueAud?: number | null;
  actorUserId?: string;
};

type LeadQualificationSyncResult = {
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

export async function syncAdminLeadQualificationToZoho(
  input: AdminLeadQualificationSyncInput,
): Promise<LeadQualificationSyncResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  if (!apiBaseUrl) {
    return { status: "skipped", details: { reason: "missing_public_api_url" } };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-sync/lead-qualification`, {
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
        company_name: input.companyName ?? null,
        deal_name: input.dealName ?? null,
        notes: input.notes ?? null,
        estimated_value_aud: input.estimatedValueAud ?? null,
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
            lead?: { sync_status?: string; crm_sync_record_id?: number | null; external_entity_id?: string | null };
            contact?: {
              sync_status?: string;
              crm_sync_record_id?: number | null;
              external_entity_id?: string | null;
            };
            deal?: { sync_status?: string; crm_sync_record_id?: number | null; external_entity_id?: string | null };
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

    const statuses = [
      payload?.data?.lead?.sync_status,
      payload?.data?.contact?.sync_status,
      payload?.data?.deal?.sync_status,
    ].filter((value): value is string => Boolean(value));
    const finalStatus = statuses.includes("failed")
      ? "failed"
      : statuses.includes("manual_review_required")
        ? "manual_review_required"
        : statuses.includes("pending")
          ? "pending"
          : "synced";

    return {
      status: finalStatus,
      details: {
        lead: payload?.data?.lead ?? null,
        contact: payload?.data?.contact ?? null,
        deal: payload?.data?.deal ?? null,
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
