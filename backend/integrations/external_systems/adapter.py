from __future__ import annotations

from integrations.base import ProviderAdapter


class ExternalSystemAdapter(ProviderAdapter):
    def __init__(self, provider_name: str) -> None:
        super().__init__(provider_name=provider_name)

