export type AvailabilityState =
  | 'verified_available'
  | 'limited'
  | 'fully_booked'
  | 'unknown'
  | 'partner_only';

export type BookingConfidence = 'high' | 'medium' | 'low' | 'unverified';

export type BookingPathOption =
  | 'book_now'
  | 'request_slot'
  | 'call_provider'
  | 'book_on_partner_site'
  | 'join_waitlist'
  | 'request_callback';

export interface VerificationResult {
  sourceType: string;
  state: AvailabilityState;
  verified: boolean;
  lastCheckedAt?: string | null;
  notes: string[];
}

export interface BookingTrust {
  availabilityState: AvailabilityState;
  bookingConfidence: BookingConfidence;
  slotStatus: 'open' | 'held' | 'closed' | 'limited' | 'fully_booked' | 'unknown';
  recommendedPath: BookingPathOption;
  verification: VerificationResult;
}

