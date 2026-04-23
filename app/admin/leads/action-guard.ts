import { getLeadsHandoffGuardState, parseLeadsHandoff } from '@/server/admin/leads-handoff-core';

type LeadsMutationBoundaryInput = {
  formData: FormData;
  resolvedTenantId: string;
  resolvedTenantSlug: string;
  supportModeActive: boolean;
};

export function assertLeadsMutationAllowed({
  formData,
  resolvedTenantId,
  resolvedTenantSlug,
  supportModeActive,
}: LeadsMutationBoundaryInput) {
  const handoff = parseLeadsHandoff({
    expectedTenantId: readField(formData, 'expectedTenantId') ?? undefined,
    expectedTenantSlug: readField(formData, 'expectedTenantSlug') ?? undefined,
    admin_return: readField(formData, 'admin_return') ?? undefined,
    admin_scope: readField(formData, 'admin_scope') ?? undefined,
    admin_scope_label: readField(formData, 'admin_scope_label') ?? undefined,
  });
  const guard = getLeadsHandoffGuardState({
    handoff,
    resolvedTenantId,
    resolvedTenantSlug,
    supportModeActive,
  });

  if (guard.leadsReadOnly) {
    throw new Error(resolveGuardErrorMessage({ handoff, guard }));
  }

  return { handoff, guard };
}

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

function resolveGuardErrorMessage(input: {
  handoff: ReturnType<typeof parseLeadsHandoff>;
  guard: ReturnType<typeof getLeadsHandoffGuardState>;
}) {
  if (input.guard.handoffRequiresReentry) {
    if (input.handoff.invalidAdminScope) {
      return 'Leads handoff rejected because the return path was not trusted. Re-open leads from the shipped admin shell.';
    }

    return 'Leads handoff rejected because the tenant context was missing. Re-open leads from the shipped admin shell.';
  }

  if (input.guard.tenantMismatch) {
    return 'Leads handoff rejected because the requested tenant no longer matches the resolved admin tenant.';
  }

  return 'Leads mutation is not allowed while support-mode or handoff read-only protection is active.';
}
