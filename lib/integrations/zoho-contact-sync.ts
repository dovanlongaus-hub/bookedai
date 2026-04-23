type AdminCustomerContactSyncInput = {
  tenantId: string;
  contactId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  actorUserId?: string;
};

type ContactSyncResult = {
  status: "skipped" | "synced" | "pending" | "manual_review_required" | "failed" | "error";
  details?: Record<string, unknown>;
};

function normalizeApiBaseUrl() {
  return process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
}

export async function syncAdminCustomerToZohoContact(
  input: AdminCustomerContactSyncInput,
): Promise<ContactSyncResult> {
  const apiBaseUrl = normalizeApiBaseUrl();
  if (!apiBaseUrl) {
    return { status: "skipped", details: { reason: "missing_public_api_url" } };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/integrations/crm-sync/contact`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(process.env.ADMIN_API_TOKEN
          ? { Authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        contact_id: input.contactId,
        full_name: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
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
      status: (payload?.data?.sync_status as ContactSyncResult["status"]) || "synced",
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
