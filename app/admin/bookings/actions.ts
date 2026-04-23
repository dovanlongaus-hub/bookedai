"use server";

import { revalidatePath } from "next/cache";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { bookingFormSchema, bookingRescheduleSchema } from "@/lib/validation/admin";

function toPayload(formData: FormData) {
  return bookingFormSchema.parse({
    customerId: formData.get("customerId"),
    serviceId: formData.get("serviceId"),
    status: formData.get("status"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    revenueCents: formData.get("revenueCents"),
    channel: formData.get("channel"),
    notes: formData.get("notes"),
  });
}

export async function createBookingAction(formData: FormData) {
  const session = await requirePermission("bookings:create");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  await getAdminRepository().createBooking(tenant.tenantId, payload, session.userId);
  revalidatePath("/admin/bookings");
}

export async function confirmBookingAction(bookingId: string) {
  const session = await requirePermission("bookings:update");
  const tenant = await getTenantContext();
  await getAdminRepository().confirmBooking(tenant.tenantId, bookingId, session.userId);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function cancelBookingAction(bookingId: string) {
  const session = await requirePermission("bookings:update");
  const tenant = await getTenantContext();
  await getAdminRepository().cancelBooking(tenant.tenantId, bookingId, session.userId);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function rescheduleBookingAction(bookingId: string, formData: FormData) {
  const session = await requirePermission("bookings:update");
  const tenant = await getTenantContext();
  const payload = bookingRescheduleSchema.parse({
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
  await getAdminRepository().rescheduleBooking(
    tenant.tenantId,
    bookingId,
    payload.startAt,
    payload.endAt,
    session.userId,
  );
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}
