import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput, AdminTextarea } from "@/components/ui/admin-input";
import { TenantProfileRecord, TenantSettingsRecord } from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

type BrandingValues = {
  logoUrl?: string;
  introductionHtml?: string;
};

function getBrandingValues(settings: TenantSettingsRecord): BrandingValues {
  const value = settings.values.branding;
  if (!value || typeof value !== "object") {
    return {};
  }

  const branding = value as Record<string, unknown>;
  return {
    logoUrl: typeof branding.logoUrl === "string" ? branding.logoUrl : undefined,
    introductionHtml:
      typeof branding.introductionHtml === "string" ? branding.introductionHtml : undefined,
  };
}

export function WorkspaceSettingsForm({
  action,
  profile,
  settings,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  profile: TenantProfileRecord;
  settings: TenantSettingsRecord;
  disabled?: boolean;
}) {
  const branding = getBrandingValues(settings);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
      <Field label="Workspace name">
        <AdminInput name="name" required defaultValue={profile.name} />
      </Field>
      <Field label="Slug">
        <AdminInput value={profile.slug} disabled readOnly />
      </Field>
      <Field label="Timezone">
        <AdminInput name="timezone" required defaultValue={profile.timezone} />
      </Field>
      <Field label="Locale">
        <AdminInput name="locale" required defaultValue={profile.locale} />
      </Field>
      <Field label="Currency">
        <AdminInput name="currency" required maxLength={3} defaultValue={profile.currency} />
      </Field>
      <Field label="Brand logo URL">
        <AdminInput name="logoUrl" type="url" defaultValue={branding.logoUrl} />
      </Field>
      <Field label="Tenant introduction HTML">
        <AdminTextarea
          name="introductionHtml"
          rows={8}
          className="min-h-[220px]"
          defaultValue={branding.introductionHtml}
        />
      </Field>
      <div className="md:col-span-2 flex gap-3">
        <AdminButton type="submit">Save workspace settings</AdminButton>
      </div>
      </fieldset>
    </form>
  );
}
