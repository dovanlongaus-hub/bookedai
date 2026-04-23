import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { billingSettingsMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const billing = await repository.getTenantBillingOverview(tenant.tenantId);
    return adminJson(billing);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = billingSettingsMutationSchema.parse(await request.json());
    const billing = await repository.updateTenantBillingSettings(
      tenant.tenantId,
      {
        ...payload,
        externalId: payload.externalId || undefined,
        renewsAt: payload.renewsAt || undefined,
      },
      session.userId,
    );
    return adminJson(billing);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
