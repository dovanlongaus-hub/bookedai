import { getAdminSession, type AdminRole } from "@/lib/auth/session";

export type Permission =
  | "dashboard:view"
  | "tenants:view"
  | "tenants:update"
  | "users:view"
  | "users:create"
  | "users:update"
  | "roles:view"
  | "roles:update"
  | "settings:view"
  | "settings:update"
  | "customers:view"
  | "customers:create"
  | "customers:update"
  | "customers:delete"
  | "leads:view"
  | "leads:create"
  | "leads:update"
  | "leads:delete"
  | "services:view"
  | "services:create"
  | "services:update"
  | "services:delete"
  | "bookings:view"
  | "bookings:create"
  | "bookings:update"
  | "campaigns:view"
  | "campaigns:create"
  | "campaigns:update"
  | "campaigns:delete"
  | "payments:view"
  | "payments:create"
  | "payments:update"
  | "reports:view"
  | "audit:view";

const allPermissions: Permission[] = [
  "dashboard:view",
  "tenants:view",
  "tenants:update",
  "users:view",
  "users:create",
  "users:update",
  "roles:view",
  "roles:update",
  "settings:view",
  "settings:update",
  "customers:view",
  "customers:create",
  "customers:update",
  "customers:delete",
  "leads:view",
  "leads:create",
  "leads:update",
  "leads:delete",
  "services:view",
  "services:create",
  "services:update",
  "services:delete",
  "bookings:view",
  "bookings:create",
  "bookings:update",
  "campaigns:view",
  "campaigns:create",
  "campaigns:update",
  "campaigns:delete",
  "payments:view",
  "payments:create",
  "payments:update",
  "reports:view",
  "audit:view",
];

const permissionsByRole: Record<AdminRole, Permission[]> = {
  PLATFORM_OWNER: allPermissions,
  SUPER_ADMIN: allPermissions,
  TENANT_ADMIN: allPermissions,
  REVENUE_MANAGER: [
    "dashboard:view",
    "customers:view",
    "customers:create",
    "customers:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "services:view",
    "services:update",
    "bookings:view",
    "bookings:create",
    "bookings:update",
    "campaigns:view",
    "campaigns:create",
    "campaigns:update",
    "campaigns:delete",
    "payments:view",
    "reports:view",
    "audit:view",
  ],
  MANAGER: [
    "dashboard:view",
    "customers:view",
    "customers:create",
    "customers:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "services:view",
    "services:update",
    "bookings:view",
    "bookings:create",
    "bookings:update",
    "campaigns:view",
    "campaigns:create",
    "campaigns:update",
    "payments:view",
    "reports:view",
    "audit:view",
  ],
  SALES_MANAGER: [
    "dashboard:view",
    "customers:view",
    "customers:create",
    "customers:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "leads:delete",
    "services:view",
    "bookings:view",
    "reports:view",
    "campaigns:view",
    "campaigns:create",
    "campaigns:update",
  ],
  SALES_SUPPORT: [
    "dashboard:view",
    "customers:view",
    "customers:create",
    "customers:update",
    "leads:view",
    "leads:create",
    "leads:update",
    "services:view",
    "bookings:view",
    "campaigns:view",
  ],
  OPERATIONS_MANAGER: [
    "dashboard:view",
    "customers:view",
    "customers:update",
    "services:view",
    "bookings:view",
    "bookings:create",
    "bookings:update",
    "payments:view",
  ],
  STAFF: [
    "dashboard:view",
    "customers:view",
    "leads:view",
    "services:view",
    "bookings:view",
    "bookings:update",
  ],
  VIEWER: ["dashboard:view", "customers:view", "leads:view", "services:view", "bookings:view"],
};

export async function requirePermission(permission: Permission) {
  const session = await getAdminSession();
  const allowed = permissionsByRole[session.role] ?? [];

  if (!allowed.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }

  if (session.impersonation && !permission.endsWith(":view")) {
    throw new Error(
      `Read-only support mode blocks mutation permission: ${permission}. End support mode before making changes.`,
    );
  }

  return session;
}
