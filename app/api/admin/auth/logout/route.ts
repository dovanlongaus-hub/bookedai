import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { adminJson } from "@/server/admin/api-responses";
import { clearAdminSessionCookie } from "@/server/admin/session-cookie";

export async function POST() {
  try {
    const session = await getAdminSession();
    await getAdminRepository().appendAuditLog({
      tenantId: session.activeTenantId,
      actorUserId: session.userId,
      entityType: "admin_session",
      entityId: session.userId,
      action: "admin.auth.logout",
      summary: `${session.email} signed out of admin workspace`,
    });
  } catch {
    // Clear the cookie even when the session is already invalid or expired.
  }

  return clearAdminSessionCookie(adminJson({ loggedOut: true }));
}
