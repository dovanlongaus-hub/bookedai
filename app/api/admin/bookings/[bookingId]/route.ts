import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { bookingMutationSchema, bookingRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ bookingId: string }> | { bookingId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("bookings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { bookingId } = bookingRouteIdSchema.parse(await Promise.resolve(context.params));
    const booking = await repository.getBookingById(tenant.tenantId, bookingId);

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Booking not found." } },
        { status: 404 },
      );
    }

    const [payments, timeline] = await Promise.all([
      repository.listBookingPayments(tenant.tenantId, bookingId),
      repository.listBookingTimeline(tenant.tenantId, bookingId),
    ]);

    return adminJson({
      booking,
      payments,
      paymentStatus:
        payments.find((payment) => payment.status === "paid")?.status ??
        payments[0]?.status ??
        "unlinked",
      timeline,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("bookings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { bookingId } = bookingRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = bookingMutationSchema.parse(await request.json());
    const booking = await repository.updateBooking(tenant.tenantId, bookingId, payload, session.userId);

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
