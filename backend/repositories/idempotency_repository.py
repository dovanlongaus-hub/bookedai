from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class IdempotencyRepository(BaseRepository):
    """Repository seam for webhook and external-callback dedupe records."""

    async def get_record(
        self,
        *,
        scope: str,
        idempotency_key: str,
        tenant_id: str | None = None,
    ) -> dict[str, object | None] | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                select
                  id,
                  tenant_id::text as tenant_id,
                  scope,
                  idempotency_key,
                  request_hash,
                  response_json,
                  created_at
                from idempotency_keys
                where scope = :scope
                  and idempotency_key = :idempotency_key
                  and (
                    :tenant_ref is null
                    or tenant_id is null
                    or tenant_id = {self.tenant_lookup_sql()}
                  )
                limit 1
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "scope": scope.strip(),
                "idempotency_key": idempotency_key.strip(),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def reserve_key(
        self,
        *,
        scope: str,
        idempotency_key: str,
        request_hash: str | None = None,
        response_json: dict[str, object] | None = None,
        tenant_id: str | None = None,
    ) -> dict[str, object | None]:
        existing_record = await self.get_record(
            scope=scope,
            idempotency_key=idempotency_key,
            tenant_id=tenant_id,
        )
        if existing_record is not None:
            return {"created": False, "record": existing_record}

        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                insert into idempotency_keys (
                  tenant_id,
                  scope,
                  idempotency_key,
                  request_hash,
                  response_json
                )
                values (
                  {self.tenant_lookup_sql()},
                  :scope,
                  :idempotency_key,
                  :request_hash,
                  cast(:response_json as jsonb)
                )
                returning
                  id,
                  tenant_id::text as tenant_id,
                  scope,
                  idempotency_key,
                  request_hash,
                  response_json,
                  created_at
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "scope": scope.strip(),
                "idempotency_key": idempotency_key.strip(),
                "request_hash": (request_hash or "").strip() or None,
                "response_json": json.dumps(response_json) if response_json is not None else None,
            },
        )
        row = result.mappings().first()
        return {"created": True, "record": dict(row) if row else None}

    async def record_response(
        self,
        *,
        scope: str,
        idempotency_key: str,
        response_json: dict[str, object] | None,
    ) -> None:
        await self.session.execute(
            text(
                """
                update idempotency_keys
                set response_json = cast(:response_json as jsonb)
                where scope = :scope
                  and idempotency_key = :idempotency_key
                """
            ),
            {
                "scope": scope.strip(),
                "idempotency_key": idempotency_key.strip(),
                "response_json": json.dumps(response_json) if response_json is not None else None,
            },
        )
