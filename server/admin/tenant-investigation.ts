import "server-only";
import {
  buildTenantInvestigationTimeline,
  type TenantBillingSnapshot,
  type TenantIntegrationsSnapshot,
  type TenantTeamSnapshot,
} from "@/server/admin/tenant-investigation-timeline";
import { fetchBackendEnvelope } from "@/server/admin/backend-api";

export async function getTenantInvestigationSnapshot(tenantSlug: string) {
  const query = `?tenant_ref=${encodeURIComponent(tenantSlug)}`;
  const [team, billing, integrations] = await Promise.all([
    fetchBackendEnvelope<TenantTeamSnapshot>(`/v1/tenant/team${query}`),
    fetchBackendEnvelope<TenantBillingSnapshot>(`/v1/tenant/billing${query}`),
    fetchBackendEnvelope<TenantIntegrationsSnapshot>(`/v1/tenant/integrations${query}`),
  ]);

  return {
    team,
    billing,
    integrations,
    timeline: buildTenantInvestigationTimeline({
      team,
      billing,
      integrations,
    }),
  };
}
