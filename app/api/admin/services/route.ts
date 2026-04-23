import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { serviceListQuerySchema, serviceMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("services:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = serviceListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    const result = await repository.listServices({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    });

    return adminJson({
      items: result.items,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      filters: query,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("services:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = serviceMutationSchema.parse(await request.json());
    const service = await repository.createService(tenant.tenantId, payload, session.userId);
    return adminJson(service, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
