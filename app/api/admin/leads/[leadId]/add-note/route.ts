import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { leadNoteMutationSchema, leadRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ leadId: string }> | { leadId: string };
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("leads:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { leadId } = leadRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = leadNoteMutationSchema.parse(await request.json());
    const lead = await repository.appendLeadNote(
      tenant.tenantId,
      leadId,
      {
        note: payload.note,
        contactAt: payload.contactAt || undefined,
      },
      session.userId,
    );

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
