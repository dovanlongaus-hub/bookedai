import "server-only";

import { requireAdminSession } from "@/server/admin/auth";
import { requireTenantContext } from "@/server/admin/tenant-context";

export async function getAdminWorkspaceContext() {
  const [session, tenant] = await Promise.all([
    requireAdminSession(),
    requireTenantContext(),
  ]);

  return { session, tenant };
}
