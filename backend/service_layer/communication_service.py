from __future__ import annotations

from dataclasses import dataclass
import re
from string import Template

import httpx

from config import Settings
from integrations.sms import SmsAdapter
from integrations.whatsapp import WhatsAppAdapter


PHONE_REGEX = re.compile(r"[^\d+]")


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
        "Need help? ${support_email}"
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
    support_email = _safe_value(variables, "support_email", "info@bookedai.au")
    payment_link = str((variables or {}).get("payment_link") or "").strip()
    manage_link = str((variables or {}).get("manage_link") or "").strip()
    timezone = _safe_value(variables, "timezone", "Australia/Sydney")
    additional_note = str((variables or {}).get("additional_note") or "").strip()
    app_url = str(public_app_url or "https://bookedai.au").rstrip("/")
    logo_url = f"{app_url}/branding/bookedai-mark.png"
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
            f"Need help? Reply to {support_email}.",
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
                  Need help? Reply to <a href="mailto:{support_email}" style="color:#0071e3;text-decoration:none;">{support_email}</a>.
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
        provider = self.settings.whatsapp_provider
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
        return False

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
        if self.settings.whatsapp_provider == "twilio":
            if self.settings.whatsapp_twilio_account_sid:
                configured_fields.append("whatsapp_twilio_account_sid")
            if self.settings.whatsapp_twilio_api_key_sid:
                configured_fields.append("whatsapp_twilio_api_key_sid")
            if self.settings.whatsapp_from_number:
                configured_fields.append("whatsapp_from_number")
        elif self.settings.whatsapp_provider == "meta":
            if self.settings.whatsapp_meta_phone_number_id:
                configured_fields.append("whatsapp_meta_phone_number_id")
            if self.settings.whatsapp_from_number:
                configured_fields.append("whatsapp_from_number")
        summary = self.whatsapp_adapter.safe_summary(configured_fields=configured_fields)
        return summary.model_dump(mode="json")

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
                "support_email": "info@bookedai.au",
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
        if not self.whatsapp_configured():
            return CommunicationSendResult(
                provider=self.whatsapp_adapter.provider_name,
                delivery_status="queued",
                warnings=["WhatsApp provider is not fully configured; message was recorded for manual review."],
            )
        if self.settings.whatsapp_provider == "meta":
            return await self._send_meta_whatsapp_message(to=recipient, body=rendered_body)
        return await self._send_twilio_message(
            account_sid=self.settings.whatsapp_twilio_account_sid,
            auth_username=self.settings.whatsapp_twilio_api_key_sid or self.settings.whatsapp_twilio_account_sid,
            auth_secret=self.settings.whatsapp_twilio_api_key_secret or self.settings.whatsapp_twilio_auth_token,
            to=f"whatsapp:{recipient}",
            body=rendered_body,
            from_number=self._normalize_whatsapp_sender(self.settings.whatsapp_from_number),
            messaging_service_sid=None,
            provider_label=self.whatsapp_adapter.provider_name,
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
            response = await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                data=payload,
                auth=(auth_username, auth_secret),
            )
            response.raise_for_status()
            data = response.json()
        return CommunicationSendResult(
            provider=provider_label,
            delivery_status=data.get("status", "sent"),
            provider_message_id=data.get("sid"),
            warnings=[],
        )

    async def _send_meta_whatsapp_message(self, *, to: str, body: str) -> CommunicationSendResult:
        recipient = to.lstrip("+")
        async with httpx.AsyncClient(timeout=20) as client:
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
            data = response.json()
        messages = data.get("messages") or []
        first_message = messages[0] if messages else {}
        return CommunicationSendResult(
            provider=self.whatsapp_adapter.provider_name,
            delivery_status="sent",
            provider_message_id=first_message.get("id"),
            warnings=[],
        )
