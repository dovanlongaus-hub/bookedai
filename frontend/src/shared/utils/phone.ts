export function normalizePhoneForMessaging(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\s()-]+/g, '');
  if (/^\+\d{8,15}$/.test(compact)) {
    return compact;
  }

  const digitsOnly = compact.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return null;
  }

  // Public booking flows are Australia-first, so accept common local mobile inputs.
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    return `+61${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 9 && digitsOnly.startsWith('4')) {
    return `+61${digitsOnly}`;
  }

  return null;
}
