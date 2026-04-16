from __future__ import annotations

from core.contracts.crm import DealSyncResultContract, LeadRecordContract


class CrmLifecycleService:
    """Foundation seam for lead, contact, deal, and task lifecycle orchestration."""

    def build_lead_record(
        self,
        *,
        full_name: str | None,
        email: str | None,
        phone: str | None,
        source: str | None,
    ) -> LeadRecordContract:
        return LeadRecordContract(
            full_name=full_name,
            email=email,
            phone=phone,
            source=source,
        )

    def empty_sync_result(self) -> DealSyncResultContract:
        return DealSyncResultContract(status="pending")

