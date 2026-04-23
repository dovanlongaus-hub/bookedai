import { Badge } from "@/components/ui/shadcn/badge";
import { Card, CardContent } from "@/components/ui/shadcn/card";

export function AdminTopbar({
  tenantName,
  userName,
  userEmail,
  role,
  impersonation,
}: {
  tenantName: string;
  userName: string;
  userEmail: string;
  role: string;
  impersonation?: {
    tenantSlug: string;
    mode: "read_only";
    reason?: string;
  } | null;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Auth guard + tenant context
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">{tenantName}</h2>
            <Badge>{role}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Signed in as {userName} • {userEmail}
          </p>
          {impersonation ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Read-only support mode active for {impersonation.tenantSlug}
              {impersonation.reason ? ` • ${impersonation.reason}` : ""}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Audit logs, soft delete, RBAC, and tenant isolation are built into the admin foundation.
        </div>
      </CardContent>
    </Card>
  );
}
