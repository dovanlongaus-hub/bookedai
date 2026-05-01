from __future__ import annotations

from fastapi import APIRouter, Depends

from api import v1_booking_handlers as booking_handlers
from api import v1_communication_handlers as communication_handlers
from api import v1_integration_handlers as integration_handlers
from api import v1_search_handlers as search_handlers
from api.internal_auth import require_internal_token


router = APIRouter(
    prefix="/api/internal/v1",
    tags=["internal-api"],
    dependencies=[Depends(require_internal_token)],
)

# Booking orchestration
router.add_api_route("/booking/leads/create", booking_handlers.create_lead, methods=["POST"])
router.add_api_route("/booking/chat/sessions/start", booking_handlers.start_chat_session, methods=["POST"])
router.add_api_route("/booking/path/resolve", booking_handlers.resolve_booking_path, methods=["POST"])
router.add_api_route("/booking/intents/create", booking_handlers.create_booking_intent, methods=["POST"])
router.add_api_route("/booking/payments/intents/create", booking_handlers.create_payment_intent, methods=["POST"])

# Search orchestration
router.add_api_route("/search/candidates", search_handlers.search_candidates, methods=["POST"])
router.add_api_route("/search/availability/check", search_handlers.check_availability, methods=["POST"])

# Communications
router.add_api_route("/communications/email/send", communication_handlers.send_lifecycle_email, methods=["POST"])
router.add_api_route("/communications/sms/send", communication_handlers.send_sms_message, methods=["POST"])
router.add_api_route("/communications/whatsapp/send", communication_handlers.send_whatsapp_message, methods=["POST"])

# Integrations control plane
router.add_api_route("/integrations/providers/status", integration_handlers.integration_provider_statuses, methods=["GET"])
router.add_api_route("/integrations/providers/zoho-crm/connection-test", integration_handlers.zoho_crm_connection_test, methods=["GET"])
router.add_api_route("/integrations/reconciliation/summary", integration_handlers.integration_reconciliation_summary, methods=["GET"])
router.add_api_route("/integrations/reconciliation/details", integration_handlers.integration_reconciliation_details, methods=["GET"])
router.add_api_route("/integrations/attention", integration_handlers.integration_attention, methods=["GET"])
router.add_api_route("/integrations/attention/triage", integration_handlers.integration_attention_triage, methods=["GET"])
router.add_api_route("/integrations/runtime-activity", integration_handlers.integration_runtime_activity, methods=["GET"])

# CRM sync and feedback
router.add_api_route("/integrations/crm-sync/contact", integration_handlers.sync_crm_contact, methods=["POST"])
router.add_api_route(
    "/integrations/crm-sync/lead-qualification",
    integration_handlers.sync_crm_lead_qualification,
    methods=["POST"],
)
router.add_api_route("/integrations/crm-sync/call-scheduled", integration_handlers.sync_crm_call_scheduled, methods=["POST"])
router.add_api_route("/integrations/crm-sync/status", integration_handlers.crm_sync_status, methods=["GET"])
router.add_api_route("/integrations/crm-sync/backlog", integration_handlers.integration_crm_sync_backlog, methods=["GET"])
router.add_api_route("/integrations/crm-sync/retry", integration_handlers.retry_crm_sync, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/deal-outcome", integration_handlers.ingest_crm_deal_outcome_feedback, methods=["POST"])
router.add_api_route(
    "/integrations/crm-feedback/deal-outcome-summary",
    integration_handlers.crm_deal_outcome_summary,
    methods=["GET"],
)
router.add_api_route("/integrations/crm-feedback/zoho-deals/poll", integration_handlers.poll_zoho_deal_feedback, methods=["POST"])

# Zoho webhook lifecycle controls
router.add_api_route("/integrations/crm-feedback/zoho-webhook", integration_handlers.list_zoho_deal_feedback_webhook, methods=["GET"])
router.add_api_route(
    "/integrations/crm-feedback/zoho-webhook/register",
    integration_handlers.register_zoho_deal_feedback_webhook,
    methods=["POST"],
)
router.add_api_route("/integrations/crm-feedback/zoho-webhook/renew", integration_handlers.update_zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route(
    "/integrations/crm-feedback/zoho-webhook/auto-renew",
    integration_handlers.auto_renew_zoho_deal_feedback_webhook,
    methods=["POST"],
)
router.add_api_route(
    "/integrations/crm-feedback/zoho-webhook/disable",
    integration_handlers.disable_zoho_deal_feedback_webhook,
    methods=["POST"],
)

# Outbox operations
router.add_api_route("/integrations/outbox/backlog", integration_handlers.integration_outbox_backlog, methods=["GET"])
router.add_api_route(
    "/integrations/outbox/dispatched-audit",
    integration_handlers.integration_outbox_dispatched_audit,
    methods=["GET"],
)
router.add_api_route("/integrations/outbox/dispatch", integration_handlers.dispatch_outbox_events, methods=["POST"])
router.add_api_route("/integrations/outbox/replay", integration_handlers.replay_outbox_event, methods=["POST"])
