import { getSettingsHandoffGuardState, parseSettingsHandoff } from '@/server/admin/settings-handoff-core';

type SettingsMutationBoundaryInput = {
  formData: FormData;
  resolvedTenantId: string;
  resolvedTenantSlug: string;
  supportModeActive: boolean;
};

export function assertSettingsMutationAllowed({
  formData,
  resolvedTenantId,
  resolvedTenantSlug,
  supportModeActive,
}: SettingsMutationBoundaryInput) {
  const handoff = parseSettingsHandoff({
    tenantId: readField(formData, 'expectedTenantId') ?? undefined,
    tenantSlug: readField(formData, 'expectedTenantSlug') ?? undefined,
    admin_return: readField(formData, 'admin_return') ?? undefined,
    admin_scope: readField(formData, 'admin_scope') ?? undefined,
    admin_scope_label: readField(formData, 'admin_scope_label') ?? undefined,
  });
  const guard = getSettingsHandoffGuardState({
    handoff,
    resolvedTenantId,
    resolvedTenantSlug,
    supportModeActive,
  });

  if (guard.settingsReadOnly) {
    throw new Error(resolveGuardErrorMessage({ handoff, guard }));
  }

  return { handoff, guard };
}

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

function resolveGuardErrorMessage(input: {
  handoff: ReturnType<typeof parseSettingsHandoff>;
  guard: ReturnType<typeof getSettingsHandoffGuardState>;
}) {
  if (input.guard.handoffRequiresReentry) {
    if (input.handoff.invalidAdminScope) {
      return 'Settings handoff rejected because the return path was not trusted. Re-open workspace settings from Platform Settings.';
    }

    return 'Settings handoff rejected because the tenant context was missing. Re-open workspace settings from Platform Settings.';
  }

  if (input.guard.tenantMismatch) {
    return 'Settings handoff rejected because the requested tenant no longer matches the resolved admin tenant.';
  }

  return 'Settings mutation is not allowed while support-mode or handoff read-only protection is active.';
}
