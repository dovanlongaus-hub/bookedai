from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlencode

import httpx
from sqlalchemy import desc, select, text

from db import ServiceMerchantProfile
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.feature_flag_repository import FeatureFlagRepository
from repositories.outbox_repository import OutboxRepository
from repositories.reporting_repository import ReportingRepository
from repositories.tenant_repository import TenantRepository
from service_layer.admin_presenters import (
    build_service_catalog_quality_counts,
    build_service_merchant_item,
)
from service_layer.prompt11_integration_service import (
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_reconciliation_details,
)

TENANT_BILLING_PLAN_CATALOG = [
    {
        "code": "starter",
        "label": "Upgrade 1",
        "price_label": "A$79/mo",
        "monthly_amount_aud": 79,
        "billing_interval": "monthly",
        "description": "For early tenant teams moving beyond freemium into their first paid BookedAI package.",
        "features": [
            "Unified tenant sign-in and workspace",
            "Catalog import, review, and publish controls",
            "Core bookings, integrations, and billing visibility",
        ],
        "recommended": False,
    },
    {
        "code": "growth",
        "label": "Upgrade 2",
        "price_label": "A$149/mo",
        "monthly_amount_aud": 149,
        "billing_interval": "monthly",
        "description": "For tenants running recurring operations with the default paid BookedAI package and stronger reporting, billing posture, and team workflows.",
        "features": [
            "Everything in Upgrade 1",
            "Revenue and billing health reporting",
            "Priority support and production rollout posture",
        ],
        "recommended": True,
    },
    {
        "code": "scale",
        "label": "Upgrade 3",
        "price_label": "A$299/mo",
        "monthly_amount_aud": 299,
        "billing_interval": "monthly",
        "description": "For multi-location operators who need the most advanced BookedAI package, stronger controls, higher service volume, and paid SaaS governance.",
        "features": [
            "Everything in Upgrade 2",
            "Expanded operational support lanes",
            "Higher-touch rollout and billing governance",
        ],
        "recommended": False,
    },
]

TENANT_PLUGIN_DEFAULT_FEATURES = {
    "chat": True,
    "search": True,
    "booking": True,
    "payment": True,
    "email": True,
    "crm": True,
    "whatsapp": True,
}

TENANT_WORKSPACE_GUIDE_DEFAULTS = {
    "overview": "Review the live operating posture first: revenue capture, onboarding progress, search readiness, and the next action that needs leadership attention.",
    "experience": "Update tenant identity, brand imagery, and HTML introduction here so the workspace stays enterprise-ready and consistent across operator-facing flows.",
    "catalog": "Keep services grouped clearly by business function, confirm pricing and imagery, then publish only rows that are ready for search and booking.",
    "plugin": "Use this area when the tenant needs BookedAI embedded into another website or product surface, with saved runtime configuration and reusable snippets.",
    "bookings": "Monitor booking states, payment dependency, and confidence from one queue so customer follow-up can move without switching tools.",
    "integrations": "Treat provider posture as controlled infrastructure: pause or resume carefully, and confirm retries or alerts before changing production sync behavior.",
    "billing": "Keep billing identity, collection readiness, invoices, and plan posture accurate here so the workspace stays commercially production-safe.",
    "team": "Manage roles with least-privilege discipline, invite only the people needed for the workflow, and keep finance and operator responsibilities distinct.",
}


def _sanitize_workspace_html(value: object) -> str | None:
    normalized = _clean_optional_text(value)
    if not normalized:
        return None

    sanitized = normalized.replace("<script", "&lt;script").replace("</script>", "&lt;/script&gt;")
    return sanitized


def _audit_actor_label(item: dict[str, object]) -> str | None:
    actor_id = _clean_optional_text(item.get("actor_id"))
    if actor_id:
        return actor_id
    actor_type = _clean_optional_text(item.get("actor_type"))
    if actor_type:
        return actor_type.replace("_", " ")
    return None


def _build_section_activity(
    audit_rows: list[dict[str, object]],
    *,
    event_types: set[str] | None = None,
    event_prefixes: tuple[str, ...] = (),
    entity_types: set[str] | None = None,
    fallback_summary: str,
    fallback_updated_at: object | None = None,
    fallback_actor: str | None = None,
) -> dict[str, object]:
    for item in audit_rows:
        event_type = str(item.get("event_type") or "").strip()
        entity_type = str(item.get("entity_type") or "").strip()
        matches = False
        if event_types and event_type in event_types:
            matches = True
        elif event_prefixes and any(event_type.startswith(prefix) for prefix in event_prefixes):
            matches = True
        elif entity_types and entity_type in entity_types:
            matches = True
        if not matches:
            continue

        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        return {
            "last_updated_at": item.get("created_at"),
            "last_updated_by": _audit_actor_label(item),
            "last_event_type": event_type or None,
            "summary": str(payload.get("summary") or event_type.replace(".", " ")).strip()
            or fallback_summary,
        }

    return {
        "last_updated_at": fallback_updated_at,
        "last_updated_by": fallback_actor,
        "last_event_type": None,
        "summary": fallback_summary,
    }


async def _load_tenant_context(session, *, tenant_ref: str | None = None) -> tuple[dict, str] | tuple[None, None]:
    tenant_repository = TenantRepository(RepositoryContext(session=session))
    tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
    if not tenant_profile:
        return None, None

    tenant_id = tenant_profile["id"] or ""
    return tenant_profile, tenant_id


async def build_tenant_overview(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    reporting_repository = ReportingRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    feature_flag_repository = FeatureFlagRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))

    summary = await reporting_repository.summarize_tenant_overview(tenant_id)
    recent_bookings = await reporting_repository.list_recent_booking_intents(tenant_id, limit=5)
    integration_items = await build_integration_provider_statuses(session, tenant_id=tenant_id)
    attention_items = await build_integration_attention_items(session, tenant_id=tenant_id)
    tenant_settings = await tenant_repository.get_tenant_settings(tenant_id)
    workspace_settings = _read_nested_dict(tenant_settings, "tenant_workspace")
    workspace_guides = _read_nested_dict(workspace_settings, "guides")
    recent_audit_entries = await audit_repository.list_recent_entries(tenant_id=tenant_id, limit=12)
    tenant_mode_enabled = await feature_flag_repository.get_flag(
        "tenant_mode_enabled",
        tenant_id=tenant_id,
    )

    priorities: list[dict[str, str]] = []
    if summary["payment_attention_count"] > 0:
        priorities.append(
            {
                "title": "Payment follow-up needs attention",
                "body": f"{summary['payment_attention_count']} booking payment states still need review or follow-up.",
                "tone": "attention",
            }
        )
    if summary["lifecycle_attention_count"] > 0:
        priorities.append(
            {
                "title": "Lifecycle communication is still queued",
                "body": f"{summary['lifecycle_attention_count']} lifecycle messages are not yet in a final delivered state.",
                "tone": "monitor",
            }
        )
    if not priorities:
        priorities.append(
            {
                "title": "Operational baseline is stable",
                "body": "No immediate payment or lifecycle attention signals are elevated in the current tenant shell snapshot.",
                "tone": "healthy",
            }
        )

    return {
        "tenant": tenant_profile,
        "shell": {
            "current_role": "tenant_admin",
            "read_only": True,
            "tenant_mode_enabled": bool(tenant_mode_enabled),
            "deployment_mode": "standalone_app",
        },
        "summary": summary,
        "workspace": {
            "logo_url": _clean_optional_text(workspace_settings.get("logo_url")),
            "hero_image_url": _clean_optional_text(workspace_settings.get("hero_image_url")),
            "introduction_html": _sanitize_workspace_html(
                workspace_settings.get("introduction_html")
            ),
            "guides": {
                key: _clean_text(workspace_guides.get(key), fallback)
                for key, fallback in TENANT_WORKSPACE_GUIDE_DEFAULTS.items()
            },
            "activity": _build_section_activity(
                recent_audit_entries,
                event_types={"tenant.profile.updated"},
                fallback_summary="Tenant experience studio has not recorded a profile change yet.",
                fallback_updated_at=tenant_profile.get("updated_at"),
                fallback_actor=_clean_optional_text(tenant_profile.get("owner_email")),
            ),
        },
        "integration_snapshot": {
            "connected_count": len(
                [item for item in integration_items if item.get("status") == "connected"]
            ),
            "attention_count": len(attention_items),
            "providers": integration_items,
        },
        "recent_bookings": recent_bookings,
        "priorities": priorities,
    }


async def build_tenant_bookings_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    reporting_repository = ReportingRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    recent_bookings = await reporting_repository.list_recent_booking_intents(tenant_id, limit=12)

    status_summary = {
        "pending_confirmation": 0,
        "active": 0,
        "completed": 0,
        "cancelled": 0,
        "other": 0,
    }

    for booking in recent_bookings:
        status = str(booking.get("status") or "").lower()
        payment_state = str(booking.get("payment_dependency_state") or "").lower()
        if status in {"pending_confirmation", "unverified"}:
            status_summary["pending_confirmation"] += 1
        elif status in {
            "captured",
            "pending",
            "confirmed",
            "in_progress",
            "active",
            "scheduled",
            "payment_pending",
            "processed_by_n8n",
            "triggered",
            "synced",
        } or payment_state in {"stripe_checkout_ready", "payment_follow_up_required"}:
            status_summary["active"] += 1
        elif status in {"completed", "paid"}:
            status_summary["completed"] += 1
        elif status in {"cancelled", "failed", "expired", "refunded"}:
            status_summary["cancelled"] += 1
        else:
            status_summary["other"] += 1

    return {
        "tenant": tenant_profile,
        "status_summary": status_summary,
        "items": recent_bookings,
    }


async def build_tenant_integrations_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    provider_items = await build_integration_provider_statuses(session, tenant_id=tenant_id)
    attention_items = await build_integration_attention_items(session, tenant_id=tenant_id)
    reconciliation = await build_reconciliation_details(session, tenant_id=tenant_id)
    crm_backlog = await build_crm_retry_backlog(session, tenant_id=tenant_id)
    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    recent_audit_entries = await audit_repository.list_recent_entries(tenant_id=tenant_id, limit=12)

    return {
        "tenant": tenant_profile,
        "providers": provider_items,
        "attention": attention_items,
        "reconciliation": reconciliation,
        "crm_retry_backlog": crm_backlog,
        "activity": _build_section_activity(
            recent_audit_entries,
            event_prefixes=("tenant.integrations.",),
            fallback_summary="No integration control changes have been recorded yet for this tenant.",
            fallback_actor=_clean_optional_text(tenant_profile.get("owner_email")),
        ),
        "controls": {
            "available_statuses": ["connected", "paused"],
            "available_sync_modes": ["read_only", "write_back", "bidirectional"],
            "operator_note": "Tenant portal integration writes currently focus on provider posture only; credential-level configuration remains admin-managed.",
        },
    }


async def build_tenant_billing_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    tenant_settings = await tenant_repository.get_tenant_settings(tenant_id)
    billing_gateway_settings = _read_billing_gateway_settings(tenant_settings)
    stripe_customer_id = _clean_optional_text(billing_gateway_settings.get("stripe_customer_id"))
    stripe_live_configured = bool(
        stripe_customer_id
        and _clean_optional_text(billing_gateway_settings.get("merchant_mode_override")) != "disabled"
    )

    billing_account_result = await session.execute(
        text(
            """
            select
              id::text as id,
              billing_email,
              merchant_mode,
              created_at,
              updated_at
            from billing_accounts
            where tenant_id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    billing_account = billing_account_result.mappings().first()

    subscription_result = await session.execute(
        text(
            """
            select
              id::text as id,
              billing_account_id::text as billing_account_id,
              status,
              plan_code,
              started_at,
              ended_at,
              created_at,
              updated_at
            from subscriptions
            where tenant_id = cast(:tenant_id as uuid)
            order by updated_at desc nulls last, created_at desc nulls last
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    subscription = subscription_result.mappings().first()

    period_rows: list[dict] = []
    if subscription and subscription.get("id"):
        periods_result = await session.execute(
            text(
                """
                select
                  id::text as id,
                  period_start,
                  period_end,
                  status,
                  created_at
                from subscription_periods
                where subscription_id = cast(:subscription_id as uuid)
                order by period_start desc, created_at desc
                limit 6
                """
            ),
            {"subscription_id": subscription["id"]},
        )
        period_rows = list(periods_result.mappings().all())

    latest_period = period_rows[0] if period_rows else None
    open_periods = sum(1 for item in period_rows if str(item.get("status") or "").lower() == "open")
    closed_periods = sum(
        1 for item in period_rows if str(item.get("status") or "").lower() in {"closed", "paid"}
    )

    has_billing_account = bool(billing_account)
    has_active_subscription = str(subscription.get("status") if subscription else "").lower() in {
        "active",
        "trialing",
    }
    merchant_mode = str(billing_account.get("merchant_mode") or "").strip().lower() if billing_account else ""
    can_charge = has_active_subscription and merchant_mode in {"live", "production"}

    stripe_state: dict[str, object] = {}
    stripe_subscription: dict[str, object] | None = None
    stripe_invoices: list[dict[str, object]] = []
    stripe_default_payment_method: dict[str, object] | None = None
    stripe_checkout_configured = bool(
        getattr(session.bind, "url", None) is not None
        and stripe_customer_id
    )

    if stripe_customer_id:
        try:
            from config import get_settings

            runtime_settings = get_settings()
            if runtime_settings.stripe_secret_key:
                stripe_state = await _load_tenant_stripe_billing_state(
                    runtime_settings,
                    stripe_customer_id=stripe_customer_id,
                )
                stripe_subscription = next(
                    (
                        item
                        for item in stripe_state.get("subscriptions", [])
                        if isinstance(item, dict)
                    ),
                    None,
                )
                stripe_invoices = [
                    item
                    for item in stripe_state.get("invoices", [])
                    if isinstance(item, dict)
                ]
                customer_payload = stripe_state.get("customer")
                if isinstance(customer_payload, dict):
                    payment_method_payload = customer_payload.get("invoice_settings", {})
                    if isinstance(payment_method_payload, dict):
                        default_payment_method = payment_method_payload.get("default_payment_method")
                        if isinstance(default_payment_method, dict):
                            stripe_default_payment_method = default_payment_method
        except Exception:
            stripe_state = {}

    if stripe_subscription:
        stripe_subscription_status = str(stripe_subscription.get("status") or "").strip().lower()
        if stripe_subscription_status:
            has_active_subscription = stripe_subscription_status in {"active", "trialing"}
            can_charge = has_active_subscription and merchant_mode in {"live", "production"}

    if not has_billing_account:
        recommended_action = "Create a billing account before enabling package-based tenant charging."
        operator_note = "Billing identity has not been configured for this tenant yet."
    elif not subscription:
        recommended_action = "Attach a subscription package so this tenant can move into paid SaaS operations."
        operator_note = "Billing account exists, but no subscription contract is attached yet."
    elif not has_active_subscription:
        recommended_action = "Review subscription status before relying on this tenant for recurring billing."
        operator_note = "A subscription record exists, but it is not currently in an active or trialing state."
    elif not can_charge:
        recommended_action = "Switch merchant mode to live when payment collection is ready for production."
        operator_note = "Subscription is active, but payment collection is still not in live merchant mode."
    else:
        recommended_action = "Monitor renewal periods, invoices, and payment method health from this tenant workspace."
        operator_note = "Tenant billing is structurally ready for paid SaaS operations."

    trial_days = 14
    plan_catalog = []
    current_plan_code = str(subscription.get("plan_code") or "").strip().lower() if subscription else ""
    if stripe_subscription:
        stripe_plan_code = _clean_optional_text(
            ((stripe_subscription.get("metadata") or {}) if isinstance(stripe_subscription.get("metadata"), dict) else {}).get("plan_code")
        )
        if stripe_plan_code:
            current_plan_code = stripe_plan_code.lower()
    for plan in TENANT_BILLING_PLAN_CATALOG:
        is_current = current_plan_code == plan["code"]
        if is_current and has_active_subscription:
            cta_label = "Current package"
        elif merchant_mode in {"live", "production"}:
            cta_label = "Continue to Stripe"
        elif has_active_subscription:
            cta_label = "Switch to this package"
        else:
            cta_label = f"Start {trial_days}-day package trial"
        plan_catalog.append(
            {
                **plan,
                "is_current": is_current,
                "cta_label": cta_label,
            }
        )

    trial_end_at = (
        latest_period.get("period_end")
        if latest_period and str(subscription.get("status") or "").lower() == "trialing"
        else None
    )
    current_plan = next((item for item in TENANT_BILLING_PLAN_CATALOG if item["code"] == current_plan_code), None)
    plan_amount_aud = int(current_plan["monthly_amount_aud"]) if current_plan else 0

    invoice_items = []
    for index, item in enumerate(period_rows, start=1):
        raw_status = str(item.get("status") or "").strip().lower()
        if raw_status in {"paid", "closed"}:
            invoice_status = "paid"
        elif raw_status in {"trial_open", "open"}:
            invoice_status = "open"
        else:
            invoice_status = raw_status or "pending"
        invoice_items.append(
            {
                "id": f"inv-{item.get('id') or index}",
                "invoice_number": f"INV-{str(tenant_profile.get('slug') or 'tenant').upper()[:8]}-{index:03d}",
                "status": invoice_status,
                "amount_aud": 0 if raw_status == "trial_open" else plan_amount_aud,
                "currency": "AUD",
                "issued_at": item.get("created_at") or item.get("period_start"),
                "due_at": item.get("period_end"),
                "period_start": item.get("period_start"),
                "period_end": item.get("period_end"),
                "receipt_available": raw_status in {"paid", "closed"},
                "source": "subscription_period",
            }
        )

    if stripe_invoices:
        invoice_items = []
        for invoice in stripe_invoices:
            raw_status = str(invoice.get("status") or "").strip().lower() or "open"
            amount_paid = int(invoice.get("amount_paid") or 0)
            amount_due = int(invoice.get("amount_due") or 0)
            amount_total = int(invoice.get("amount_total") or 0)
            amount_cents = amount_paid or amount_due or amount_total
            hosted_invoice_url = _clean_optional_text(invoice.get("hosted_invoice_url"))
            invoice_pdf = _clean_optional_text(invoice.get("invoice_pdf"))
            invoice_items.append(
                {
                    "id": _clean_optional_text(invoice.get("id")) or f"stripe-invoice-{len(invoice_items) + 1}",
                    "invoice_number": _clean_optional_text(invoice.get("number")) or _clean_optional_text(invoice.get("id")) or f"STRIPE-{len(invoice_items) + 1:03d}",
                    "status": raw_status,
                    "amount_aud": amount_cents / 100,
                    "currency": str(invoice.get("currency") or "aud").upper(),
                    "issued_at": datetime.fromtimestamp(int(invoice.get("created") or 0), UTC).isoformat() if invoice.get("created") else None,
                    "due_at": datetime.fromtimestamp(int(invoice.get("due_date") or 0), UTC).isoformat() if invoice.get("due_date") else None,
                    "period_start": datetime.fromtimestamp(int((invoice.get("period_start") or 0)), UTC).isoformat() if invoice.get("period_start") else None,
                    "period_end": datetime.fromtimestamp(int((invoice.get("period_end") or 0)), UTC).isoformat() if invoice.get("period_end") else None,
                    "receipt_available": bool(hosted_invoice_url or invoice_pdf or raw_status == "paid"),
                    "source": "stripe",
                    "hosted_invoice_url": hosted_invoice_url,
                    "receipt_url": invoice_pdf or hosted_invoice_url,
                    "can_mark_paid": False,
                }
            )

    payment_method_status = "configured" if can_charge else "not_collected"
    if has_billing_account and not has_active_subscription:
        payment_method_status = "setup_pending"
    elif has_active_subscription and not can_charge:
        payment_method_status = "needs_collection"
    if stripe_default_payment_method:
        payment_method_status = "configured"

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    recent_audit_entries = await audit_repository.list_recent_entries(tenant_id=tenant_id, limit=12)
    billing_audit_events = []
    for item in recent_audit_entries:
        event_type = str(item.get("event_type") or "").strip()
        entity_type = str(item.get("entity_type") or "").strip()
        if not (
            event_type.startswith("tenant.")
            or entity_type in {"billing_account", "subscription", "tenant_profile"}
        ):
            continue
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        billing_audit_events.append(
            {
                "id": f"audit-{item.get('id')}",
                "event_type": event_type,
                "entity_type": entity_type or None,
                "entity_id": item.get("entity_id"),
                "actor_type": item.get("actor_type"),
                "actor_id": item.get("actor_id"),
                "created_at": item.get("created_at"),
                "summary": str(payload.get("summary") or event_type.replace(".", " ")).strip(),
            }
        )
        if len(billing_audit_events) >= 6:
            break

    return {
        "tenant": tenant_profile,
        "activity": _build_section_activity(
            recent_audit_entries,
            event_prefixes=("tenant.billing.",),
            entity_types={"billing_account", "subscription"},
            fallback_summary="No billing control changes have been recorded yet for this tenant.",
            fallback_updated_at=(
                (billing_account.get("updated_at") if billing_account else None)
                or (subscription.get("updated_at") if subscription else None)
            ),
            fallback_actor=_clean_optional_text(tenant_profile.get("owner_email")),
        ),
        "account": {
            "id": billing_account.get("id") if billing_account else None,
            "billing_email": billing_account.get("billing_email") if billing_account else None,
            "merchant_mode": billing_account.get("merchant_mode") if billing_account else None,
            "created_at": billing_account.get("created_at") if billing_account else None,
            "updated_at": billing_account.get("updated_at") if billing_account else None,
        },
        "subscription": {
            "id": (_clean_optional_text(stripe_subscription.get("id")) if stripe_subscription else None) or (subscription.get("id") if subscription else None),
            "billing_account_id": subscription.get("billing_account_id") if subscription else None,
            "status": (_clean_optional_text(stripe_subscription.get("status")) if stripe_subscription else None) or (subscription.get("status") if subscription else "not_started"),
            "package_code": current_plan_code or (subscription.get("plan_code") if subscription else None),
            "plan_code": current_plan_code or (subscription.get("plan_code") if subscription else None),
            "started_at": datetime.fromtimestamp(int(stripe_subscription.get("start_date") or 0), UTC).isoformat() if stripe_subscription and stripe_subscription.get("start_date") else (subscription.get("started_at") if subscription else None),
            "ended_at": datetime.fromtimestamp(int(stripe_subscription.get("cancel_at") or 0), UTC).isoformat() if stripe_subscription and stripe_subscription.get("cancel_at") else (subscription.get("ended_at") if subscription else None),
            "created_at": subscription.get("created_at") if subscription else None,
            "updated_at": subscription.get("updated_at") if subscription else None,
            "current_period_start": datetime.fromtimestamp(int(stripe_subscription.get("current_period_start") or 0), UTC).isoformat() if stripe_subscription and stripe_subscription.get("current_period_start") else (latest_period.get("period_start") if latest_period else None),
            "current_period_end": datetime.fromtimestamp(int(stripe_subscription.get("current_period_end") or 0), UTC).isoformat() if stripe_subscription and stripe_subscription.get("current_period_end") else (latest_period.get("period_end") if latest_period else None),
            "current_period_status": (_clean_optional_text(stripe_subscription.get("status")) if stripe_subscription else None) or (latest_period.get("status") if latest_period else None),
        },
        "period_summary": {
            "total_periods": len(period_rows),
            "open_periods": open_periods,
            "closed_periods": closed_periods,
            "latest_status": latest_period.get("status") if latest_period else None,
        },
        "periods": [
            {
                "id": item.get("id"),
                "period_start": item.get("period_start"),
                "period_end": item.get("period_end"),
                "status": item.get("status"),
                "created_at": item.get("created_at"),
            }
            for item in period_rows
        ],
        "collection": {
            "has_billing_account": has_billing_account,
            "has_active_subscription": has_active_subscription,
            "can_charge": can_charge,
            "operator_note": operator_note,
            "recommended_action": recommended_action,
        },
        "self_serve": {
            "billing_setup_complete": has_billing_account,
            "payment_method_status": payment_method_status,
            "trial_days": trial_days,
            "trial_end_at": trial_end_at,
            "can_start_trial": has_billing_account and not has_active_subscription,
            "can_change_plan": has_billing_account,
            "can_manage_billing": True,
            "can_open_billing_portal": bool(stripe_customer_id and merchant_mode in {"live", "production"}),
            "can_start_stripe_checkout": bool(merchant_mode in {"live", "production"}),
        },
        "payment_method": {
            "status": payment_method_status,
            "provider_label": "Stripe" if stripe_customer_id else "BookedAI billing",
            "brand": _clean_optional_text(((stripe_default_payment_method.get("card") or {}) if isinstance(stripe_default_payment_method.get("card"), dict) else {}).get("brand")) if stripe_default_payment_method else None,
            "last4": _clean_optional_text(((stripe_default_payment_method.get("card") or {}) if isinstance(stripe_default_payment_method.get("card"), dict) else {}).get("last4")) if stripe_default_payment_method else None,
            "expires_label": (
                f"{str(((stripe_default_payment_method.get('card') or {}) if isinstance(stripe_default_payment_method.get('card'), dict) else {}).get('exp_month') or '').strip()}/{str(((stripe_default_payment_method.get('card') or {}) if isinstance(stripe_default_payment_method.get('card'), dict) else {}).get('exp_year') or '').strip()}"
                if stripe_default_payment_method
                else None
            ),
            "note": (
                "Stripe payment collection is enabled for this tenant."
                if stripe_default_payment_method
                else (
                    "Stripe is configured. Start checkout for a package or open the billing portal to attach a payment method."
                    if merchant_mode in {"live", "production"}
                    else "Switch merchant mode to live before opening the real Stripe billing flow for this tenant."
                )
            ),
        },
        "settings": {
            "billing_email": billing_account.get("billing_email") if billing_account else None,
            "merchant_mode": billing_account.get("merchant_mode") if billing_account else None,
            "invoice_delivery": "email",
            "auto_renew": bool(subscription and str(subscription.get("status") or "").lower() in {"active", "trialing"}),
            "support_tier": current_plan["label"] if current_plan else "Not assigned",
        },
        "invoices": invoice_items,
        "invoice_summary": {
            "total_invoices": len(invoice_items),
            "open_invoices": sum(1 for item in invoice_items if item["status"] == "open"),
            "paid_invoices": sum(1 for item in invoice_items if item["status"] == "paid"),
            "currency": "AUD",
        },
        "gateway": {
            "provider": "stripe" if stripe_customer_id else "bookedai_manual",
            "checkout_enabled": bool(merchant_mode in {"live", "production"}),
            "portal_enabled": bool(stripe_customer_id and merchant_mode in {"live", "production"}),
            "customer_id_present": bool(stripe_customer_id),
            "note": (
                "Tenant billing is linked to the live Stripe customer and can continue into hosted checkout or portal management."
                if stripe_customer_id and merchant_mode in {"live", "production"}
                else (
                    "Stripe is configured in BookedAI, but this tenant is still in test posture. Switch merchant mode to live to use the real Stripe flow."
                    if stripe_customer_id or merchant_mode not in {"live", "production"}
                    else "Stripe has not been attached to this tenant yet."
                )
            ),
        },
        "audit_trail": billing_audit_events,
        "plans": plan_catalog,
        "upcoming_capabilities": [
            "Self-serve payment method management",
            "Invoice history and downloadable receipts",
            "Plan changes, upgrade prompts, and billing alerts",
        ],
    }


def build_tenant_invoice_receipt(invoice: dict, *, tenant: dict, billing: dict) -> dict:
    invoice_number = str(invoice.get("invoice_number") or "INV-TENANT").strip()
    currency = str(invoice.get("currency") or "AUD").strip().upper()
    amount_aud = float(invoice.get("amount_aud") or 0)
    issued_at = invoice.get("issued_at")
    due_at = invoice.get("due_at")
    status = str(invoice.get("status") or "open").strip().lower()
    tenant_name = str(tenant.get("name") or tenant.get("slug") or "BookedAI Tenant").strip()
    plan_code = str(billing.get("subscription", {}).get("plan_code") or billing.get("subscription", {}).get("package_code") or "package").strip()
    receipt_number = invoice_number.replace("INV-", "RCT-")
    paid_at = datetime.now(UTC).isoformat() if status == "paid" else None
    line_items = [
        {
            "description": f"BookedAI {plan_code.title()} subscription",
            "amount_aud": amount_aud,
        }
    ]
    text = "\n".join(
        [
            f"Receipt {receipt_number}",
            f"Invoice {invoice_number}",
            f"Tenant {tenant_name}",
            f"Status {status}",
            f"Issued {issued_at or 'not scheduled'}",
            f"Due {due_at or 'not scheduled'}",
            f"Amount {currency} {amount_aud:.2f}",
            *(f"Line item: {item['description']} - {currency} {float(item['amount_aud']):.2f}" for item in line_items),
        ]
    )
    return {
        "receipt_number": receipt_number,
        "invoice_id": invoice.get("id"),
        "invoice_number": invoice_number,
        "tenant_name": tenant_name,
        "status": status,
        "currency": currency,
        "amount_aud": amount_aud,
        "issued_at": issued_at,
        "due_at": due_at,
        "paid_at": paid_at,
        "billing_email": billing.get("account", {}).get("billing_email"),
        "merchant_mode": billing.get("account", {}).get("merchant_mode"),
        "line_items": line_items,
        "download_filename": f"{receipt_number.lower()}.txt",
        "text": text,
    }


async def build_tenant_onboarding_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    catalog_result = await session.execute(
        text(
            """
            select
              count(*) as total_records,
              count(*) filter (where coalesce(publish_state, 'draft') = 'published') as published_records
            from service_merchant_profiles
            where tenant_id = :tenant_id
            """
        ),
        {"tenant_id": tenant_id},
    )
    catalog_row = catalog_result.mappings().first() or {}

    billing_result = await session.execute(
        text(
            """
            select
              exists(
                select 1
                from billing_accounts
                where tenant_id = cast(:tenant_id as uuid)
              ) as has_billing_account,
              exists(
                select 1
                from subscriptions
                where tenant_id = cast(:tenant_id as uuid)
                  and status in ('active', 'trialing')
              ) as has_active_subscription
            """
        ),
        {"tenant_id": tenant_id},
    )
    billing_row = billing_result.mappings().first() or {}

    business_profile_ready = bool(str(tenant_profile.get("name") or "").strip())
    catalog_ready = int(catalog_row.get("total_records") or 0) > 0
    publish_ready = int(catalog_row.get("published_records") or 0) > 0
    billing_ready = bool(billing_row.get("has_billing_account"))
    subscription_ready = bool(billing_row.get("has_active_subscription"))

    steps = [
        {
            "id": "account",
            "label": "Account created",
            "status": "complete",
            "description": "Tenant identity exists and can access the portal.",
        },
        {
            "id": "business_profile",
            "label": "Business profile",
            "status": "complete" if business_profile_ready else "incomplete",
            "description": "Add business name, industry, and workspace basics.",
        },
        {
            "id": "catalog",
            "label": "Catalog input",
            "status": "complete" if catalog_ready else "incomplete",
            "description": "Import or enter at least one tenant-owned service row.",
        },
        {
            "id": "publish",
            "label": "Public publish",
            "status": "complete" if publish_ready else "incomplete",
            "description": "Publish at least one search-ready record for public discovery.",
        },
        {
            "id": "billing",
            "label": "Billing setup",
            "status": "complete" if billing_ready else "incomplete",
            "description": "Attach billing identity and merchant posture.",
        },
        {
            "id": "subscription",
            "label": "Subscription live",
            "status": "complete" if subscription_ready else "incomplete",
            "description": "Move the tenant into an active or trialing paid state.",
        },
    ]

    completed_steps = len([step for step in steps if step["status"] == "complete"])
    progress_percent = int((completed_steps / len(steps)) * 100) if steps else 0

    if completed_steps == len(steps):
        recommended_next_action = "Tenant setup baseline is complete. Focus on monthly value visibility and retention loops."
    elif not catalog_ready:
        recommended_next_action = "Import or enter the first service so the workspace can move beyond account setup."
    elif not publish_ready:
        recommended_next_action = "Review and publish a search-ready service to activate tenant-owned discovery."
    elif not billing_ready:
        recommended_next_action = "Configure billing identity so the tenant can move toward paid SaaS operations."
    else:
        recommended_next_action = "Attach an active subscription or trial before paid rollout."

    return {
        "tenant": tenant_profile,
        "progress": {
            "completed_steps": completed_steps,
            "total_steps": len(steps),
            "percent": progress_percent,
        },
        "steps": steps,
        "checkpoints": {
            "catalog_records": int(catalog_row.get("total_records") or 0),
            "published_records": int(catalog_row.get("published_records") or 0),
            "has_billing_account": billing_ready,
            "has_active_subscription": subscription_ready,
        },
        "recommended_next_action": recommended_next_action,
    }


async def build_tenant_team_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    members = await tenant_repository.list_tenant_members(tenant_id)
    invite_audit_rows = await audit_repository.list_recent_entries(
        tenant_id=tenant_id,
        limit=12,
    )

    role_counts = {
        "tenant_admin": 0,
        "finance_manager": 0,
        "operator": 0,
        "other": 0,
    }
    status_counts = {
        "active": 0,
        "invited": 0,
        "disabled": 0,
        "other": 0,
    }
    normalized_members = []
    for item in members:
        role = str(item.get("role") or "operator").strip().lower()
        status = str(item.get("status") or "active").strip().lower()
        if role in role_counts:
            role_counts[role] += 1
        else:
            role_counts["other"] += 1
        if status in status_counts:
            status_counts[status] += 1
        else:
            status_counts["other"] += 1
        normalized_members.append(
            {
                "email": item.get("email"),
                "full_name": item.get("full_name"),
                "role": role,
                "status": status,
                "auth_provider": item.get("auth_provider"),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
            }
        )

    invite_activity = []
    for item in invite_audit_rows:
        event_type = str(item.get("event_type") or "").strip()
        if event_type not in {
            "tenant.team.member_invited",
            "tenant.team.member_invite_resent",
            "tenant.team.member_invite_accepted",
        }:
            continue
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        invite_activity.append(
            {
                "id": f"invite-audit-{item.get('id')}",
                "event_type": event_type,
                "created_at": item.get("created_at"),
                "actor_id": item.get("actor_id"),
                "recipient_email": payload.get("email"),
                "role": payload.get("role"),
                "delivery_status": payload.get("invite_delivery_status"),
                "invite_url": payload.get("invite_url"),
                "summary": str(payload.get("summary") or "Tenant invite recorded.").strip(),
            }
        )
        if len(invite_activity) >= 6:
            break

    return {
        "tenant": tenant_profile,
        "activity": _build_section_activity(
            invite_audit_rows,
            event_prefixes=("tenant.team.",),
            fallback_summary="No team access changes have been recorded yet for this tenant.",
            fallback_actor=_clean_optional_text(tenant_profile.get("owner_email")),
        ),
        "summary": {
            "total_members": len(normalized_members),
            "active_members": status_counts["active"],
            "invited_members": status_counts["invited"],
            "admin_members": role_counts["tenant_admin"],
            "finance_members": role_counts["finance_manager"],
        },
        "role_counts": role_counts,
        "status_counts": status_counts,
        "available_roles": [
            {
                "code": "tenant_admin",
                "label": "Tenant Admin",
                "description": "Full tenant control across billing, catalog, reporting, and team access.",
            },
            {
                "code": "finance_manager",
                "label": "Finance Manager",
                "description": "Can review billing and manage plans without full tenant administration.",
            },
            {
                "code": "operator",
                "label": "Operator",
                "description": "Read and operate day-to-day workspace areas without billing control.",
            },
        ],
        "invite_activity": invite_activity,
        "members": normalized_members,
    }


def _normalize_portal_action_style(action_id: str) -> str:
    if action_id == "pay_now":
        return "primary"
    if action_id == "request_cancel":
        return "danger"
    return "secondary"


def _normalize_portal_status_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"cancelled", "failed", "error"}:
        return "attention"
    if normalized in {"completed", "paid", "succeeded"}:
        return "healthy"
    return "monitor"


async def _load_portal_booking_row(session, *, booking_reference: str):
    normalized_reference = str(booking_reference or "").strip()
    if not normalized_reference:
        return None

    booking_result = await session.execute(
        text(
            """
            select
              bi.id::text as booking_intent_id,
              bi.tenant_id::text as tenant_id,
              bi.booking_reference,
              bi.service_name,
              bi.service_id,
              bi.requested_date,
              bi.requested_time,
              bi.timezone,
              bi.booking_path,
              bi.confidence_level,
              bi.status,
              bi.payment_dependency_state,
              bi.metadata_json,
              bi.created_at::text as created_at,
              c.full_name as customer_name,
              c.email as customer_email,
              c.phone as customer_phone,
              sm.business_name,
              sm.business_email,
              sm.owner_email,
              sm.category,
              sm.summary,
              sm.amount_aud as service_amount_aud,
              sm.currency_code,
              sm.display_price,
              sm.duration_minutes,
              sm.venue_name,
              sm.location,
              sm.map_url,
              sm.booking_url,
              sm.image_url
            from booking_intents bi
            left join contacts c
              on c.id = bi.contact_id
            left join service_merchant_profiles sm
              on sm.service_id = bi.service_id
             and sm.tenant_id = bi.tenant_id
            where bi.booking_reference = :booking_reference
            limit 1
            """
        ),
        {"booking_reference": normalized_reference},
    )
    return booking_result.mappings().first()


async def build_portal_booking_snapshot(session, *, booking_reference: str) -> dict:
    normalized_reference = str(booking_reference or "").strip()
    if not normalized_reference:
        return {}

    booking_row = await _load_portal_booking_row(
        session,
        booking_reference=normalized_reference,
    )
    if not booking_row:
        return {}

    payment_result = await session.execute(
        text(
            """
            select
              pi.id::text as payment_intent_id,
              pi.payment_option,
              pi.status,
              pi.amount_aud,
              pi.currency,
              pi.payment_url,
              pi.external_session_id,
              pi.metadata_json,
              pi.created_at::text as created_at
            from payment_intents pi
            where pi.booking_intent_id = cast(:booking_intent_id as uuid)
            order by pi.created_at desc
            limit 1
            """
        ),
        {"booking_intent_id": booking_row.get("booking_intent_id")},
    )
    payment_row = payment_result.mappings().first()

    booking_metadata = dict(booking_row.get("metadata_json") or {})
    notes = str(booking_metadata.get("notes") or "").strip() or None

    payment_status = (
        str(payment_row.get("status") or booking_row.get("payment_dependency_state") or "pending").strip()
        or "pending"
    )
    payment_url = str(payment_row.get("payment_url") or "").strip() or None
    booking_status = str(booking_row.get("status") or "captured").strip() or "captured"

    can_pay_now = bool(payment_url) and payment_status.lower() not in {
        "paid",
        "succeeded",
        "completed",
        "cancelled",
    }
    can_request_reschedule = booking_status.lower() not in {"cancelled", "completed"}
    can_request_cancel = booking_status.lower() not in {"cancelled", "completed"}

    support_email = (
        str(booking_row.get("business_email") or "").strip().lower()
        or str(booking_row.get("owner_email") or "").strip().lower()
        or "support@bookedai.au"
    )
    booking_closed = booking_status.lower() in {"cancelled", "completed"}
    payment_failed = payment_status.lower() in {"failed", "requires_action", "payment_follow_up_required"}
    payment_complete = payment_status.lower() in {"paid", "succeeded", "completed"}

    action_rows = [
        {
            "id": "pay_now",
            "label": "Complete payment",
            "description": "Finish payment using the current secure payment link.",
            "enabled": can_pay_now,
            "href": payment_url,
            "note": None if can_pay_now else "Payment is already settled or no active payment link is available.",
        },
        {
            "id": "request_reschedule",
            "label": "Request reschedule",
            "description": "Ask the team to review and move this booking to a different time.",
            "enabled": can_request_reschedule,
            "href": None,
            "note": None if can_request_reschedule else "This booking can no longer be rescheduled from the portal.",
        },
        {
            "id": "request_cancel",
            "label": "Request cancellation",
            "description": "Send a cancellation request for manual confirmation.",
            "enabled": can_request_cancel,
            "href": None,
            "note": None if can_request_cancel else "This booking can no longer be cancelled from the portal.",
        },
        {
            "id": "contact_support",
            "label": "Contact support",
            "description": "Get help from the business or BookedAI support team.",
            "enabled": True,
            "href": f"mailto:{support_email}?subject=Booking%20support%20{normalized_reference}",
            "note": None,
        },
    ]

    status_summary = {
        "tone": "monitor",
        "title": "Booking under review",
        "body": "This booking is active in the portal and may still require follow-up from the provider.",
    }
    if booking_closed and booking_status.lower() == "cancelled":
        status_summary = {
            "tone": "attention",
            "title": "Booking cancelled",
            "body": "This booking is already marked as cancelled, so no further scheduling actions are available in the portal.",
        }
    elif booking_closed:
        status_summary = {
            "tone": "healthy",
            "title": "Booking completed",
            "body": "This booking is already marked complete. The portal remains available for review and support follow-up.",
        }
    elif payment_failed:
        status_summary = {
            "tone": "attention",
            "title": "Payment needs attention",
            "body": "A payment issue or follow-up requirement is recorded for this booking. Use the portal actions or contact support to resolve it.",
        }
    elif payment_complete:
        status_summary = {
            "tone": "healthy",
            "title": "Payment received",
            "body": "Payment is already recorded for this booking. You can still review the booking and contact support if anything changes.",
        }

    timeline = [
        {
            "id": "booking_created",
            "label": "Booking captured",
            "detail": f"Reference {normalized_reference} was created and is now visible in the portal.",
            "tone": "complete",
        },
        {
            "id": "schedule_state",
            "label": "Schedule requested",
            "detail": "The requested date and time are recorded below for review and follow-up.",
            "tone": "complete"
            if booking_row.get("requested_date") or booking_row.get("requested_time")
            else "current",
        },
        {
            "id": "payment_state",
            "label": "Payment status",
            "detail": f"Current payment state: {payment_status.replace('_', ' ')}.",
            "tone": "complete" if payment_status.lower() in {"paid", "succeeded", "completed"} else "current",
        },
    ]

    if booking_row.get("booking_path"):
        timeline.append(
            {
                "id": "booking_path",
                "label": "Booking path selected",
                "detail": f"The current booking path is {(str(booking_row.get('booking_path') or '').replace('_', ' '))}.",
                "tone": "upcoming" if booking_closed else "current",
            }
        )

    booking_intent_id = str(booking_row.get("booking_intent_id") or "").strip()
    if booking_intent_id:
        audit_result = await session.execute(
            text(
                """
                select
                  id,
                  event_type,
                  payload,
                  created_at::text as created_at
                from audit_logs
                where entity_id = :entity_id
                  and event_type like 'portal.%'
                order by created_at desc, id desc
                limit 5
                """
            ),
            {"entity_id": booking_intent_id},
        )
        audit_rows = list(audit_result.mappings().all())
        for item in reversed(audit_rows):
            event_type = str(item.get("event_type") or "").strip()
            created_at = str(item.get("created_at") or "").strip()
            payload = dict(item.get("payload") or {})
            event_label = (
                "Reschedule request submitted"
                if event_type == "portal.reschedule_request.requested"
                else "Cancellation request submitted"
                if event_type == "portal.cancel_request.requested"
                else "Portal request submitted"
            )
            detail_parts = [f"Recorded at {created_at}."] if created_at else []
            if payload.get("customer_note"):
                detail_parts.append(f"Customer note: {payload.get('customer_note')}")
            if payload.get("preferred_date") or payload.get("preferred_time"):
                detail_parts.append(
                    "Requested schedule: "
                    f"{payload.get('preferred_date') or 'date pending'}"
                    f" {payload.get('preferred_time') or ''}".strip()
                )
            timeline.append(
                {
                    "id": f"audit_{item.get('id')}",
                    "label": event_label,
                    "detail": " ".join(detail_parts).strip() or "A customer portal request was recorded.",
                    "tone": "current",
                }
            )

    return {
        "booking": {
            "booking_reference": normalized_reference,
            "status": booking_status,
            "created_at": booking_row.get("created_at"),
            "requested_date": booking_row.get("requested_date"),
            "requested_time": booking_row.get("requested_time"),
            "timezone": booking_row.get("timezone"),
            "booking_path": booking_row.get("booking_path"),
            "confidence_level": booking_row.get("confidence_level"),
            "payment_dependency_state": booking_row.get("payment_dependency_state"),
            "notes": notes,
        },
        "customer": {
            "full_name": booking_row.get("customer_name"),
            "email": booking_row.get("customer_email"),
            "phone": booking_row.get("customer_phone"),
        },
        "service": {
            "service_name": booking_row.get("service_name"),
            "service_id": booking_row.get("service_id"),
            "business_name": booking_row.get("business_name"),
            "category": booking_row.get("category"),
            "summary": booking_row.get("summary"),
            "duration_minutes": booking_row.get("duration_minutes"),
            "amount_aud": booking_row.get("service_amount_aud"),
            "currency_code": booking_row.get("currency_code"),
            "display_price": booking_row.get("display_price"),
            "venue_name": booking_row.get("venue_name"),
            "location": booking_row.get("location"),
            "map_url": booking_row.get("map_url"),
            "booking_url": booking_row.get("booking_url"),
            "image_url": booking_row.get("image_url"),
        },
        "payment": {
            "status": payment_status,
            "amount_aud": payment_row.get("amount_aud") if payment_row else booking_row.get("service_amount_aud"),
            "currency": payment_row.get("currency") if payment_row else booking_row.get("currency_code"),
            "payment_url": payment_url,
        },
        "status_summary": status_summary,
        "allowed_actions": [
            {**item, "style": _normalize_portal_action_style(str(item["id"]))} for item in action_rows
        ],
        "support": {
            "contact_email": support_email,
            "contact_phone": None,
            "contact_label": booking_row.get("business_name") or "BookedAI support",
        },
        "status_timeline": timeline,
    }


async def queue_portal_booking_request(
    session,
    *,
    booking_reference: str,
    request_type: str,
    customer_note: str | None = None,
    preferred_date: str | None = None,
    preferred_time: str | None = None,
    timezone: str | None = None,
) -> dict:
    booking_row = await _load_portal_booking_row(session, booking_reference=booking_reference)
    if not booking_row:
        return {}

    normalized_reference = str(booking_row.get("booking_reference") or booking_reference).strip()
    tenant_id = str(booking_row.get("tenant_id") or "").strip() or None
    booking_intent_id = str(booking_row.get("booking_intent_id") or "").strip() or None
    support_email = (
        str(booking_row.get("business_email") or "").strip().lower()
        or str(booking_row.get("owner_email") or "").strip().lower()
        or "support@bookedai.au"
    )

    safe_request_type = request_type.strip().lower()
    request_payload = {
        "booking_reference": normalized_reference,
        "request_type": safe_request_type,
        "customer_note": (customer_note or "").strip() or None,
        "preferred_date": (preferred_date or "").strip() or None,
        "preferred_time": (preferred_time or "").strip() or None,
        "timezone": (timezone or "").strip() or None,
        "customer_name": booking_row.get("customer_name"),
        "customer_email": booking_row.get("customer_email"),
        "customer_phone": booking_row.get("customer_phone"),
        "service_name": booking_row.get("service_name"),
        "business_name": booking_row.get("business_name"),
        "support_email": support_email,
    }

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))

    await audit_repository.append_entry(
        tenant_id=tenant_id,
        event_type=f"portal.{safe_request_type}.requested",
        entity_type="booking_intent",
        entity_id=booking_intent_id,
        actor_type="portal_customer",
        actor_id=normalized_reference,
        payload=request_payload,
    )
    outbox_id = await outbox_repository.enqueue_event(
        tenant_id=tenant_id,
        event_type=f"portal.{safe_request_type}.requested",
        aggregate_type="booking_intent",
        aggregate_id=booking_intent_id,
        payload=request_payload,
        idempotency_key=f"portal:{safe_request_type}:{normalized_reference}:{preferred_date or ''}:{preferred_time or ''}:{(customer_note or '').strip()}",
    )

    message = (
        "Your reschedule request has been recorded for manual review."
        if safe_request_type == "reschedule_request"
        else "Your cancellation request has been recorded for manual review."
    )

    return {
        "request_status": "queued",
        "request_type": safe_request_type,
        "booking_reference": normalized_reference,
        "message": message,
        "support_email": support_email,
        "outbox_event_id": outbox_id,
    }


def _service_belongs_to_tenant(
    service: ServiceMerchantProfile,
    *,
    tenant_profile: dict[str, str | None],
    tenant_user_email: str | None,
) -> bool:
    tenant_id = str(tenant_profile.get("id") or "").strip()
    service_tenant_id = str(getattr(service, "tenant_id", "") or "").strip()
    if tenant_id and service_tenant_id and tenant_id == service_tenant_id:
        return True

    normalized_email = (tenant_user_email or "").strip().lower()
    owner_email = str(getattr(service, "owner_email", "") or "").strip().lower()
    if normalized_email and owner_email and normalized_email == owner_email:
        return True

    service_email = str(getattr(service, "business_email", "") or "").strip().lower()
    if normalized_email and service_email and normalized_email == service_email:
        return True

    tenant_name = str(tenant_profile.get("name") or "").strip().lower()
    business_name = str(getattr(service, "business_name", "") or "").strip().lower()
    if tenant_name and business_name and (tenant_name == business_name or tenant_name in business_name):
        return True

    tenant_slug = str(tenant_profile.get("slug") or "").strip().lower()
    source_url = str(getattr(service, "source_url", "") or "").strip().lower()
    return bool(tenant_slug and source_url and tenant_slug in source_url)


async def build_tenant_catalog_snapshot(
    session,
    *,
    tenant_ref: str | None = None,
    tenant_user_email: str | None = None,
) -> dict:
    tenant_profile, _tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile:
        return {}

    services = (
        await session.execute(
            select(ServiceMerchantProfile).order_by(
                desc(ServiceMerchantProfile.featured),
                ServiceMerchantProfile.business_name,
                ServiceMerchantProfile.name,
            )
        )
    ).scalars().all()

    filtered_items = [
        build_service_merchant_item(service)
        for service in services
        if _service_belongs_to_tenant(
            service,
            tenant_profile=tenant_profile,
            tenant_user_email=tenant_user_email,
        )
    ]

    return {
        "tenant": tenant_profile,
        "counts": build_service_catalog_quality_counts(filtered_items),
        "items": filtered_items,
        "import_guidance": {
            "required_fields": [
                "service_name",
                "duration_minutes",
                "location",
                "amount_aud",
                "currency_code",
                "display_price",
                "summary",
                "image_url",
                "booking_url",
            ],
            "recommended_focus": "Capture only booking-relevant services and structured fields that improve search quality.",
        },
    }


def _read_nested_dict(record: dict[str, object], key: str) -> dict[str, object]:
    value = record.get(key)
    return dict(value) if isinstance(value, dict) else {}


def _clean_text(value: object, fallback: str) -> str:
    text_value = str(value or "").strip()
    return text_value or fallback


def _clean_optional_text(value: object) -> str | None:
    text_value = str(value or "").strip()
    return text_value or None


def _tenant_billing_return_url(tenant_slug: str | None) -> str:
    normalized_slug = str(tenant_slug or "").strip()
    if normalized_slug:
        return f"https://tenant.bookedai.au/{normalized_slug}#billing"
    return "https://tenant.bookedai.au#billing"


def _read_billing_gateway_settings(settings: dict[str, object]) -> dict[str, object]:
    return _read_nested_dict(settings, "billing_gateway")


async def _stripe_post_form(
    *,
    stripe_secret_key: str,
    path: str,
    form_data: list[tuple[str, str]],
) -> dict[str, object]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"https://api.stripe.com{path}",
            headers={
                "Authorization": f"Bearer {stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            content=urlencode(form_data).encode(),
        )
        response.raise_for_status()
        payload = response.json()
    return payload if isinstance(payload, dict) else {}


async def _stripe_get(
    *,
    stripe_secret_key: str,
    path: str,
    params: list[tuple[str, str]] | None = None,
) -> dict[str, object]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"https://api.stripe.com{path}",
            headers={
                "Authorization": f"Bearer {stripe_secret_key}",
            },
            params=params,
        )
        response.raise_for_status()
        payload = response.json()
    return payload if isinstance(payload, dict) else {}


async def ensure_tenant_stripe_customer(
    session,
    settings,
    *,
    tenant_profile: dict[str, object],
    billing_email: str | None,
) -> tuple[str, dict[str, object]]:
    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=str(tenant_profile.get("id") or "")))
    current_settings = await tenant_repository.get_tenant_settings(str(tenant_profile.get("id") or ""))
    billing_gateway_settings = _read_billing_gateway_settings(current_settings)

    customer_id = _clean_optional_text(billing_gateway_settings.get("stripe_customer_id"))
    normalized_email = _clean_optional_text(billing_email) or _clean_optional_text(tenant_profile.get("owner_email"))
    tenant_name = _clean_optional_text(tenant_profile.get("name")) or "BookedAI Tenant"
    tenant_slug = _clean_optional_text(tenant_profile.get("slug")) or ""
    tenant_id = _clean_optional_text(tenant_profile.get("id")) or ""

    if customer_id:
        update_form = [
            ("name", tenant_name),
            ("metadata[tenant_id]", tenant_id),
            ("metadata[tenant_slug]", tenant_slug),
        ]
        if normalized_email:
            update_form.append(("email", normalized_email))
        await _stripe_post_form(
            stripe_secret_key=settings.stripe_secret_key,
            path=f"/v1/customers/{customer_id}",
            form_data=update_form,
        )
        return customer_id, billing_gateway_settings

    create_form = [
        ("name", tenant_name),
        ("metadata[tenant_id]", tenant_id),
        ("metadata[tenant_slug]", tenant_slug),
        ("metadata[source]", "tenant_billing_workspace"),
    ]
    if normalized_email:
        create_form.append(("email", normalized_email))
    stripe_customer = await _stripe_post_form(
        stripe_secret_key=settings.stripe_secret_key,
        path="/v1/customers",
        form_data=create_form,
    )
    customer_id = _clean_optional_text(stripe_customer.get("id"))
    if not customer_id:
        raise ValueError("Stripe did not return a customer id for tenant billing.")

    next_gateway_settings = {
        **billing_gateway_settings,
        "stripe_customer_id": customer_id,
        "stripe_customer_email": normalized_email,
        "last_synced_at": datetime.now(UTC).isoformat(),
    }
    await tenant_repository.upsert_tenant_settings(
        tenant_id=tenant_id,
        settings_json={"billing_gateway": next_gateway_settings},
    )
    return customer_id, next_gateway_settings


async def create_tenant_stripe_checkout_session(
    session,
    settings,
    *,
    tenant_profile: dict[str, object],
    billing_email: str | None,
    plan_code: str,
    plan_label: str,
    plan_description: str,
    monthly_amount_aud: int,
    mode: str,
) -> dict[str, object]:
    tenant_id = _clean_optional_text(tenant_profile.get("id")) or ""
    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    customer_id, gateway_settings = await ensure_tenant_stripe_customer(
        session,
        settings,
        tenant_profile=tenant_profile,
        billing_email=billing_email,
    )
    tenant_slug = _clean_optional_text(tenant_profile.get("slug")) or ""
    return_url = _tenant_billing_return_url(tenant_slug)
    form_data: list[tuple[str, str]] = [
        ("mode", "subscription"),
        ("customer", customer_id),
        ("success_url", return_url),
        ("cancel_url", return_url),
        ("payment_method_types[]", "card"),
        ("line_items[0][quantity]", "1"),
        ("line_items[0][price_data][currency]", settings.stripe_currency),
        ("line_items[0][price_data][unit_amount]", str(int(monthly_amount_aud) * 100)),
        ("line_items[0][price_data][recurring][interval]", "month"),
        ("line_items[0][price_data][product_data][name]", f"BookedAI {plan_label}"),
        ("line_items[0][price_data][product_data][description]", plan_description),
        ("client_reference_id", tenant_id),
        ("metadata[tenant_id]", tenant_id),
        ("metadata[tenant_slug]", tenant_slug),
        ("metadata[plan_code]", plan_code),
        ("metadata[source]", "tenant_billing_workspace"),
        ("subscription_data[metadata][tenant_id]", tenant_id),
        ("subscription_data[metadata][tenant_slug]", tenant_slug),
        ("subscription_data[metadata][plan_code]", plan_code),
    ]
    if mode == "trial":
        form_data.append(("subscription_data[trial_period_days]", "14"))
    if billing_email:
        form_data.append(("customer_email", billing_email.strip().lower()))

    stripe_session = await _stripe_post_form(
        stripe_secret_key=settings.stripe_secret_key,
        path="/v1/checkout/sessions",
        form_data=form_data,
    )
    checkout_url = _clean_optional_text(stripe_session.get("url"))
    if not checkout_url:
        raise ValueError("Stripe did not return a checkout url for tenant billing.")

    next_gateway_settings = {
        **gateway_settings,
        "stripe_checkout_session_id": _clean_optional_text(stripe_session.get("id")),
        "stripe_checkout_plan_code": plan_code,
        "stripe_checkout_mode": mode,
        "last_synced_at": datetime.now(UTC).isoformat(),
    }
    await tenant_repository.upsert_tenant_settings(
        tenant_id=tenant_id,
        settings_json={"billing_gateway": next_gateway_settings},
    )
    return {
        "checkout_url": checkout_url,
        "stripe_customer_id": customer_id,
        "stripe_checkout_session_id": _clean_optional_text(stripe_session.get("id")),
    }


async def create_tenant_stripe_billing_portal_session(
    session,
    settings,
    *,
    tenant_profile: dict[str, object],
    billing_email: str | None,
) -> dict[str, object]:
    customer_id, _ = await ensure_tenant_stripe_customer(
        session,
        settings,
        tenant_profile=tenant_profile,
        billing_email=billing_email,
    )
    stripe_session = await _stripe_post_form(
        stripe_secret_key=settings.stripe_secret_key,
        path="/v1/billing_portal/sessions",
        form_data=[
            ("customer", customer_id),
            ("return_url", _tenant_billing_return_url(_clean_optional_text(tenant_profile.get("slug")))),
        ],
    )
    portal_url = _clean_optional_text(stripe_session.get("url"))
    if not portal_url:
        raise ValueError("Stripe did not return a customer portal url for tenant billing.")
    return {
        "portal_url": portal_url,
        "stripe_customer_id": customer_id,
    }


async def _load_tenant_stripe_billing_state(
    settings,
    *,
    stripe_customer_id: str,
) -> dict[str, object]:
    customer = await _stripe_get(
        stripe_secret_key=settings.stripe_secret_key,
        path=f"/v1/customers/{stripe_customer_id}",
        params=[("expand[]", "invoice_settings.default_payment_method")],
    )
    subscriptions_payload = await _stripe_get(
        stripe_secret_key=settings.stripe_secret_key,
        path="/v1/subscriptions",
        params=[
            ("customer", stripe_customer_id),
            ("status", "all"),
            ("limit", "6"),
        ],
    )
    invoices_payload = await _stripe_get(
        stripe_secret_key=settings.stripe_secret_key,
        path="/v1/invoices",
        params=[
            ("customer", stripe_customer_id),
            ("limit", "6"),
        ],
    )
    subscriptions = subscriptions_payload.get("data") if isinstance(subscriptions_payload.get("data"), list) else []
    invoices = invoices_payload.get("data") if isinstance(invoices_payload.get("data"), list) else []
    return {
        "customer": customer,
        "subscriptions": subscriptions,
        "invoices": invoices,
    }


async def build_tenant_plugin_interface_snapshot(session, *, tenant_ref: str | None = None) -> dict:
    tenant_profile, tenant_id = await _load_tenant_context(session, tenant_ref=tenant_ref)
    if not tenant_profile or not tenant_id:
        return {}

    tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    settings = await tenant_repository.get_tenant_settings(tenant_id)
    plugin_settings = _read_nested_dict(settings, "partner_plugin_interface")
    feature_settings = _read_nested_dict(plugin_settings, "features")
    recent_audit_entries = await audit_repository.list_recent_entries(tenant_id=tenant_id, limit=12)

    service_rows = (
        await session.execute(
            text(
                """
                select
                  service_id,
                  name,
                  category,
                  display_price,
                  booking_url,
                  image_url,
                  publish_state
                from service_merchant_profiles
                where tenant_id = :tenant_id
                order by
                  case when coalesce(publish_state, 'draft') = 'published' then 0 else 1 end,
                  featured desc,
                  name asc
                limit 24
                """
            ),
            {"tenant_id": tenant_id},
        )
    ).mappings().all()

    published_product_names = [
        str(item.get("name") or "").strip()
        for item in service_rows
        if str(item.get("publish_state") or "").strip().lower() == "published"
        and str(item.get("name") or "").strip()
    ]
    first_booking_url = next(
        (
            str(item.get("booking_url") or "").strip()
            for item in service_rows
            if str(item.get("booking_url") or "").strip()
        ),
        None,
    )

    partner_name = _clean_text(
        plugin_settings.get("partner_name"),
        str(tenant_profile.get("name") or "BookedAI Partner"),
    )
    main_message = _clean_text(
        plugin_settings.get("headline") or settings.get("main_message"),
        f"Book {partner_name} through BookedAI",
    )
    partner_website_url = _clean_text(
        plugin_settings.get("partner_website_url") or first_booking_url,
        f"https://{tenant_profile.get('slug')}.bookedai.au",
    )
    bookedai_host = _clean_text(plugin_settings.get("bookedai_host"), "https://product.bookedai.au")
    embed_path = _clean_text(plugin_settings.get("embed_path"), f"/partner/{tenant_profile.get('slug')}/embed")
    widget_script_path = _clean_text(
        plugin_settings.get("widget_script_path"),
        "/partner-plugins/ai-mentor-pro-widget.js",
    )
    widget_id = _clean_text(
        plugin_settings.get("widget_id"),
        f"{tenant_profile.get('slug')}-plugin",
    )
    tenant_slug = str(tenant_profile.get("slug") or "").strip()

    features = {
        key: bool(feature_settings.get(key, fallback))
        for key, fallback in TENANT_PLUGIN_DEFAULT_FEATURES.items()
    }

    products = [
        {
            "service_id": item.get("service_id"),
            "name": item.get("name"),
            "category": item.get("category"),
            "display_price": item.get("display_price"),
            "booking_url": item.get("booking_url"),
            "image_url": item.get("image_url"),
            "publish_state": item.get("publish_state"),
        }
        for item in service_rows
    ]

    return {
        "tenant": tenant_profile,
        "activity": _build_section_activity(
            recent_audit_entries,
            event_types={"tenant.plugin_interface.updated"},
            fallback_summary="No plugin configuration changes have been recorded yet for this tenant.",
            fallback_actor=_clean_optional_text(tenant_profile.get("owner_email")),
        ),
        "experience": {
            "partner_name": partner_name,
            "partner_website_url": partner_website_url,
            "bookedai_host": bookedai_host,
            "embed_path": embed_path,
            "widget_script_path": widget_script_path,
            "tenant_ref": tenant_slug,
            "widget_id": widget_id,
            "accent_color": _clean_text(plugin_settings.get("accent_color"), "#1f7a6b"),
            "button_label": _clean_text(plugin_settings.get("button_label"), f"Book {partner_name}"),
            "modal_title": _clean_text(plugin_settings.get("modal_title"), partner_name),
            "headline": main_message,
            "prompt": _clean_text(plugin_settings.get("prompt"), main_message),
            "inline_target_selector": _clean_text(
                plugin_settings.get("inline_target_selector"),
                "#bookedai-partner-widget",
            ),
            "support_email": _clean_optional_text(plugin_settings.get("support_email")),
            "support_whatsapp": _clean_optional_text(plugin_settings.get("support_whatsapp")),
            "logo_url": _clean_optional_text(plugin_settings.get("logo_url")),
        },
        "features": features,
        "runtime": {
            "deployment_mode": "plugin_integrated",
            "channel": "embedded_widget",
            "source": _clean_text(plugin_settings.get("source"), f"{tenant_slug}_plugin"),
            "widget_script_url": f"{bookedai_host.rstrip('/')}{widget_script_path}",
            "embed_url": f"{bookedai_host.rstrip('/')}{embed_path}",
            "documentation_url": "https://tenant.bookedai.au/",
        },
        "catalog_summary": {
            "published_product_count": len(published_product_names),
            "product_names": published_product_names,
        },
        "products": products,
    }
