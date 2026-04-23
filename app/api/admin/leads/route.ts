import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { leadListQuerySchema, leadMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("leads:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = leadListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    const result = await repository.listLeads({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      status: query.status,
      pipelineStage: query.pipeline_stage,
      owner: query.owner,
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
    const session = await requirePermission("leads:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const body = await request.json();
    const payload = leadMutationSchema.parse(body);
    const lead = await repository.createLead(tenant.tenantId, payload, session.userId);
    return adminJson(lead, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
