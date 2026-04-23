from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from config import Settings
from core.contracts.common import SafeProviderConfigSummary
from core.contracts.crm import LeadRecordContract
from integrations.base import ProviderAdapter


class ZohoCrmAdapter(ProviderAdapter):
    def __init__(self) -> None:
        super().__init__(provider_name="zoho_crm")

    def configured_fields(self, settings: Settings) -> list[str]:
        fields: list[str] = []
        if settings.zoho_crm_api_base_url.strip():
            fields.append("api_base_url")
        if settings.zoho_crm_access_token.strip():
            fields.append("access_token")
        if settings.zoho_crm_refresh_token.strip():
            fields.append("refresh_token")
        if settings.zoho_crm_client_id.strip():
            fields.append("client_id")
        if settings.zoho_crm_client_secret.strip():
            fields.append("client_secret")
        if settings.zoho_crm_default_lead_module.strip():
            fields.append("default_lead_module")
        if settings.zoho_crm_default_contact_module.strip():
            fields.append("default_contact_module")
        if settings.zoho_crm_default_deal_module.strip():
            fields.append("default_deal_module")
        if settings.zoho_crm_default_task_module.strip():
            fields.append("default_task_module")
        return fields

    def configured(self, settings: Settings) -> bool:
        if (
            settings.zoho_crm_refresh_token.strip()
            and settings.zoho_crm_client_id.strip()
            and settings.zoho_crm_client_secret.strip()
        ):
            return True
        return bool(settings.zoho_crm_access_token.strip())

    def safe_summary(self, settings: Settings) -> SafeProviderConfigSummary:
        configured_fields = self.configured_fields(settings)
        notes: list[str] = []
        if settings.zoho_crm_access_token.strip():
            notes.append("Direct access token is configured. This is useful for smoke tests but expires quickly.")
        if (
            settings.zoho_crm_refresh_token.strip()
            and settings.zoho_crm_client_id.strip()
            and settings.zoho_crm_client_secret.strip()
        ):
            notes.append("Refresh-token flow is configured for durable server-side CRM access.")
        if not self.configured(settings):
            notes.append(
                "Set ZOHO_CRM_ACCESS_TOKEN for a short-lived smoke test, or configure refresh token + client credentials for production."
            )
        return SafeProviderConfigSummary(
            provider=self.provider_name,
            enabled=self.configured(settings),
            label="Zoho CRM connection",
            configured_fields=configured_fields,
            notes=notes,
        )

    def safe_summary_payload(self, settings: Settings) -> dict[str, Any]:
        summary = self.safe_summary(settings)
        if hasattr(summary, "model_dump"):
            return summary.model_dump(mode="json")
        return summary.dict()

    async def get_access_token(self, settings: Settings) -> tuple[str, str | None, str]:
        if (
            settings.zoho_crm_refresh_token.strip()
            and settings.zoho_crm_client_id.strip()
            and settings.zoho_crm_client_secret.strip()
        ):
            token_url = f"{settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    token_url,
                    data={
                        "refresh_token": settings.zoho_crm_refresh_token,
                        "client_id": settings.zoho_crm_client_id,
                        "client_secret": settings.zoho_crm_client_secret,
                        "grant_type": "refresh_token",
                    },
                )
                response.raise_for_status()
                payload = response.json()

            access_token = str(payload.get("access_token") or "").strip()
            if not access_token:
                raise ValueError("Zoho CRM OAuth response did not include an access token.")
            api_domain = str(payload.get("api_domain") or "").strip() or None
            return access_token, api_domain, "refresh_token"

        direct_token = settings.zoho_crm_access_token.strip()
        if direct_token:
            return direct_token, None, "access_token"

        if not self.configured(settings):
            raise ValueError("Zoho CRM OAuth credentials are incomplete.")
        raise ValueError("Zoho CRM OAuth credentials are incomplete.")

    async def fetch_modules(
        self,
        settings: Settings,
        *,
        access_token: str,
        api_base_url: str,
    ) -> list[dict[str, Any]]:
        response_data = await self._request(
            access_token=access_token,
            method="GET",
            url=f"{api_base_url.rstrip('/')}/settings/modules",
        )
        items = response_data.get("modules") or response_data.get("data") or []
        modules: list[dict[str, Any]] = []
        if not isinstance(items, list):
            return modules
        for item in items:
            if not isinstance(item, dict):
                continue
            modules.append(
                {
                    "api_name": item.get("api_name"),
                    "module_name": item.get("module_name") or item.get("singular_label") or item.get("plural_label"),
                    "singular_label": item.get("singular_label"),
                    "plural_label": item.get("plural_label"),
                    "generated_type": item.get("generated_type"),
                    "visible": item.get("visible"),
                    "creatable": item.get("creatable"),
                    "editable": item.get("editable"),
                    "deletable": item.get("deletable"),
                }
            )
        return modules

    async def fetch_fields(
        self,
        *,
        access_token: str,
        api_base_url: str,
        module_api_name: str,
    ) -> list[dict[str, Any]]:
        response_data = await self._request(
            access_token=access_token,
            method="GET",
            url=f"{api_base_url.rstrip('/')}/settings/fields",
            params={"module": module_api_name},
        )
        items = response_data.get("fields") or response_data.get("data") or []
        fields: list[dict[str, Any]] = []
        if not isinstance(items, list):
            return fields
        for item in items:
            if not isinstance(item, dict):
                continue
            fields.append(
                {
                    "api_name": item.get("api_name"),
                    "display_label": item.get("display_label"),
                    "data_type": item.get("data_type"),
                    "required": item.get("required"),
                    "read_only": item.get("read_only"),
                    "system_mandatory": item.get("system_mandatory"),
                    "visible": item.get("visible"),
                }
            )
        return fields

    async def test_connection(
        self,
        settings: Settings,
        *,
        module_api_name: str | None = None,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        requested_module = (
            (module_api_name or "").strip()
            or settings.zoho_crm_default_lead_module.strip()
            or "Leads"
        )
        modules = await self.fetch_modules(
            settings,
            access_token=access_token,
            api_base_url=api_base_url,
        )
        module_fields = await self.fetch_fields(
            access_token=access_token,
            api_base_url=api_base_url,
            module_api_name=requested_module,
        )
        return {
            "provider": self.provider_name,
            "status": "connected",
            "token_source": token_source,
            "api_base_url": api_base_url,
            "api_domain": api_domain,
            "safe_config": self.safe_summary_payload(settings),
            "module_count": len(modules),
            "modules": modules[:20],
            "requested_module": requested_module,
            "requested_module_found": any(
                str(item.get("api_name") or "").strip().lower() == requested_module.lower()
                for item in modules
            ),
            "field_count": len(module_fields),
            "fields": module_fields[:25],
            "defaults": {
                "lead_module": settings.zoho_crm_default_lead_module,
                "contact_module": settings.zoho_crm_default_contact_module,
                "deal_module": settings.zoho_crm_default_deal_module,
                "task_module": settings.zoho_crm_default_task_module,
            },
        }

    async def upsert_lead(
        self,
        settings: Settings,
        *,
        lead: LeadRecordContract,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        module_api_name = settings.zoho_crm_default_lead_module.strip() or "Leads"
        payload = self._build_lead_payload(lead)
        duplicate_check_fields = self._build_duplicate_check_fields(lead)
        if not duplicate_check_fields:
            raise ValueError("Zoho CRM upsert requires at least one duplicate-check field such as Email or Phone.")
        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}/upsert",
            json_body={
                "data": [payload],
                "duplicate_check_fields": duplicate_check_fields,
                "trigger": [],
            },
        )
        result = self._extract_upsert_result(response_data)
        result.update(
            {
                "provider": self.provider_name,
                "module_api_name": module_api_name,
                "token_source": token_source,
                "api_base_url": api_base_url,
            }
        )
        return result

    async def upsert_contact(
        self,
        settings: Settings,
        *,
        lead: LeadRecordContract,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        module_api_name = settings.zoho_crm_default_contact_module.strip() or "Contacts"
        payload = {
            "Last_Name": self._resolve_last_name(lead.full_name),
        }
        if lead.email:
            payload["Email"] = lead.email.strip().lower()
        if lead.phone:
            payload["Phone"] = lead.phone.strip()
        duplicate_check_fields = self._build_duplicate_check_fields(lead)
        if not duplicate_check_fields:
            raise ValueError("Zoho CRM contact upsert requires Email or Phone.")
        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}/upsert",
            json_body={
                "data": [payload],
                "duplicate_check_fields": duplicate_check_fields,
                "trigger": [],
            },
        )
        result = self._extract_upsert_result(response_data)
        result.update(
            {
                "provider": self.provider_name,
                "module_api_name": module_api_name,
                "token_source": token_source,
                "api_base_url": api_base_url,
            }
        )
        return result

    async def upsert_deal(
        self,
        settings: Settings,
        *,
        lead: LeadRecordContract,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        module_api_name = settings.zoho_crm_default_deal_module.strip() or "Deals"
        payload = self._build_deal_payload(lead)
        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}/upsert",
            json_body={
                "data": [payload],
                "duplicate_check_fields": ["Deal_Name"],
                "trigger": [],
            },
        )
        result = self._extract_upsert_result(response_data)
        result.update(
            {
                "provider": self.provider_name,
                "module_api_name": module_api_name,
                "token_source": token_source,
                "api_base_url": api_base_url,
            }
        )
        return result

    async def create_follow_up_task(
        self,
        settings: Settings,
        *,
        lead: LeadRecordContract,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        module_api_name = settings.zoho_crm_default_task_module.strip() or "Tasks"
        payload = self._build_task_payload(lead)
        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}",
            json_body={
                "data": [payload],
                "trigger": [],
            },
        )
        result = self._extract_upsert_result(response_data)
        result.update(
            {
                "provider": self.provider_name,
                "module_api_name": module_api_name,
                "token_source": token_source,
                "api_base_url": api_base_url,
            }
        )
        return result

    async def fetch_deal_by_id(
        self,
        settings: Settings,
        *,
        external_deal_id: str,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        module_api_name = settings.zoho_crm_default_deal_module.strip() or "Deals"
        response_data = await self._request(
            access_token=access_token,
            method="GET",
            url=f"{api_base_url.rstrip('/')}/{module_api_name}/{external_deal_id}",
        )
        items = response_data.get("data") or []
        if not isinstance(items, list) or not items or not isinstance(items[0], dict):
            raise ValueError("Zoho CRM deal lookup did not return a deal record.")
        deal = items[0]
        return {
            "provider": self.provider_name,
            "module_api_name": module_api_name,
            "token_source": token_source,
            "api_base_url": api_base_url,
            "deal": deal,
        }

    async def enable_notifications(
        self,
        settings: Settings,
        *,
        channel_id: str,
        token: str,
        notify_url: str,
        events: list[str],
        return_affected_field_values: bool = True,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base_url.rstrip('/')}/actions/watch",
            json_body={
                "watch": [
                    {
                        "channel_id": channel_id,
                        "events": events,
                        "token": token,
                        "notify_url": notify_url,
                        "return_affected_field_values": return_affected_field_values,
                    }
                ]
            },
        )
        watch_items = response_data.get("watch") or []
        first_item = watch_items[0] if isinstance(watch_items, list) and watch_items else {}
        details = first_item.get("details") if isinstance(first_item, dict) and isinstance(first_item.get("details"), dict) else {}
        return {
            "provider": self.provider_name,
            "token_source": token_source,
            "api_base_url": api_base_url,
            "channel_id": channel_id,
            "token": token,
            "notify_url": notify_url,
            "events": events,
            "status": str(first_item.get("status") or "").strip().lower() or "unknown",
            "code": first_item.get("code"),
            "message": first_item.get("message"),
            "details": details,
        }

    async def get_notification_details(
        self,
        settings: Settings,
        *,
        channel_id: str,
        module_api_name: str | None = None,
        page: int = 1,
        per_page: int = 200,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        params: dict[str, Any] = {
            "channel_id": channel_id,
            "page": page,
            "per_page": per_page,
        }
        if (module_api_name or "").strip():
            params["module"] = module_api_name.strip()
        response_data = await self._request(
            access_token=access_token,
            method="GET",
            url=f"{api_base_url.rstrip('/')}/actions/watch",
            params=params,
        )
        return {
            "provider": self.provider_name,
            "token_source": token_source,
            "api_base_url": api_base_url,
            "channel_id": channel_id,
            "items": response_data.get("watch") if isinstance(response_data.get("watch"), list) else [],
        }

    async def update_notification_details(
        self,
        settings: Settings,
        *,
        channel_id: str,
        token: str,
        notify_url: str,
        events: list[str],
        channel_expiry: str | None = None,
        return_affected_field_values: bool = True,
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        watch_payload: dict[str, Any] = {
            "channel_id": channel_id,
            "token": token,
            "notify_url": notify_url,
            "events": events,
            "return_affected_field_values": return_affected_field_values,
        }
        if (channel_expiry or "").strip():
            watch_payload["channel_expiry"] = channel_expiry.strip()
        response_data = await self._request(
            access_token=access_token,
            method="PATCH",
            url=f"{api_base_url.rstrip('/')}/actions/watch",
            json_body={"watch": [watch_payload]},
        )
        watch_items = response_data.get("watch") or []
        first_item = watch_items[0] if isinstance(watch_items, list) and watch_items else {}
        details = first_item.get("details") if isinstance(first_item, dict) and isinstance(first_item.get("details"), dict) else {}
        return {
            "provider": self.provider_name,
            "token_source": token_source,
            "api_base_url": api_base_url,
            "channel_id": channel_id,
            "token": token,
            "notify_url": notify_url,
            "events": events,
            "channel_expiry": channel_expiry,
            "status": str(first_item.get("status") or "").strip().lower() or "unknown",
            "code": first_item.get("code"),
            "message": first_item.get("message"),
            "details": details,
        }

    async def disable_notifications(
        self,
        settings: Settings,
        *,
        channel_ids: list[str],
    ) -> dict[str, Any]:
        access_token, api_domain, token_source = await self.get_access_token(settings)
        api_base_url = self._resolve_api_base_url(settings, api_domain=api_domain)
        response_data = await self._request(
            access_token=access_token,
            method="DELETE",
            url=f"{api_base_url.rstrip('/')}/actions/watch",
            params={"channel_ids": ",".join(channel_ids)},
        )
        return {
            "provider": self.provider_name,
            "token_source": token_source,
            "api_base_url": api_base_url,
            "channel_ids": channel_ids,
            "items": response_data.get("watch") if isinstance(response_data.get("watch"), list) else [],
        }

    def _resolve_api_base_url(self, settings: Settings, *, api_domain: str | None = None) -> str:
        if api_domain:
            return f"{api_domain.rstrip('/')}/crm/v8"
        return settings.zoho_crm_api_base_url.rstrip("/")

    def _build_lead_payload(self, lead: LeadRecordContract) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "Last_Name": self._resolve_last_name(lead.full_name),
            "Company": (lead.company_name or "").strip() or "BookedAI Lead",
        }
        if lead.full_name:
            payload["Full_Name"] = lead.full_name.strip()
        if lead.email:
            payload["Email"] = lead.email.strip().lower()
        if lead.phone:
            payload["Phone"] = lead.phone.strip()
        if lead.source:
            payload["Lead_Source"] = lead.source.strip()
        if lead.lead_status:
            payload["Lead_Status"] = lead.lead_status.strip()
        return payload

    def _build_duplicate_check_fields(self, lead: LeadRecordContract) -> list[str]:
        duplicate_check_fields: list[str] = []
        if (lead.email or "").strip():
            duplicate_check_fields.append("Email")
        if (lead.phone or "").strip():
            duplicate_check_fields.append("Phone")
        return duplicate_check_fields

    def _build_deal_payload(self, lead: LeadRecordContract) -> dict[str, Any]:
        metadata = lead.metadata or {}
        booking_reference = str(metadata.get("booking_reference") or lead.lead_id or "").strip()
        service_name = str(metadata.get("service_name") or lead.company_name or "BookedAI Service").strip()
        requested_date = str(metadata.get("requested_date") or "").strip()
        requested_time = str(metadata.get("requested_time") or "").strip()
        full_name = (lead.full_name or "").strip() or "BookedAI Customer"
        deal_name = str(metadata.get("deal_name") or "").strip() or f"{service_name} - {full_name}"
        closing_date = requested_date or (datetime.now(UTC) + timedelta(days=7)).date().isoformat()
        stage = str(metadata.get("deal_stage") or "").strip() or "Qualification"

        description_lines = [
            f"BookedAI booking reference: {booking_reference}" if booking_reference else "",
            f"Service: {service_name}" if service_name else "",
            f"Customer: {full_name}" if full_name else "",
            f"Requested slot: {requested_date} {requested_time}".strip() if requested_date or requested_time else "",
            f"Lead source: {lead.source}" if lead.source else "",
            f"Notes: {str(metadata.get('notes') or '').strip()}" if str(metadata.get("notes") or "").strip() else "",
        ]
        payload: dict[str, Any] = {
            "Deal_Name": deal_name,
            "Closing_Date": closing_date,
            "Stage": stage,
            "Description": "\n".join(line for line in description_lines if line),
        }
        amount_aud = metadata.get("amount_aud")
        if amount_aud not in {None, ""}:
            payload["Amount"] = amount_aud
        external_contact_id = str(metadata.get("external_contact_id") or "").strip()
        if external_contact_id:
            payload["Contact_Name"] = {"id": external_contact_id}
        return payload

    def _build_task_payload(self, lead: LeadRecordContract) -> dict[str, Any]:
        metadata = lead.metadata or {}
        service_name = str(metadata.get("service_name") or lead.company_name or "BookedAI Service").strip()
        booking_reference = str(metadata.get("booking_reference") or lead.lead_id or "").strip()
        requested_date = str(metadata.get("requested_date") or "").strip()
        requested_time = str(metadata.get("requested_time") or "").strip()
        booking_path = str(metadata.get("booking_path") or "").strip()
        full_name = (lead.full_name or "").strip() or "BookedAI Customer"
        due_date = requested_date or (datetime.now(UTC) + timedelta(days=1)).date().isoformat()
        subject = str(metadata.get("task_subject") or "").strip() or f"Booking follow-up: {service_name}"
        priority = "High" if booking_path == "request_callback" else "Normal"

        description_lines = [
            f"BookedAI booking reference: {booking_reference}" if booking_reference else "",
            f"Customer: {full_name}" if full_name else "",
            f"Requested slot: {requested_date} {requested_time}".strip() if requested_date or requested_time else "",
            f"Lead source: {lead.source}" if lead.source else "",
            f"Notes: {str(metadata.get('notes') or '').strip()}" if str(metadata.get("notes") or "").strip() else "",
        ]
        payload: dict[str, Any] = {
            "Subject": subject,
            "Due_Date": due_date,
            "Status": "Not Started",
            "Priority": priority,
            "Description": "\n".join(line for line in description_lines if line),
        }
        external_contact_id = str(metadata.get("external_contact_id") or "").strip()
        if external_contact_id:
            payload["Who_Id"] = external_contact_id
        external_deal_id = str(metadata.get("external_deal_id") or "").strip()
        if external_deal_id:
            payload["What_Id"] = external_deal_id
            payload["$se_module"] = "Deals"
        return payload

    def _resolve_last_name(self, full_name: str | None) -> str:
        normalized = (full_name or "").strip()
        if not normalized:
            return "BookedAI"
        return normalized.split()[-1] or "BookedAI"

    def _extract_upsert_result(self, response_data: dict[str, Any]) -> dict[str, Any]:
        items = response_data.get("data") or []
        if not isinstance(items, list) or not items:
            raise ValueError("Zoho CRM upsert response did not include record results.")
        first_item = items[0]
        if not isinstance(first_item, dict):
            raise ValueError("Zoho CRM upsert response returned an unexpected record payload.")
        details = first_item.get("details") if isinstance(first_item.get("details"), dict) else {}
        return {
            "status": str(first_item.get("status") or "").strip().lower() or "unknown",
            "code": first_item.get("code"),
            "message": first_item.get("message"),
            "external_id": details.get("id"),
            "action": details.get("action"),
            "duplicate_field": details.get("duplicate_field"),
        }

    async def _request(
        self,
        *,
        access_token: str,
        method: str,
        url: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
            response.raise_for_status()
            payload = response.json()
        return payload if isinstance(payload, dict) else {}
