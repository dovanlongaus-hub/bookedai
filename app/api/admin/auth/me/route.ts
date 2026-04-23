import { getAdminRepository } from "@/lib/db/admin-repository";
import { getAdminSession } from "@/lib/auth/session";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    const session = await getAdminSession();
    const repository = getAdminRepository();
    const tenants = await repository.listTenantOptions(session.userId, session.role);

    return adminJson({
      session,
      accessibleTenants: tenants.filter((tenant) => session.tenantIds.includes(tenant.id)),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

