from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LeadRecordContract(BaseModel):
    lead_id: str | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    company_name: str | None = None
    tenant_id: str | None = None
    lead_status: str = "new"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ContactMappingContract(BaseModel):
    local_contact_id: str | None = None
    external_contact_id: str | None = None
    provider: str = "zoho_crm"
    entity_type: str = "contact"
    sync_status: str = "pending"


class DealSyncResultContract(BaseModel):
    status: str
    deal_id: str | None = None
    owner_id: str | None = None
    pipeline_stage: str | None = None
    external_lead_id: str | None = None
    synced_at: str | None = None
    error_message: str | None = None


class FollowUpTaskContract(BaseModel):
    subject: str
    due_at: str | None = None
    owner_id: str | None = None
    status: str = "pending"
    priority: str = "normal"
    task_type: str | None = None
    tenant_id: str | None = None


class CrmLifecycleSnapshotContract(BaseModel):
    lead: LeadRecordContract
    mapping: ContactMappingContract | None = None
    deal: DealSyncResultContract | None = None
    follow_up_tasks: list[FollowUpTaskContract] = Field(default_factory=list)
