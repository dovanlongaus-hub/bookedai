import { NextResponse } from "next/server";

import { createAdminSessionToken } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { adminAuthVerifyCodeSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { consumeAdminEmailLoginCode } from "@/server/admin/email-login";
import { canUseAdminEmailSignIn, resolveAdminIdentity } from "@/server/admin/identity";
import { withAdminSessionCookie } from "@/server/admin/session-cookie";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = adminAuthVerifyCodeSchema.parse(body);
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

    const consumed = await consumeAdminEmailLoginCode({
      email: identity.email,
      code: payload.code,
      userId: identity.userId,
    });
    if (!consumed) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_code", message: "The verification code is invalid or expired." } },
        { status: 401 },
      );
    }

    const { token, session } = createAdminSessionToken(identity);
    const repository = getAdminRepository();
    await repository.appendAuditLog({
      tenantId: session.activeTenantId,
      actorUserId: session.userId,
      entityType: "admin_session",
      entityId: session.userId,
      action: "admin.auth.login_code_verified",
      summary: `${session.email} signed into admin workspace using a verification code`,
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
    });

    return withAdminSessionCookie(response, token, session);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
