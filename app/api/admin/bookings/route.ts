import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { bookingListQuerySchema, bookingMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("bookings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = bookingListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );

    const result = await repository.listBookings({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      status: query.status,
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
    const session = await requirePermission("bookings:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = bookingMutationSchema.parse(await request.json());
    const booking = await repository.createBooking(tenant.tenantId, payload, session.userId);
    return adminJson(booking, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
