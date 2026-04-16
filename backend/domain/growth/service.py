from __future__ import annotations

from core.contracts.growth import AttributionContract, LandingConversionContract


class GrowthService:
    """Foundation seam for growth attribution and landing conversion tracking."""

    def build_conversion_event(
        self,
        *,
        conversion_type: str,
        landing_path: str,
        attribution: AttributionContract,
    ) -> LandingConversionContract:
        return LandingConversionContract(
            conversion_type=conversion_type,
            landing_path=landing_path,
            attribution=attribution,
        )

