import { NextResponse } from "next/server";

import { createAdminSessionToken, getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { adminAuthSwitchTenantSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { withAdminSessionCookie } from "@/server/admin/session-cookie";

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    const body = await request.json();
    const payload = adminAuthSwitchTenantSchema.parse(body);
    const repository = getAdminRepository();
    const accessibleTenants = await repository.listTenantOptions(session.userId, session.role);
    const nextTenant = accessibleTenants.find((tenant) => tenant.id === payload.tenantId);

    if (!nextTenant || !session.tenantIds.includes(nextTenant.id)) {
      return NextResponse.json(
        { ok: false, error: { code: "forbidden", message: "Tenant is not accessible for this session." } },
        { status: 403 },
      );
    }

    const next = createAdminSessionToken({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      activeTenantId: nextTenant.id,
      tenantIds: session.tenantIds,
    });
    await repository.appendAuditLog({
      tenantId: nextTenant.id,
      actorUserId: session.userId,
      entityType: "admin_session",
      entityId: session.userId,
      action: "admin.auth.switch_tenant",
      summary: `${session.email} switched admin workspace to ${nextTenant.slug}`,
      metadata: {
        previousTenantId: session.activeTenantId,
        nextTenantId: nextTenant.id,
      },
    });

    const response = adminJson({
      session: next.session,
      activeTenant: nextTenant,
    });

    return withAdminSessionCookie(response, next.token, next.session);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
