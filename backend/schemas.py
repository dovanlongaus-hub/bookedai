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


class CreateCustomerHandoffSessionRequest(BaseModel):
    """Public-app payload to mint a Telegram deep-link with pre-filled context."""

    source: str | None = Field(default=None, max_length=50)
    booking_reference: str | None = Field(default=None, max_length=64)
    service_query: str | None = Field(default=None, max_length=300)
    service_slug: str | None = Field(default=None, max_length=120)
    location_hint: str | None = Field(default=None, max_length=120)
    locale: str | None = Field(default=None, max_length=12)
    notes: str | None = Field(default=None, max_length=500)
    selected_service_ids: list[str] = Field(default_factory=list, max_length=10)


class CreateCustomerHandoffSessionResponse(BaseModel):
    status: str
    session_id: str
    deeplink: str
    expires_at: str


class HandoffSessionSourceMetric(BaseModel):
    minted: int
    consumed: int


class HandoffSessionSummaryResponse(BaseModel):
    """Admin-only conversion metrics for `customer_handoff_sessions`."""

    status: str
    since: str
    minted: int
    consumed: int
    expired_unconsumed: int
    conversion_rate: float
    by_source: dict[str, HandoffSessionSourceMetric]


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


class AdminPortalSupportQueueItem(BaseModel):
    queue_item_id: str
    id: int
    source_kind: str | None = None
    request_type: str
    booking_reference: str | None = None
    booking_status: str | None = None
    service_name: str | None = None
    business_name: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    support_email: str | None = None
    preferred_date: str | None = None
    preferred_time: str | None = None
    timezone: str | None = None
    customer_note: str | None = None
    created_at: str
    outbox_event_id: int | None = None
    outbox_status: str | None = None
    outbox_available_at: str | None = None
    resolution_status: str | None = None
    resolution_note: str | None = None
    resolved_at: str | None = None
    resolved_by: str | None = None
    action_request_id: int | None = None


class AdminOverviewResponse(BaseModel):
    status: str
    metrics: list[AdminMetricCard]
    recent_bookings: list[AdminBookingRecord]
    recent_events: list[AdminTimelineEvent]
    portal_support_queue: list[AdminPortalSupportQueueItem] = Field(default_factory=list)


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


class AdminPortalSupportActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class AdminPortalSupportActionResponse(BaseModel):
    status: str
    request_id: int
    action: str
    message: str


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


class AdminMessagingItem(BaseModel):
    message_key: str
    source_kind: str
    item_id: str
    channel: str
    delivery_status: str
    title: str
    provider: str | None = None
    template_key: str | None = None
    tenant_id: str | None = None
    tenant_ref: str | None = None
    tenant_name: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    entity_label: str | None = None
    occurred_at: str
    latest_event_type: str | None = None
    latest_event_at: str | None = None
    retry_eligible: bool = False
    manual_follow_up: bool = False
    needs_attention: bool = False
    last_error: str | None = None
    attempt_count: int = 0
    summary: str | None = None


class AdminMessagingEvent(BaseModel):
    event_id: str
    event_type: str
    occurred_at: str
    detail: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class AdminMessagingListResponse(BaseModel):
    status: str
    items: list[AdminMessagingItem]


class AdminMessagingDetailResponse(BaseModel):
    status: str
    item: AdminMessagingItem
    events: list[AdminMessagingEvent] = Field(default_factory=list)


class AdminMessagingActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class AdminMessagingActionResponse(BaseModel):
    status: str
    action: str
    message: str


class AdminPendingHandoffItem(BaseModel):
    event_id: str
    conversation_id: str | None = None
    channel: str
    customer_care_status: str
    sender_name: str | None = None
    last_message: str | None = None
    created_at: str
    telegram_chat_id: str | None = None
    telegram_username: str | None = None
    booking_reference: str | None = None
    support_handoff_failed: bool = False
    support_handoff_targets: int = 0
    support_handoff_delivered: int = 0
    claimed_at: str | None = None
    claimed_by: str | None = None
    claim_active: bool = False


class AdminPendingHandoffsResponse(BaseModel):
    status: str
    items: list[AdminPendingHandoffItem]
    total: int
    pending_count: int
    failed_count: int
    claimed_count: int = 0


class AdminClaimHandoffRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class AdminClaimHandoffResponse(BaseModel):
    status: str
    conversation_id: str
    channel: str
    claimed_at: str
    claimed_by: str
    ttl_seconds: int


class AdminReleaseHandoffRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class AdminReleaseHandoffResponse(BaseModel):
    status: str
    conversation_id: str
    channel: str
    released_at: str
    released_by: str


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


class AdminTenantListItem(BaseModel):
    id: str
    slug: str
    name: str
    status: str
    timezone: str | None = None
    locale: str | None = None
    industry: str | None = None
    active_memberships: int = 0
    total_services: int = 0
    published_services: int = 0
    updated_at: str | None = None


class AdminTenantListResponse(BaseModel):
    status: str
    items: list[AdminTenantListItem]


class AdminTenantWorkspaceGuides(BaseModel):
    overview: str | None = None
    experience: str | None = None
    catalog: str | None = None
    plugin: str | None = None
    bookings: str | None = None
    integrations: str | None = None
    billing: str | None = None
    team: str | None = None


class AdminTenantWorkspaceSettings(BaseModel):
    logo_url: str | None = None
    hero_image_url: str | None = None
    introduction_html: str | None = None
    guides: AdminTenantWorkspaceGuides = Field(default_factory=AdminTenantWorkspaceGuides)


class AdminTenantMemberItem(BaseModel):
    email: str
    full_name: str | None = None
    role: str
    status: str
    auth_provider: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AdminTenantDetailResponse(BaseModel):
    status: str
    tenant: AdminTenantListItem
    workspace: AdminTenantWorkspaceSettings = Field(default_factory=AdminTenantWorkspaceSettings)
    members: list[AdminTenantMemberItem] = Field(default_factory=list)
    services: list[AdminServiceMerchantItem] = Field(default_factory=list)


class AdminTenantProfileUpdateRequest(BaseModel):
    business_name: str | None = None
    industry: str | None = None
    timezone: str | None = None
    locale: str | None = None
    logo_url: str | None = None
    hero_image_url: str | None = None
    introduction_html: str | None = None
    guide_overview: str | None = None
    guide_experience: str | None = None
    guide_catalog: str | None = None
    guide_plugin: str | None = None
    guide_bookings: str | None = None
    guide_integrations: str | None = None
    guide_billing: str | None = None
    guide_team: str | None = None


class AdminTenantMemberAccessUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=64)


class AdminTenantCatalogUpsertRequest(BaseModel):
    service_id: str | None = Field(default=None, max_length=255)
    business_name: str | None = Field(default=None, max_length=255)
    business_email: str | None = Field(default=None, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=100)
    summary: str | None = None
    amount_aud: float | None = None
    currency_code: str | None = Field(default=None, max_length=8)
    display_price: str | None = Field(default=None, max_length=255)
    duration_minutes: int | None = None
    venue_name: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=500)
    map_url: str | None = Field(default=None, max_length=500)
    booking_url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    source_url: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list)
    featured: bool = False
    publish_state: str | None = Field(default=None, max_length=32)


class AdminTenantCatalogResponse(BaseModel):
    status: str
    tenant: AdminTenantListItem
    items: list[AdminServiceMerchantItem]


class ServiceCatalogItem(BaseModel):
    id: str
    name: str
    category: str
    tenant_id: str | None = Field(default=None, max_length=64)
    business_email: str | None = Field(default=None, max_length=255)
    owner_email: str | None = Field(default=None, max_length=255)
    summary: str
    duration_minutes: int = Field(gt=0)
    amount_aud: float = Field(ge=0)
    currency_code: str = Field(default="AUD", max_length=8)
    display_price: str | None = Field(default=None, max_length=255)
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
    event_title: str | None = Field(default=None, max_length=255)
    event_summary: str | None = Field(default=None, max_length=1000)
    event_start_at: str | None = Field(default=None, max_length=64)
    event_end_at: str | None = Field(default=None, max_length=64)
    event_venue_name: str | None = Field(default=None, max_length=200)
    event_location: str | None = Field(default=None, max_length=300)
    event_organizer: str | None = Field(default=None, max_length=255)
    event_url: str | None = Field(default=None, max_length=500)
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
    amount_aud: float = Field(ge=0)
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
    package_name: str
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


class PublicDemoImportRequest(BaseModel):
    website_url: str = Field(min_length=4, max_length=500)
    business_name: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=100)


class PublicDemoImportItem(BaseModel):
    name: str
    category: str | None = None
    summary: str | None = None
    amount_aud: float | None = None
    duration_minutes: int | None = None
    venue_name: str | None = None
    location: str | None = None
    booking_url: str | None = None
    image_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class PublicDemoImportResponse(BaseModel):
    status: str
    business_name: str
    website_url: str
    services: list[PublicDemoImportItem]
    service_count: int
