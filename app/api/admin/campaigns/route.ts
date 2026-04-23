import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { campaignListQuerySchema, campaignMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("campaigns:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = campaignListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    const result = await repository.listCampaigns({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      status: query.status,
      channel: query.channel,
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
    const session = await requirePermission("campaigns:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = campaignMutationSchema.parse(await request.json());
    const campaign = await repository.createCampaign(tenant.tenantId, payload, session.userId);
    return adminJson(campaign, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
