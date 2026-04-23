export type SettingsHandoffState = {
  requestedTenantId: string | null;
  requestedTenantSlug: string | null;
  adminReturn: boolean;
  adminScope: string | null;
  adminScopeLabel: string;
  invalidAdminScope: boolean;
  missingTenantHint: boolean;
};

export type SettingsHandoffGuardState = {
  tenantMismatch: boolean;
  handoffRequiresReentry: boolean;
  settingsReadOnly: boolean;
};

export function parseSettingsHandoff(
  searchParams:
    | Record<string, string | string[] | undefined>
    | URLSearchParams
    | undefined,
): SettingsHandoffState {
  const getValue = (key: string) => {
    if (!searchParams) {
      return null;
    }

    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }

    const raw = searchParams[key];
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] ?? null : null;
  };

  const requestedTenantId = normalizeToken(getValue('tenantId'));
  const requestedTenantSlug = normalizeToken(getValue('tenantSlug'));
  const adminReturn = getValue('admin_return') === '1';
  const rawAdminScope = getValue('admin_scope');
  const adminScope = sanitizeAdminScope(rawAdminScope);
  const adminScopeLabel = sanitizeAdminScopeLabel(getValue('admin_scope_label'));
  const invalidAdminScope = Boolean(rawAdminScope?.trim()) && !adminScope;
  const missingTenantHint = adminReturn && !requestedTenantId && !requestedTenantSlug;

  return {
    requestedTenantId,
    requestedTenantSlug,
    adminReturn,
    adminScope,
    adminScopeLabel,
    invalidAdminScope,
    missingTenantHint,
  };
}

export function buildSettingsHandoffReturnHref(state: SettingsHandoffState) {
  if (!state.adminReturn || !state.adminScope) {
    return null;
  }

  return state.adminScope;
}

export function getSettingsHandoffGuardState(input: {
  handoff: SettingsHandoffState;
  resolvedTenantId: string;
  resolvedTenantSlug: string;
  supportModeActive: boolean;
}): SettingsHandoffGuardState {
  const tenantMismatch = Boolean(
    (input.handoff.requestedTenantSlug && input.resolvedTenantSlug !== input.handoff.requestedTenantSlug) ||
      (input.handoff.requestedTenantId && input.resolvedTenantId !== input.handoff.requestedTenantId),
  );
  const handoffRequiresReentry =
    input.handoff.adminReturn && (input.handoff.invalidAdminScope || input.handoff.missingTenantHint);

  return {
    tenantMismatch,
    handoffRequiresReentry,
    settingsReadOnly: input.supportModeActive || tenantMismatch || handoffRequiresReentry,
  };
}

function normalizeToken(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sanitizeAdminScope(value: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith('/')) {
    return null;
  }

  if (normalized.startsWith('//')) {
    return null;
  }

  return normalized;
}

function sanitizeAdminScopeLabel(value: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return 'Platform Settings';
  }

  return normalized.slice(0, 80);
}
