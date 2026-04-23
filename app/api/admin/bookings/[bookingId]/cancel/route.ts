import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { bookingRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ bookingId: string }> | { bookingId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("bookings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { bookingId } = bookingRouteIdSchema.parse(await Promise.resolve(context.params));
    const booking = await repository.cancelBooking(tenant.tenantId, bookingId, session.userId);

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Booking not found." } },
        { status: 404 },
      );
    }

    return adminJson(booking);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
