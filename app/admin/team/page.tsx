import { createTeamMemberAction, updateTeamMemberAccessAction } from "@/app/admin/team/actions";
import { TeamMemberForm } from "@/components/admin/team/team-member-form";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

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

export default async function TeamPage() {
  await requirePermission("users:view");
  await requirePermission("roles:view");
  const session = await getAdminSession();
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [users, roles] = await Promise.all([
    repository.listUsers(tenant.tenantId),
    repository.listRoles(tenant.tenantId),
  ]);

  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const invitedUsers = users.filter((user) => user.status === "INVITED").length;
  const disabledUsers = users.filter((user) => user.status === "DISABLED").length;
  const supportModeActive = Boolean(session.impersonation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Team and roles"
        description="This control plane gives tenant admins a practical operator surface for team access: invite users, move them between active and invited states, and keep role visibility close to daily execution."
      />
      <SupportModePageBanner
        scopeLabel="Team and roles"
        tenantPanel="team"
        adminPath="/admin/team"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Team members" value={String(users.length)} hint="Current active tenant roster." />
        <MetricCard label="Active" value={String(activeUsers)} hint="Operators with immediate workspace access." />
        <MetricCard label="Invited" value={String(invitedUsers)} hint="Pending activation and onboarding." />
        <MetricCard label="Roles" value={String(roles.length)} hint="Role catalog available for assignment." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_430px]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Team access roster</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep user status and primary role aligned with the tenant operating model. Role assignment is edit-ready here; deeper permission editing remains anchored in the role catalog.
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Team member</th>
                  <th className="px-4 py-3">Current role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{user.name || user.email}</div>
                      <div className="mt-1 text-slate-600">{user.email}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        Added {user.createdAt.slice(0, 10)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {user.primaryRoleName || "No role assigned"}
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge
                        tone={
                          user.status === "ACTIVE"
                            ? "success"
                            : user.status === "INVITED"
                              ? "warning"
                              : "default"
                        }
                      >
                        {user.status}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4">
                      <form
                        action={updateTeamMemberAccessAction.bind(null, user.id)}
                        className="flex flex-col gap-3 xl:flex-row"
                      >
                        <fieldset disabled={supportModeActive} className="contents">
                        <select
                          name="roleId"
                          defaultValue={user.primaryRoleId ?? ""}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                        >
                          <option value="">No role</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="status"
                          defaultValue={user.status}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INVITED">INVITED</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                        <AdminButton type="submit" variant="secondary">
                          Save
                        </AdminButton>
                        </fieldset>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Add team member</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create an operator record now and assign the primary role up front so the workspace opens with the right access lane.
          </p>
          <div className="mt-6">
            <TeamMemberForm
              action={createTeamMemberAction}
              roles={roles}
              submitLabel="Create member"
              disabled={supportModeActive}
            />
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Role catalog</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950">{role.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{role.description || role.slug}</div>
                </div>
                <AdminBadge>{role.permissionSlugs.length} permissions</AdminBadge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.permissionSlugs.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
