import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput, AdminTextarea } from "@/components/ui/admin-input";
import { CustomerRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function CustomerForm({
  action,
  customer,
  submitLabel,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customer?: CustomerRecord | null;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
      <Field label="First name">
        <AdminInput name="firstName" required defaultValue={customer?.firstName} />
      </Field>
      <Field label="Last name">
        <AdminInput name="lastName" required defaultValue={customer?.lastName} />
      </Field>
      <Field label="Email">
        <AdminInput name="email" type="email" defaultValue={customer?.email} />
      </Field>
      <Field label="Phone">
        <AdminInput name="phone" defaultValue={customer?.phone} />
      </Field>
      <Field label="Company">
        <AdminInput name="company" defaultValue={customer?.company} />
      </Field>
      <Field label="Lifecycle status">
        <select
          name="lifecycleStage"
          defaultValue={customer?.lifecycleStage ?? "new"}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="new">new</option>
          <option value="active">active</option>
          <option value="vip">vip</option>
          <option value="at_risk">at_risk</option>
        </select>
      </Field>
      <Field label="Lead source">
        <select
          name="sourceLabel"
          defaultValue={customer?.sourceLabel ?? "manual_entry"}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="manual_entry">manual_entry</option>
          <option value="website_chat">website_chat</option>
          <option value="missed_call_recovery">missed_call_recovery</option>
          <option value="instagram_campaign">instagram_campaign</option>
          <option value="referral">referral</option>
        </select>
      </Field>
      <Field label="Tags">
        <AdminInput
          name="tags"
          placeholder="vip, retention, reactivated"
          defaultValue={customer?.tags.join(", ")}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm text-slate-700 md:col-span-2">
        <input type="checkbox" name="marketingConsent" defaultChecked={customer?.marketingConsent} />
        Marketing consent granted
      </label>
      <Field label="Notes">
        <AdminTextarea name="notes" rows={5} defaultValue={customer?.notes} />
      </Field>
      <div className="md:col-span-2 flex gap-3">
        <AdminButton type="submit">{submitLabel}</AdminButton>
      </div>
      </fieldset>
    </form>
  );
}
