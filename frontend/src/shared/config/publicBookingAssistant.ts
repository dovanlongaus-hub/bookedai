const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

function readEnvFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? TRUTHY_ENV_VALUES.has(normalized) : false;
}

// Shadow priming and live-read selection are intentionally separate:
// shadow mode can warm v1 reads and additive writes, while live-read only
// affects visible recommendation and CTA guidance. Legacy writes remain
// authoritative until a later cutover wave.
export function isPublicBookingAssistantV1Enabled() {
  return readEnvFlag(import.meta.env.VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED);
}

export function isPublicBookingAssistantV1LiveReadEnabled() {
  return readEnvFlag(import.meta.env.VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ);
}
