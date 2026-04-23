import { requirePermission } from "@/lib/rbac/policies";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { getTenantContext } from "@/lib/tenant/context";
import {
  customerListQuerySchema,
  customerMutationSchema,
} from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("customers:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = customerListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    const result = await repository.listCustomers({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      lifecycleStage: query.stage,
      source: query.source,
      dateFrom: query.date_from || undefined,
      dateTo: query.date_to || undefined,
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
    const session = await requirePermission("customers:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const body = await request.json();
    const payload = customerMutationSchema.parse(body);

    const customer = await repository.createCustomer(tenant.tenantId, payload, session.userId);

    return adminJson(customer, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
