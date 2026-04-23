import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { serviceMutationSchema, serviceRouteIdSchema } from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ serviceId: string }> | { serviceId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("services:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { serviceId } = serviceRouteIdSchema.parse(await Promise.resolve(context.params));
    const service = await repository.getServiceById(tenant.tenantId, serviceId);

    if (!service) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Service not found." } },
        { status: 404 },
      );
    }

    return adminJson(service);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("services:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { serviceId } = serviceRouteIdSchema.parse(await Promise.resolve(context.params));
    const payload = serviceMutationSchema.parse(await request.json());
    const service = await repository.updateService(tenant.tenantId, serviceId, payload, session.userId);

    if (!service) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Service not found." } },
        { status: 404 },
      );
    }

    return adminJson(service);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("services:delete");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { serviceId } = serviceRouteIdSchema.parse(await Promise.resolve(context.params));
    const service = await repository.softDeleteService(tenant.tenantId, serviceId, session.userId);

    if (!service) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Service not found." } },
        { status: 404 },
      );
    }

    return adminJson({
      id: service.id,
      deletedAt: service.deletedAt,
      status: "archived",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
