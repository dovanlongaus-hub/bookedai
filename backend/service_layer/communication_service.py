from __future__ import annotations

from dataclasses import dataclass
import logging
import re
from string import Template

import httpx

from config import Settings
from core.customer_booking_contact import (
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE,
)
from integrations.sms import SmsAdapter
from integrations.whatsapp import WhatsAppAdapter


PHONE_REGEX = re.compile(r"[^\d+]")
HTTPX_LOGGER = logging.getLogger("httpx")


@dataclass
class CommunicationSendResult:
    provider: str
    delivery_status: str
    provider_message_id: str | None = None
    warnings: list[str] | None = None


@dataclass
class RenderedEmailTemplate:
    subject: str
    text: str
    html: str


BOOKEDAI_COMMUNICATION_TEMPLATES: dict[str, str] = {
    "bookedai_booking_confirmation": (
        "Bookedai.au confirmed: ${service_name} for ${customer_name} on ${slot_label}. "
        "Ref ${booking_reference}. ${business_name} will handle the next step. "
        "Manage it here: ${manage_link}. Reply on WhatsApp to ask, reschedule, or request cancellation. "
        "BookedAI support: ${support_phone} or ${support_email}"
    ),
    "bookedai_demo_reminder": (
        "Bookedai.au: Hi ${customer_name}, your live demo is coming up at ${slot_label}. "
        "Reply to this message if you need to reschedule."
    ),
    "bookedai_payment_followup": (
        "Bookedai.au: Hi ${customer_name}, your ${service_name} booking is ready for the next step. "
        "Complete payment here: ${payment_link}"
    ),
    "bookedai_manual_review": (
        "Bookedai.au: Hi ${customer_name}, we received your request for ${service_name}. "
        "A team member will confirm details with you shortly."
    ),
}


def _safe_value(variables: dict[str, str] | None, key: str, fallback: str) -> str:
    value = str((variables or {}).get(key) or "").strip()
    return value or fallback


def render_bookedai_confirmation_email(
    *,
    variables: dict[str, str] | None,
    public_app_url: str | None,
) -> RenderedEmailTemplate:
    customer_name = _safe_value(variables, "customer_name", "there")
    service_name = _safe_value(variables, "service_name", "Bookedai.au booking")
    slot_label = _safe_value(variables, "slot_label", "To be confirmed")
    booking_reference = _safe_value(variables, "booking_reference", "Pending reference")
    business_name = _safe_value(variables, "business_name", "Bookedai.au")
    venue_name = _safe_value(variables, "venue_name", business_name)
    support_email = _safe_value(variables, "support_email", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
    support_phone = _safe_value(variables, "support_phone", DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE)
    payment_link = str((variables or {}).get("payment_link") or "").strip()
    manage_link = str((variables or {}).get("manage_link") or "").strip()
    timezone = _safe_value(variables, "timezone", "Australia/Sydney")
    additional_note = str((variables or {}).get("additional_note") or "").strip()
    app_url = str(public_app_url or "https://bookedai.au").rstrip("/")
    logo_url = f"{app_url}/branding/bookedai-mark-gradient.png?v=20260418-brand-system"
    primary_link = payment_link or manage_link or app_url
    primary_label = "Complete next step" if payment_link else "Open Bookedai.au"

    text_lines = [
        f"Hi {customer_name},",
        "",
        "Your Bookedai.au booking has been confirmed.",
        f"Service: {service_name}",
        f"Schedule: {slot_label}",
        f"Timezone: {timezone}",
        f"Booking reference: {booking_reference}",
        f"Handled by: {business_name}",
        f"Location: {venue_name}",
    ]
    if payment_link:
        text_lines.append(f"Payment link: {payment_link}")
    if manage_link and manage_link != payment_link:
        text_lines.append(f"Manage booking: {manage_link}")
    if additional_note:
        text_lines.extend(["", f"Note: {additional_note}"])
    text_lines.extend(
        [
            "",
            f"Need help? Reply to {support_email} or message {support_phone} on Telegram, WhatsApp, or iMessage.",
            "Bookedai.au",
            "AI Receptionist & Booking for SMEs",
        ]
    )

    html = f"""
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f5f7;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;">
      <tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding:28px 28px 18px;background:linear-gradient(135deg,#f7fbff 0%,#ffffff 100%);border-bottom:1px solid rgba(29,29,31,0.08);">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:56px;height:56px;border-radius:18px;background:#f5f5f7;padding:6px;">
                      <img src="{logo_url}" alt="Bookedai.au logo" width="44" height="44" style="display:block;width:44px;height:44px;object-fit:contain;" />
                    </td>
                    <td style="padding-left:16px;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0071e3;">AI Receptionist & Booking for SMEs</div>
                      <div style="padding-top:8px;font-size:28px;line-height:1.15;font-weight:700;color:#1d1d1f;">Bookedai.au booking confirmed</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#3a3a3c;">
                  Hi {customer_name}, your next step with <strong>{service_name}</strong> is now confirmed and ready to move forward.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7fbff;border:1px solid #d6e8ff;border-radius:22px;">
                  <tr>
                    <td style="padding:20px;">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0071e3;">Confirmation summary</div>
                      <div style="padding-top:14px;font-size:16px;line-height:1.8;color:#1d1d1f;">
                        <div><strong>Service:</strong> {service_name}</div>
                        <div><strong>Schedule:</strong> {slot_label}</div>
                        <div><strong>Timezone:</strong> {timezone}</div>
                        <div><strong>Booking reference:</strong> {booking_reference}</div>
                        <div><strong>Handled by:</strong> {business_name}</div>
                        <div><strong>Location:</strong> {venue_name}</div>
                      </div>
                    </td>
                  </tr>
                </table>
                {"<p style='margin:18px 0 0;font-size:14px;line-height:1.7;color:#3a3a3c;'><strong>Additional note:</strong> " + additional_note + "</p>" if additional_note else ""}
                <div style="padding-top:24px;">
                  <a href="{primary_link}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-weight:700;border-radius:999px;padding:14px 22px;">{primary_label}</a>
                </div>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#6e6e73;">
                  Need help? Reply to <a href="mailto:{support_email}" style="color:#0071e3;text-decoration:none;">{support_email}</a>
                  or message {support_phone} on Telegram, WhatsApp, or iMessage.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()

    return RenderedEmailTemplate(
        subject=f"Bookedai.au confirmed: {service_name} ({booking_reference})",
        text="\n".join(text_lines),
        html=html,
    )


def normalize_e164(value: str) -> str:
    trimmed = PHONE_REGEX.sub("", str(value or "").strip())
    if not trimmed:
        raise ValueError("A phone number is required.")
    if not trimmed.startswith("+"):
        raise ValueError("Phone number must be provided in international format, for example +61400000000.")
    digits = trimmed[1:]
    if not digits.isdigit() or len(digits) < 8:
        raise ValueError("Phone number must be a valid E.164 number.")
    return f"+{digits}"


class CommunicationService:
    settings: Settings

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.sms_adapter = SmsAdapter(provider_name=f"sms_{settings.sms_provider or 'unconfigured'}")
        self.whatsapp_adapter = WhatsAppAdapter(
            provider_name=f"whatsapp_{settings.whatsapp_provider or 'unconfigured'}"
        )

    def sms_configured(self) -> bool:
        if self.settings.sms_provider != "twilio":
            return False
        has_sender = bool(self.settings.sms_from_number or self.settings.sms_messaging_service_sid)
        has_credentials = bool(
            (self.settings.sms_twilio_account_sid and self.settings.sms_twilio_auth_token)
            or (self.settings.sms_twilio_api_key_sid and self.settings.sms_twilio_api_key_secret)
        )
        return bool(
            self.settings.sms_twilio_account_sid
            and has_credentials
            and has_sender
        )

    def whatsapp_configured(self) -> bool:
        primary_provider = self._normalize_provider_name(self.settings.whatsapp_provider)
        fallback_provider = self._normalize_provider_name(self.settings.whatsapp_fallback_provider)
        return self._whatsapp_provider_configured(primary_provider) or (
            bool(fallback_provider)
            and fallback_provider != primary_provider
            and self._whatsapp_provider_configured(fallback_provider)
        )

    def telegram_configured(self) -> bool:
        return bool(self._customer_telegram_bot_token())

    def whatsapp_delivery_provider_name(self) -> str:
        primary_provider = self._normalize_provider_name(self.settings.whatsapp_provider)
        fallback_provider = self._normalize_provider_name(self.settings.whatsapp_fallback_provider)
        if self._whatsapp_provider_configured(primary_provider):
            return f"whatsapp_{primary_provider}"
        if (
            fallback_provider
            and fallback_provider != primary_provider
            and self._whatsapp_provider_configured(fallback_provider)
        ):
            return f"whatsapp_{fallback_provider}"
        return self.whatsapp_adapter.provider_name

    def sms_safe_summary(self) -> dict[str, object]:
        configured_fields: list[str] = []
        if self.settings.sms_twilio_account_sid:
            configured_fields.append("sms_twilio_account_sid")
        if self.settings.sms_twilio_api_key_sid:
            configured_fields.append("sms_twilio_api_key_sid")
        if self.settings.sms_from_number:
            configured_fields.append("sms_from_number")
        if self.settings.sms_messaging_service_sid:
            configured_fields.append("sms_messaging_service_sid")
        summary = self.sms_adapter.safe_summary(configured_fields=configured_fields)
        return summary.model_dump(mode="json")

    def whatsapp_safe_summary(self) -> dict[str, object]:
        configured_fields: list[str] = []
        primary_provider = self._normalize_provider_name(self.settings.whatsapp_provider)
        fallback_provider = self._normalize_provider_name(self.settings.whatsapp_fallback_provider)
        notes: list[str] = []
        if primary_provider == "twilio":
            if self.settings.whatsapp_twilio_account_sid:
                configured_fields.append("whatsapp_twilio_account_sid")
            if self.settings.whatsapp_twilio_api_key_sid:
                configured_fields.append("whatsapp_twilio_api_key_sid")
            if self.settings.whatsapp_from_number:
                configured_fields.append("whatsapp_from_number")
        elif primary_provider == "meta":
            if self.settings.whatsapp_meta_phone_number_id:
                configured_fields.append("whatsapp_meta_phone_number_id")
            if self.settings.whatsapp_from_number:
                configured_fields.append("whatsapp_from_number")
        elif primary_provider == "evolution":
            if self.settings.whatsapp_evolution_api_url:
                configured_fields.append("whatsapp_evolution_api_url")
            if self.settings.whatsapp_evolution_api_key:
                configured_fields.append("whatsapp_evolution_api_key")
            if self.settings.whatsapp_evolution_instance:
                configured_fields.append("whatsapp_evolution_instance")
            notes.extend(
                [
                    "personal_whatsapp_bridge=evolution_api",
                    "requires_qr_session_connected",
                ]
            )
        if fallback_provider and fallback_provider != primary_provider:
            notes.append(f"fallback_provider=whatsapp_{fallback_provider}")
            if self._whatsapp_provider_configured(fallback_provider):
                notes.append("fallback_provider_configured")
        summary = self.whatsapp_adapter.safe_summary(configured_fields=configured_fields)
        payload = summary.model_dump(mode="json")
        payload["enabled"] = self.whatsapp_configured()
        payload["notes"] = notes
        return payload

    def render_template(
        self,
        *,
        template_key: str | None,
        variables: dict[str, str] | None,
        fallback_body: str | None,
    ) -> str:
        if template_key:
            template = BOOKEDAI_COMMUNICATION_TEMPLATES.get(template_key)
            if not template:
                raise ValueError(f"Unknown communication template: {template_key}")
            template_variables = {
                "customer_name": "there",
                "service_name": "Bookedai.au booking",
                "slot_label": "To be confirmed",
                "booking_reference": "Pending reference",
                "business_name": "Bookedai.au",
                "support_email": DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
                "support_phone": DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE,
                **(variables or {}),
            }
            return Template(template).safe_substitute(template_variables)
        body = str(fallback_body or "").strip()
        if not body:
            raise ValueError("A message body or supported template_key is required.")
        return body

    async def send_sms(
        self,
        *,
        to: str,
        body: str | None = None,
        template_key: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> CommunicationSendResult:
        recipient = normalize_e164(to)
        rendered_body = self.render_template(
            template_key=template_key,
            variables=variables,
            fallback_body=body,
        )
        if not self.sms_configured():
            return CommunicationSendResult(
                provider=self.sms_adapter.provider_name,
                delivery_status="queued",
                warnings=["SMS provider is not fully configured; message was recorded for manual review."],
            )
        return await self._send_twilio_message(
            account_sid=self.settings.sms_twilio_account_sid,
            auth_username=self.settings.sms_twilio_api_key_sid or self.settings.sms_twilio_account_sid,
            auth_secret=self.settings.sms_twilio_api_key_secret or self.settings.sms_twilio_auth_token,
            to=recipient,
            body=rendered_body,
            from_number=self.settings.sms_from_number or None,
            messaging_service_sid=self.settings.sms_messaging_service_sid or None,
            provider_label=self.sms_adapter.provider_name,
        )

    async def send_whatsapp(
        self,
        *,
        to: str,
        body: str | None = None,
        template_key: str | None = None,
        variables: dict[str, str] | None = None,
    ) -> CommunicationSendResult:
        recipient = normalize_e164(to)
        rendered_body = self.render_template(
            template_key=template_key,
            variables=variables,
            fallback_body=body,
        )
        primary_provider = self._normalize_provider_name(self.settings.whatsapp_provider)
        fallback_provider = self._normalize_provider_name(self.settings.whatsapp_fallback_provider)
        if not self.whatsapp_configured():
            return CommunicationSendResult(
                provider=self.whatsapp_adapter.provider_name,
                delivery_status="queued",
                warnings=["WhatsApp provider is not fully configured; message was recorded for manual review."],
            )
        fallback_warning = ""
        if self._whatsapp_provider_configured(primary_provider):
            result = await self._send_whatsapp_for_provider(
                primary_provider,
                to=recipient,
                body=rendered_body,
            )
            if not self._should_try_whatsapp_fallback(result, primary_provider, fallback_provider):
                return result
            fallback_warning = (
                f"WhatsApp primary provider whatsapp_{primary_provider} is unavailable; "
                f"trying backup provider whatsapp_{fallback_provider}."
            )
        elif fallback_provider and fallback_provider != primary_provider:
            fallback_warning = (
                f"WhatsApp primary provider whatsapp_{primary_provider or 'unconfigured'} is not configured; "
                f"using backup provider whatsapp_{fallback_provider}."
            )

        if fallback_provider and fallback_provider != primary_provider and self._whatsapp_provider_configured(fallback_provider):
            result = await self._send_whatsapp_for_provider(
                fallback_provider,
                to=recipient,
                body=rendered_body,
            )
            warnings = [fallback_warning, *(result.warnings or [])] if fallback_warning else result.warnings
            return CommunicationSendResult(
                provider=result.provider,
                delivery_status=result.delivery_status,
                provider_message_id=result.provider_message_id,
                warnings=warnings,
            )

        return CommunicationSendResult(
            provider=self.whatsapp_adapter.provider_name,
            delivery_status="queued",
            warnings=["WhatsApp provider is not fully configured; message was recorded for manual review."],
        )

    async def send_telegram(
        self,
        *,
        chat_id: str,
        body: str | None = None,
        template_key: str | None = None,
        variables: dict[str, str] | None = None,
        reply_markup: dict[str, object] | None = None,
        parse_mode: str | None = None,
    ) -> CommunicationSendResult:
        recipient = str(chat_id or "").strip()
        if not recipient:
            raise ValueError("Telegram chat_id is required.")
        rendered_body = self.render_template(
            template_key=template_key,
            variables=variables,
            fallback_body=body,
        )
        bot_token = self._customer_telegram_bot_token()
        if not bot_token:
            return CommunicationSendResult(
                provider="telegram_bot",
                delivery_status="queued",
                warnings=["Telegram bot token is not configured; message was recorded for manual review."],
            )
        async with httpx.AsyncClient(timeout=20) as client:
            previous_httpx_level = HTTPX_LOGGER.level
            HTTPX_LOGGER.setLevel(logging.WARNING)
            try:
                payload: dict[str, object] = {
                    "chat_id": recipient,
                    "text": rendered_body,
                    "disable_web_page_preview": True,
                }
                if parse_mode:
                    payload["parse_mode"] = parse_mode
                if reply_markup:
                    payload["reply_markup"] = reply_markup
                response = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json=payload,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code if error.response is not None else None
                warning = "Telegram delivery is unavailable right now; the message was recorded for manual review."
                if status_code is not None:
                    warning = f"Telegram provider returned HTTP {status_code}; the message was recorded for manual review."
                return CommunicationSendResult(
                    provider="telegram_bot",
                    delivery_status="queued",
                    warnings=[warning],
                )
            finally:
                HTTPX_LOGGER.setLevel(previous_httpx_level)
        payload = response.json() if response.content else {}
        result = payload.get("result") if isinstance(payload, dict) else {}
        message_id = result.get("message_id") if isinstance(result, dict) else None
        return CommunicationSendResult(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id=str(message_id) if message_id is not None else None,
            warnings=[],
        )

    async def answer_telegram_callback_query(
        self,
        *,
        callback_query_id: str,
        text: str | None = None,
    ) -> CommunicationSendResult:
        callback_id = str(callback_query_id or "").strip()
        if not callback_id:
            raise ValueError("Telegram callback_query_id is required.")
        bot_token = self._customer_telegram_bot_token()
        if not bot_token:
            return CommunicationSendResult(
                provider="telegram_bot",
                delivery_status="queued",
                warnings=["Telegram bot token is not configured; callback acknowledgement was recorded for manual review."],
            )
        async with httpx.AsyncClient(timeout=20) as client:
            previous_httpx_level = HTTPX_LOGGER.level
            HTTPX_LOGGER.setLevel(logging.WARNING)
            try:
                payload: dict[str, object] = {"callback_query_id": callback_id}
                if text:
                    payload["text"] = text[:200]
                response = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery",
                    json=payload,
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code if error.response is not None else None
                warning = "Telegram callback acknowledgement is unavailable right now."
                if status_code is not None:
                    warning = f"Telegram callback acknowledgement returned HTTP {status_code}."
                return CommunicationSendResult(
                    provider="telegram_bot",
                    delivery_status="queued",
                    warnings=[warning],
                )
            finally:
                HTTPX_LOGGER.setLevel(previous_httpx_level)
        return CommunicationSendResult(
            provider="telegram_bot",
            delivery_status="sent",
            warnings=[],
        )

    @staticmethod
    def _normalize_provider_name(value: str | None) -> str:
        return str(value or "").strip().lower()

    def _customer_telegram_bot_token(self) -> str:
        return (
            str(getattr(self.settings, "bookedai_customer_telegram_bot_token", "") or "").strip()
            or str(getattr(self.settings, "telegram_bot_token", "") or "").strip()
        )

    def _whatsapp_provider_configured(self, provider: str) -> bool:
        if provider == "twilio":
            has_credentials = bool(
                (self.settings.whatsapp_twilio_account_sid and self.settings.whatsapp_twilio_auth_token)
                or (self.settings.whatsapp_twilio_api_key_sid and self.settings.whatsapp_twilio_api_key_secret)
            )
            return bool(
                self.settings.whatsapp_twilio_account_sid
                and has_credentials
                and self.settings.whatsapp_from_number
            )
        if provider == "meta":
            return bool(
                self.settings.whatsapp_meta_phone_number_id
                and self.settings.whatsapp_meta_access_token
                and self.settings.whatsapp_from_number
            )
        if provider == "evolution":
            return bool(
                self.settings.whatsapp_evolution_api_url
                and self.settings.whatsapp_evolution_api_key
            )
        return False

    @staticmethod
    def _should_try_whatsapp_fallback(
        result: CommunicationSendResult,
        primary_provider: str,
        fallback_provider: str,
    ) -> bool:
        if not fallback_provider or fallback_provider == primary_provider:
            return False
        return bool(
            result.delivery_status == "queued"
            and not result.provider_message_id
            and result.warnings
        )

    async def _send_whatsapp_for_provider(
        self,
        provider: str,
        *,
        to: str,
        body: str,
    ) -> CommunicationSendResult:
        if provider == "meta":
            return await self._send_meta_whatsapp_message(
                to=to,
                body=body,
                provider_label="whatsapp_meta",
            )
        if provider == "twilio":
            return await self._send_twilio_whatsapp_message(to=to, body=body)
        if provider == "evolution":
            return await self._send_evolution_whatsapp_message(to=to, body=body)
        return CommunicationSendResult(
            provider=f"whatsapp_{provider or 'unconfigured'}",
            delivery_status="queued",
            warnings=["WhatsApp provider is not supported; message was recorded for manual review."],
        )

    async def _send_twilio_whatsapp_message(self, *, to: str, body: str) -> CommunicationSendResult:
        return await self._send_twilio_message(
            account_sid=self.settings.whatsapp_twilio_account_sid,
            auth_username=self.settings.whatsapp_twilio_api_key_sid or self.settings.whatsapp_twilio_account_sid,
            auth_secret=self.settings.whatsapp_twilio_api_key_secret or self.settings.whatsapp_twilio_auth_token,
            to=f"whatsapp:{to}",
            body=body,
            from_number=self._normalize_whatsapp_sender(self.settings.whatsapp_from_number),
            messaging_service_sid=None,
            provider_label="whatsapp_twilio",
        )

    async def _send_evolution_whatsapp_message(self, *, to: str, body: str) -> CommunicationSendResult:
        base_url = self.settings.whatsapp_evolution_api_url.rstrip("/")
        instance = self.settings.whatsapp_evolution_instance or "bookedai"
        api_key = self.settings.whatsapp_evolution_api_key
        number = to.lstrip("+").replace(" ", "")
        url = f"{base_url}/message/sendText/{instance}"
        payloads = [
            {"number": number, "text": body},
            {"number": number, "textMessage": {"text": body}},
        ]
        warnings: list[str] = []
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                for index, payload_body in enumerate(payloads):
                    response = await client.post(
                        url,
                        json=payload_body,
                        headers={"apikey": api_key, "Content-Type": "application/json"},
                    )
                    if response.status_code in {200, 201}:
                        payload = response.json() if response.content else {}
                        msg_id = str(payload.get("key", {}).get("id") or payload.get("id") or "")
                        if index > 0:
                            warnings.append("Evolution API accepted the legacy textMessage payload.")
                        return CommunicationSendResult(
                            provider="whatsapp_evolution",
                            delivery_status="sent",
                            provider_message_id=msg_id or None,
                            warnings=warnings,
                        )
                    warnings.append(
                        f"Evolution API attempt {index + 1} returned {response.status_code}: {response.text[:200]}"
                    )
                    if response.status_code not in {400, 422, 500}:
                        break
            return CommunicationSendResult(
                provider="whatsapp_evolution",
                delivery_status="queued",
                warnings=warnings or ["Evolution API did not accept the message payload."],
            )
        except Exception as exc:
            exception_message = str(exc).strip() or type(exc).__name__
            return CommunicationSendResult(
                provider="whatsapp_evolution",
                delivery_status="queued",
                warnings=[*warnings, f"Evolution API request failed: {exception_message}"],
            )

    @staticmethod
    def _normalize_whatsapp_sender(value: str) -> str:
        if value.startswith("whatsapp:"):
            return value
        return f"whatsapp:{normalize_e164(value)}"

    async def _send_twilio_message(
        self,
        *,
        account_sid: str,
        auth_username: str,
        auth_secret: str,
        to: str,
        body: str,
        from_number: str | None,
        messaging_service_sid: str | None,
        provider_label: str,
    ) -> CommunicationSendResult:
        payload = {
            "To": to,
            "Body": body,
        }
        if messaging_service_sid:
            payload["MessagingServiceSid"] = messaging_service_sid
        elif from_number:
            payload["From"] = from_number
        else:
            raise ValueError("Twilio requires a sender number or messaging service SID.")

        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                    data=payload,
                    auth=(auth_username, auth_secret),
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code if error.response is not None else None
                if status_code in {401, 403} or (status_code is not None and status_code >= 500):
                    return CommunicationSendResult(
                        provider=provider_label,
                        delivery_status="queued",
                        provider_message_id=None,
                        warnings=[
                            "Messaging provider delivery is unavailable right now; the message was recorded for manual review."
                        ],
                    )
                raise
            data = response.json()
        return CommunicationSendResult(
            provider=provider_label,
            delivery_status=data.get("status", "sent"),
            provider_message_id=data.get("sid"),
            warnings=[],
        )

    async def _send_meta_whatsapp_message(
        self,
        *,
        to: str,
        body: str,
        provider_label: str | None = None,
    ) -> CommunicationSendResult:
        recipient = to.lstrip("+")
        async with httpx.AsyncClient(timeout=20) as client:
            try:
                response = await client.post(
                    f"https://graph.facebook.com/v19.0/{self.settings.whatsapp_meta_phone_number_id}/messages",
                    headers={
                        "Authorization": f"Bearer {self.settings.whatsapp_meta_access_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": recipient,
                        "type": "text",
                        "text": {"body": body},
                    },
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code if error.response is not None else None
                warning = "Messaging provider delivery is unavailable right now; the message was recorded for manual review."
                if status_code is not None:
                    warning = (
                        f"WhatsApp provider returned HTTP {status_code}; "
                        "the message was recorded for manual review."
                    )
                return CommunicationSendResult(
                    provider=provider_label or self.whatsapp_adapter.provider_name,
                    delivery_status="queued",
                    provider_message_id=None,
                    warnings=[warning],
                )
            data = response.json()
        messages = data.get("messages") or []
        first_message = messages[0] if messages else {}
        return CommunicationSendResult(
            provider=provider_label or self.whatsapp_adapter.provider_name,
            delivery_status="sent",
            provider_message_id=first_message.get("id"),
            warnings=[],
        )
