from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text

from repositories.base import BaseRepository


class AcademyRepository(BaseRepository):
    """Snapshot-first academy read models for demo, portal, and retention flows."""

    async def get_booking_context(
        self,
        *,
        booking_reference: str,
        tenant_id: str | None = None,
    ) -> dict[str, Any] | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_reference = str(booking_reference or "").strip()
        if not normalized_reference:
            return None

        tenant_clause = ""
        params: dict[str, Any] = {"booking_reference": normalized_reference}
        if effective_tenant_id:
            tenant_clause = "and bi.tenant_id = cast(:tenant_id as uuid)"
            params["tenant_id"] = effective_tenant_id

        result = await self.session.execute(
            text(
                f"""
                select
                  bi.id::text as booking_intent_id,
                  bi.tenant_id::text as tenant_id,
                  bi.contact_id::text as contact_id,
                  bi.booking_reference,
                  bi.service_id,
                  bi.service_name,
                  bi.requested_date,
                  bi.requested_time,
                  bi.timezone,
                  bi.metadata_json,
                  c.full_name as customer_name,
                  c.email as customer_email,
                  c.phone as customer_phone
                from booking_intents bi
                left join contacts c
                  on c.id = bi.contact_id
                where bi.booking_reference = :booking_reference
                  {tenant_clause}
                limit 1
                """
            ),
            params,
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def upsert_student_snapshot(
        self,
        *,
        tenant_id: str,
        contact_id: str | None = None,
        student_ref: str,
        identity_key: str | None = None,
        source_booking_reference: str | None = None,
        student_name: str | None = None,
        student_age: int | None = None,
        guardian_name: str | None = None,
        guardian_email: str | None = None,
        guardian_phone: str | None = None,
        current_level: str | None = None,
        status: str = "active",
        profile_json: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        normalized_identity_key = str(identity_key or "").strip().lower() or None
        result = await self.session.execute(
            text(
                """
                insert into academy_students (
                  tenant_id,
                  contact_id,
                  student_ref,
                  identity_key,
                  source_booking_reference,
                  student_name,
                  student_age,
                  guardian_name,
                  guardian_email,
                  guardian_phone,
                  current_level,
                  status,
                  profile_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:contact_id as uuid),
                  :student_ref,
                  :identity_key,
                  :source_booking_reference,
                  :student_name,
                  :student_age,
                  :guardian_name,
                  :guardian_email,
                  :guardian_phone,
                  :current_level,
                  :status,
                  cast(:profile_json as jsonb)
                )
                on conflict (tenant_id, student_ref)
                do update set
                  contact_id = coalesce(excluded.contact_id, academy_students.contact_id),
                  identity_key = coalesce(excluded.identity_key, academy_students.identity_key),
                  source_booking_reference = coalesce(excluded.source_booking_reference, academy_students.source_booking_reference),
                  student_name = coalesce(excluded.student_name, academy_students.student_name),
                  student_age = coalesce(excluded.student_age, academy_students.student_age),
                  guardian_name = coalesce(excluded.guardian_name, academy_students.guardian_name),
                  guardian_email = coalesce(excluded.guardian_email, academy_students.guardian_email),
                  guardian_phone = coalesce(excluded.guardian_phone, academy_students.guardian_phone),
                  current_level = coalesce(excluded.current_level, academy_students.current_level),
                  status = coalesce(excluded.status, academy_students.status),
                  profile_json = coalesce(academy_students.profile_json, '{}'::jsonb) || cast(:profile_json as jsonb),
                  updated_at = now()
                returning
                  id::text as student_id,
                  student_ref,
                  tenant_id::text as tenant_id,
                  contact_id::text as contact_id,
                  source_booking_reference,
                  student_name,
                  student_age,
                  guardian_name,
                  guardian_email,
                  guardian_phone,
                  current_level,
                  status,
                  profile_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "contact_id": (contact_id or "").strip() or None,
                "student_ref": student_ref,
                "identity_key": normalized_identity_key,
                "source_booking_reference": source_booking_reference,
                "student_name": student_name,
                "student_age": student_age,
                "guardian_name": guardian_name,
                "guardian_email": guardian_email,
                "guardian_phone": guardian_phone,
                "current_level": current_level,
                "status": status,
                "profile_json": json.dumps(profile_json or {}),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def find_student_by_identity_key(
        self,
        *,
        tenant_id: str,
        identity_key: str | None,
    ) -> dict[str, Any] | None:
        normalized_identity_key = str(identity_key or "").strip().lower()
        if not normalized_identity_key:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  id::text as student_id,
                  student_ref,
                  tenant_id::text as tenant_id,
                  contact_id::text as contact_id,
                  source_booking_reference,
                  student_name,
                  student_age,
                  guardian_name,
                  guardian_email,
                  guardian_phone,
                  current_level,
                  status,
                  profile_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                from academy_students
                where tenant_id = cast(:tenant_id as uuid)
                  and identity_key = :identity_key
                limit 1
                """
            ),
            {
                "tenant_id": tenant_id,
                "identity_key": normalized_identity_key,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_student_profile(self, *, student_ref: str) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                select
                  id::text as student_id,
                  tenant_id::text as tenant_id,
                  contact_id::text as contact_id,
                  student_ref,
                  identity_key,
                  source_booking_reference,
                  student_name,
                  student_age,
                  guardian_name,
                  guardian_email,
                  guardian_phone,
                  current_level,
                  status,
                  profile_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                from academy_students
                where student_ref = :student_ref
                limit 1
                """
            ),
            {"student_ref": str(student_ref or "").strip()},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_student_by_booking_reference(
        self,
        *,
        booking_reference: str,
        tenant_id: str | None = None,
    ) -> dict[str, Any] | None:
        effective_tenant_id = tenant_id or self.tenant_id
        tenant_clause = ""
        params: dict[str, Any] = {"booking_reference": str(booking_reference or "").strip()}
        if effective_tenant_id:
            tenant_clause = "and tenant_id = cast(:tenant_id as uuid)"
            params["tenant_id"] = effective_tenant_id

        result = await self.session.execute(
            text(
                f"""
                select
                  id::text as student_id,
                  tenant_id::text as tenant_id,
                  contact_id::text as contact_id,
                  student_ref,
                  identity_key,
                  source_booking_reference,
                  student_name,
                  student_age,
                  guardian_name,
                  guardian_email,
                  guardian_phone,
                  current_level,
                  status,
                  profile_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                from academy_students
                where source_booking_reference = :booking_reference
                  {tenant_clause}
                order by updated_at desc
                limit 1
                """
            ),
            params,
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def insert_assessment_snapshot(
        self,
        *,
        tenant_id: str,
        student_id: str,
        booking_intent_id: str | None = None,
        booking_reference: str | None = None,
        template_version: str,
        program_code: str,
        source: str,
        answers_json: dict[str, Any] | None = None,
        result_json: dict[str, Any] | None = None,
    ) -> int | None:
        result = await self.session.execute(
            text(
                """
                insert into academy_assessment_snapshots (
                  tenant_id,
                  student_id,
                  booking_intent_id,
                  booking_reference,
                  template_version,
                  program_code,
                  source,
                  answers_json,
                  result_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:student_id as uuid),
                  cast(:booking_intent_id as uuid),
                  :booking_reference,
                  :template_version,
                  :program_code,
                  :source,
                  cast(:answers_json as jsonb),
                  cast(:result_json as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_id": tenant_id,
                "student_id": student_id,
                "booking_intent_id": (booking_intent_id or "").strip() or None,
                "booking_reference": booking_reference,
                "template_version": template_version,
                "program_code": program_code,
                "source": source,
                "answers_json": json.dumps(answers_json or {}),
                "result_json": json.dumps(result_json or {}),
            },
        )
        return result.scalar_one_or_none()

    async def insert_enrollment_snapshot(
        self,
        *,
        tenant_id: str,
        student_id: str,
        booking_intent_id: str | None = None,
        booking_reference: str | None = None,
        service_id: str | None = None,
        service_name: str | None = None,
        class_code: str | None = None,
        class_label: str | None = None,
        plan_code: str | None = None,
        plan_label: str | None = None,
        status: str = "active",
        snapshot_json: dict[str, Any] | None = None,
    ) -> int | None:
        result = await self.session.execute(
            text(
                """
                insert into academy_enrollment_snapshots (
                  tenant_id,
                  student_id,
                  booking_intent_id,
                  booking_reference,
                  service_id,
                  service_name,
                  class_code,
                  class_label,
                  plan_code,
                  plan_label,
                  status,
                  snapshot_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:student_id as uuid),
                  cast(:booking_intent_id as uuid),
                  :booking_reference,
                  :service_id,
                  :service_name,
                  :class_code,
                  :class_label,
                  :plan_code,
                  :plan_label,
                  :status,
                  cast(:snapshot_json as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_id": tenant_id,
                "student_id": student_id,
                "booking_intent_id": (booking_intent_id or "").strip() or None,
                "booking_reference": booking_reference,
                "service_id": service_id,
                "service_name": service_name,
                "class_code": class_code,
                "class_label": class_label,
                "plan_code": plan_code,
                "plan_label": plan_label,
                "status": status,
                "snapshot_json": json.dumps(snapshot_json or {}),
            },
        )
        return result.scalar_one_or_none()

    async def insert_report_snapshot(
        self,
        *,
        tenant_id: str,
        student_id: str,
        booking_intent_id: str | None = None,
        booking_reference: str | None = None,
        report_kind: str = "progress_preview",
        report_json: dict[str, Any] | None = None,
    ) -> int | None:
        result = await self.session.execute(
            text(
                """
                insert into academy_report_snapshots (
                  tenant_id,
                  student_id,
                  booking_intent_id,
                  booking_reference,
                  report_kind,
                  report_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:student_id as uuid),
                  cast(:booking_intent_id as uuid),
                  :booking_reference,
                  :report_kind,
                  cast(:report_json as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_id": tenant_id,
                "student_id": student_id,
                "booking_intent_id": (booking_intent_id or "").strip() or None,
                "booking_reference": booking_reference,
                "report_kind": report_kind,
                "report_json": json.dumps(report_json or {}),
            },
        )
        return result.scalar_one_or_none()

    async def insert_portal_request_snapshot(
        self,
        *,
        tenant_id: str,
        student_id: str | None = None,
        booking_intent_id: str | None = None,
        booking_reference: str | None = None,
        request_type: str,
        reason_code: str | None = None,
        status: str = "queued",
        request_payload_json: dict[str, Any] | None = None,
    ) -> int | None:
        result = await self.session.execute(
            text(
                """
                insert into academy_portal_request_snapshots (
                  tenant_id,
                  student_id,
                  booking_intent_id,
                  booking_reference,
                  request_type,
                  reason_code,
                  status,
                  request_payload_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:student_id as uuid),
                  cast(:booking_intent_id as uuid),
                  :booking_reference,
                  :request_type,
                  :reason_code,
                  :status,
                  cast(:request_payload_json as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_id": tenant_id,
                "student_id": (student_id or "").strip() or None,
                "booking_intent_id": (booking_intent_id or "").strip() or None,
                "booking_reference": booking_reference,
                "request_type": request_type,
                "reason_code": reason_code,
                "status": status,
                "request_payload_json": json.dumps(request_payload_json or {}),
            },
        )
        return result.scalar_one_or_none()

    async def get_latest_assessment(self, *, student_ref: str) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                select
                  aas.id,
                  aas.tenant_id::text as tenant_id,
                  aas.student_id::text as student_id,
                  aas.booking_intent_id::text as booking_intent_id,
                  aas.booking_reference,
                  aas.template_version,
                  aas.program_code,
                  aas.source,
                  aas.answers_json,
                  aas.result_json,
                  aas.created_at::text as created_at
                from academy_assessment_snapshots aas
                inner join academy_students s
                  on s.id = aas.student_id
                where s.student_ref = :student_ref
                order by aas.created_at desc, aas.id desc
                limit 1
                """
            ),
            {"student_ref": str(student_ref or "").strip()},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def insert_subscription_intent(
        self,
        *,
        tenant_id: str,
        student_id: str | None = None,
        booking_intent_id: str | None = None,
        booking_reference: str | None = None,
        plan_code: str,
        plan_label: str | None = None,
        billing_interval: str = "month",
        amount_aud: float | int | None = None,
        status: str = "pending_checkout",
        checkout_url: str | None = None,
        intent_payload_json: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                insert into academy_subscription_intents (
                  tenant_id,
                  student_id,
                  booking_intent_id,
                  booking_reference,
                  plan_code,
                  plan_label,
                  billing_interval,
                  amount_aud,
                  status,
                  checkout_url,
                  intent_payload_json
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:student_id as uuid),
                  cast(:booking_intent_id as uuid),
                  :booking_reference,
                  :plan_code,
                  :plan_label,
                  :billing_interval,
                  :amount_aud,
                  :status,
                  :checkout_url,
                  cast(:intent_payload_json as jsonb)
                )
                returning
                  id::text as subscription_intent_id,
                  tenant_id::text as tenant_id,
                  student_id::text as student_id,
                  booking_intent_id::text as booking_intent_id,
                  booking_reference,
                  plan_code,
                  plan_label,
                  billing_interval,
                  amount_aud,
                  status,
                  checkout_url,
                  intent_payload_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "student_id": (student_id or "").strip() or None,
                "booking_intent_id": (booking_intent_id or "").strip() or None,
                "booking_reference": booking_reference,
                "plan_code": plan_code,
                "plan_label": plan_label,
                "billing_interval": billing_interval,
                "amount_aud": amount_aud,
                "status": status,
                "checkout_url": checkout_url,
                "intent_payload_json": json.dumps(intent_payload_json or {}),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_latest_subscription_intent(
        self,
        *,
        student_ref: str | None = None,
        booking_reference: str | None = None,
    ) -> dict[str, Any] | None:
        if student_ref:
            result = await self.session.execute(
                text(
                    """
                    select
                      asi.id::text as subscription_intent_id,
                      asi.tenant_id::text as tenant_id,
                      asi.student_id::text as student_id,
                      s.student_ref,
                      asi.booking_intent_id::text as booking_intent_id,
                      asi.booking_reference,
                      asi.plan_code,
                      asi.plan_label,
                      asi.billing_interval,
                      asi.amount_aud,
                      asi.status,
                      asi.checkout_url,
                      asi.intent_payload_json,
                      asi.created_at::text as created_at,
                      asi.updated_at::text as updated_at
                    from academy_subscription_intents asi
                    left join academy_students s
                      on s.id = asi.student_id
                    where s.student_ref = :student_ref
                    order by asi.created_at desc, asi.id desc
                    limit 1
                    """
                ),
                {"student_ref": str(student_ref or "").strip()},
            )
        else:
            result = await self.session.execute(
                text(
                    """
                    select
                      asi.id::text as subscription_intent_id,
                      asi.tenant_id::text as tenant_id,
                      asi.student_id::text as student_id,
                      s.student_ref,
                      asi.booking_intent_id::text as booking_intent_id,
                      asi.booking_reference,
                      asi.plan_code,
                      asi.plan_label,
                      asi.billing_interval,
                      asi.amount_aud,
                      asi.status,
                      asi.checkout_url,
                      asi.intent_payload_json,
                      asi.created_at::text as created_at,
                      asi.updated_at::text as updated_at
                    from academy_subscription_intents asi
                    left join academy_students s
                      on s.id = asi.student_id
                    where asi.booking_reference = :booking_reference
                    order by asi.created_at desc, asi.id desc
                    limit 1
                    """
                ),
                {"booking_reference": str(booking_reference or "").strip()},
            )
        row = result.mappings().first()
        return dict(row) if row else None

    async def insert_agent_action_run(
        self,
        *,
        tenant_id: str | None,
        agent_type: str,
        action_type: str,
        entity_type: str,
        entity_id: str | None = None,
        booking_reference: str | None = None,
        student_ref: str | None = None,
        status: str = "queued",
        priority: str = "normal",
        reason: str | None = None,
        input_json: dict[str, Any] | None = None,
        result_json: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                insert into agent_action_runs (
                  tenant_id,
                  agent_type,
                  action_type,
                  entity_type,
                  entity_id,
                  booking_reference,
                  student_ref,
                  status,
                  priority,
                  reason,
                  input_json,
                  result_json
                )
                values (
                  cast(:tenant_id as uuid),
                  :agent_type,
                  :action_type,
                  :entity_type,
                  :entity_id,
                  :booking_reference,
                  :student_ref,
                  :status,
                  :priority,
                  :reason,
                  cast(:input_json as jsonb),
                  cast(:result_json as jsonb)
                )
                returning
                  id::text as action_run_id,
                  tenant_id::text as tenant_id,
                  agent_type,
                  action_type,
                  entity_type,
                  entity_id,
                  booking_reference,
                  student_ref,
                  status,
                  priority,
                  reason,
                  input_json,
                  result_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                """
            ),
            {
                "tenant_id": (tenant_id or "").strip() or None,
                "agent_type": agent_type,
                "action_type": action_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "booking_reference": booking_reference,
                "student_ref": student_ref,
                "status": status,
                "priority": priority,
                "reason": reason,
                "input_json": json.dumps(input_json or {}),
                "result_json": json.dumps(result_json or {}),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def list_agent_action_runs(
        self,
        *,
        tenant_id: str | None = None,
        student_ref: str | None = None,
        booking_reference: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        agent_type: str | None = None,
        status: str | None = None,
        action_type: str | None = None,
        dependency_state: str | None = None,
        lifecycle_event: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        clauses = ["true"]
        params: dict[str, Any] = {"limit": max(limit, 1)}
        effective_tenant_id = tenant_id or self.tenant_id
        if effective_tenant_id:
            clauses.append("tenant_id = cast(:tenant_id as uuid)")
            params["tenant_id"] = str(effective_tenant_id).strip()
        if student_ref:
            clauses.append("student_ref = :student_ref")
            params["student_ref"] = str(student_ref or "").strip()
        if booking_reference:
            clauses.append("booking_reference = :booking_reference")
            params["booking_reference"] = str(booking_reference or "").strip()
        if entity_type:
            clauses.append("entity_type = :entity_type")
            params["entity_type"] = str(entity_type or "").strip()
        if entity_id:
            clauses.append("entity_id = :entity_id")
            params["entity_id"] = str(entity_id or "").strip()
        if agent_type:
            clauses.append("agent_type = :agent_type")
            params["agent_type"] = str(agent_type or "").strip()
        if status:
            clauses.append("status = :status")
            params["status"] = str(status or "").strip()
        if action_type:
            clauses.append("action_type = :action_type")
            params["action_type"] = str(action_type or "").strip()
        if dependency_state:
            clauses.append(
                """
                coalesce(
                  input_json->>'dependency_state',
                  input_json->'lifecycle'->>'dependency_state',
                  input_json->'lifecycle'->>'payment_state',
                  result_json->>'dependency_state',
                  result_json->'execution'->>'dependency_state'
                ) = :dependency_state
                """
            )
            params["dependency_state"] = str(dependency_state or "").strip()
        if lifecycle_event:
            clauses.append(
                """
                coalesce(
                  input_json->>'lifecycle_event',
                  input_json->'context'->>'lifecycle_event',
                  input_json->'context'->>'agent_handoff',
                  input_json->'lifecycle'->>'event_type',
                  input_json->'lifecycle'->>'status',
                  result_json->'execution'->>'lifecycle_event',
                  entity_type
                ) = :lifecycle_event
                """
            )
            params["lifecycle_event"] = str(lifecycle_event or "").strip()

        result = await self.session.execute(
            text(
                f"""
                select
                  id::text as action_run_id,
                  tenant_id::text as tenant_id,
                  agent_type,
                  action_type,
                  entity_type,
                  entity_id,
                  booking_reference,
                  student_ref,
                  status,
                  priority,
                  reason,
                  input_json,
                  result_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                from agent_action_runs
                where {" and ".join(clauses)}
                order by created_at desc, id desc
                limit :limit
                """
            ),
            params,
        )
        return [dict(row) for row in result.mappings().all()]

    async def summarize_agent_action_runs(
        self,
        *,
        tenant_id: str | None = None,
        student_ref: str | None = None,
        booking_reference: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        agent_type: str | None = None,
        action_type: str | None = None,
        dependency_state: str | None = None,
        lifecycle_event: str | None = None,
    ) -> dict[str, Any]:
        clauses = ["true"]
        params: dict[str, Any] = {}
        effective_tenant_id = tenant_id or self.tenant_id
        if effective_tenant_id:
            clauses.append("tenant_id = cast(:tenant_id as uuid)")
            params["tenant_id"] = str(effective_tenant_id).strip()
        if student_ref:
            clauses.append("student_ref = :student_ref")
            params["student_ref"] = str(student_ref or "").strip()
        if booking_reference:
            clauses.append("booking_reference = :booking_reference")
            params["booking_reference"] = str(booking_reference or "").strip()
        if entity_type:
            clauses.append("entity_type = :entity_type")
            params["entity_type"] = str(entity_type or "").strip()
        if entity_id:
            clauses.append("entity_id = :entity_id")
            params["entity_id"] = str(entity_id or "").strip()
        if agent_type:
            clauses.append("agent_type = :agent_type")
            params["agent_type"] = str(agent_type or "").strip()
        if action_type:
            clauses.append("action_type = :action_type")
            params["action_type"] = str(action_type or "").strip()
        if dependency_state:
            clauses.append(
                """
                coalesce(
                  input_json->>'dependency_state',
                  input_json->'lifecycle'->>'dependency_state',
                  input_json->'lifecycle'->>'payment_state',
                  result_json->>'dependency_state',
                  result_json->'execution'->>'dependency_state'
                ) = :dependency_state
                """
            )
            params["dependency_state"] = str(dependency_state or "").strip()
        if lifecycle_event:
            clauses.append(
                """
                coalesce(
                  input_json->>'lifecycle_event',
                  input_json->'context'->>'lifecycle_event',
                  input_json->'context'->>'agent_handoff',
                  input_json->'lifecycle'->>'event_type',
                  input_json->'lifecycle'->>'status',
                  result_json->'execution'->>'lifecycle_event',
                  entity_type
                ) = :lifecycle_event
                """
            )
            params["lifecycle_event"] = str(lifecycle_event or "").strip()

        result = await self.session.execute(
            text(
                f"""
                select
                  count(*)::int as total,
                  count(*) filter (where status = 'queued')::int as queued,
                  count(*) filter (where status = 'in_progress')::int as in_progress,
                  count(*) filter (where status = 'sent')::int as sent,
                  count(*) filter (where status = 'completed')::int as completed,
                  count(*) filter (where status = 'manual_review')::int as manual_review,
                  count(*) filter (where status = 'failed')::int as failed,
                  count(*) filter (where status in ('queued', 'manual_review', 'failed'))::int as needs_attention
                from agent_action_runs
                where {" and ".join(clauses)}
                """
            ),
            params,
        )
        row = result.mappings().first()
        return dict(row) if row else {
            "total": 0,
            "queued": 0,
            "in_progress": 0,
            "sent": 0,
            "completed": 0,
            "manual_review": 0,
            "failed": 0,
            "needs_attention": 0,
        }

    async def get_agent_action_run(
        self,
        *,
        action_run_id: str,
        tenant_id: str | None = None,
    ) -> dict[str, Any] | None:
        effective_tenant_id = tenant_id or self.tenant_id
        tenant_clause = ""
        params: dict[str, Any] = {"action_run_id": str(action_run_id or "").strip()}
        if effective_tenant_id:
            tenant_clause = "and tenant_id = cast(:tenant_id as uuid)"
            params["tenant_id"] = str(effective_tenant_id).strip()

        result = await self.session.execute(
            text(
                f"""
                select
                  id::text as action_run_id,
                  tenant_id::text as tenant_id,
                  agent_type,
                  action_type,
                  entity_type,
                  entity_id,
                  booking_reference,
                  student_ref,
                  status,
                  priority,
                  reason,
                  input_json,
                  result_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                from agent_action_runs
                where id = cast(:action_run_id as uuid)
                  {tenant_clause}
                limit 1
                """
            ),
            params,
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def update_agent_action_run_status(
        self,
        *,
        action_run_id: str,
        tenant_id: str | None,
        status: str,
        result_json: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        effective_tenant_id = tenant_id or self.tenant_id
        tenant_clause = ""
        params: dict[str, Any] = {
            "action_run_id": str(action_run_id or "").strip(),
            "status": status,
            "result_json": json.dumps(result_json or {}),
        }
        if effective_tenant_id:
            tenant_clause = "and tenant_id = cast(:tenant_id as uuid)"
            params["tenant_id"] = str(effective_tenant_id).strip()

        result = await self.session.execute(
            text(
                f"""
                update agent_action_runs
                set
                  status = :status,
                  result_json = coalesce(result_json, '{{}}'::jsonb) || cast(:result_json as jsonb),
                  updated_at = now()
                where id = cast(:action_run_id as uuid)
                  {tenant_clause}
                returning
                  id::text as action_run_id,
                  tenant_id::text as tenant_id,
                  agent_type,
                  action_type,
                  entity_type,
                  entity_id,
                  booking_reference,
                  student_ref,
                  status,
                  priority,
                  reason,
                  input_json,
                  result_json,
                  created_at::text as created_at,
                  updated_at::text as updated_at
                """
            ),
            params,
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_latest_enrollment(self, *, student_ref: str) -> dict[str, Any] | None:
        result = await self.session.execute(
            text(
                """
                select
                  aes.id,
                  aes.tenant_id::text as tenant_id,
                  aes.student_id::text as student_id,
                  aes.booking_intent_id::text as booking_intent_id,
                  aes.booking_reference,
                  aes.service_id,
                  aes.service_name,
                  aes.class_code,
                  aes.class_label,
                  aes.plan_code,
                  aes.plan_label,
                  aes.status,
                  aes.snapshot_json,
                  aes.created_at::text as created_at
                from academy_enrollment_snapshots aes
                inner join academy_students s
                  on s.id = aes.student_id
                where s.student_ref = :student_ref
                order by aes.created_at desc, aes.id desc
                limit 1
                """
            ),
            {"student_ref": str(student_ref or "").strip()},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_latest_report_preview(
        self,
        *,
        student_ref: str | None = None,
        booking_reference: str | None = None,
    ) -> dict[str, Any] | None:
        if student_ref:
            result = await self.session.execute(
                text(
                    """
                    select
                      ars.id,
                      ars.tenant_id::text as tenant_id,
                      ars.student_id::text as student_id,
                      s.student_ref,
                      ars.booking_intent_id::text as booking_intent_id,
                      ars.booking_reference,
                      ars.report_kind,
                      ars.report_json,
                      ars.created_at::text as created_at
                    from academy_report_snapshots ars
                    inner join academy_students s
                      on s.id = ars.student_id
                    where s.student_ref = :student_ref
                    order by ars.created_at desc, ars.id desc
                    limit 1
                    """
                ),
                {"student_ref": str(student_ref or "").strip()},
            )
        else:
            result = await self.session.execute(
                text(
                    """
                    select
                      ars.id,
                      ars.tenant_id::text as tenant_id,
                      ars.student_id::text as student_id,
                      s.student_ref,
                      ars.booking_intent_id::text as booking_intent_id,
                      ars.booking_reference,
                      ars.report_kind,
                      ars.report_json,
                      ars.created_at::text as created_at
                    from academy_report_snapshots ars
                    inner join academy_students s
                      on s.id = ars.student_id
                    where ars.booking_reference = :booking_reference
                    order by ars.created_at desc, ars.id desc
                    limit 1
                    """
                ),
                {"booking_reference": str(booking_reference or "").strip()},
            )
        row = result.mappings().first()
        return dict(row) if row else None

    async def list_recent_portal_requests(
        self,
        *,
        student_ref: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        result = await self.session.execute(
            text(
                """
                select
                  aprs.id,
                  aprs.tenant_id::text as tenant_id,
                  aprs.student_id::text as student_id,
                  s.student_ref,
                  aprs.booking_intent_id::text as booking_intent_id,
                  aprs.booking_reference,
                  aprs.request_type,
                  aprs.reason_code,
                  aprs.status,
                  aprs.request_payload_json,
                  aprs.created_at::text as created_at
                from academy_portal_request_snapshots aprs
                inner join academy_students s
                  on s.id = aprs.student_id
                where s.student_ref = :student_ref
                order by aprs.created_at desc, aprs.id desc
                limit :limit
                """
            ),
            {
                "student_ref": str(student_ref or "").strip(),
                "limit": max(limit, 1),
            },
        )
        return [dict(row) for row in result.mappings().all()]
