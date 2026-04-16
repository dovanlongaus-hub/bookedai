from __future__ import annotations

from integrations.base import ProviderAdapter


class StripeAdapter(ProviderAdapter):
    def __init__(self) -> None:
        super().__init__(provider_name="stripe")

