import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  timezone: string;
  locale: string;
};

export async function getTenantContext(tenantSlug?: string): Promise<TenantContext> {
  const session = await getAdminSession();
  const repository = getAdminRepository();
  const tenants = await repository.listTenantOptions(session.userId, session.role);
  const sessionTenantSet = new Set(session.tenantIds);
  const accessibleTenants = tenants.filter((tenant) => sessionTenantSet.has(tenant.id));
  const selected =
    accessibleTenants.find((tenant) => tenant.slug === tenantSlug) ??
    accessibleTenants.find((tenant) => tenant.id === session.activeTenantId) ??
    accessibleTenants[0];

  if (!selected) {
    throw new Error("No tenant is available for this session.");
  }

  return {
    tenantId: selected.id,
    tenantSlug: selected.slug,
    tenantName: selected.name,
    timezone: selected.timezone,
    locale: selected.locale,
  };
}
