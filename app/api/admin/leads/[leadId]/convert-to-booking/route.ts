import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { leadConvertBookingSchema, leadRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ leadId: string }> | { leadId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requirePermission("leads:update");
    const session = await requirePermission("bookings:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = leadConvertBookingSchema.parse(await request.json());
    const booking = await repository.convertLeadToBooking(
      tenant.tenantId,
      leadId,
      payload.serviceId,
      session.userId,
    );

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Lead or service not found." } },
        { status: 404 },
      );
    }

    return adminJson(booking, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
