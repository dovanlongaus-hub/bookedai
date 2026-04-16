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
  distanceKm?: number | null;
  matchScore?: number | null;
  semanticScore?: number | null;
  trustSignal?: string | null;
  isPreferred?: boolean;
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
