from __future__ import annotations

from integrations.base import ProviderAdapter


class EmailProviderAdapter(ProviderAdapter):
    def __init__(self, provider_name: str = "email_provider") -> None:
        super().__init__(provider_name=provider_name)

