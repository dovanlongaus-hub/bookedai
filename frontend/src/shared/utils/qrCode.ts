import QRCode from 'qrcode';

const QR_CACHE = new Map<string, string>();

const QR_OPTIONS = {
  margin: 1,
  width: 320,
  color: {
    dark: '#0f172a',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'M' as const,
};

export async function generateQrCodeDataUrl(value: string): Promise<string> {
  if (!value) {
    return '';
  }
  const cached = QR_CACHE.get(value);
  if (cached) {
    return cached;
  }
  const dataUrl = await QRCode.toDataURL(value, QR_OPTIONS);
  QR_CACHE.set(value, dataUrl);
  return dataUrl;
}

export async function downloadQrCodePng(value: string, filename: string): Promise<void> {
  const dataUrl = await generateQrCodeDataUrl(value);
  if (!dataUrl) {
    return;
  }
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through to legacy
    }
  }
  if (typeof document === 'undefined') {
    return false;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}
