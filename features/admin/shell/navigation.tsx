"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  BriefcaseBusiness,
  CalendarDays,
  Building2,
  CreditCard,
  ShieldCheck,
  Settings,
  FileSearch,
  KeyRound,
  BarChart3,
  Megaphone,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: Target },
  { href: "/admin/services", label: "Services", icon: BriefcaseBusiness },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/team", label: "Team", icon: ShieldCheck },
  { href: "/admin/roles", label: "Roles", icon: KeyRound },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit", icon: FileSearch },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({
  tenantName,
  tenantSlug,
}: {
  tenantName: string;
  tenantSlug: string;
}) {
  const pathname = usePathname();

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          BookedAI Admin
        </div>
        <CardTitle className="text-2xl">Revenue Engine OS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Building2 className="h-3.5 w-3.5" />
            Active tenant
          </div>
          <div className="mt-2 text-base font-semibold text-slate-950">{tenantName}</div>
          <div className="mt-1 text-sm text-slate-600">{tenantSlug}</div>
          <div className="mt-3">
            <Badge variant="secondary">Multi-tenant context active</Badge>
          </div>
        </div>

        <nav className="space-y-1">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
