import Link from "next/link";

import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { AuditLogRecord, getAdminRepository, PaginationResult } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("audit:view");
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const entityType = typeof params.entityType === "string" ? params.entityType : "all";

  const auditLogs = (await repository.listAuditLogs({
    tenantId: tenant.tenantId,
    page,
    pageSize: 12,
    query,
    entityType,
  })) as PaginationResult<AuditLogRecord>;

  const entityTypes = Array.from(new Set(auditLogs.items.map((item) => item.entityType)));
  const baseQuery = new URLSearchParams({
    q: query,
    entityType,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Audit workspace"
        description="This audit workspace turns event history into a clear review surface: filter by entity type, search summaries, and review the latest workspace and revenue changes in one place."
      />
      <SupportModePageBanner
        scopeLabel="Audit workspace"
        tenantPanel="integrations"
        adminPath="/admin/audit"
      />

      <AdminCard className="p-6">
        <form className="grid gap-3 md:grid-cols-4" action="/admin/audit">
          <AdminInput
            name="q"
            defaultValue={query}
            placeholder="Search entity, action, summary"
            className="md:col-span-2"
          />
          <select
            name="entityType"
            defaultValue={entityType}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All entity types</option>
            {entityTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <AdminButton type="submit" variant="secondary">
            Apply filters
          </AdminButton>
        </form>

        <div className="mt-6 space-y-3">
          {auditLogs.items.map((item) => (
            <div
              key={String(item.id)}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge tone="info">{item.entityType}</AdminBadge>
                    <AdminBadge>{item.action}</AdminBadge>
                  </div>
                  <div className="mt-3 text-base font-semibold text-slate-950">{item.summary}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    entity `{item.entityId}`{item.actorUserId ? ` • actor ${item.actorUserId}` : ""}
                  </div>
                </div>
                <div className="text-sm text-slate-500">{item.createdAt.slice(0, 19).replace("T", " ")}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>
            Page {auditLogs.page} of {auditLogs.totalPages} • {auditLogs.total} audit events
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/audit?page=${Math.max(auditLogs.page - 1, 1)}&${baseQuery.toString()}`}>
              <AdminButton variant="secondary" disabled={auditLogs.page <= 1}>
                Previous
              </AdminButton>
            </Link>
            <Link href={`/admin/audit?page=${Math.min(auditLogs.page + 1, auditLogs.totalPages)}&${baseQuery.toString()}`}>
              <AdminButton variant="secondary" disabled={auditLogs.page >= auditLogs.totalPages}>
                Next
              </AdminButton>
            </Link>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
