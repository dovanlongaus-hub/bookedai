"""Domain contracts and shared DTO foundations."""

from .ai_router import FallbackResultContract, GroundingResultContract, ProviderSelectionResultContract, SynthesisResultContract
from .booking_trust import (
    AvailabilityState,
    BookingConfidenceLevel,
    BookingPathOption,
    BookingTrustContract,
    SlotStatus,
    VerificationResultContract,
)
from .common import DomainResult, ReconciliationResult, SafeProviderConfigSummary, SyncJobResult
from .crm import ContactMappingContract, CrmLifecycleSnapshotContract, DealSyncResultContract, FollowUpTaskContract, LeadRecordContract
from .deployment_modes import DeploymentMode, DeploymentModeContract
from .email import EmailDeliveryStatus, EmailDeliverySummaryContract, EmailMessagePayloadContract, EmailTemplateKey, MonthlyReportSummaryContract
from .growth import AttributionContract, LandingConversionContract, LeadSourceContract
from .integrations import ExternalEntityMappingContract, IntegrationConfigSummaryContract, IntegrationSyncContract, SyncMode
from .matching import MatchCandidateContract, MatchConfidenceContract, MatchRequestContract, MatchResultContract
from .payments import (
    BankTransferInstructionContract,
    CheckoutIntentContract,
    InvoiceSummaryContract,
    PaymentOption,
    PaymentOptionContract,
    PaymentStatus,
)
from .v1 import EnvelopeActorContract, EnvelopeMetaContract, ErrorDetailContract, ErrorEnvelopeContract, PaginationMetaContract, SuccessEnvelopeContract

__all__ = [
    "AvailabilityState",
    "AttributionContract",
    "BankTransferInstructionContract",
    "BookingConfidenceLevel",
    "BookingPathOption",
    "BookingTrustContract",
    "CheckoutIntentContract",
    "ContactMappingContract",
    "CrmLifecycleSnapshotContract",
    "DealSyncResultContract",
    "DeploymentMode",
    "DeploymentModeContract",
    "DomainResult",
    "EmailDeliveryStatus",
    "EmailDeliverySummaryContract",
    "EmailMessagePayloadContract",
    "EmailTemplateKey",
    "EnvelopeActorContract",
    "EnvelopeMetaContract",
    "ErrorDetailContract",
    "ErrorEnvelopeContract",
    "ExternalEntityMappingContract",
    "FallbackResultContract",
    "FollowUpTaskContract",
    "GroundingResultContract",
    "IntegrationConfigSummaryContract",
    "IntegrationSyncContract",
    "InvoiceSummaryContract",
    "LandingConversionContract",
    "LeadRecordContract",
    "LeadSourceContract",
    "MatchCandidateContract",
    "MatchConfidenceContract",
    "MatchRequestContract",
    "MatchResultContract",
    "MonthlyReportSummaryContract",
    "PaginationMetaContract",
    "PaymentOption",
    "PaymentOptionContract",
    "PaymentStatus",
    "ProviderSelectionResultContract",
    "ReconciliationResult",
    "SafeProviderConfigSummary",
    "SlotStatus",
    "SuccessEnvelopeContract",
    "SynthesisResultContract",
    "SyncJobResult",
    "SyncMode",
    "VerificationResultContract",
]
