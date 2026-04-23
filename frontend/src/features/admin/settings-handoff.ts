import type { AdminTenantDetailResponse } from './types';

type BuildWorkspaceSettingsHandoffUrlInput = {
  tenant?: Pick<AdminTenantDetailResponse['tenant'], 'id' | 'slug' | 'name'> | null;
  adminScope?: string;
  adminScopeLabel?: string;
};

function getRootAdminBaseUrl() {
  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const configured =
    viteEnv?.VITE_ROOT_ADMIN_BASE_URL?.trim() ||
    viteEnv?.VITE_APP_URL?.trim() ||
    viteEnv?.VITE_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'https://admin.bookedai.au';
}

export function buildWorkspaceSettingsHandoffUrl({
  tenant,
  adminScope = '/admin#platform-settings',
  adminScopeLabel = 'Platform Settings',
}: BuildWorkspaceSettingsHandoffUrlInput) {
  const baseUrl = getRootAdminBaseUrl();
  const params = new URLSearchParams({
    admin_return: '1',
    admin_scope: adminScope,
    admin_scope_label: adminScopeLabel,
  });

  if (tenant?.id) {
    params.set('tenantId', tenant.id);
  }

  if (tenant?.slug) {
    params.set('tenantSlug', tenant.slug);
  }

  return `${baseUrl}/admin/settings?${params.toString()}`;
}
