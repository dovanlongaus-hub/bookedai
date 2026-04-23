import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput } from "@/components/ui/admin-input";
import { RoleRecord, UserRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function TeamMemberForm({
  action,
  roles,
  user,
  submitLabel,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  roles: RoleRecord[];
  user?: UserRecord | null;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
      <Field label="Full name">
        <AdminInput name="name" defaultValue={user?.name} placeholder="Taylor Morgan" />
      </Field>
      <Field label="Work email">
        <AdminInput
          name="email"
          type="email"
          required
          defaultValue={user?.email}
          placeholder="team@tenant.example"
        />
      </Field>
      <Field label="Status">
        <select
          name="status"
          defaultValue={user?.status ?? "INVITED"}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INVITED">INVITED</option>
          <option value="DISABLED">DISABLED</option>
        </select>
      </Field>
      <Field label="Primary role">
        <select
          name="roleId"
          defaultValue={user?.primaryRoleId ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="">No role assigned yet</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2 flex gap-3">
        <AdminButton type="submit">{submitLabel}</AdminButton>
      </div>
      </fieldset>
    </form>
  );
}
