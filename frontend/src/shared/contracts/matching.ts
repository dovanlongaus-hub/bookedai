export interface MatchRequest {
  query: string;
  locationHint?: string | null;
  budgetHint?: string | null;
  tenantId?: string | null;
}

export interface MatchCandidate {
  candidateId: string;
  providerName: string;
  serviceName: string;
  sourceType: string;
  category?: string | null;
  summary?: string | null;
  venueName?: string | null;
  location?: string | null;
  bookingUrl?: string | null;
  contactPhone?: string | null;
  mapUrl?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  amountAud?: number | null;
  currencyCode?: string | null;
  displayPrice?: string | null;
  durationMinutes?: number | null;
  tags?: string[];
  featured?: boolean;
  distanceKm?: number | null;
  matchScore?: number | null;
  semanticScore?: number | null;
  trustSignal?: string | null;
  isPreferred?: boolean;
  displaySummary?: string | null;
  explanation?: string | null;
  whyThisMatches?: string | null;
  sourceLabel?: string | null;
  pricePosture?: string | null;
  bookingPathType?: string | null;
  nextStep?: string | null;
  availabilityState?: string | null;
  bookingConfidence?: string | null;
  bookingFit?: MatchBookingFit | null;
}

export interface MatchConfidence {
  score: number;
  reason?: string | null;
  evidence?: string[];
  gatingState: 'high' | 'medium' | 'low' | 'unknown';
}

export interface MatchBookingFit {
  budgetFit: 'within_budget' | 'over_budget' | 'unknown';
  partySizeFit: 'supported' | 'manual_review' | 'unknown';
  scheduleFit: 'booking_ready' | 'manual_confirmation' | 'unknown';
  locationFit: 'aligned' | 'online_flexible' | 'unknown' | 'mismatch';
  bookingReadiness: 'instant_book' | 'partner_redirect' | 'manual_review' | 'advisory';
  summary?: string | null;
}

export interface MatchResult {
  request: MatchRequest;
  candidates: MatchCandidate[];
  confidence: MatchConfidence;
}
