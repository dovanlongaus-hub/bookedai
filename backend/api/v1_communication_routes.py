from fastapi import APIRouter

from api import v1_communication_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-communications"])

router.add_api_route("/email/messages/send", handlers.send_lifecycle_email, methods=["POST"])
router.add_api_route("/sms/messages/send", handlers.send_sms_message, methods=["POST"])
router.add_api_route("/whatsapp/messages/send", handlers.send_whatsapp_message, methods=["POST"])
router.add_api_route("/telegram/messages/send-by-phone", handlers.send_telegram_message_by_phone, methods=["POST"])
