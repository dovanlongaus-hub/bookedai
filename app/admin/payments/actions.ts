"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { paymentMutationSchema, paymentStatusMutationSchema } from "@/lib/validation/admin";

function parsePaymentPayload(formData: FormData) {
  const payload = paymentMutationSchema.parse({
    customerId: formData.get("customerId"),
    bookingId: formData.get("bookingId"),
    provider: formData.get("provider"),
    amountCents: formData.get("amountCents"),
    currency: formData.get("currency"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
    externalPaymentId: formData.get("externalPaymentId"),
    paidAt: formData.get("paidAt"),
  });

  return {
    ...payload,
    bookingId: payload.bookingId || undefined,
    paymentMethod: payload.paymentMethod || undefined,
    externalPaymentId: payload.externalPaymentId || undefined,
    paidAt: payload.paidAt || undefined,
  };
}

function parsePaymentStatusPayload(formData: FormData) {
  const payload = paymentStatusMutationSchema.parse({
    status: formData.get("status"),
    paidAt: formData.get("paidAt"),
    refundedAt: formData.get("refundedAt"),
  });

  return {
    ...payload,
    paidAt: payload.paidAt || undefined,
    refundedAt: payload.refundedAt || undefined,
  };
}

export async function createPaymentAction(formData: FormData) {
  const session = await requirePermission("payments:create");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.createPayment(tenant.tenantId, parsePaymentPayload(formData), session.userId);
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  redirect("/admin/payments");
}

export async function updatePaymentStatusAction(paymentId: string, formData: FormData) {
  const session = await requirePermission("payments:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updatePaymentStatus(
    tenant.tenantId,
    paymentId,
    parsePaymentStatusPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  redirect("/admin/payments");
}
