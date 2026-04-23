"use server";

import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth/session";
import {
  buildEndTenantSupportAuditLog,
  buildEndTenantSupportSession,
  buildStartTenantSupportAuditLog,
  buildStartTenantSupportSession,
} from "@/lib/admin/tenant-support";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { adminSupportImpersonationSchema } from "@/lib/validation/admin";
import {
  clearAdminSessionCookieForAction,
  setAdminSessionCookieForAction,
} from "@/server/admin/session-cookie";

function assertSupportImpersonationAllowed(role: string) {
  if (role !== "PLATFORM_OWNER" && role !== "SUPER_ADMIN") {
    throw new Error("Missing permission: tenants:update");
  }
}

export async function startTenantSupportModeAction(formData: FormData) {
  const session = await requirePermission("tenants:view");
  assertSupportImpersonationAllowed(session.role);

  const parsed = adminSupportImpersonationSchema.parse({
    tenantId: formData.get("tenantId"),
    reason: formData.get("reason"),
  });

  const repository = getAdminRepository();
  const accessibleTenants = await repository.listTenantOptions(session.userId, session.role);
  const targetTenant = accessibleTenants.find((tenant) => tenant.id === parsed.tenantId);

  if (!targetTenant) {
    throw new Error("Tenant is not accessible for this session.");
  }

  const next = buildStartTenantSupportSession(session, targetTenant, parsed.reason);

  await repository.appendAuditLog(buildStartTenantSupportAuditLog({
    session,
    targetTenant,
    reason: parsed.reason,
  }));

  await setAdminSessionCookieForAction(next.token, next.session);
  redirect(`/admin/tenants?tenant=${encodeURIComponent(targetTenant.slug)}`);
}

export async function endTenantSupportModeAction() {
  const session = await getAdminSession();
  const repository = getAdminRepository();
  const auditLog = buildEndTenantSupportAuditLog(session);

  if (auditLog) {
    await repository.appendAuditLog(auditLog);
  }

  const next = buildEndTenantSupportSession(session);

  await clearAdminSessionCookieForAction();
  await setAdminSessionCookieForAction(next.token, next.session);
  redirect("/admin/tenants");
}
