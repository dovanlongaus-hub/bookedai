import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { paymentRouteIdSchema, paymentStatusMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ paymentId: string }> | { paymentId: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("payments:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { paymentId } = paymentRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = paymentStatusMutationSchema.parse(await request.json());
    const payment = await repository.updatePaymentStatus(
      tenant.tenantId,
      paymentId,
      {
        ...payload,
        paidAt: payload.paidAt || undefined,
        refundedAt: payload.refundedAt || undefined,
      },
      session.userId,
    );

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Payment not found." } },
        { status: 404 },
      );
    }

    return adminJson(payment);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
