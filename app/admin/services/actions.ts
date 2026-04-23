"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { serviceFormSchema } from "@/lib/validation/admin";

function toPayload(formData: FormData) {
  return serviceFormSchema.parse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    priceCents: formData.get("priceCents"),
  });
}

export async function createServiceAction(formData: FormData) {
  const session = await requirePermission("services:create");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  const service = await getAdminRepository().createService(tenant.tenantId, payload, session.userId);
  revalidatePath("/admin/services");
  redirect(`/admin/services?edit=${service.id}`);
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const session = await requirePermission("services:update");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  await getAdminRepository().updateService(tenant.tenantId, serviceId, payload, session.userId);
  revalidatePath("/admin/services");
  redirect(`/admin/services?edit=${serviceId}`);
}

export async function archiveServiceAction(serviceId: string) {
  const session = await requirePermission("services:delete");
  const tenant = await getTenantContext();
  await getAdminRepository().softDeleteService(tenant.tenantId, serviceId, session.userId);
  revalidatePath("/admin/services");
  redirect("/admin/services");
}
