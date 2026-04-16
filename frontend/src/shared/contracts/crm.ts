export interface LeadRecord {
  leadId?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
}

export interface ContactMapping {
  localContactId?: string | null;
  externalContactId?: string | null;
  provider: 'zoho_crm';
}

export interface DealSyncResult {
  status: string;
  dealId?: string | null;
  ownerId?: string | null;
  pipelineStage?: string | null;
}

export interface FollowUpTask {
  subject: string;
  dueAt?: string | null;
  ownerId?: string | null;
  status: string;
}

