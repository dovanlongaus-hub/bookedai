type ShareInput = {
  title: string;
  text: string;
  url: string;
};

export function isWebShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareWithFallback(input: ShareInput): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (isWebShareAvailable()) {
    try {
      await navigator.share({ title: input.title, text: input.text, url: input.url });
      return 'shared';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        return 'cancelled';
      }
      return 'unsupported';
    }
  }
  return 'unsupported';
}

export function buildMailtoUrl(params: { to?: string; subject: string; body: string }): string {
  const recipient = params.to ?? '';
  const search = new URLSearchParams();
  search.set('subject', params.subject);
  search.set('body', params.body);
  return `mailto:${recipient}?${search.toString()}`;
}

export function buildSmsUrl(body: string, phone?: string): string {
  const target = phone ?? '';
  const separator = navigator.platform?.toLowerCase().includes('mac') || /iPhone|iPad/.test(navigator.userAgent)
    ? '&'
    : '?';
  return `sms:${target}${separator}body=${encodeURIComponent(body)}`;
}
