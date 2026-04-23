import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";
import { getAdminSettingsIntegrationsSnapshot } from "@/server/admin/settings-integrations";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const integrations = await getAdminSettingsIntegrationsSnapshot(tenant.tenantSlug);
    return adminJson(integrations);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
