import { updateRolePermissionsAction } from "@/app/admin/roles/actions";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

export default async function RolesPage() {
  await requirePermission("roles:view");
  const session = await getAdminSession();
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [roles, permissions] = await Promise.all([
    repository.listRoles(tenant.tenantId),
    repository.listPermissions(tenant.tenantId),
  ]);

  const categories = Array.from(new Set(permissions.map((permission) => permission.category || "general")));
  const supportModeActive = Boolean(session.impersonation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Roles and permissions"
        description="This workspace covers permission management for the admin area: review role posture, edit permission sets, and keep access semantics close to the modules people use every day."
      />
      <SupportModePageBanner
        scopeLabel="Roles and permissions"
        tenantPanel="team"
        adminPath="/admin/roles"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Roles" value={String(roles.length)} hint="Tenant-scoped role catalog." />
        <MetricCard label="Permissions" value={String(permissions.length)} hint="Available permission vocabulary." />
        <MetricCard label="Categories" value={String(categories.length)} hint="Permission grouping for faster review." />
      </div>

      <div className="space-y-6">
        {roles.map((role) => (
          <AdminCard key={role.id} className="p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{role.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {role.description || role.slug}
                </p>
              </div>
              <AdminBadge tone="info">{role.permissionSlugs.length} permissions</AdminBadge>
            </div>

            <form action={updateRolePermissionsAction.bind(null, role.id)} className="mt-6 space-y-5">
              <fieldset disabled={supportModeActive} className="space-y-5">
              {categories.map((category) => {
                const scopedPermissions = permissions.filter(
                  (permission) => (permission.category || "general") === category,
                );

                return (
                  <div key={category} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {category}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {scopedPermissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            name="permissionSlugs"
                            value={permission.slug}
                            defaultChecked={role.permissionSlugs.includes(permission.slug)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold text-slate-950">{permission.slug}</span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {permission.description || permission.name}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <AdminButton type="submit">Save permissions</AdminButton>
              </fieldset>
            </form>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
