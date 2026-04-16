"""Repository and persistence abstractions for future domain migrations."""

from .audit_repository import AuditLogRepository
from .booking_intent_repository import BookingIntentRepository
from .booking_repository import BookingRepository
from .contact_repository import ContactRepository
from .crm_repository import CrmSyncRepository
from .email_repository import EmailRepository
from .feature_flag_repository import FeatureFlagRepository
from .idempotency_repository import IdempotencyRepository
from .integration_repository import IntegrationRepository
from .lead_repository import LeadRepository
from .outbox_repository import OutboxRepository
from .payment_intent_repository import PaymentIntentRepository
from .payment_repository import PaymentRepository
from .tenant_repository import TenantRepository
from .webhook_repository import WebhookEventRepository

__all__ = [
    "AuditLogRepository",
    "BookingIntentRepository",
    "BookingRepository",
    "ContactRepository",
    "CrmSyncRepository",
    "EmailRepository",
    "FeatureFlagRepository",
    "IdempotencyRepository",
    "IntegrationRepository",
    "LeadRepository",
    "OutboxRepository",
    "PaymentIntentRepository",
    "PaymentRepository",
    "TenantRepository",
    "WebhookEventRepository",
]
