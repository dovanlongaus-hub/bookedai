export interface ProviderSelectionResult {
  provider: string;
  model: string;
  reason?: string | null;
}

export interface GroundingResult {
  sourceType: string;
  sourceCount: number;
  confidence: number;
  freshnessNote?: string | null;
}

export interface SynthesisResult {
  summary: string;
  confidence: number;
  requiresConfirmation: boolean;
}

export interface FallbackResult {
  activated: boolean;
  strategy?: string | null;
  notes: string[];
}

