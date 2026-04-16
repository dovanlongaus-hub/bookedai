from __future__ import annotations

from integrations.base import ProviderAdapter


class N8NAdapter(ProviderAdapter):
    def __init__(self) -> None:
        super().__init__(provider_name="n8n")

