export type PaymentOption =
  | 'stripe_card'
  | 'bank_transfer'
  | 'bank_transfer_qr'
  | 'partner_checkout'
  | 'invoice_after_confirmation';

export type PaymentStatus =
  | 'pending'
  | 'requires_action'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'unknown';

export interface CheckoutIntent {
  bookingReference?: string | null;
  amountAud?: number | null;
  paymentOption: PaymentOption;
  requiresBookingConfirmation: boolean;
}

export interface BankTransferInstruction {
  accountName?: string | null;
  bsb?: string | null;
  accountNumberMasked?: string | null;
  reference?: string | null;
  qrPayload?: string | null;
}

export interface InvoiceSummary {
  invoiceNumber?: string | null;
  periodLabel?: string | null;
  amountDueAud?: number | null;
  status: PaymentStatus;
}

