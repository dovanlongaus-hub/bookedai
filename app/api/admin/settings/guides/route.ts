import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { workspaceGuidesMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const guides = await repository.getWorkspaceGuides(tenant.tenantId);
    return adminJson(guides);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = workspaceGuidesMutationSchema.parse(await request.json());
    const guides = await repository.updateWorkspaceGuides(tenant.tenantId, payload, session.userId);
    return adminJson(guides);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
