import { AdminSidebar } from "@/features/admin/shell/navigation";
import { AdminTopbar } from "@/features/admin/shell/topbar";

export function AdminWorkspaceShell({
  children,
  session,
  tenant,
}: {
  children: React.ReactNode;
      session: {
        name: string;
        email: string;
        role: string;
        impersonation?: {
          tenantSlug: string;
          mode: "read_only";
          reason?: string;
        } | null;
      };
  tenant: {
    tenantName: string;
    tenantSlug: string;
  };
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <AdminSidebar tenantName={tenant.tenantName} tenantSlug={tenant.tenantSlug} />
        </aside>
        <main className="min-w-0 flex-1 space-y-6">
          <AdminTopbar
          tenantName={tenant.tenantName}
          userName={session.name}
          userEmail={session.email}
          role={session.role}
          impersonation={session.impersonation}
        />
          {children}
        </main>
      </div>
    </div>
  );
}
