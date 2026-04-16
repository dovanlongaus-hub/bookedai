from __future__ import annotations

from core.contracts.deployment_modes import DeploymentModeContract


class DeploymentModesService:
    """Foundation seam for standalone, embedded, plugin, and headless capability rules."""

    def get_mode(self, mode: str) -> DeploymentModeContract:
        if mode == "standalone_app":
            return DeploymentModeContract(
                mode="standalone_app",
                availability_truth_managed_by_bookedai=True,
                supports_embedded_widget=True,
                supports_headless_api=True,
            )
        if mode == "embedded_widget":
            return DeploymentModeContract(
                mode="embedded_widget",
                supports_embedded_widget=True,
            )
        if mode == "plugin_integrated":
            return DeploymentModeContract(
                mode="plugin_integrated",
                supports_headless_api=True,
            )
        return DeploymentModeContract(mode="headless_api", supports_headless_api=True)

