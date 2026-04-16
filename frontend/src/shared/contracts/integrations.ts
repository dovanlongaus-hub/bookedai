export interface ProviderConfigSafeSummary {
  provider: string;
  enabled: boolean;
  configuredFields: string[];
}

export interface SyncJobResult {
  status: string;
  externalId?: string | null;
  detail?: string | null;
  retryable: boolean;
}

export interface ReconciliationResult {
  status: string;
  checkedAt?: string | null;
  conflicts: string[];
  metadata: Record<string, unknown>;
}

export interface ExternalEntityMapping {
  provider: string;
  localEntityType: string;
  localEntityId: string;
  externalEntityId: string;
}

