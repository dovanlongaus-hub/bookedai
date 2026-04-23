import { AuditLogRecord, getAdminRepository, PaginationResult } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { auditLogListQuerySchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("audit:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = auditLogListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = (await repository.listAuditLogs({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      entityType: query.entityType,
    })) as PaginationResult<AuditLogRecord>;

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
