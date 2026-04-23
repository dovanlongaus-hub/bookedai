"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import {
  billingSettingsMutationSchema,
  billingGatewayControlsMutationSchema,
  branchMutationSchema,
  branchRouteIdSchema,
  pluginRuntimeControlsMutationSchema,
  tenantSettingsMutationSchema,
  workspaceGuidesMutationSchema,
} from "@/lib/validation/admin";

function parseSettingsPayload(formData: FormData) {
  const payload = tenantSettingsMutationSchema.parse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    locale: formData.get("locale"),
    currency: formData.get("currency"),
    logoUrl: formData.get("logoUrl"),
    introductionHtml: formData.get("introductionHtml"),
  });

  return {
    ...payload,
    logoUrl: payload.logoUrl || undefined,
    introductionHtml: payload.introductionHtml || undefined,
  };
}

export async function updateWorkspaceSettingsAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateTenantWorkspaceSettings(
    tenant.tenantId,
    parseSettingsPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  redirect("/admin/settings");
}

function parseBranchPayload(formData: FormData) {
  return branchMutationSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    timezone: formData.get("timezone"),
  });
}

function parseBillingPayload(formData: FormData) {
  const payload = billingSettingsMutationSchema.parse({
    provider: formData.get("provider"),
    externalId: formData.get("externalId"),
    planCode: formData.get("planCode"),
    status: formData.get("status"),
    renewsAt: formData.get("renewsAt"),
  });

  return {
    ...payload,
    externalId: payload.externalId || undefined,
    renewsAt: payload.renewsAt || undefined,
  };
}

function parseWorkspaceGuidesPayload(formData: FormData) {
  return workspaceGuidesMutationSchema.parse({
    overview: formData.get("overview"),
    experience: formData.get("experience"),
    catalog: formData.get("catalog"),
    plugin: formData.get("plugin"),
    bookings: formData.get("bookings"),
    integrations: formData.get("integrations"),
    billing: formData.get("billing"),
    team: formData.get("team"),
  });
}

function parseBillingGatewayControlsPayload(formData: FormData) {
  const payload = billingGatewayControlsMutationSchema.parse({
    merchantModeOverride: formData.get("merchantModeOverride"),
    stripeCustomerId: formData.get("stripeCustomerId"),
    stripeCustomerEmail: formData.get("stripeCustomerEmail"),
  });

  return {
    merchantModeOverride: payload.merchantModeOverride || undefined,
    stripeCustomerId: payload.stripeCustomerId || undefined,
    stripeCustomerEmail: payload.stripeCustomerEmail || undefined,
  };
}

function parsePluginRuntimeControlsPayload(formData: FormData) {
  const payload = pluginRuntimeControlsMutationSchema.parse({
    partnerName: formData.get("partnerName"),
    partnerWebsiteUrl: formData.get("partnerWebsiteUrl"),
    bookedaiHost: formData.get("bookedaiHost"),
    embedPath: formData.get("embedPath"),
    widgetScriptPath: formData.get("widgetScriptPath"),
    widgetId: formData.get("widgetId"),
    headline: formData.get("headline"),
    prompt: formData.get("prompt"),
    accentColor: formData.get("accentColor"),
    buttonLabel: formData.get("buttonLabel"),
    modalTitle: formData.get("modalTitle"),
    supportEmail: formData.get("supportEmail"),
    supportWhatsapp: formData.get("supportWhatsapp"),
    logoUrl: formData.get("logoUrl"),
  });

  return {
    partnerName: payload.partnerName || undefined,
    partnerWebsiteUrl: payload.partnerWebsiteUrl || undefined,
    bookedaiHost: payload.bookedaiHost || undefined,
    embedPath: payload.embedPath || undefined,
    widgetScriptPath: payload.widgetScriptPath || undefined,
    widgetId: payload.widgetId || undefined,
    headline: payload.headline || undefined,
    prompt: payload.prompt || undefined,
    accentColor: payload.accentColor || undefined,
    buttonLabel: payload.buttonLabel || undefined,
    modalTitle: payload.modalTitle || undefined,
    supportEmail: payload.supportEmail || undefined,
    supportWhatsapp: payload.supportWhatsapp || undefined,
    logoUrl: payload.logoUrl || undefined,
  };
}

export async function createBranchAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.createBranch(tenant.tenantId, parseBranchPayload(formData), session.userId);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function updateBranchAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const { branchId } = branchRouteIdSchema.parse({
    branchId: formData.get("branchId"),
  });
  await repository.updateBranch(tenant.tenantId, branchId, parseBranchPayload(formData), session.userId);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function archiveBranchAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const { branchId } = branchRouteIdSchema.parse({
    branchId: formData.get("branchId"),
  });
  await repository.setBranchActiveState(tenant.tenantId, branchId, false, session.userId);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function reactivateBranchAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const { branchId } = branchRouteIdSchema.parse({
    branchId: formData.get("branchId"),
  });
  await repository.setBranchActiveState(tenant.tenantId, branchId, true, session.userId);
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

export async function updateBillingSettingsAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateTenantBillingSettings(
    tenant.tenantId,
    parseBillingPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tenants");
  redirect("/admin/settings");
}

export async function updateWorkspaceGuidesAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateWorkspaceGuides(
    tenant.tenantId,
    parseWorkspaceGuidesPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tenants");
  redirect("/admin/settings");
}

export async function updateBillingGatewayControlsAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updateBillingGatewayControls(
    tenant.tenantId,
    parseBillingGatewayControlsPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tenants");
  redirect("/admin/settings");
}

export async function updatePluginRuntimeControlsAction(formData: FormData) {
  const session = await requirePermission("settings:update");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  await repository.updatePluginRuntimeControls(
    tenant.tenantId,
    parsePluginRuntimeControlsPayload(formData),
    session.userId,
  );
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tenants");
  redirect("/admin/settings");
}
