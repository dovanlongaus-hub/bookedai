from __future__ import annotations

from integrations.base import ProviderAdapter


class WhatsAppAdapter(ProviderAdapter):
    def __init__(self) -> None:
        super().__init__(provider_name="whatsapp")

