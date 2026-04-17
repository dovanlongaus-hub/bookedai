export const releaseVersion = '1.0.5-tenant-panels';
export const releaseLabel = 'Tenant Panels';
export const releaseCodename = 'sprint9-detail-slices';
export const releaseDate = '2026-04-16';

export function getReleaseBadgeLabel() {
  return `${releaseLabel} • ${releaseCodename}`;
}

export function getReleaseVersionLabel() {
  return `Source ${releaseVersion} • ${releaseDate}`;
}
