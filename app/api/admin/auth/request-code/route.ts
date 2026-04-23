import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { adminAuthRequestCodeSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { deliverAdminLoginCode } from "@/server/admin/email-delivery";
import { issueAdminEmailLoginCode } from "@/server/admin/email-login";
import { canUseAdminEmailSignIn, resolveAdminIdentity } from "@/server/admin/identity";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = adminAuthRequestCodeSchema.parse(body);
    const identity = await resolveAdminIdentity(payload.email, payload.tenantSlug);

    if (!identity) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_credentials", message: "Admin account not found." } },
        { status: 401 },
      );
    }
    if (!canUseAdminEmailSignIn(identity)) {
      return NextResponse.json(
        { ok: false, error: { code: "forbidden", message: "This account is not allowed to access admin sign-in." } },
        { status: 403 },
      );
    }

    const repository = getAdminRepository();
    const accessibleTenants =
      identity.source === "legacy" ? null : await repository.listTenantOptions(identity.userId, identity.role);
    const activeTenant =
      identity.source === "legacy"
        ? {
            id: identity.activeTenantId,
            slug: identity.activeTenantSlug || payload.tenantSlug || "",
            name: identity.activeTenantName || identity.activeTenantSlug || identity.email,
          }
        : accessibleTenants?.find((tenant) => tenant.id === identity.activeTenantId) ?? accessibleTenants?.[0] ?? null;

    const codeRecord = await issueAdminEmailLoginCode({
      userId: identity.userId,
      email: identity.email,
      tenantId: activeTenant?.id,
      tenantSlug: activeTenant?.slug,
      metadata: {
        role: identity.role,
        tenantIds: identity.tenantIds,
      },
    });

    const delivery = await deliverAdminLoginCode({
      email: identity.email,
      code: codeRecord.code,
      tenantName: activeTenant?.name,
      tenantSlug: activeTenant?.slug,
    });

    await repository.appendAuditLog({
      tenantId: activeTenant?.id || identity.activeTenantId,
      actorUserId: identity.userId,
      entityType: "admin_session",
      entityId: identity.userId,
      action: "admin.auth.request_code",
      summary: `${identity.email} requested an admin sign-in code`,
      metadata: {
        deliveryStatus: delivery.status,
        codeLast4: codeRecord.codeLast4,
      },
    });

    return adminJson({
      email: identity.email,
      codeLast4: codeRecord.codeLast4,
      expiresAt: codeRecord.expiresAt,
      expiresInMinutes: codeRecord.expiresInMinutes,
      operatorNote: delivery.operatorNote,
      deliveryStatus: delivery.status,
      debugCode: delivery.debugCode ?? null,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
