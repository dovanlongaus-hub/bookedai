import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { leadRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ leadId: string }> | { leadId: string };
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requirePermission("leads:update");
    const session = await requirePermission("customers:create");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const customer = await repository.convertLeadToCustomer(tenant.tenantId, leadId, session.userId);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }

    return adminJson(customer, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
