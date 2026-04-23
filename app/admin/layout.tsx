import { AdminWorkspaceShell } from "@/features/admin/shell/workspace-shell";
import { getAdminWorkspaceContext } from "@/server/admin/workspace";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, tenant } = await getAdminWorkspaceContext();

  return (
    <AdminWorkspaceShell
      session={{
        name: session.name,
        email: session.email,
        role: session.role,
        impersonation: session.impersonation
          ? {
              tenantSlug: session.impersonation.tenantSlug,
              mode: session.impersonation.mode,
              reason: session.impersonation.reason,
            }
          : null,
      }}
      tenant={{ tenantName: tenant.tenantName, tenantSlug: tenant.tenantSlug }}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
