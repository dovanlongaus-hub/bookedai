import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { rolePermissionMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("roles:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const [roles, permissions] = await Promise.all([
      repository.listRoles(tenant.tenantId),
      repository.listPermissions(tenant.tenantId),
    ]);
    return adminJson({ roles, permissions });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("roles:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const body = await request.json();
    const roleId = typeof body.roleId === "string" ? body.roleId : "";
    const payload = rolePermissionMutationSchema.parse({
      permissionSlugs: Array.isArray(body.permissionSlugs) ? body.permissionSlugs : [],
    });
    const role = await repository.updateRolePermissions(
      tenant.tenantId,
      roleId,
      payload,
      session.userId,
    );

    if (!role) {
      return Response.json(
        { ok: false, error: { code: "not_found", message: "Role not found." } },
        { status: 404 },
      );
    }

    return adminJson(role);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
