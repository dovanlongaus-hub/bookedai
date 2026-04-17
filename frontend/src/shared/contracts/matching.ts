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
  mapUrl?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  amountAud?: number | null;
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
}

export interface MatchConfidence {
  score: number;
  reason?: string | null;
  evidence?: string[];
  gatingState: 'high' | 'medium' | 'low' | 'unknown';
}

export interface MatchResult {
  request: MatchRequest;
  candidates: MatchCandidate[];
  confidence: MatchConfidence;
}
