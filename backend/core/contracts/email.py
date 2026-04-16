from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


EmailTemplateKey = Literal[
    "lead_follow_up",
    "booking_follow_up",
    "booking_confirmation",
    "invoice",
    "payment_reminder",
    "overdue_reminder",
    "monthly_report",
    "thank_you",
]
EmailDeliveryStatus = Literal["queued", "sent", "failed", "delivered", "opened", "unknown"]


class EmailMessagePayloadContract(BaseModel):
    template_key: EmailTemplateKey
    to: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    subject: str
    variables: dict[str, str] = Field(default_factory=dict)
    reply_to: str | None = None
    from_address: str | None = None
    template_version: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class MonthlyReportSummaryContract(BaseModel):
    booking_count: int = 0
    lead_count: int = 0
    total_revenue_aud: float | None = None
    period_label: str | None = None
    generated_at: str | None = None
    email_status: EmailDeliveryStatus = "unknown"
    delivery_message_id: str | None = None


class EmailDeliverySummaryContract(BaseModel):
    message: EmailMessagePayloadContract
    delivery_status: EmailDeliveryStatus
    provider: str | None = None
    provider_message_id: str | None = None
    failure_reason: str | None = None
