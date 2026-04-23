from fastapi import APIRouter

from api import v1_integration_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-integrations"])

router.add_api_route("/integrations/providers/status", handlers.integration_provider_statuses, methods=["GET"])
router.add_api_route("/integrations/crm-sync/contact", handlers.sync_crm_contact, methods=["POST"])
router.add_api_route("/integrations/crm-sync/lead-qualification", handlers.sync_crm_lead_qualification, methods=["POST"])
router.add_api_route("/integrations/crm-sync/call-scheduled", handlers.sync_crm_call_scheduled, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook", handlers.list_zoho_deal_feedback_webhook, methods=["GET"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook/register", handlers.register_zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook/auto-renew", handlers.auto_renew_zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook/renew", handlers.update_zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook/disable", handlers.disable_zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/deal-outcome", handlers.ingest_crm_deal_outcome_feedback, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-webhook", handlers.zoho_deal_feedback_webhook, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/zoho-deals/poll", handlers.poll_zoho_deal_feedback, methods=["POST"])
router.add_api_route("/integrations/crm-feedback/deal-outcome-summary", handlers.crm_deal_outcome_summary, methods=["GET"])
router.add_api_route("/integrations/crm-sync/status", handlers.crm_sync_status, methods=["GET"])
router.add_api_route(
    "/integrations/providers/zoho-crm/connection-test",
    handlers.zoho_crm_connection_test,
    methods=["GET"],
)
router.add_api_route("/integrations/reconciliation/summary", handlers.integration_reconciliation_summary, methods=["GET"])
router.add_api_route("/integrations/attention", handlers.integration_attention, methods=["GET"])
router.add_api_route("/integrations/attention/triage", handlers.integration_attention_triage, methods=["GET"])
router.add_api_route("/integrations/crm-sync/backlog", handlers.integration_crm_sync_backlog, methods=["GET"])
router.add_api_route("/integrations/reconciliation/details", handlers.integration_reconciliation_details, methods=["GET"])
router.add_api_route("/integrations/runtime-activity", handlers.integration_runtime_activity, methods=["GET"])
router.add_api_route("/integrations/outbox/dispatched-audit", handlers.integration_outbox_dispatched_audit, methods=["GET"])
router.add_api_route("/integrations/outbox/backlog", handlers.integration_outbox_backlog, methods=["GET"])
router.add_api_route("/integrations/outbox/dispatch", handlers.dispatch_outbox_events, methods=["POST"])
router.add_api_route("/integrations/outbox/replay", handlers.replay_outbox_event, methods=["POST"])
router.add_api_route("/integrations/crm-sync/retry", handlers.retry_crm_sync, methods=["POST"])
