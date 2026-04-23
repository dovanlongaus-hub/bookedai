import { ReactNode } from "react";

import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminCard } from "@/components/ui/admin-card";
import type { ZohoCrmSyncStatusRecord } from "@/lib/integrations/zoho-crm-sync";

function toneForStatus(status?: string) {
  switch (status) {
    case "synced":
      return "success";
    case "retrying":
      return "info";
    case "failed":
      return "danger";
    case "manual_review_required":
      return "warning";
    case "pending":
      return "default";
    default:
      return "default";
  }
}

function labelForStatus(status?: string) {
  if (!status) {
    return "Not started";
  }
  return status.replace(/_/g, " ");
}

export function CrmSyncStatusCard({
  title = "Zoho CRM sync",
  description,
  record,
  enabled,
  emptyMessage,
  disabledMessage,
  actions,
}: {
  title?: string;
  description: string;
  record: ZohoCrmSyncStatusRecord | null;
  enabled: boolean;
  emptyMessage: string;
  disabledMessage?: string;
  actions?: ReactNode;
}) {
  return (
    <AdminCard className="p-6">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-4 flex items-center gap-3">
        <AdminBadge tone={toneForStatus(record?.sync_status)}>
          {labelForStatus(record?.sync_status)}
        </AdminBadge>
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {record ? record.provider.replace(/_/g, " ") : "Zoho CRM"}
        </div>
      </div>

      <div className="mt-4 space-y-4 text-sm text-slate-700">
        {!enabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            {disabledMessage || "CRM bridge is disabled in this environment."}
          </div>
        ) : null}

        {enabled && !record ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
            {emptyMessage}
          </div>
        ) : null}

        {record ? (
          <>
            <DetailRow label="Sync record" value={`#${record.id}`} />
            <DetailRow label="Local entity" value={record.local_entity_id} />
            <DetailRow
              label="Zoho record"
              value={record.external_entity_id || "Not linked yet"}
            />
            <DetailRow
              label="Last synced"
              value={record.last_synced_at || "Never"}
            />
            <DetailRow
              label="Retry count"
              value={String(record.retry_count || 0)}
            />
            {record.latest_error_message ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Latest CRM issue
                </div>
                <div className="mt-2 text-sm leading-6">
                  {record.latest_error_message}
                </div>
                <div className="mt-2 text-xs text-rose-700">
                  {record.latest_error_code || "provider_error"}
                  {record.latest_error_retryable ? " • retryable" : ""}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </AdminCard>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold text-slate-950">{label}</div>
      <div className="mt-1 text-slate-700">{value}</div>
    </div>
  );
}
