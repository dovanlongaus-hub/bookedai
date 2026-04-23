"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Target, BriefcaseBusiness, CalendarDays } from "lucide-react";

import { AdminCard } from "@/components/ui/admin-card";
import { AdminBadge } from "@/components/ui/admin-badge";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: Target },
  { href: "/admin/services", label: "Services", icon: BriefcaseBusiness },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
];

export function AdminShell({
  children,
  session,
  tenant,
}: {
  children: React.ReactNode;
  session: {
    name: string;
    email: string;
    role: string;
  };
  tenant: {
    tenantName: string;
    tenantSlug: string;
  };
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <AdminCard className="sticky top-4 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              BookedAI Admin
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">
              Revenue Engine OS
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Multi-tenant revenue operations for service businesses. Reduce missed leads, increase booking conversion, and track revenue.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Active tenant
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{tenant.tenantName}</div>
              <div className="mt-1 text-sm text-slate-600">{tenant.tenantSlug}</div>
            </div>

            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </AdminCard>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <AdminCard className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Auth + tenant context
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-950">{tenant.tenantName}</h2>
                  <AdminBadge tone="info">{session.role}</AdminBadge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Signed in as {session.name} • {session.email}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Audit logs, soft delete, RBAC, and tenant isolation are baked into the foundation.
              </div>
            </div>
          </AdminCard>
          {children}
        </main>
      </div>
    </div>
  );
}
