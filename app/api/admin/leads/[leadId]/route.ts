import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { leadMutationSchema, leadRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ leadId: string }> | { leadId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("leads:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const lead = await repository.getLeadById(tenant.tenantId, leadId);

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }

    const timeline = await repository.listLeadTimeline(tenant.tenantId, leadId);

    return adminJson({
      lead,
      timeline,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("leads:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = leadMutationSchema.parse(await request.json());
    const lead = await repository.updateLead(tenant.tenantId, leadId, payload, session.userId);

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }

    return adminJson(lead);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("leads:delete");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const lead = await repository.softDeleteLead(tenant.tenantId, leadId, session.userId);

    if (!lead) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }

    return adminJson({
      id: lead.id,
      deletedAt: lead.deletedAt,
      status: "archived",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
