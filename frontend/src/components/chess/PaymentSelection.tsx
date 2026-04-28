import { useCallback, useState } from 'react';

import type {
  ChessAudBankTransferOption,
  ChessPaymentOption,
  ChessStripeAudOption,
  ChessVndBankQrOption,
} from '../../shared/api/v1';

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
        {option.qr_image_url ? (
          <img
            src={option.qr_image_url}
            alt={dict.qrAlt}
            style={{
              width: 168,
              height: 168,
              objectFit: 'contain',
              borderRadius: 'var(--chess-radius)',
              border: '1px solid var(--chess-line)',
              background: 'var(--chess-paper)',
              padding: 8,
            }}
          />
        ) : null}
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

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {options.map((option) => {
          if (option.type === 'stripe_aud') {
            return <StripeOptionCard key="stripe_aud" option={option} dict={dict} locale={locale} />;
          }
          if (option.type === 'vnd_bank_qr') {
            return <VndQrOptionCard key="vnd_bank_qr" option={option} dict={dict} locale={locale} />;
          }
          if (option.type === 'aud_bank_transfer') {
            return (
              <AudBankTransferOptionCard
                key="aud_bank_transfer"
                option={option}
                dict={dict}
                locale={locale}
              />
            );
          }
          return null;
        })}
      </div>

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
