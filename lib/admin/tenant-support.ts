import { createAdminSessionToken, type AdminSession } from "@/lib/auth/session";

export type TenantSupportTarget = {
  id: string;
  slug: string;
};

export function buildStartTenantSupportSession(
  session: AdminSession,
  targetTenant: TenantSupportTarget,
  reason?: string | null,
) {
  const trimmedReason = reason?.trim() || undefined;

  return createAdminSessionToken({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    activeTenantId: session.activeTenantId,
    tenantIds: session.tenantIds,
    impersonation: {
      tenantId: targetTenant.id,
      tenantSlug: targetTenant.slug,
      mode: "read_only",
      reason: trimmedReason,
      startedAt: new Date().toISOString(),
    },
  });
}

export function buildEndTenantSupportSession(session: AdminSession) {
  return createAdminSessionToken({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    activeTenantId: session.activeTenantId,
    tenantIds: session.tenantIds,
    impersonation: null,
  });
}

export function buildStartTenantSupportAuditLog(input: {
  session: AdminSession;
  targetTenant: TenantSupportTarget;
  reason?: string | null;
}) {
  const trimmedReason = input.reason?.trim() || null;

  return {
    tenantId: input.targetTenant.id,
    actorUserId: input.session.userId,
    entityType: "tenant_support_session",
    entityId: input.targetTenant.id,
    action: "admin.auth.start_tenant_support_mode",
    summary: `${input.session.email} started read-only tenant support mode for ${input.targetTenant.slug}.`,
    metadata: {
      tenantSlug: input.targetTenant.slug,
      supportMode: "read_only",
      reason: trimmedReason,
    },
  };
}

export function buildEndTenantSupportAuditLog(session: AdminSession) {
  if (!session.impersonation) {
    return null;
  }

  return {
    tenantId: session.impersonation.tenantId,
    actorUserId: session.userId,
    entityType: "tenant_support_session",
    entityId: session.impersonation.tenantId,
    action: "admin.auth.end_tenant_support_mode",
    summary: `${session.email} ended read-only tenant support mode for ${session.impersonation.tenantSlug}.`,
    metadata: {
      tenantSlug: session.impersonation.tenantSlug,
      supportMode: session.impersonation.mode,
    },
  };
}
