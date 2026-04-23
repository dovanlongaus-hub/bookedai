import { NextResponse } from "next/server";

import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import {
  customerMutationSchema,
  customerRouteIdSchema,
} from "@/lib/validation/admin";
import { adminErrorResponse, adminJson } from "@/server/admin/api-responses";

type RouteContext = {
  params: Promise<{ customerId: string }> | { customerId: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requirePermission("customers:view");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { customerId } = customerRouteIdSchema.parse(await Promise.resolve(context.params));
    const customer = await repository.getCustomerById(tenant.tenantId, customerId);

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Customer not found." } },
        { status: 404 },
      );
    }

    const [bookings, payments, auditLogs, timeline] = await Promise.all([
      repository.listCustomerBookings(tenant.tenantId, customerId),
      repository.listCustomerPayments(tenant.tenantId, customerId),
      repository.listCustomerAuditLogs(tenant.tenantId, customerId),
      repository.listCustomerTimeline(tenant.tenantId, customerId),
    ]);

    return adminJson({
      customer,
      bookings,
      payments,
      auditLogs,
      timeline,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("customers:update");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { customerId } = customerRouteIdSchema.parse(await Promise.resolve(context.params));
    const body = await request.json();
    const payload = customerMutationSchema.parse(body);
    const customer = await repository.updateCustomer(
      tenant.tenantId,
      customerId,
      payload,
      session.userId,
    );

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Customer not found." } },
        { status: 404 },
      );
    }

    return adminJson(customer);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requirePermission("customers:delete");
    const tenant = await getTenantContext();
    const repository = getAdminRepository();
    const { customerId } = customerRouteIdSchema.parse(await Promise.resolve(context.params));
    const customer = await repository.softDeleteCustomer(
      tenant.tenantId,
      customerId,
      session.userId,
    );

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Customer not found." } },
        { status: 404 },
      );
    }

    return adminJson({
      id: customer.id,
      deletedAt: customer.deletedAt,
      status: "archived",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
