import "server-only";

import { findLegacyAdminMembership, isLegacyAdminDatabaseConfigured } from "@/lib/db/legacy-admin-auth";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

type ResolvedAdminIdentity = {
  userId: string;
  email: string;
  name: string;
  role: string;
  activeTenantId: string;
  tenantIds: string[];
  activeTenantSlug?: string;
  activeTenantName?: string;
  source: "prisma" | "legacy" | "mock";
};

const bootstrapEligibleRoles = new Set([
  "PLATFORM_OWNER",
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "REVENUE_MANAGER",
  "SALES_MANAGER",
  "OPERATIONS_MANAGER",
]);

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
        activeTenantSlug: user.tenant.slug,
        activeTenantName: user.tenant.name,
        source: "prisma",
      };
    }
  }

  if (isLegacyAdminDatabaseConfigured()) {
    const membership = await findLegacyAdminMembership({
      email: normalizedEmail,
      tenantSlug,
    });

    if (membership) {
      return {
        userId: `legacy:${membership.tenant_id}:${membership.email.trim().toLowerCase()}`,
        email: membership.email.trim().toLowerCase(),
        name: membership.full_name?.trim() || membership.email.trim().toLowerCase(),
        role: mapRoleSlugToAdminRole(membership.role),
        activeTenantId: membership.tenant_id,
        tenantIds: [membership.tenant_id],
        activeTenantSlug: membership.tenant_slug,
        activeTenantName: membership.tenant_name,
        source: "legacy",
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
      activeTenantSlug: tenantSlug,
      source: "mock",
    };
  }

  return null;
}

function getAllowedBootstrapEmails() {
  return new Set(
    String(process.env.ADMIN_BOOTSTRAP_ALLOWED_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isValidAdminBootstrapPassword(password: string) {
  const expected = process.env.ADMIN_BOOTSTRAP_PASSWORD || (process.env.NODE_ENV !== "production" ? "bookedai-admin" : "");

  return Boolean(expected) && password === expected;
}

export function canUseAdminBootstrap(identity: ResolvedAdminIdentity) {
  if (!bootstrapEligibleRoles.has(identity.role)) {
    return false;
  }

  const allowedEmails = getAllowedBootstrapEmails();
  if (allowedEmails.size > 0 && !allowedEmails.has(identity.email.trim().toLowerCase())) {
    return false;
  }

  return true;
}

export function canUseAdminEmailSignIn(identity: ResolvedAdminIdentity) {
  return canUseAdminBootstrap(identity);
}

export function isAdminBootstrapEnabled() {
  return process.env.ADMIN_ENABLE_BOOTSTRAP_LOGIN === "1";
}
