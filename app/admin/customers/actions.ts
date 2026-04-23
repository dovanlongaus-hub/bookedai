"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { syncAdminCustomerToZohoContact } from "@/lib/integrations/zoho-contact-sync";
import { retryZohoCrmSyncRecord } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { customerFormSchema } from "@/lib/validation/admin";

function toPayload(formData: FormData) {
  return customerFormSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    lifecycleStage: formData.get("lifecycleStage"),
    sourceLabel: formData.get("sourceLabel"),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    marketingConsent: formData.get("marketingConsent") === "on",
    notes: formData.get("notes"),
  });
}

export async function createCustomerAction(formData: FormData) {
  const session = await requirePermission("customers:create");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  const repository = getAdminRepository();
  const customer = await repository.createCustomer(tenant.tenantId, payload, session.userId);
  await syncAdminCustomerToZohoContact({
    tenantId: tenant.tenantId,
    contactId: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    actorUserId: session.userId,
  });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}`);
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const session = await requirePermission("customers:update");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  const repository = getAdminRepository();
  const customer = await repository.updateCustomer(tenant.tenantId, customerId, payload, session.userId);
  if (customer) {
    await syncAdminCustomerToZohoContact({
      tenantId: tenant.tenantId,
      contactId: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      actorUserId: session.userId,
    });
  }
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}`);
}

export async function archiveCustomerAction(customerId: string) {
  const session = await requirePermission("customers:delete");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.softDeleteCustomer(tenant.tenantId, customerId, session.userId);
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect("/admin/customers");
}

export async function syncCustomerCrmContactAction(customerId: string) {
  const session = await requirePermission("customers:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const customer = await repository.getCustomerById(tenant.tenantId, customerId);

  if (!customer) {
    throw new Error("Customer not found.");
  }

  await syncAdminCustomerToZohoContact({
    tenantId: tenant.tenantId,
    contactId: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function retryCustomerCrmSyncAction(customerId: string, crmSyncRecordId: number) {
  const session = await requirePermission("customers:update");
  const tenant = await getTenantContext();

  await retryZohoCrmSyncRecord({
    tenantId: tenant.tenantId,
    crmSyncRecordId,
    actorUserId: session.userId,
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
}
