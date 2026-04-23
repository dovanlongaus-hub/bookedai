import "server-only";

import { getTenantContext } from "@/lib/tenant/context";

export async function requireTenantContext(tenantSlug?: string) {
  return getTenantContext(tenantSlug);
}
