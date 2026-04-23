import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput, AdminTextarea } from "@/components/ui/admin-input";
import { LeadRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function LeadForm({
  action,
  lead,
  submitLabel,
  tenantId,
  tenantSlug,
  disabled = false,
  readOnlyReason,
}: {
  action: (formData: FormData) => void | Promise<void>;
  lead?: LeadRecord | null;
  submitLabel: string;
  tenantId: string;
  tenantSlug: string;
  disabled?: boolean;
  readOnlyReason?: string | null;
}) {
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4">
        <input type="hidden" name="expectedTenantId" value={tenantId} />
        <input type="hidden" name="expectedTenantSlug" value={tenantSlug} />
        <input type="hidden" name="admin_return" value="1" />
        <input type="hidden" name="admin_scope" value="/admin#overview" />
        <input type="hidden" name="admin_scope_label" value="Overview" />
        {disabled && readOnlyReason ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <div className="font-semibold">Leads is read-only right now.</div>
            <div className="mt-1 text-amber-900">{readOnlyReason}</div>
          </div>
        ) : null}
      <Field label="Title">
        <AdminInput name="title" required defaultValue={lead?.title} />
      </Field>
      <Field label="Source">
        <select
          name="source"
          defaultValue={lead?.source ?? "website_chat"}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="website_chat">website_chat</option>
          <option value="missed_call_recovery">missed_call_recovery</option>
          <option value="instagram_campaign">instagram_campaign</option>
          <option value="referral">referral</option>
          <option value="manual_entry">manual_entry</option>
        </select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status">
          <select
            name="status"
            defaultValue={lead?.status ?? "NEW"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="NEW">NEW</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
        </Field>
        <Field label="Pipeline stage">
          <select
            name="pipelineStage"
            defaultValue={lead?.pipelineStage ?? "captured"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="captured">captured</option>
            <option value="qualified">qualified</option>
            <option value="follow_up">follow_up</option>
            <option value="proposal">proposal</option>
            <option value="booked">booked</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Score">
          <AdminInput name="score" type="number" min="0" max="100" defaultValue={String(lead?.score ?? 50)} />
        </Field>
        <Field label="Estimated value (cents)">
          <AdminInput
            name="estimatedValueCents"
            type="number"
            min="0"
            defaultValue={String(lead?.estimatedValueCents ?? 0)}
          />
        </Field>
      </div>
      <Field label="Owner">
        <AdminInput name="ownerName" defaultValue={lead?.ownerName} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Next follow-up">
          <AdminInput
            name="nextFollowUpAt"
            type="datetime-local"
            defaultValue={lead?.nextFollowUpAt?.slice(0, 16)}
          />
        </Field>
        <Field label="Last contact">
          <AdminInput
            name="lastContactAt"
            type="datetime-local"
            defaultValue={lead?.lastContactAt?.slice(0, 16)}
          />
        </Field>
      </div>
      <Field label="Notes">
        <AdminTextarea name="notes" rows={4} defaultValue={lead?.notes} />
      </Field>
      <AdminButton type="submit">{submitLabel}</AdminButton>
      </fieldset>
    </form>
  );
}
