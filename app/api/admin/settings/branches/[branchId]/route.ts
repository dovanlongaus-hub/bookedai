import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import {
  branchMutationSchema,
  branchRouteIdSchema,
  branchStateMutationSchema,
} from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ branchId: string }> | { branchId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("settings:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { branchId } = branchRouteIdSchema.parse(await Promise.resolve(context.params));
    const branch = await repository.getBranchById(tenant.tenantId, branchId);

    if (!branch) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Branch not found." } },
        { status: 404 },
      );
    }

    return adminJson(branch);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("settings:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { branchId } = branchRouteIdSchema.parse(await Promise.resolve(context.params));
    const body = await request.json();

    const branch =
      typeof body?.isActive === "boolean"
        ? await repository.setBranchActiveState(
            tenant.tenantId,
            branchId,
            branchStateMutationSchema.parse(body).isActive,
            session.userId,
          )
        : await repository.updateBranch(
            tenant.tenantId,
            branchId,
            branchMutationSchema.parse(body),
            session.userId,
          );

    if (!branch) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Branch not found." } },
        { status: 404 },
      );
    }

    return adminJson(branch);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
