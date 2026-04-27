import Link from "next/link";

import {
  archiveServiceAction,
  createServiceAction,
  updateServiceAction,
} from "@/app/admin/services/actions";
import { ServiceForm } from "@/components/admin/services/service-form";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("services:view");
  const session = await getAdminSession();
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const sortBy = typeof params.sort_by === "string" ? params.sort_by : "updatedAt";
  const sortOrder = typeof params.sort_order === "string" ? params.sort_order : "desc";
  const editId = typeof params.edit === "string" ? params.edit : "";

  const services = await repository.listServices({
    tenantId: tenant.tenantId,
    page,
    pageSize: 8,
    query,
    sortBy:
      sortBy === "name" || sortBy === "priceCents" || sortBy === "durationMinutes"
        ? sortBy
        : "updatedAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });
  const editingService = editId ? await repository.getServiceById(tenant.tenantId, editId) : null;
  const supportModeActive = Boolean(session.impersonation);
  const baseQuery = new URLSearchParams({
    q: query,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 7"
        title="Services module"
        description="This services workspace stays intentionally simple: list, search, create, edit, and archive around the three core commercial fields that matter most here, name, duration, and price."
      />
      <SupportModePageBanner
        scopeLabel="Services module"
        tenantPanel="overview"
        adminPath="/admin/services"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Services in view" value={String(services.total)} hint="Soft-deleted rows stay hidden." />
        <MetricCard label="Average duration" value={`${Math.round((services.items.reduce((sum, service) => sum + service.durationMinutes, 0) || 0) / Math.max(services.items.length, 1))} mins`} hint="Based on the current filtered list." />
        <MetricCard label="Average price" value={money(Math.round((services.items.reduce((sum, service) => sum + service.priceCents, 0) || 0) / Math.max(services.items.length, 1)))} hint="Simple commercial benchmark for the current view." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
        <AdminCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Service list</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep the catalog lightweight here. This workspace focuses on the offer essentials teams need most often.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-4" action="/admin/services">
            <AdminInput
              name="q"
              defaultValue={query}
              placeholder="Search service name"
              className="md:col-span-2"
            />
            <select
              name="sort_by"
              defaultValue={sortBy}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="updatedAt">Sort by updated</option>
              <option value="name">Sort by name</option>
              <option value="priceCents">Sort by price</option>
              <option value="durationMinutes">Sort by duration</option>
            </select>
            <select
              name="sort_order"
              defaultValue={sortOrder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <div className="flex gap-3 md:col-span-4">
              <AdminButton type="submit" variant="secondary">Apply</AdminButton>
              <Link href="/admin/services" className="inline-flex">
                <AdminButton type="button" variant="ghost">Reset</AdminButton>
              </Link>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {services.items.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{service.name}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {service.durationMinutes} mins • {money(service.priceCents)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/services?edit=${service.id}`}>
                      <AdminButton variant="secondary">Edit</AdminButton>
                    </Link>
                    <form action={archiveServiceAction.bind(null, service.id)}>
                      <AdminButton type="submit" variant="danger" disabled={supportModeActive}>Archive</AdminButton>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {services.page} of {services.totalPages} • {services.total} services
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/services?page=${Math.max(services.page - 1, 1)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={services.page <= 1}>Previous</AdminButton>
              </Link>
              <Link href={`/admin/services?page=${Math.min(services.page + 1, services.totalPages)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={services.page >= services.totalPages}>Next</AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            {editingService ? "Edit service" : "Create service"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Simple service form for the three main selling fields: name, duration, and price.
          </p>
          <div className="mt-6">
            <ServiceForm
              action={
                editingService
                  ? updateServiceAction.bind(null, editingService.id)
                  : createServiceAction
              }
              service={editingService}
              submitLabel={editingService ? "Save service" : "Create service"}
              disabled={supportModeActive}
            />
          </div>
          {editingService ? (
            <div className="mt-4">
              <Link href="/admin/services">
                <AdminButton variant="ghost">Clear selection</AdminButton>
              </Link>
            </div>
          ) : null}
        </AdminCard>
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
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
