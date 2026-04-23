export type EmailTemplateKey =
  | 'bookedai_booking_confirmation'
  | 'lead_follow_up'
  | 'booking_confirmation'
  | 'invoice'
  | 'payment_reminder'
  | 'overdue_reminder'
  | 'monthly_report'
  | 'thank_you';

export type EmailDeliveryStatus = 'queued' | 'sent' | 'failed' | 'delivered' | 'opened' | 'unknown';

export interface EmailMessagePayload {
  templateKey: EmailTemplateKey;
  to: string[];
  cc: string[];
  subject: string;
  variables: Record<string, string>;
}

export interface MonthlyReportSummary {
  bookingCount: number;
  leadCount: number;
  totalRevenueAud?: number | null;
  periodLabel?: string | null;
}
