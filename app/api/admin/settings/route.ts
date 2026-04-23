import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { tenantSettingsMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { getAdminSettingsIntegrationsSnapshot } from "@/server/admin/settings-integrations";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const [guides, billingGateway, pluginRuntime, integrations, profile, settings, branches, billing] = await Promise.all([
      repository.getWorkspaceGuides(tenant.tenantId),
      repository.getBillingGatewayControls(tenant.tenantId),
      repository.getPluginRuntimeControls(tenant.tenantId),
      getAdminSettingsIntegrationsSnapshot(tenant.tenantSlug),
      repository.getTenantProfile(tenant.tenantId),
      repository.getTenantSettings(tenant.tenantId),
      repository.listBranches(tenant.tenantId),
      repository.getTenantBillingOverview(tenant.tenantId),
    ]);
    return adminJson({ profile, settings, branches, billing, guides, billingGateway, pluginRuntime, integrations });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = tenantSettingsMutationSchema.parse(await request.json());
    const result = await repository.updateTenantWorkspaceSettings(
      tenant.tenantId,
      {
        ...payload,
        logoUrl: payload.logoUrl || undefined,
        introductionHtml: payload.introductionHtml || undefined,
      },
      session.userId,
    );
    return adminJson(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
