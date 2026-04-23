import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { branchMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const branches = await repository.listBranches(tenant.tenantId);
    return adminJson({ items: branches });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = branchMutationSchema.parse(await request.json());
    const branch = await repository.createBranch(tenant.tenantId, payload, session.userId);
    return adminJson(branch, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
