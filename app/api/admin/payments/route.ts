import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { paymentListQuerySchema, paymentMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET(request: Request) {
  try {
    await requirePermission("payments:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const query = paymentListQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const result = await repository.listPayments({
      tenantId: tenant.tenantId,
      page: query.page,
      pageSize: query.limit,
      query: query.q,
      status: query.status,
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
    const session = await requirePermission("payments:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = paymentMutationSchema.parse(await request.json());
    const payment = await repository.createPayment(
      tenant.tenantId,
      {
        ...payload,
        bookingId: payload.bookingId || undefined,
        paymentMethod: payload.paymentMethod || undefined,
        externalPaymentId: payload.externalPaymentId || undefined,
        paidAt: payload.paidAt || undefined,
      },
      session.userId,
    );
    return adminJson(payment, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
