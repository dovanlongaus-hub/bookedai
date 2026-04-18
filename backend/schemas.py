from __future__ import annotations

from datetime import date, time
from typing import Any, Literal

from pydantic import BaseModel, Field


class ContactDetails(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


class BookingDetails(BaseModel):
    requested_service: str | None = None
    requested_date: str | None = None
    requested_time: str | None = None
    timezone: str | None = None
    notes: str | None = None


class AIBookingDecision(BaseModel):
    intent: Literal["booking", "support", "faq", "human_handoff", "unknown"]
    confidence: float = Field(ge=0, le=1)
    should_trigger_booking_workflow: bool
    needs_human_handoff: bool
    summary: str
    customer_reply: str
    contact: ContactDetails = Field(default_factory=ContactDetails)
    booking: BookingDetails = Field(default_factory=BookingDetails)


class TawkMessage(BaseModel):
    conversation_id: str | None = None
    message_id: str | None = None
    text: str
    sender_name: str | None = None
    sender_email: str | None = None
    sender_phone: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BookingWorkflowPayload(BaseModel):
    conversation_id: str | None = None
    message_id: str | None = None
    source: str = "tawk"
    customer_message: str
    ai_summary: str
    ai_intent: str
    customer_reply: str
    contact: ContactDetails = Field(default_factory=ContactDetails)
    booking: BookingDetails = Field(default_factory=BookingDetails)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TawkWebhookResponse(BaseModel):
    status: str
    conversation_id: str | None = None
    reply: str
    intent: str
    workflow_triggered: bool
    workflow_status: str | None = None


class EmailStatusResponse(BaseModel):
    smtp_configured: bool
    imap_configured: bool


class AdminConfigEntry(BaseModel):
    key: str
    value: str
    category: str
    masked: bool = False


class AdminConfigResponse(BaseModel):
    status: str
    items: list[AdminConfigEntry]


class EmailSendRequest(BaseModel):
    to: list[str] = Field(min_length=1)
    subject: str
    text: str
    html: str | None = None


class EmailSendResponse(BaseModel):
    status: str
    message: str


class InboxEmail(BaseModel):
    uid: str
    from_address: str
    subject: str
    date: str
    snippet: str


class EmailInboxResponse(BaseModel):
    status: str
    mailbox: str
    count: int
    messages: list[InboxEmail]


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AdminSessionResponse(BaseModel):
    status: str
    username: str
    session_token: str
    expires_at: str


class AdminMetricCard(BaseModel):
    label: str
    value: str
    tone: Literal["neutral", "success", "warning", "danger", "info"] = "neutral"


class AdminBookingRecord(BaseModel):
    booking_reference: str
    created_at: str
    industry: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    business_email: str | None = None
    customer_phone: str | None = None
    service_name: str | None = None
    service_id: str | None = None
    requested_date: str | None = None
    requested_time: str | None = None
    timezone: str | None = None
    amount_aud: float | None = None
    payment_status: str | None = None
    payment_url: str | None = None
    email_status: str | None = None
    workflow_status: str | None = None
    notes: str | None = None


class AdminTimelineEvent(BaseModel):
    id: int
    source: str
    event_type: str
    created_at: str
    ai_intent: str | None = None
    workflow_status: str | None = None
    message_text: str | None = None
    ai_reply: str | None = None
    sender_name: str | None = None
    sender_email: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AdminOverviewResponse(BaseModel):
    status: str
    metrics: list[AdminMetricCard]
    recent_bookings: list[AdminBookingRecord]
    recent_events: list[AdminTimelineEvent]


class AdminBookingsResponse(BaseModel):
    status: str
    total: int
    items: list[AdminBookingRecord]


class AdminBookingDetailResponse(BaseModel):
    status: str
    booking: AdminBookingRecord
    events: list[AdminTimelineEvent]


class AdminBookingConfirmationRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class AdminDiscordHandoffRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=8000)
    lane_label: str | None = Field(default=None, max_length=100)
    handoff_format: str | None = Field(default=None, max_length=50)


class AdminDiscordHandoffResponse(BaseModel):
    status: str
    message: str


class AdminApiRoute(BaseModel):
    path: str
    methods: list[str]
    protected: bool = False


class AdminApiInventoryResponse(BaseModel):
    status: str
    items: list[AdminApiRoute]


class PartnerProfileItem(BaseModel):
    id: int
    name: str
    category: str | None = None
    website_url: str | None = None
    description: str | None = None
    logo_url: str | None = None
    image_url: str | None = None
    featured: bool = False
    sort_order: int = 0
    is_active: bool = True


class PartnerProfileListResponse(BaseModel):
    status: str
    items: list[PartnerProfileItem]


class PartnerProfileUpsertRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    website_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=1500)
    logo_url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    featured: bool = False
    sort_order: int = 0
    is_active: bool = True


class AdminServiceMerchantItem(BaseModel):
    id: int
    service_id: str
    business_name: str
    business_email: str | None = None
    name: str
    category: str | None = None
    summary: str | None = None
    amount_aud: float | None = None
    duration_minutes: int | None = None
    venue_name: str | None = None
    location: str | None = None
    map_url: str | None = None
    booking_url: str | None = None
    image_url: str | None = None
    source_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    featured: bool = False
    is_active: bool = True
    is_search_ready: bool = True
    quality_warnings: list[str] = Field(default_factory=list)
    updated_at: str


class AdminServiceMerchantListResponse(BaseModel):
    status: str
    items: list[AdminServiceMerchantItem]


class AdminServiceCatalogQualityCounts(BaseModel):
    total_records: int = 0
    search_ready_records: int = 0
    warning_records: int = 0
    inactive_records: int = 0


class AdminServiceCatalogQualityResponse(BaseModel):
    status: str
    counts: AdminServiceCatalogQualityCounts
    items: list[AdminServiceMerchantItem]


class AdminServiceImportRequest(BaseModel):
    website_url: str = Field(min_length=3, max_length=500)
    business_name: str | None = Field(default=None, max_length=255)
    business_email: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=100)


class ServiceCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    business_email: str | None = Field(default=None, max_length=255)
    summary: str
    duration_minutes: int = Field(gt=0)
    amount_aud: float = Field(gt=0)
    image_url: str | None = Field(default=None, max_length=500)
    map_snapshot_url: str | None = Field(default=None, max_length=500)
    venue_name: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=300)
    map_url: str | None = Field(default=None, max_length=500)
    booking_url: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    tags: list[str] = Field(default_factory=list)
    featured: bool = False


class BookingAssistantCatalogResponse(BaseModel):
    status: str
    business_email: str
    stripe_enabled: bool
    services: list[ServiceCatalogItem]


class BookingAssistantChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AIEventItem(BaseModel):
    title: str
    summary: str
    start_at: str
    end_at: str | None = None
    timezone: str = "Australia/Sydney"
    venue_name: str | None = None
    location: str | None = None
    organizer: str | None = None
    url: str
    image_url: str | None = None
    map_snapshot_url: str | None = None
    map_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    source: str
    source_priority: int = 0
    is_wsti_priority: bool = False


class BookingAssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation: list[BookingAssistantChatMessage] = Field(default_factory=list, max_length=12)
    user_latitude: float | None = None
    user_longitude: float | None = None
    user_locality: str | None = Field(default=None, max_length=120)


class BookingAssistantChatResponse(BaseModel):
    status: str
    reply: str
    matched_services: list[ServiceCatalogItem]
    matched_events: list[AIEventItem] = Field(default_factory=list)
    suggested_service_id: str | None = None
    should_request_location: bool = False


class BookingAssistantSessionRequest(BaseModel):
    service_id: str
    customer_name: str = Field(min_length=2)
    customer_email: str | None = Field(default=None, max_length=255)
    customer_phone: str | None = None
    requested_date: date
    requested_time: time
    timezone: str = "Australia/Sydney"
    notes: str | None = Field(default=None, max_length=1000)


class BookingAssistantSessionResponse(BaseModel):
    status: str
    booking_reference: str
    portal_url: str
    service: ServiceCatalogItem
    amount_aud: float = Field(gt=0)
    amount_label: str
    requested_date: str
    requested_time: str
    timezone: str
    payment_status: Literal["stripe_checkout_ready", "payment_follow_up_required"]
    payment_url: str
    qr_code_url: str
    email_status: Literal["sent", "pending_manual_followup"]
    meeting_status: Literal["scheduled", "configuration_required"]
    meeting_join_url: str | None = None
    meeting_event_url: str | None = None
    calendar_add_url: str | None = None
    confirmation_message: str
    contact_email: str
    workflow_status: str | None = None


class PricingConsultationRequest(BaseModel):
    plan_id: Literal["basic", "standard", "pro"]
    customer_name: str = Field(min_length=2, max_length=255)
    customer_email: str = Field(min_length=3, max_length=255)
    customer_phone: str | None = Field(default=None, max_length=50)
    business_name: str = Field(min_length=2, max_length=255)
    business_type: str = Field(min_length=2, max_length=120)
    onboarding_mode: Literal["online", "onsite"] = "online"
    startup_referral_eligible: bool = False
    referral_partner: str | None = Field(default=None, max_length=255)
    referral_location: str | None = Field(default=None, max_length=255)
    preferred_date: date
    preferred_time: time
    timezone: str = "Australia/Sydney"
    notes: str | None = Field(default=None, max_length=1000)
    source_page: str | None = Field(default=None, max_length=120)
    source_section: str | None = Field(default=None, max_length=120)
    source_cta: str | None = Field(default=None, max_length=120)
    source_detail: str | None = Field(default=None, max_length=255)
    source_plan_id: str | None = Field(default=None, max_length=50)
    source_flow_mode: str | None = Field(default=None, max_length=50)
    source_path: str | None = Field(default=None, max_length=500)
    source_referrer: str | None = Field(default=None, max_length=500)


class PricingConsultationResponse(BaseModel):
    status: str
    consultation_reference: str
    plan_id: Literal["basic", "standard", "pro"]
    plan_name: str
    amount_aud: float = Field(gt=0)
    amount_label: str
    preferred_date: str
    preferred_time: str
    timezone: str
    onboarding_mode: Literal["online", "onsite"]
    trial_days: int
    trial_summary: str
    startup_offer_applied: bool
    startup_offer_summary: str | None = None
    onsite_travel_fee_note: str | None = None
    meeting_status: Literal["scheduled", "configuration_required"]
    meeting_join_url: str | None = None
    meeting_event_url: str | None = None
    payment_status: Literal["stripe_checkout_ready", "payment_follow_up_required"]
    payment_url: str | None = None
    email_status: Literal["sent", "pending_manual_followup"]


class DemoBookingRequest(BaseModel):
    customer_name: str = Field(min_length=2, max_length=255)
    customer_email: str = Field(min_length=3, max_length=255)
    customer_phone: str | None = Field(default=None, max_length=50)
    business_name: str = Field(min_length=2, max_length=255)
    business_type: str = Field(min_length=2, max_length=120)
    preferred_date: date
    preferred_time: time
    timezone: str = "Australia/Sydney"
    notes: str | None = Field(default=None, max_length=1000)
    source_page: str | None = Field(default=None, max_length=120)
    source_section: str | None = Field(default=None, max_length=120)
    source_cta: str | None = Field(default=None, max_length=120)
    source_detail: str | None = Field(default=None, max_length=255)
    source_path: str | None = Field(default=None, max_length=500)
    source_referrer: str | None = Field(default=None, max_length=500)


class DemoBookingResponse(BaseModel):
    status: str
    demo_reference: str
    preferred_date: str
    preferred_time: str
    timezone: str
    meeting_status: Literal["scheduled", "configuration_required"]
    meeting_join_url: str | None = None
    meeting_event_url: str | None = None
    email_status: Literal["sent", "pending_manual_followup"]
    confirmation_message: str


class DemoBriefRequest(BaseModel):
    customer_name: str = Field(min_length=2, max_length=255)
    customer_email: str = Field(min_length=3, max_length=255)
    customer_phone: str | None = Field(default=None, max_length=50)
    business_name: str = Field(min_length=2, max_length=255)
    business_type: str = Field(min_length=2, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    source_page: str | None = Field(default=None, max_length=120)
    source_section: str | None = Field(default=None, max_length=120)
    source_cta: str | None = Field(default=None, max_length=120)
    source_detail: str | None = Field(default=None, max_length=255)
    source_path: str | None = Field(default=None, max_length=500)
    source_referrer: str | None = Field(default=None, max_length=500)


class DemoBriefResponse(BaseModel):
    status: str
    brief_reference: str
    email_status: Literal["sent", "pending_manual_followup"]
    confirmation_message: str


class DemoBookingSyncResponse(BaseModel):
    status: Literal["pending", "synced"]
    brief_reference: str
    sync_status: Literal["pending", "synced", "already_synced"]
    booking_reference: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    business_name: str | None = None
    business_type: str | None = None
    preferred_date: str | None = None
    preferred_time: str | None = None
    timezone: str | None = None
    meeting_event_url: str | None = None
    email_status: Literal["sent", "pending_manual_followup"] | None = None
    confirmation_message: str
