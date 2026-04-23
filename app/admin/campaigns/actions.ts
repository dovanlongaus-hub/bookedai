"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { campaignFormSchema } from "@/lib/validation/admin";

function toPayload(formData: FormData) {
  return campaignFormSchema.parse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    sourcePlatform: formData.get("sourcePlatform"),
    sourceKey: formData.get("sourceKey"),
    status: formData.get("status"),
    budgetCents: formData.get("budgetCents"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    utmSource: formData.get("utmSource"),
    utmMedium: formData.get("utmMedium"),
    utmCampaign: formData.get("utmCampaign"),
    notes: formData.get("notes"),
  });
}

export async function createCampaignAction(formData: FormData) {
  const session = await requirePermission("campaigns:create");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  const campaign = await getAdminRepository().createCampaign(tenant.tenantId, payload, session.userId);
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns?edit=${campaign?.id ?? ""}`);
}

export async function updateCampaignAction(campaignId: string, formData: FormData) {
  const session = await requirePermission("campaigns:update");
  const tenant = await getTenantContext();
  const payload = toPayload(formData);
  await getAdminRepository().updateCampaign(tenant.tenantId, campaignId, payload, session.userId);
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns?edit=${campaignId}`);
}

export async function archiveCampaignAction(campaignId: string) {
  const session = await requirePermission("campaigns:delete");
  const tenant = await getTenantContext();
  await getAdminRepository().softDeleteCampaign(tenant.tenantId, campaignId, session.userId);
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns");
}
