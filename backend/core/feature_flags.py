from __future__ import annotations

from dataclasses import dataclass

from repositories.base import RepositoryContext
from repositories.feature_flag_repository import FeatureFlagRepository


@dataclass(frozen=True)
class FeatureFlag:
    key: str
    description: str
    default_enabled: bool = False


FEATURE_FLAGS: tuple[FeatureFlag, ...] = (
    FeatureFlag(
        key="billing_webhook_shadow_mode",
        description="Keep billing webhook handling in non-authoritative shadow mode.",
    ),
    FeatureFlag(
        key="new_booking_domain_dual_write",
        description="Dual-write booking actions into new domain foundations.",
    ),
    FeatureFlag(
        key="crm_sync_v1_enabled",
        description="Enable the first CRM lifecycle adapter path.",
    ),
    FeatureFlag(
        key="email_template_engine_v1",
        description="Enable modular email composition templates.",
    ),
    FeatureFlag(
        key="tenant_mode_enabled",
        description="Expose tenant-aware runtime seams while staying single-tenant by default.",
    ),
    FeatureFlag(
        key="new_admin_bookings_view",
        description="Gate future admin bookings refactors behind a safe rollout switch.",
    ),
    FeatureFlag(
        key="admin_booking_read_shadow_compare",
        description="Compare legacy admin booking reads against normalized booking/payment mirrors without cutover.",
    ),
    FeatureFlag(
        key="semantic_matching_model_assist_v1",
        description="Enable model-assisted semantic reranking for Prompt 9 catalog search while preserving heuristic fallback.",
    ),
)


def get_flag_defaults() -> dict[str, bool]:
    return {flag.key: flag.default_enabled for flag in FEATURE_FLAGS}


def is_known_flag(flag_key: str) -> bool:
    return any(flag.key == flag_key for flag in FEATURE_FLAGS)


async def is_flag_enabled(
    flag_key: str,
    *,
    session=None,
    tenant_id: str | None = None,
) -> bool:
    defaults = get_flag_defaults()
    default_value = defaults.get(flag_key, False)
    if session is None or not is_known_flag(flag_key):
        return default_value

    repository = FeatureFlagRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    try:
        db_value = await repository.get_flag(flag_key, tenant_id=tenant_id)
    except Exception:
        return default_value

    return default_value if db_value is None else db_value
