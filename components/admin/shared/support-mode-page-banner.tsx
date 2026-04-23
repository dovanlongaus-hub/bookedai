import Link from "next/link";

import { getAdminSession } from "@/lib/auth/session";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";

type TenantPanel = "overview" | "billing" | "team" | "integrations";

function getTenantWorkspaceBaseUrl() {
  const configured =
    process.env.ADMIN_TENANT_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_TENANT_APP_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://tenant.bookedai.au";
}

function buildTenantWorkspaceLink(options: {
  tenantSlug: string;
  panel: TenantPanel;
  adminPath: string;
  scopeLabel: string;
}) {
  const baseUrl = getTenantWorkspaceBaseUrl();
  const hash = options.panel === "overview" ? "" : `#${options.panel}`;
  const params = new URLSearchParams({
    admin_return: "1",
    admin_scope: options.adminPath,
    admin_scope_label: options.scopeLabel,
  });
  return `${baseUrl}/${encodeURIComponent(options.tenantSlug)}?${params.toString()}${hash}`;
}

export async function SupportModePageBanner({
  scopeLabel,
  tenantPanel = "overview",
  adminPath,
}: {
  scopeLabel: string;
  tenantPanel?: TenantPanel;
  adminPath: string;
}) {
  const session = await getAdminSession();
  const impersonation = session.impersonation;

  if (!impersonation) {
    return null;
  }

  return (
    <AdminCard className="border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone="warning">Read-only support mode</AdminBadge>
            <AdminBadge tone="info">{scopeLabel}</AdminBadge>
          </div>
          <div className="mt-3 text-sm font-semibold text-amber-950">
            Investigating tenant <span className="font-bold">{impersonation.tenantSlug}</span> from this workspace.
          </div>
          <div className="mt-1 text-sm leading-6 text-amber-900">
            Keep this page investigation-first while support mode is active. Create, update, delete, and sync write actions are blocked until support mode ends.
            {impersonation.reason ? ` Reason: ${impersonation.reason}.` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/tenants?tenant=${encodeURIComponent(impersonation.tenantSlug)}`}>
            <AdminButton variant="secondary">Return to tenant investigation</AdminButton>
          </Link>
          <a
            href={buildTenantWorkspaceLink({
              tenantSlug: impersonation.tenantSlug,
              panel: tenantPanel,
              adminPath,
              scopeLabel,
            })}
            target="_blank"
            rel="noreferrer"
          >
            <AdminButton variant="ghost">Open tenant {tenantPanel}</AdminButton>
          </a>
        </div>
      </div>
    </AdminCard>
  );
}
