export const releaseVersion = '1.0.6-tenant-catalog-workspace';
export const releaseLabel = 'Tenant Catalog Workspace';
export const releaseCodename = 'google-auth-ai-import';
export const releaseDate = '2026-04-18';

export function getReleaseBadgeLabel() {
  return `${releaseLabel} • ${releaseCodename}`;
}

export function getReleaseVersionLabel() {
  return `Source ${releaseVersion} • ${releaseDate}`;
}
