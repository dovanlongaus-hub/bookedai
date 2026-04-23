import "server-only";

import { type Permission, requirePermission } from "@/lib/rbac/policies";

export async function requireAdminPermission(permission: Permission) {
  return requirePermission(permission);
}
