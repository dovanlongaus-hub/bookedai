from __future__ import annotations

from integrations.base import ProviderAdapter


class ZohoCrmAdapter(ProviderAdapter):
    def __init__(self) -> None:
        super().__init__(provider_name="zoho_crm")

