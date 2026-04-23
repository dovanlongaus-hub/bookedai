import "server-only";

import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

type ResolvedAdminIdentity = {
  userId: string;
  email: string;
  name: string;
  role: string;
  activeTenantId: string;
  tenantIds: string[];
};

function mapRoleSlugToAdminRole(roleSlug?: string | null) {
  const normalized = String(roleSlug || "").trim().toLowerCase();

  if (normalized === "platform-owner" || normalized === "platform_owner") {
    return "PLATFORM_OWNER";
  }

  if (normalized === "tenant-admin" || normalized === "tenant_admin") {
    return "TENANT_ADMIN";
  }

  if (normalized === "revenue-manager" || normalized === "revenue_manager") {
    return "REVENUE_MANAGER";
  }

  if (normalized === "sales-manager" || normalized === "sales_manager") {
    return "SALES_MANAGER";
  }

  if (normalized === "operations-manager" || normalized === "operations_manager") {
    return "OPERATIONS_MANAGER";
  }

  return "VIEWER";
}

export async function resolveAdminIdentity(
  email: string,
  tenantSlug?: string,
): Promise<ResolvedAdminIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isDatabaseConfigured()) {
    const prisma = getPrismaClient();
    if (prisma) {
      const user = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          deletedAt: null,
          tenant: tenantSlug
            ? {
                slug: tenantSlug,
                deletedAt: null,
              }
            : {
                deletedAt: null,
              },
        },
        include: {
          tenant: true,
          assignedRoles: {
            where: { deletedAt: null, role: { deletedAt: null } },
            include: { role: true },
          },
        },
      });

      if (!user?.tenant) {
        return null;
      }

      const firstRole = user.assignedRoles[0]?.role?.slug;
      return {
        userId: user.id,
        email: user.email,
        name: user.name?.trim() || user.email,
        role: mapRoleSlugToAdminRole(firstRole),
        activeTenantId: user.tenant.id,
        tenantIds: [user.tenant.id],
      };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const mockTenantId =
      tenantSlug === "ocean-studio" ? "tenant_ocean_studio" : "tenant_harbour_glow";
    return {
      userId: "user_dev_admin",
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0] || "BookedAI Operator",
      role: normalizedEmail.startsWith("owner@") ? "PLATFORM_OWNER" : "TENANT_ADMIN",
      activeTenantId: mockTenantId,
      tenantIds: [mockTenantId, "tenant_ocean_studio", "tenant_harbour_glow"],
    };
  }

  return null;
}

export function isValidAdminBootstrapPassword(password: string) {
  const expected =
    process.env.ADMIN_BOOTSTRAP_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== "production" ? "bookedai-admin" : "");

  return Boolean(expected) && password === expected;
}

