import { NextResponse } from "next/server";

import { createAdminSessionToken } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { adminAuthLoginSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { isValidAdminBootstrapPassword, resolveAdminIdentity } from "@/server/admin/identity";
import { withAdminSessionCookie } from "@/server/admin/session-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = adminAuthLoginSchema.parse(body);

    if (!isValidAdminBootstrapPassword(payload.password)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_credentials", message: "Invalid admin credentials." } },
        { status: 401 },
      );
    }

    const identity = await resolveAdminIdentity(payload.email, payload.tenantSlug);
    if (!identity) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_credentials", message: "Admin account not found." } },
        { status: 401 },
      );
    }

    const { token, session } = createAdminSessionToken(identity);
    await getAdminRepository().appendAuditLog({
      tenantId: session.activeTenantId,
      actorUserId: session.userId,
      entityType: "admin_session",
      entityId: session.userId,
      action: "admin.auth.login",
      summary: `${session.email} signed into admin workspace`,
      metadata: {
        role: session.role,
        tenantIds: session.tenantIds,
      },
    });

    const response = adminJson({
      session: {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        activeTenantId: session.activeTenantId,
        tenantIds: session.tenantIds,
        expiresAt: session.expiresAt,
      },
      sessionToken: token,
    });

    return withAdminSessionCookie(response, token, session);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
