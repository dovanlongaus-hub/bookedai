import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

import type {
  ChessAudBankTransferOption,
  ChessPaymentOption,
  ChessStripeAudOption,
  ChessVndBankQrOption,
} from '../../shared/api/v1';

// ---- VietQR EMVCo TLV encoder (NAPAS-247) ---------------------------------
// Produces the same QR payload that img.vietqr.io emits, so any Vietnamese
// banking app can scan and auto-fill recipient + amount + reference. We keep
// img.vietqr.io as a graceful fallback when local generation fails.

function emvTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildVietQRPayload(opts: {
  bankBin: string;
  accountNumber: string;
  amountVnd: number;
  reference: string;
}): string {
  const napasGuid = emvTLV('00', 'A000000727');
  const acquirerId = emvTLV('00', opts.bankBin);
  const merchantId = emvTLV('01', opts.accountNumber);
  const beneficiary = emvTLV('01', acquirerId + merchantId);
  const serviceCode = emvTLV('02', 'QRIBFTTA');
  const merchantAccount = emvTLV('38', napasGuid + beneficiary + serviceCode);
  const additional = emvTLV('62', emvTLV('08', opts.reference));
  const payload =
    emvTLV('00', '01') +
    emvTLV('01', '12') +
    merchantAccount +
    emvTLV('53', '704') +
    emvTLV('54', String(Math.floor(opts.amountVnd))) +
    emvTLV('58', 'VN') +
    additional +
    '6304';
  return payload + crc16Ccitt(payload);
}

function parseBankBinFromQrUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // img.vietqr.io URL shape: /image/{bin}-{account}-compact2.png
  const match = /\/image\/(\d+)-/.exec(url);
  return match ? match[1] : null;
}

export type PaymentSelectionLocale = 'en' | 'vi';

export interface PaymentSelectionDictionary {
  heading: string;
  lead: string;
  loading: string;
  error: string;
  retry: string;
  empty: string;
  optionStripeTitle: string;
  optionStripeBody: (amount: string) => string;
  optionStripeCta: string;
  optionVndQrTitle: string;
  optionVndQrBody: string;
  optionAudTransferTitle: string;
  optionAudTransferBody: string;
  bankDetails: string;
  bankNameLabel: string;
  accountHolderLabel: string;
  accountNumberLabel: string;
  bsbLabel: string;
  referenceLabel: string;
  amountLabel: string;
  copy: string;
  copied: string;
  qrAlt: string;
  instructionsHeading: string;
  vndInstructions: readonly string[];
  audInstructions: readonly string[];
  skipLink: string;
  tabCardLabel?: string;
  tabQrLabel?: string;
}

interface PaymentSelectionProps {
  locale: PaymentSelectionLocale;
  dict: PaymentSelectionDictionary;
  options: ChessPaymentOption[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onSkip: () => void;
}

function formatAmount(amount: number, currency: string, locale: PaymentSelectionLocale): string {
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Locally-rendered VietQR EMVCo QR image. Falls back to img.vietqr.io when
 * local payload synthesis fails (bank BIN missing or qrcode pkg error). */
function VietQrCodeImage({
  option,
  dict,
}: {
  option: ChessVndBankQrOption;
  dict: PaymentSelectionDictionary;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  const bankBin = useMemo(
    () => parseBankBinFromQrUrl(option.qr_image_url),
    [option.qr_image_url],
  );

  useEffect(() => {
    let cancelled = false;
    if (!bankBin) {
      setErrored(true);
      return;
    }
    const payload = buildVietQRPayload({
      bankBin,
      accountNumber: option.account_number,
      amountVnd: option.amount,
      reference: option.transfer_reference,
    });
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: '#0b1d3a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bankBin, option.account_number, option.amount, option.transfer_reference]);

  const fallbackUrl = option.qr_image_url || null;
  const src = !errored && dataUrl ? dataUrl : fallbackUrl;
  if (!src) return null;
  return (
    <img
      src={src}
      alt={dict.qrAlt}
      style={{
        width: 192,
        height: 192,
        objectFit: 'contain',
        borderRadius: 'var(--chess-radius)',
        border: '1px solid var(--chess-line)',
        background: 'var(--chess-paper)',
        padding: 8,
      }}
    />
  );
}

/** Tab navigation between Credit Card (Stripe AUD) and QR (VND VietQR + AUD bank). */
function PaymentTabs({
  options,
  dict,
  locale,
  loading,
  errored,
}: {
  options: ChessPaymentOption[];
  dict: PaymentSelectionDictionary;
  locale: PaymentSelectionLocale;
  loading: boolean;
  errored: boolean;
}) {
  const stripe = options.find((o) => o.type === 'stripe_aud') as
    | ChessStripeAudOption
    | undefined;
  const vndQr = options.find((o) => o.type === 'vnd_bank_qr') as
    | ChessVndBankQrOption
    | undefined;
  const audBank = options.find((o) => o.type === 'aud_bank_transfer') as
    | ChessAudBankTransferOption
    | undefined;

  const cardLabel =
    dict.tabCardLabel ?? (locale === 'vi' ? 'Thẻ tín dụng' : 'Credit Card');
  const qrLabel = dict.tabQrLabel ?? (locale === 'vi' ? 'QR & Chuyển khoản' : 'QR & Bank Transfer');

  // Default to QR tab if Stripe is missing or no checkout URL was generated.
  const defaultTab: 'card' | 'qr' =
    stripe?.stripe_checkout_url && !errored ? 'card' : 'qr';
  const [active, setActive] = useState<'card' | 'qr'>(defaultTab);

  if (loading || errored || options.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        role="tablist"
        aria-label="Payment method"
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          background: 'var(--chess-ivory)',
          padding: 4,
          borderRadius: 999,
          border: '1px solid var(--chess-line)',
        }}
      >
        {(['card', 'qr'] as const).map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab)}
              className="chess-btn chess-btn-sm"
              style={{
                background: isActive ? 'var(--chess-navy)' : 'transparent',
                color: isActive ? 'var(--chess-on-navy)' : 'var(--chess-muted)',
                border: 'none',
                borderRadius: 999,
                padding: '8px 18px',
                boxShadow: isActive ? '0 4px 14px -8px rgba(11,29,58,0.4)' : 'none',
              }}
            >
              {tab === 'card' ? `💳 ${cardLabel}` : `📱 ${qrLabel}`}
            </button>
          );
        })}
      </div>

      {active === 'card' ? (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {stripe && stripe.stripe_checkout_url ? (
            <StripeOptionCard option={stripe} dict={dict} locale={locale} />
          ) : (
            <p style={{ fontSize: '0.92rem', color: 'var(--chess-muted)' }}>
              {locale === 'vi'
                ? 'Stripe chưa được cấu hình. Vui lòng dùng tab QR & Chuyển khoản để thanh toán.'
                : 'Stripe is not configured. Please use the QR & Bank Transfer tab.'}
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {vndQr ? <VndQrOptionCard option={vndQr} dict={dict} locale={locale} /> : null}
          {audBank ? <AudBankTransferOptionCard option={audBank} dict={dict} locale={locale} /> : null}
        </div>
      )}
    </div>
  );
}

function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        // Silent failure — user can copy manually.
      });
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="chess-btn chess-btn-sm chess-btn-outline"
      aria-label={label}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

function DetailRow({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 0',
        borderBottom: '1px solid var(--chess-line)',
      }}
    >
      <span
        style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--chess-muted)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--chess-navy)',
            fontVariantNumeric: 'tabular-nums',
            wordBreak: 'break-word',
          }}
        >
          {value}
        </span>
        {copyLabel && copiedLabel ? (
          <CopyButton value={value} label={copyLabel} copiedLabel={copiedLabel} />
        ) : null}
      </div>
    </div>
  );
}

function StripeOptionCard({
  option,
  dict,
  locale,
}: {
  option: ChessStripeAudOption;
  dict: PaymentSelectionDictionary;
  locale: PaymentSelectionLocale;
}) {
  const formatted = formatAmount(option.amount, option.currency, locale);
  return (
    <article className="chess-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.optionStripeTitle}</span>
        <h3
          className="chess-display"
          style={{ marginTop: 8, fontSize: '1.25rem', color: 'var(--chess-navy)' }}
        >
          {formatted}
        </h3>
      </header>
      <p
        style={{
          fontSize: '0.92rem',
          lineHeight: 1.65,
          color: 'var(--chess-muted)',
        }}
      >
        {dict.optionStripeBody(formatted)}
      </p>
      <a
        href={option.stripe_checkout_url}
        className="chess-btn chess-btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        {dict.optionStripeCta}
      </a>
    </article>
  );
}

function VndQrOptionCard({
  option,
  dict,
  locale,
}: {
  option: ChessVndBankQrOption;
  dict: PaymentSelectionDictionary;
  locale: PaymentSelectionLocale;
}) {
  const formatted = formatAmount(option.amount, option.currency, locale);
  return (
    <article className="chess-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.optionVndQrTitle}</span>
        <h3
          className="chess-display"
          style={{ marginTop: 8, fontSize: '1.25rem', color: 'var(--chess-navy)' }}
        >
          {formatted}
        </h3>
      </header>
      <p
        style={{
          fontSize: '0.92rem',
          lineHeight: 1.65,
          color: 'var(--chess-muted)',
        }}
      >
        {dict.optionVndQrBody}
      </p>
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <VietQrCodeImage option={option} dict={dict} />

        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="chess-eyebrow chess-eyebrow-on-light">{dict.bankDetails}</span>
          <div style={{ marginTop: 8 }}>
            <DetailRow label={dict.bankNameLabel} value={option.bank_name} />
            <DetailRow label={dict.accountHolderLabel} value={option.account_holder} />
            <DetailRow
              label={dict.accountNumberLabel}
              value={option.account_number}
              copyLabel={dict.copy}
              copiedLabel={dict.copied}
            />
            <DetailRow
              label={dict.referenceLabel}
              value={option.transfer_reference}
              copyLabel={dict.copy}
              copiedLabel={dict.copied}
            />
          </div>
        </div>
      </div>
      <div>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.instructionsHeading}</span>
        <ol style={{ marginTop: 8, paddingLeft: 20, color: 'var(--chess-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>
          {dict.vndInstructions.map((step) => (
            <li key={step} style={{ marginBottom: 4 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function AudBankTransferOptionCard({
  option,
  dict,
  locale,
}: {
  option: ChessAudBankTransferOption;
  dict: PaymentSelectionDictionary;
  locale: PaymentSelectionLocale;
}) {
  const formatted = formatAmount(option.amount, option.currency, locale);
  return (
    <article className="chess-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.optionAudTransferTitle}</span>
        <h3
          className="chess-display"
          style={{ marginTop: 8, fontSize: '1.25rem', color: 'var(--chess-navy)' }}
        >
          {formatted}
        </h3>
      </header>
      <p
        style={{
          fontSize: '0.92rem',
          lineHeight: 1.65,
          color: 'var(--chess-muted)',
        }}
      >
        {dict.optionAudTransferBody}
      </p>
      <div>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.bankDetails}</span>
        <div style={{ marginTop: 8 }}>
          <DetailRow label={dict.bankNameLabel} value={option.bank_name} />
          <DetailRow label={dict.accountHolderLabel} value={option.account_holder} />
          <DetailRow
            label={dict.bsbLabel}
            value={option.bsb}
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
          />
          <DetailRow
            label={dict.accountNumberLabel}
            value={option.account_number}
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
          />
          <DetailRow
            label={dict.referenceLabel}
            value={option.transfer_reference}
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
          />
        </div>
      </div>
      <div>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.instructionsHeading}</span>
        <ol style={{ marginTop: 8, paddingLeft: 20, color: 'var(--chess-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>
          {dict.audInstructions.map((step) => (
            <li key={step} style={{ marginBottom: 4 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export function PaymentSelection({
  locale,
  dict,
  options,
  loading,
  error,
  onRetry,
  onSkip,
}: PaymentSelectionProps) {
  return (
    <section
      aria-label={dict.heading}
      className="chess-status-success"
      style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <header>
        <span className="chess-eyebrow chess-eyebrow-on-light">{dict.heading}</span>
        <p
          style={{
            marginTop: 10,
            fontSize: '0.95rem',
            lineHeight: 1.65,
            color: 'var(--chess-text)',
          }}
        >
          {dict.lead}
        </p>
      </header>

      {loading ? (
        <p style={{ fontSize: '0.92rem', color: 'var(--chess-muted)' }}>{dict.loading}</p>
      ) : null}

      {error ? (
        <div
          className="chess-status-error"
          role="alert"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <span>{error}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="chess-btn chess-btn-sm chess-btn-outline"
              style={{ alignSelf: 'flex-start' }}
            >
              {dict.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && options.length === 0 ? (
        <p style={{ fontSize: '0.92rem', color: 'var(--chess-muted)' }}>{dict.empty}</p>
      ) : null}

      <PaymentTabs
        options={options}
        dict={dict}
        locale={locale}
        loading={loading}
        errored={Boolean(error)}
      />


      <div>
        <button
          type="button"
          onClick={onSkip}
          className="chess-btn chess-btn-sm chess-btn-outline"
        >
          {dict.skipLink}
        </button>
      </div>
    </section>
  );
}
