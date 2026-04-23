import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { billingGatewayControlsMutationSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

export async function GET() {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const gateway = await repository.getBillingGatewayControls(tenant.tenantId);
    return adminJson(gateway);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const payload = billingGatewayControlsMutationSchema.parse(await request.json());
    const gateway = await repository.updateBillingGatewayControls(
      tenant.tenantId,
      {
        merchantModeOverride: payload.merchantModeOverride || undefined,
        stripeCustomerId: payload.stripeCustomerId || undefined,
        stripeCustomerEmail: payload.stripeCustomerEmail || undefined,
      },
      session.userId,
    );
    return adminJson(gateway);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
