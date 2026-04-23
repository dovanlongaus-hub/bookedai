import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { userMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("users:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const [users, roles] = await Promise.all([
      repository.listUsers(tenant.tenantId),
      repository.listRoles(tenant.tenantId),
    ]);
    return adminJson({ users, roles });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("users:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = userMutationSchema.parse(await request.json());
    const user = await repository.createUser(
      tenant.tenantId,
      { ...payload, roleId: payload.roleId || undefined },
      session.userId,
    );
    return adminJson(user, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
