const TRUTHY_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_ENV_VALUES = new Set(['0', 'false', 'no', 'off']);

function readEnvFlag(value: string | undefined, defaultValue = false) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (TRUTHY_ENV_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_ENV_VALUES.has(normalized)) {
    return false;
  }
  return defaultValue;
}

// Shadow priming and live-read selection are intentionally separate:
// shadow mode can warm v1 reads and additive writes, while live-read only
// affects visible recommendation and CTA guidance. Legacy writes remain
// authoritative until a later cutover wave.
//
// For hosted public/product runtimes we now default both flags on unless the
// build explicitly disables them. This avoids shipping stale fallback-only
// builds when deploy wiring forgets to pass the Vite flags through.
export function isPublicBookingAssistantV1Enabled() {
  return readEnvFlag(import.meta.env.VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED, true);
}

export function isPublicBookingAssistantV1LiveReadEnabled() {
  return readEnvFlag(import.meta.env.VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ, true);
}
