from __future__ import annotations

from typing import Any

from repositories.academy_repository import AcademyRepository
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.outbox_repository import OutboxRepository


def _clean_optional_text(value: object) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _coerce_json_object(value: object) -> dict[str, Any]:
    return dict(value) if isinstance(value, dict) else {}


def _build_student_identity_key(
    *,
    student_name: str | None,
    guardian_email: str | None,
    guardian_phone: str | None,
    booking_reference: str | None,
) -> str | None:
    normalized_student = _clean_optional_text(student_name)
    normalized_email = _clean_optional_text(guardian_email)
    normalized_phone = _clean_optional_text(guardian_phone)
    if normalized_student and (normalized_email or normalized_phone):
        return "|".join(
            [
                normalized_student.lower(),
                (normalized_email or "").lower(),
                normalized_phone or "",
            ]
        )
    return _clean_optional_text(booking_reference)


def _build_student_ref(
    *,
    booking_reference: str | None,
    student_name: str | None,
) -> str:
    booking_token = "".join(
        character.lower()
        for character in str(booking_reference or "").strip()
        if character.isalnum()
    )[:18]
    name_token = "".join(
        character.lower()
        for character in str(student_name or "").strip()
        if character.isalnum()
    )[:12]
    primary_token = booking_token or name_token or "academy"
    secondary_token = name_token if booking_token and name_token else None
    return f"student_{primary_token}{f'_{secondary_token}' if secondary_token else ''}"


def _format_agent_action_run(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "action_run_id": item.get("action_run_id"),
        "tenant_id": item.get("tenant_id"),
        "agent_type": item.get("agent_type"),
        "action_type": item.get("action_type"),
        "entity_type": item.get("entity_type"),
        "entity_id": item.get("entity_id"),
        "booking_reference": item.get("booking_reference"),
        "student_ref": item.get("student_ref"),
        "status": item.get("status"),
        "priority": item.get("priority"),
        "reason": item.get("reason"),
        "input": _coerce_json_object(item.get("input_json")),
        "result": _coerce_json_object(item.get("result_json")),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


AGENT_ACTION_TERMINAL_STATUSES = {
    "queued",
    "in_progress",
    "sent",
    "completed",
    "failed",
    "manual_review",
    "skipped",
}


async def persist_booking_academy_snapshot(
    session,
    *,
    tenant_id: str,
    booking_reference: str,
    template_version: str,
    program_code: str,
    participant: dict[str, Any],
    assessment: dict[str, Any],
    placement: dict[str, Any],
    service_name: str | None,
    report_preview: dict[str, Any],
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    booking_row = await repository.get_booking_context(
        booking_reference=booking_reference,
        tenant_id=tenant_id,
    )
    participant_data = dict(participant)
    assessment_data = dict(assessment)
    placement_data = dict(placement)

    booking_contact_name = _clean_optional_text((booking_row or {}).get("customer_name"))
    booking_contact_email = _clean_optional_text((booking_row or {}).get("customer_email"))
    booking_contact_phone = _clean_optional_text((booking_row or {}).get("customer_phone"))
    student_name = _clean_optional_text(participant_data.get("student_name")) or booking_contact_name
    guardian_name = _clean_optional_text(participant_data.get("guardian_name")) or booking_contact_name
    identity_key = _build_student_identity_key(
        student_name=student_name,
        guardian_email=booking_contact_email,
        guardian_phone=booking_contact_phone,
        booking_reference=booking_reference,
    )
    existing_student = await repository.find_student_by_identity_key(
        tenant_id=tenant_id,
        identity_key=identity_key,
    )
    student_ref = (
        _clean_optional_text((existing_student or {}).get("student_ref"))
        or _build_student_ref(
            booking_reference=booking_reference,
            student_name=student_name,
        )
    )

    student_row = await repository.upsert_student_snapshot(
        tenant_id=tenant_id,
        contact_id=_clean_optional_text((booking_row or {}).get("contact_id")),
        student_ref=student_ref,
        identity_key=identity_key,
        source_booking_reference=booking_reference,
        student_name=student_name,
        student_age=participant_data.get("student_age"),
        guardian_name=guardian_name,
        guardian_email=booking_contact_email,
        guardian_phone=booking_contact_phone,
        current_level=_clean_optional_text(assessment_data.get("level"))
        or _clean_optional_text(placement_data.get("level")),
        status="active",
        profile_json={
            "program_code": program_code,
            "template_version": template_version,
            "service_name": service_name,
            "booking_reference": booking_reference,
            "participant": participant_data,
        },
    )
    if not student_row:
        return {}

    student_id = str(student_row.get("student_id") or "").strip()
    booking_intent_id = _clean_optional_text((booking_row or {}).get("booking_intent_id"))

    await repository.insert_assessment_snapshot(
        tenant_id=tenant_id,
        student_id=student_id,
        booking_intent_id=booking_intent_id,
        booking_reference=booking_reference,
        template_version=template_version,
        program_code=program_code,
        source="booking_report_preview",
        answers_json=_coerce_json_object(assessment_data.get("answers")),
        result_json=assessment_data,
    )

    suggested_plan = placement_data.get("suggested_plan")
    suggested_plan = suggested_plan if isinstance(suggested_plan, dict) else {}
    primary_slot = None
    available_slots = placement_data.get("available_slots")
    if isinstance(available_slots, list) and available_slots:
        primary_slot = available_slots[0] if isinstance(available_slots[0], dict) else None

    await repository.insert_enrollment_snapshot(
        tenant_id=tenant_id,
        student_id=student_id,
        booking_intent_id=booking_intent_id,
        booking_reference=booking_reference,
        service_id=_clean_optional_text((booking_row or {}).get("service_id")),
        service_name=service_name or _clean_optional_text((booking_row or {}).get("service_name")),
        class_code=_clean_optional_text((primary_slot or {}).get("class_code")),
        class_label=_clean_optional_text(placement_data.get("class_label")),
        plan_code=_clean_optional_text(suggested_plan.get("plan_code")),
        plan_label=_clean_optional_text(suggested_plan.get("title"))
        or _clean_optional_text(suggested_plan.get("label")),
        status="active",
        snapshot_json={
            "placement": placement_data,
            "service_name": service_name,
            "booking_reference": booking_reference,
        },
    )

    await repository.insert_report_snapshot(
        tenant_id=tenant_id,
        student_id=student_id,
        booking_intent_id=booking_intent_id,
        booking_reference=booking_reference,
        report_kind="progress_preview",
        report_json=report_preview,
    )

    return {
        "student_ref": student_ref,
        "student_id": student_id,
        "booking_reference": booking_reference,
    }


async def build_academy_student_snapshot(
    session,
    *,
    student_ref: str,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    student_row = await repository.get_student_profile(student_ref=student_ref)
    if not student_row:
        return {}

    if tenant_id and str(student_row.get("tenant_id") or "").strip() != str(tenant_id).strip():
        return {}

    latest_assessment = await repository.get_latest_assessment(student_ref=student_ref)
    latest_enrollment = await repository.get_latest_enrollment(student_ref=student_ref)
    latest_report = await repository.get_latest_report_preview(student_ref=student_ref)
    latest_subscription_intent = await repository.get_latest_subscription_intent(student_ref=student_ref)
    recent_action_runs = await repository.list_agent_action_runs(student_ref=student_ref, limit=8)
    recent_requests = await repository.list_recent_portal_requests(student_ref=student_ref, limit=6)

    return {
        "student": {
            "tenant_id": student_row.get("tenant_id"),
            "student_ref": student_row.get("student_ref"),
            "student_name": student_row.get("student_name"),
            "student_age": student_row.get("student_age"),
            "guardian_name": student_row.get("guardian_name"),
            "guardian_email": student_row.get("guardian_email"),
            "guardian_phone": student_row.get("guardian_phone"),
            "current_level": student_row.get("current_level"),
            "status": student_row.get("status"),
            "source_booking_reference": student_row.get("source_booking_reference"),
            "profile": _coerce_json_object(student_row.get("profile_json")),
            "created_at": student_row.get("created_at"),
            "updated_at": student_row.get("updated_at"),
        },
        "latest_assessment": {
            "template_version": latest_assessment.get("template_version"),
            "program_code": latest_assessment.get("program_code"),
            "source": latest_assessment.get("source"),
            "answers": _coerce_json_object(latest_assessment.get("answers_json")),
            "result": _coerce_json_object(latest_assessment.get("result_json")),
            "created_at": latest_assessment.get("created_at"),
        }
        if latest_assessment
        else None,
        "latest_enrollment": {
            "service_id": latest_enrollment.get("service_id"),
            "service_name": latest_enrollment.get("service_name"),
            "class_code": latest_enrollment.get("class_code"),
            "class_label": latest_enrollment.get("class_label"),
            "plan_code": latest_enrollment.get("plan_code"),
            "plan_label": latest_enrollment.get("plan_label"),
            "status": latest_enrollment.get("status"),
            "snapshot": _coerce_json_object(latest_enrollment.get("snapshot_json")),
            "created_at": latest_enrollment.get("created_at"),
        }
        if latest_enrollment
        else None,
        "latest_report_preview": _coerce_json_object(latest_report.get("report_json"))
        if latest_report
        else None,
        "latest_subscription_intent": {
            "subscription_intent_id": latest_subscription_intent.get("subscription_intent_id"),
            "booking_reference": latest_subscription_intent.get("booking_reference"),
            "plan_code": latest_subscription_intent.get("plan_code"),
            "plan_label": latest_subscription_intent.get("plan_label"),
            "billing_interval": latest_subscription_intent.get("billing_interval"),
            "amount_aud": latest_subscription_intent.get("amount_aud"),
            "status": latest_subscription_intent.get("status"),
            "checkout_url": latest_subscription_intent.get("checkout_url"),
            "payload": _coerce_json_object(latest_subscription_intent.get("intent_payload_json")),
            "created_at": latest_subscription_intent.get("created_at"),
        }
        if latest_subscription_intent
        else None,
        "recent_agent_actions": [
            _format_agent_action_run(item)
            for item in recent_action_runs
        ],
        "recent_requests": [
            {
                "request_type": item.get("request_type"),
                "reason_code": item.get("reason_code"),
                "status": item.get("status"),
                "booking_reference": item.get("booking_reference"),
                "payload": _coerce_json_object(item.get("request_payload_json")),
                "created_at": item.get("created_at"),
            }
            for item in recent_requests
        ],
    }


async def create_academy_subscription_intent(
    session,
    *,
    tenant_id: str | None,
    student_ref: str | None,
    booking_reference: str | None,
    booking_intent_id: str | None,
    plan_code: str,
    plan_label: str | None,
    amount_aud: float | int | None,
    billing_interval: str = "month",
    placement: dict[str, Any] | None = None,
    actor_id: str | None = None,
    source: str = "public_web",
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    normalized_student_ref = _clean_optional_text(student_ref)
    normalized_booking_reference = _clean_optional_text(booking_reference)

    student_row = None
    if normalized_student_ref:
        student_row = await repository.get_student_profile(student_ref=normalized_student_ref)
    if not student_row and normalized_booking_reference:
        student_row = await repository.get_student_by_booking_reference(
            booking_reference=normalized_booking_reference,
            tenant_id=tenant_id,
        )
    if not student_row:
        return {}

    effective_tenant_id = _clean_optional_text(tenant_id) or _clean_optional_text(student_row.get("tenant_id"))
    effective_student_ref = _clean_optional_text(student_row.get("student_ref")) or normalized_student_ref
    student_id = _clean_optional_text(student_row.get("student_id"))
    latest_enrollment = await repository.get_latest_enrollment(student_ref=effective_student_ref or "")
    booking_row = None
    effective_booking_reference = (
        normalized_booking_reference
        or _clean_optional_text((latest_enrollment or {}).get("booking_reference"))
        or _clean_optional_text(student_row.get("source_booking_reference"))
    )
    if effective_booking_reference and effective_tenant_id:
        booking_row = await repository.get_booking_context(
            booking_reference=effective_booking_reference,
            tenant_id=effective_tenant_id,
        )

    effective_booking_intent_id = (
        _clean_optional_text(booking_intent_id)
        or _clean_optional_text((booking_row or {}).get("booking_intent_id"))
        or _clean_optional_text((latest_enrollment or {}).get("booking_intent_id"))
    )
    placement_payload = _coerce_json_object(placement)
    normalized_plan_code = _clean_optional_text(plan_code) or _clean_optional_text((latest_enrollment or {}).get("plan_code"))
    normalized_plan_label = _clean_optional_text(plan_label) or _clean_optional_text((latest_enrollment or {}).get("plan_label"))
    normalized_billing_interval = _clean_optional_text(billing_interval) or "month"
    if not effective_tenant_id or not student_id or not normalized_plan_code:
        return {}

    intent_payload = {
        "student_ref": effective_student_ref,
        "student_name": student_row.get("student_name"),
        "guardian_name": student_row.get("guardian_name"),
        "guardian_email": student_row.get("guardian_email"),
        "guardian_phone": student_row.get("guardian_phone"),
        "booking_reference": effective_booking_reference,
        "booking_intent_id": effective_booking_intent_id,
        "plan_code": normalized_plan_code,
        "plan_label": normalized_plan_label,
        "billing_interval": normalized_billing_interval,
        "amount_aud": amount_aud,
        "placement": placement_payload,
        "source": source,
    }

    subscription_intent = await repository.insert_subscription_intent(
        tenant_id=effective_tenant_id,
        student_id=student_id,
        booking_intent_id=effective_booking_intent_id,
        booking_reference=effective_booking_reference,
        plan_code=normalized_plan_code,
        plan_label=normalized_plan_label,
        billing_interval=normalized_billing_interval,
        amount_aud=amount_aud,
        status="pending_checkout",
        checkout_url=None,
        intent_payload_json=intent_payload,
    )
    if not subscription_intent:
        return {}

    action_specs = [
        (
            "subscription_start_confirmation",
            "Send parent confirmation once the subscription checkout or invoice path is ready.",
            "high",
        ),
        (
            "payment_reminder",
            "Remind the parent if checkout remains pending after the academy confirmation window.",
            "normal",
        ),
        (
            "crm_sync",
            "Sync the student, guardian, placement, and subscription plan into the tenant CRM.",
            "normal",
        ),
        (
            "report_generation_trigger",
            "Schedule the next parent progress report so retention starts immediately after booking.",
            "normal",
        ),
        (
            "retention_evaluation_trigger",
            "Evaluate plan fit and churn risk after the first learning milestone.",
            "normal",
        ),
    ]
    action_runs: list[dict[str, Any]] = []
    for action_type, reason, priority in action_specs:
        action_run = await repository.insert_agent_action_run(
            tenant_id=effective_tenant_id,
            agent_type="revenue_operations",
            action_type=action_type,
            entity_type="academy_subscription_intent",
            entity_id=subscription_intent.get("subscription_intent_id"),
            booking_reference=effective_booking_reference,
            student_ref=effective_student_ref,
            status="queued",
            priority=priority,
            reason=reason,
            input_json=intent_payload,
        )
        if action_run:
            action_runs.append(action_run)

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    await audit_repository.append_entry(
        tenant_id=effective_tenant_id,
        event_type="academy.subscription_intent.created",
        entity_type="academy_subscription_intent",
        entity_id=subscription_intent.get("subscription_intent_id"),
        actor_type="system",
        actor_id=actor_id or source,
        payload={
            **intent_payload,
            "queued_action_count": len(action_runs),
        },
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=effective_tenant_id,
        event_type="academy.subscription_intent.created",
        aggregate_type="academy_subscription_intent",
        aggregate_id=subscription_intent.get("subscription_intent_id"),
        payload={
            **intent_payload,
            "queued_action_count": len(action_runs),
        },
        idempotency_key=f"academy-subscription:{effective_student_ref}:{effective_booking_reference}:{normalized_plan_code}",
    )

    return {
        "tenant_id": effective_tenant_id,
        "student_ref": effective_student_ref,
        "booking_reference": effective_booking_reference,
        "subscription_intent": {
            "subscription_intent_id": subscription_intent.get("subscription_intent_id"),
            "plan_code": subscription_intent.get("plan_code"),
            "plan_label": subscription_intent.get("plan_label"),
            "billing_interval": subscription_intent.get("billing_interval"),
            "amount_aud": subscription_intent.get("amount_aud"),
            "status": subscription_intent.get("status"),
            "checkout_url": subscription_intent.get("checkout_url"),
            "created_at": subscription_intent.get("created_at"),
        },
        "queued_actions": [
            {
                "action_run_id": item.get("action_run_id"),
                "agent_type": item.get("agent_type"),
                "action_type": item.get("action_type"),
                "status": item.get("status"),
                "priority": item.get("priority"),
                "reason": item.get("reason"),
            }
            for item in action_runs
        ],
        "outbox_event_id": outbox_event_id,
        "message": "Subscription handoff is queued for revenue operations.",
    }


async def queue_academy_agent_action(
    session,
    *,
    action_type: str,
    tenant_id: str | None,
    student_ref: str | None,
    booking_reference: str | None,
    reason: str | None = None,
    priority: str = "normal",
    actor_id: str | None = None,
    source: str = "api",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    normalized_student_ref = _clean_optional_text(student_ref)
    normalized_booking_reference = _clean_optional_text(booking_reference)

    student_row = None
    if normalized_student_ref:
        student_row = await repository.get_student_profile(student_ref=normalized_student_ref)
    if not student_row and normalized_booking_reference:
        student_row = await repository.get_student_by_booking_reference(
            booking_reference=normalized_booking_reference,
            tenant_id=tenant_id,
        )
    if not student_row:
        return {}

    effective_tenant_id = _clean_optional_text(tenant_id) or _clean_optional_text(student_row.get("tenant_id"))
    effective_student_ref = _clean_optional_text(student_row.get("student_ref")) or normalized_student_ref
    latest_enrollment = await repository.get_latest_enrollment(student_ref=effective_student_ref or "")
    latest_subscription = await repository.get_latest_subscription_intent(student_ref=effective_student_ref)
    effective_booking_reference = (
        normalized_booking_reference
        or _clean_optional_text((latest_subscription or {}).get("booking_reference"))
        or _clean_optional_text((latest_enrollment or {}).get("booking_reference"))
        or _clean_optional_text(student_row.get("source_booking_reference"))
    )

    input_payload = {
        "student_ref": effective_student_ref,
        "student_name": student_row.get("student_name"),
        "guardian_name": student_row.get("guardian_name"),
        "guardian_email": student_row.get("guardian_email"),
        "guardian_phone": student_row.get("guardian_phone"),
        "booking_reference": effective_booking_reference,
        "current_level": student_row.get("current_level"),
        "latest_enrollment": _coerce_json_object((latest_enrollment or {}).get("snapshot_json")),
        "latest_subscription_intent_id": (latest_subscription or {}).get("subscription_intent_id"),
        "source": source,
        "context": context or {},
    }

    default_reasons = {
        "report_generation_trigger": "Generate or refresh the next parent-facing academy progress report.",
        "retention_evaluation_trigger": "Evaluate plan fit, payment posture, and churn risk for the current student.",
    }
    action_run = await repository.insert_agent_action_run(
        tenant_id=effective_tenant_id,
        agent_type="revenue_operations",
        action_type=action_type,
        entity_type="academy_student",
        entity_id=_clean_optional_text(student_row.get("student_id")),
        booking_reference=effective_booking_reference,
        student_ref=effective_student_ref,
        status="queued",
        priority=priority,
        reason=_clean_optional_text(reason) or default_reasons.get(action_type),
        input_json=input_payload,
    )
    if not action_run:
        return {}

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    await audit_repository.append_entry(
        tenant_id=effective_tenant_id,
        event_type=f"agent_action.{action_type}.queued",
        entity_type="academy_student",
        entity_id=_clean_optional_text(student_row.get("student_id")),
        actor_type="system",
        actor_id=actor_id or source,
        payload=input_payload,
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=effective_tenant_id,
        event_type=f"agent_action.{action_type}.queued",
        aggregate_type="academy_student",
        aggregate_id=_clean_optional_text(student_row.get("student_id")),
        payload=input_payload,
        idempotency_key=f"agent-action:{action_type}:{effective_student_ref}:{effective_booking_reference}:{source}",
    )

    return {
        "tenant_id": effective_tenant_id,
        "student_ref": effective_student_ref,
        "booking_reference": effective_booking_reference,
        "action_run": {
            "action_run_id": action_run.get("action_run_id"),
            "agent_type": action_run.get("agent_type"),
            "action_type": action_run.get("action_type"),
            "status": action_run.get("status"),
            "priority": action_run.get("priority"),
            "reason": action_run.get("reason"),
            "created_at": action_run.get("created_at"),
        },
        "outbox_event_id": outbox_event_id,
        "message": "Revenue operations action queued.",
    }


async def queue_sme_revenue_operations_handoff(
    session,
    *,
    tenant_id: str | None,
    booking_reference: str | None,
    booking_intent_id: str | None = None,
    lead_id: str | None = None,
    contact_id: str | None = None,
    customer: dict[str, Any] | None = None,
    service: dict[str, Any] | None = None,
    lifecycle: dict[str, Any] | None = None,
    actor_id: str | None = None,
    source: str = "api",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    effective_tenant_id = _clean_optional_text(tenant_id)
    effective_booking_reference = _clean_optional_text(booking_reference)
    effective_booking_intent_id = _clean_optional_text(booking_intent_id)
    effective_lead_id = _clean_optional_text(lead_id)
    effective_contact_id = _clean_optional_text(contact_id)
    customer_payload = _coerce_json_object(customer)
    service_payload = _coerce_json_object(service)
    lifecycle_payload = _coerce_json_object(lifecycle)

    if not effective_tenant_id or not (
        effective_booking_reference or effective_booking_intent_id or effective_lead_id
    ):
        return {}

    input_payload = {
        "booking_reference": effective_booking_reference,
        "booking_intent_id": effective_booking_intent_id,
        "lead_id": effective_lead_id,
        "contact_id": effective_contact_id,
        "customer": customer_payload,
        "service": service_payload,
        "lifecycle": lifecycle_payload,
        "source": source,
        "context": context or {},
    }

    action_specs = [
        (
            "lead_follow_up",
            "Follow up with the customer while booking intent is fresh.",
            "high",
        ),
        (
            "payment_reminder",
            "Monitor payment posture and remind the customer if the booking is unpaid or pending.",
            "normal",
        ),
        (
            "crm_sync",
            "Sync the captured customer, service, booking, and next-step state into the tenant CRM.",
            "normal",
        ),
        (
            "customer_care_status_monitor",
            "Keep the customer-care agent ready to answer status, reschedule, payment, or support questions from this booking.",
            "normal",
        ),
        (
            "webhook_callback",
            "Notify tenant automations or integration webhooks about the new booking lifecycle state.",
            "normal",
        ),
    ]

    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    action_runs: list[dict[str, Any]] = []
    entity_id = effective_booking_intent_id or effective_lead_id or effective_booking_reference
    for action_type, reason, priority in action_specs:
        action_run = await repository.insert_agent_action_run(
            tenant_id=effective_tenant_id,
            agent_type="revenue_operations",
            action_type=action_type,
            entity_type="booking_lifecycle",
            entity_id=entity_id,
            booking_reference=effective_booking_reference,
            student_ref=None,
            status="queued",
            priority=priority,
            reason=reason,
            input_json=input_payload,
        )
        if action_run:
            action_runs.append(action_run)

    if not action_runs:
        return {}

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    await audit_repository.append_entry(
        tenant_id=effective_tenant_id,
        event_type="revenue_operations.handoff.queued",
        entity_type="booking_lifecycle",
        entity_id=entity_id,
        actor_type="system",
        actor_id=actor_id or source,
        payload={
            **input_payload,
            "queued_action_count": len(action_runs),
        },
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=effective_tenant_id,
        event_type="revenue_operations.handoff.queued",
        aggregate_type="booking_lifecycle",
        aggregate_id=entity_id,
        payload={
            **input_payload,
            "queued_action_count": len(action_runs),
        },
        idempotency_key=f"revenue-ops-handoff:{effective_tenant_id}:{entity_id}:{source}",
    )

    return {
        "tenant_id": effective_tenant_id,
        "booking_reference": effective_booking_reference,
        "booking_intent_id": effective_booking_intent_id,
        "lead_id": effective_lead_id,
        "queued_actions": [_format_agent_action_run(item) for item in action_runs],
        "outbox_event_id": outbox_event_id,
        "message": "Revenue operations agent handoff queued.",
    }


async def list_academy_agent_actions(
    session,
    *,
    tenant_id: str | None,
    student_ref: str | None = None,
    booking_reference: str | None = None,
    status: str | None = None,
    action_type: str | None = None,
    limit: int = 25,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    action_runs = await repository.list_agent_action_runs(
        tenant_id=tenant_id,
        student_ref=_clean_optional_text(student_ref),
        booking_reference=_clean_optional_text(booking_reference),
        status=_clean_optional_text(status),
        action_type=_clean_optional_text(action_type),
        limit=min(max(limit, 1), 100),
    )
    return {
        "tenant_id": tenant_id,
        "filters": {
            "student_ref": _clean_optional_text(student_ref),
            "booking_reference": _clean_optional_text(booking_reference),
            "status": _clean_optional_text(status),
            "action_type": _clean_optional_text(action_type),
            "limit": min(max(limit, 1), 100),
        },
        "action_runs": [_format_agent_action_run(item) for item in action_runs],
    }


async def get_academy_agent_action(
    session,
    *,
    action_run_id: str,
    tenant_id: str | None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    action_run = await repository.get_agent_action_run(
        action_run_id=action_run_id,
        tenant_id=tenant_id,
    )
    return _format_agent_action_run(action_run) if action_run else {}


async def transition_academy_agent_action(
    session,
    *,
    action_run_id: str,
    tenant_id: str | None,
    status: str,
    result: dict[str, Any] | None = None,
    note: str | None = None,
    actor_id: str | None = None,
    source: str = "api",
) -> dict[str, Any]:
    normalized_status = _clean_optional_text(status)
    if normalized_status not in AGENT_ACTION_TERMINAL_STATUSES:
        return {}

    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    existing = await repository.get_agent_action_run(
        action_run_id=action_run_id,
        tenant_id=tenant_id,
    )
    if not existing:
        return {}

    effective_tenant_id = _clean_optional_text(tenant_id) or _clean_optional_text(existing.get("tenant_id"))
    transition_result = {
        **_coerce_json_object(result),
        "transition_note": _clean_optional_text(note),
        "previous_status": existing.get("status"),
        "source": source,
    }
    updated = await repository.update_agent_action_run_status(
        action_run_id=action_run_id,
        tenant_id=effective_tenant_id,
        status=normalized_status,
        result_json=transition_result,
    )
    if not updated:
        return {}

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
    payload = {
        "action_run_id": action_run_id,
        "agent_type": updated.get("agent_type"),
        "action_type": updated.get("action_type"),
        "student_ref": updated.get("student_ref"),
        "booking_reference": updated.get("booking_reference"),
        "previous_status": existing.get("status"),
        "status": normalized_status,
        "result": transition_result,
    }
    await audit_repository.append_entry(
        tenant_id=effective_tenant_id,
        event_type="agent_action.status_changed",
        entity_type="agent_action_run",
        entity_id=action_run_id,
        actor_type="system",
        actor_id=actor_id or source,
        payload=payload,
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=effective_tenant_id,
        event_type="agent_action.status_changed",
        aggregate_type="agent_action_run",
        aggregate_id=action_run_id,
        payload=payload,
        idempotency_key=f"agent-action-transition:{action_run_id}:{normalized_status}",
    )

    return {
        "tenant_id": effective_tenant_id,
        "action_run": _format_agent_action_run(updated),
        "outbox_event_id": outbox_event_id,
        "message": "Revenue operations action status updated.",
    }


async def get_academy_report_preview(
    session,
    *,
    student_ref: str | None = None,
    booking_reference: str | None = None,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    latest_report = await repository.get_latest_report_preview(
        student_ref=student_ref,
        booking_reference=booking_reference,
    )
    if not latest_report:
        return {}

    report_tenant_id = _clean_optional_text(latest_report.get("tenant_id"))
    if tenant_id and report_tenant_id and report_tenant_id != str(tenant_id).strip():
        return {}

    student_row = await repository.get_student_profile(
        student_ref=_clean_optional_text(latest_report.get("student_ref")) or student_ref or ""
    )

    return {
        "tenant_id": latest_report.get("tenant_id"),
        "student_ref": latest_report.get("student_ref"),
        "booking_reference": latest_report.get("booking_reference"),
        "report_preview": _coerce_json_object(latest_report.get("report_json")),
        "student": {
            "student_name": (student_row or {}).get("student_name"),
            "guardian_name": (student_row or {}).get("guardian_name"),
            "guardian_email": (student_row or {}).get("guardian_email"),
            "guardian_phone": (student_row or {}).get("guardian_phone"),
            "current_level": (student_row or {}).get("current_level"),
        }
        if student_row
        else None,
    }


async def get_academy_enrollment_snapshot(
    session,
    *,
    student_ref: str,
    tenant_id: str | None = None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    student_row = await repository.get_student_profile(student_ref=student_ref)
    if not student_row:
        return {}
    if tenant_id and str(student_row.get("tenant_id") or "").strip() != str(tenant_id).strip():
        return {}

    latest_enrollment = await repository.get_latest_enrollment(student_ref=student_ref)
    if not latest_enrollment:
        return {}

    return {
        "tenant_id": student_row.get("tenant_id"),
        "student_ref": student_ref,
        "enrollment": {
            "service_id": latest_enrollment.get("service_id"),
            "service_name": latest_enrollment.get("service_name"),
            "class_code": latest_enrollment.get("class_code"),
            "class_label": latest_enrollment.get("class_label"),
            "plan_code": latest_enrollment.get("plan_code"),
            "plan_label": latest_enrollment.get("plan_label"),
            "status": latest_enrollment.get("status"),
            "snapshot": _coerce_json_object(latest_enrollment.get("snapshot_json")),
            "created_at": latest_enrollment.get("created_at"),
        },
    }


async def queue_academy_portal_request(
    session,
    *,
    request_type: str,
    student_ref: str,
    reason_code: str | None,
    customer_note: str | None = None,
    requested_plan_code: str | None = None,
    booking_reference: str | None = None,
    actor_id: str | None = None,
) -> dict[str, Any]:
    repository = AcademyRepository(RepositoryContext(session=session))
    student_row = await repository.get_student_profile(student_ref=student_ref)
    if not student_row:
        return {}

    tenant_id = _clean_optional_text(student_row.get("tenant_id"))
    student_id = _clean_optional_text(student_row.get("student_id"))
    latest_enrollment = await repository.get_latest_enrollment(student_ref=student_ref)
    latest_report = await repository.get_latest_report_preview(student_ref=student_ref)
    effective_booking_reference = (
        _clean_optional_text(booking_reference)
        or _clean_optional_text((latest_enrollment or {}).get("booking_reference"))
        or _clean_optional_text((latest_report or {}).get("booking_reference"))
        or _clean_optional_text(student_row.get("source_booking_reference"))
    )

    booking_row = None
    if effective_booking_reference and tenant_id:
        booking_row = await repository.get_booking_context(
            booking_reference=effective_booking_reference,
            tenant_id=tenant_id,
        )

    request_payload = {
        "student_ref": student_ref,
        "student_name": student_row.get("student_name"),
        "guardian_name": student_row.get("guardian_name"),
        "guardian_email": student_row.get("guardian_email"),
        "guardian_phone": student_row.get("guardian_phone"),
        "current_level": student_row.get("current_level"),
        "request_type": request_type,
        "reason_code": reason_code,
        "customer_note": _clean_optional_text(customer_note),
        "requested_plan_code": _clean_optional_text(requested_plan_code),
        "booking_reference": effective_booking_reference,
        "service_name": (latest_enrollment or {}).get("service_name"),
        "current_plan_code": (latest_enrollment or {}).get("plan_code"),
        "current_plan_label": (latest_enrollment or {}).get("plan_label"),
    }

    portal_request_id = await repository.insert_portal_request_snapshot(
        tenant_id=tenant_id or "",
        student_id=student_id,
        booking_intent_id=_clean_optional_text((booking_row or {}).get("booking_intent_id")),
        booking_reference=effective_booking_reference,
        request_type=request_type,
        reason_code=reason_code,
        status="queued",
        request_payload_json=request_payload,
    )

    audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    await audit_repository.append_entry(
        tenant_id=tenant_id,
        event_type=f"portal.{request_type}.requested",
        entity_type="academy_student",
        entity_id=student_id,
        actor_type="portal_customer",
        actor_id=actor_id or student_ref,
        payload=request_payload,
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=tenant_id,
        event_type=f"portal.{request_type}.requested",
        aggregate_type="academy_student",
        aggregate_id=student_id,
        payload=request_payload,
        idempotency_key=(
            f"portal:{request_type}:{student_ref}:{reason_code or ''}:{requested_plan_code or ''}:{(customer_note or '').strip()}"
        ),
    )

    message = (
        "Your pause request has been recorded for review."
        if request_type == "pause"
        else "Your plan downgrade request has been recorded for review."
    )

    return {
        "tenant_id": tenant_id,
        "request_status": "queued",
        "request_type": request_type,
        "student_ref": student_ref,
        "booking_reference": effective_booking_reference,
        "reason_code": reason_code,
        "portal_request_id": portal_request_id,
        "outbox_event_id": outbox_event_id,
        "message": message,
    }
