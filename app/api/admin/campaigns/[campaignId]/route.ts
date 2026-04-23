import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import {
  campaignMutationSchema,
  campaignRouteIdSchema,
} from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ campaignId: string }> | { campaignId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("campaigns:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { campaignId } = campaignRouteIdSchema.parse(await Promise.resolve(context.params));
    const campaign = await repository.getCampaignById(tenant.tenantId, campaignId);

    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Campaign not found." } },
        { status: 404 },
      );
    }

    return adminJson(campaign);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("campaigns:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { campaignId } = campaignRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = campaignMutationSchema.parse(await request.json());
    const campaign = await repository.updateCampaign(tenant.tenantId, campaignId, payload, session.userId);

    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Campaign not found." } },
        { status: 404 },
      );
    }

    return adminJson(campaign);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("campaigns:delete");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { campaignId } = campaignRouteIdSchema.parse(await Promise.resolve(context.params));
    const campaign = await repository.softDeleteCampaign(tenant.tenantId, campaignId, session.userId);

    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Campaign not found." } },
        { status: 404 },
      );
    }

    return adminJson({
      id: campaign.id,
      deletedAt: campaign.deletedAt,
      status: "archived",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
