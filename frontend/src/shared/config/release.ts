export const releaseVersion = '1.0.8-tenant-currency-truth';
export const releaseLabel = 'Tenant Currency Truth';
export const releaseCodename = 'multi-currency-display-price';
export const releaseDate = '2026-04-18';

export function getReleaseBadgeLabel() {
  return `${releaseLabel} • ${releaseCodename}`;
}

export function getReleaseVersionLabel() {
  return `Source ${releaseVersion} • ${releaseDate}`;
}
