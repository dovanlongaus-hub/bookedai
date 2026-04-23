import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput } from "@/components/ui/admin-input";
import { ServiceRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function ServiceForm({
  action,
  service,
  submitLabel,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  service?: ServiceRecord | null;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={disabled} className="space-y-4">
      <Field label="Name">
        <AdminInput name="name" required defaultValue={service?.name} />
      </Field>
      <Field label="Duration (minutes)">
        <AdminInput
          name="durationMinutes"
          type="number"
          min="5"
          defaultValue={String(service?.durationMinutes ?? 30)}
        />
      </Field>
      <Field label="Price (cents)">
        <AdminInput
          name="priceCents"
          type="number"
          min="0"
          defaultValue={String(service?.priceCents ?? 0)}
        />
      </Field>
      <AdminButton type="submit">{submitLabel}</AdminButton>
      </fieldset>
    </form>
  );
}
