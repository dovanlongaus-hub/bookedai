from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


DeploymentMode = Literal[
    "standalone_app",
    "embedded_widget",
    "plugin_integrated",
    "headless_api",
]


class DeploymentModeContract(BaseModel):
    mode: DeploymentMode
    availability_truth_managed_by_bookedai: bool = False
    supports_embedded_widget: bool = False
    supports_headless_api: bool = False
    label: str | None = None
    description: str | None = None
    deployment_surface: str | None = None
    notes: str | None = None
