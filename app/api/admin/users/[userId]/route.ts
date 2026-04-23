import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { userAccessMutationSchema, userRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ userId: string }> | { userId: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("users:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { userId } = userRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = userAccessMutationSchema.parse(await request.json());
    const user = await repository.updateUserAccess(
      tenant.tenantId,
      userId,
      { ...payload, roleId: payload.roleId || undefined },
      session.userId,
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "User not found." } },
        { status: 404 },
      );
    }

    return adminJson(user);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
