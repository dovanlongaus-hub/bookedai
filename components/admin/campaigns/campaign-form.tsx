import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput } from "@/components/ui/admin-input";
import { CampaignRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function toDateValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

export function CampaignForm({
  action,
  campaign,
  submitLabel,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  campaign?: CampaignRecord | null;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4">
        <Field label="Campaign name">
          <AdminInput name="name" required defaultValue={campaign?.name} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Channel">
            <select
              name="channel"
              defaultValue={campaign?.channel ?? "paid_social"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="paid_social">Paid social</option>
              <option value="ops_reactivation">Ops reactivation</option>
              <option value="email">Email</option>
              <option value="referral">Referral</option>
              <option value="organic">Organic</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={campaign?.status ?? "DRAFT"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Source platform">
            <AdminInput
              name="sourcePlatform"
              required
              defaultValue={campaign?.sourcePlatform ?? "instagram"}
            />
          </Field>
          <Field label="Source key">
            <AdminInput
              name="sourceKey"
              required
              defaultValue={campaign?.sourceKey ?? "instagram_campaign"}
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Budget (cents)">
            <AdminInput
              name="budgetCents"
              type="number"
              min="0"
              defaultValue={String(campaign?.budgetCents ?? 0)}
            />
          </Field>
          <Field label="UTM campaign">
            <AdminInput name="utmCampaign" defaultValue={campaign?.utmCampaign} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="UTM source">
            <AdminInput name="utmSource" defaultValue={campaign?.utmSource} />
          </Field>
          <Field label="UTM medium">
            <AdminInput name="utmMedium" defaultValue={campaign?.utmMedium} />
          </Field>
          <Field label="Start date">
            <AdminInput
              name="startDate"
              type="date"
              defaultValue={toDateValue(campaign?.startDate)}
            />
          </Field>
        </div>
        <Field label="End date">
          <AdminInput name="endDate" type="date" defaultValue={toDateValue(campaign?.endDate)} />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={4}
            defaultValue={campaign?.notes}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
        </Field>
        <AdminButton type="submit">{submitLabel}</AdminButton>
      </fieldset>
    </form>
  );
}
