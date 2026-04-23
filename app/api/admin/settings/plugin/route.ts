import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { pluginRuntimeControlsMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const pluginRuntime = await repository.getPluginRuntimeControls(tenant.tenantId);
    return adminJson(pluginRuntime);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = pluginRuntimeControlsMutationSchema.parse(await request.json());
    const pluginRuntime = await repository.updatePluginRuntimeControls(
      tenant.tenantId,
      {
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
      },
      session.userId,
    );
    return adminJson(pluginRuntime);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
