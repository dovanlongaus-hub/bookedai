from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import json
from uuid import uuid4

from sqlalchemy import text

from repositories.base import BaseRepository


@dataclass
class TenantSeedRecord:
    slug: str
    name: str
    timezone: str = "Australia/Sydney"
    locale: str = "en-AU"
    status: str = "active"


class TenantRepository(BaseRepository):
    """Repository seam for tenant anchor records and tenant settings."""

    @staticmethod
    def _tenant_filter_sql() -> str:
        return "id::text = :tenant_ref or slug = :tenant_ref"

    async def get_default_tenant_id(self) -> str | None:
        result = await self.session.execute(
            text(
                """
                select id::text
                from tenants
                where slug = 'default-production-tenant'
                limit 1
                """
            )
        )
        return result.scalar_one_or_none()

    async def resolve_tenant_id(self, tenant_ref: str | None) -> str | None:
        if not tenant_ref:
            return await self.get_default_tenant_id()

        result = await self.session.execute(
            text(
                f"""
                select id::text
                from tenants
                where {self._tenant_filter_sql()}
                limit 1
                """
            ),
            {"tenant_ref": tenant_ref},
        )
        return result.scalar_one_or_none()

    async def get_tenant_profile(self, tenant_ref: str | None) -> dict[str, str | None] | None:
        effective_tenant_id = await self.resolve_tenant_id(tenant_ref)
        if not effective_tenant_id:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  slug,
                  name,
                  status,
                  timezone,
                  locale,
                  industry
                from tenants
                where id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": effective_tenant_id},
        )
        row = result.mappings().first()
        if not row:
            return None

        return {
            "id": row["id"],
            "slug": row["slug"],
            "name": row["name"],
            "status": row["status"],
            "timezone": row["timezone"],
            "locale": row["locale"],
            "industry": row["industry"],
        }

    async def get_tenant_settings(self, tenant_ref: str | None) -> dict[str, object]:
        effective_tenant_id = await self.resolve_tenant_id(tenant_ref)
        if not effective_tenant_id:
            return {}

        result = await self.session.execute(
            text(
                """
                select settings_json
                from tenant_settings
                where tenant_id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": effective_tenant_id},
        )
        row = result.mappings().first()
        if not row:
            return {}

        settings = row.get("settings_json")
        return dict(settings) if isinstance(settings, dict) else {}

    async def create_tenant(
        self,
        *,
        slug: str,
        name: str,
        timezone: str = "Australia/Sydney",
        locale: str = "en-AU",
        industry: str | None = None,
    ) -> dict[str, str | None]:
        result = await self.session.execute(
            text(
                """
                insert into tenants (slug, name, status, timezone, locale, industry)
                values (:slug, :name, 'active', :timezone, :locale, :industry)
                on conflict (slug) do update
                set
                  name = excluded.name,
                  timezone = excluded.timezone,
                  locale = excluded.locale,
                  industry = excluded.industry,
                  updated_at = now()
                returning
                  id::text as id,
                  slug,
                  name,
                  status,
                  timezone,
                  locale,
                  industry
                """
            ),
            {
                "slug": slug,
                "name": name,
                "timezone": timezone,
                "locale": locale,
                "industry": industry,
            },
        )
        row = result.mappings().first()
        return {
            "id": row["id"],
            "slug": row["slug"],
            "name": row["name"],
            "status": row["status"],
            "timezone": row["timezone"],
            "locale": row["locale"],
            "industry": row["industry"],
        }

    async def count_active_memberships(self, tenant_id: str) -> int:
        result = await self.session.execute(
            text(
                """
                select count(*)
                from tenant_user_memberships
                where tenant_id = :tenant_id
                  and status = 'active'
                """
            ),
            {"tenant_id": tenant_id},
        )
        return int(result.scalar_one_or_none() or 0)

    async def update_tenant_profile(
        self,
        *,
        tenant_id: str,
        name: str | None = None,
        timezone: str | None = None,
        locale: str | None = None,
        industry: str | None = None,
    ) -> dict[str, str | None] | None:
        result = await self.session.execute(
            text(
                """
                update tenants
                set
                  name = coalesce(nullif(:name, ''), name),
                  timezone = coalesce(nullif(:timezone, ''), timezone),
                  locale = coalesce(nullif(:locale, ''), locale),
                  industry = case
                    when :industry is null then industry
                    else nullif(:industry, '')
                  end,
                  updated_at = now()
                where id = cast(:tenant_id as uuid)
                returning
                  id::text as id,
                  slug,
                  name,
                  status,
                  timezone,
                  locale,
                  industry
                """
            ),
            {
                "tenant_id": tenant_id,
                "name": name,
                "timezone": timezone,
                "locale": locale,
                "industry": industry,
            },
        )
        row = result.mappings().first()
        if not row:
            return None

        return {
            "id": row["id"],
            "slug": row["slug"],
            "name": row["name"],
            "status": row["status"],
            "timezone": row["timezone"],
            "locale": row["locale"],
            "industry": row["industry"],
        }

    async def upsert_tenant_settings(
        self,
        *,
        tenant_id: str,
        settings_json: dict[str, object],
    ) -> dict[str, object]:
        result = await self.session.execute(
            text(
                """
                insert into tenant_settings (tenant_id, settings_json)
                values (cast(:tenant_id as uuid), cast(:settings_json as jsonb))
                on conflict (tenant_id) do update
                set
                  settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb) || cast(:settings_json as jsonb),
                  version = tenant_settings.version + 1,
                  updated_at = now()
                returning
                  settings_json,
                  version,
                  updated_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "settings_json": json.dumps(settings_json),
            },
        )
        row = result.mappings().first() or {}
        settings = row.get("settings_json")
        return {
            "settings_json": dict(settings) if isinstance(settings, dict) else {},
            "version": int(row.get("version") or 1),
            "updated_at": row.get("updated_at"),
        }

    async def list_tenant_members(self, tenant_id: str) -> list[dict[str, str | None]]:
        result = await self.session.execute(
            text(
                """
                select
                  tenant_id,
                  tenant_slug,
                  email,
                  full_name,
                  auth_provider,
                  provider_subject,
                  role,
                  status,
                  created_at,
                  updated_at
                from tenant_user_memberships
                where tenant_id = :tenant_id
                order by
                  case role
                    when 'tenant_admin' then 0
                    when 'finance_manager' then 1
                    else 2
                  end,
                  created_at asc,
                  email asc
                """
            ),
            {"tenant_id": tenant_id},
        )
        return [dict(row) for row in result.mappings().all()]

    async def upsert_tenant_member(
        self,
        *,
        tenant_id: str,
        tenant_slug: str,
        email: str,
        full_name: str | None = None,
        role: str = "operator",
        status: str = "invited",
        auth_provider: str = "password",
    ) -> dict[str, str | None]:
        normalized_email = email.strip().lower()
        existing_result = await self.session.execute(
            text(
                """
                select 1
                from tenant_user_memberships
                where tenant_id = :tenant_id
                  and email = :email
                limit 1
                """
            ),
            {
                "tenant_id": tenant_id,
                "email": normalized_email,
            },
        )
        exists = bool(existing_result.scalar_one_or_none())
        if exists:
            result = await self.session.execute(
                text(
                    """
                    update tenant_user_memberships
                    set
                      tenant_slug = :tenant_slug,
                      full_name = coalesce(nullif(:full_name, ''), full_name),
                      auth_provider = coalesce(nullif(:auth_provider, ''), auth_provider),
                      role = :role,
                      status = :status,
                      updated_at = now()
                    where tenant_id = :tenant_id
                      and email = :email
                    returning
                      tenant_id,
                      tenant_slug,
                      email,
                      full_name,
                      auth_provider,
                      provider_subject,
                      role,
                      status,
                      created_at,
                      updated_at
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "tenant_slug": tenant_slug,
                    "email": normalized_email,
                    "full_name": full_name,
                    "auth_provider": auth_provider,
                    "role": role,
                    "status": status,
                },
            )
        else:
            result = await self.session.execute(
                text(
                    """
                    insert into tenant_user_memberships (
                      tenant_id,
                      tenant_slug,
                      email,
                      full_name,
                      auth_provider,
                      role,
                      status
                    )
                    values (
                      :tenant_id,
                      :tenant_slug,
                      :email,
                      nullif(:full_name, ''),
                      :auth_provider,
                      :role,
                      :status
                    )
                    returning
                      tenant_id,
                      tenant_slug,
                      email,
                      full_name,
                      auth_provider,
                      provider_subject,
                      role,
                      status,
                      created_at,
                      updated_at
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "tenant_slug": tenant_slug,
                    "email": normalized_email,
                    "full_name": full_name,
                    "auth_provider": auth_provider,
                    "role": role,
                    "status": status,
                },
            )
        row = result.mappings().first()
        return dict(row) if row else {}

    async def update_tenant_member_access(
        self,
        *,
        tenant_id: str,
        email: str,
        role: str | None = None,
        status: str | None = None,
    ) -> dict[str, str | None] | None:
        normalized_email = email.strip().lower()
        result = await self.session.execute(
            text(
                """
                update tenant_user_memberships
                set
                  role = coalesce(nullif(:role, ''), role),
                  status = coalesce(nullif(:status, ''), status),
                  updated_at = now()
                where tenant_id = :tenant_id
                  and email = :email
                returning
                  tenant_id,
                  tenant_slug,
                  email,
                  full_name,
                  auth_provider,
                  provider_subject,
                  role,
                  status,
                  created_at,
                  updated_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "email": normalized_email,
                "role": role,
                "status": status,
            },
        )
        row = result.mappings().first()
        if not row:
            return None

        if role:
            await self.session.execute(
                text(
                    """
                    update tenant_user_credentials
                    set
                      role = :role,
                      updated_at = now()
                    where tenant_id = :tenant_id
                      and email = :email
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "email": normalized_email,
                    "role": role,
                },
            )

        return dict(row)

    async def upsert_billing_account(
        self,
        *,
        tenant_id: str,
        billing_email: str | None = None,
        merchant_mode: str | None = None,
    ) -> dict[str, str | None]:
        result = await self.session.execute(
            text(
                """
                insert into billing_accounts (tenant_id, billing_email, merchant_mode)
                values (
                  cast(:tenant_id as uuid),
                  nullif(:billing_email, ''),
                  coalesce(nullif(:merchant_mode, ''), 'test')
                )
                on conflict (tenant_id) do update
                set
                  billing_email = coalesce(nullif(:billing_email, ''), billing_accounts.billing_email),
                  merchant_mode = coalesce(nullif(:merchant_mode, ''), billing_accounts.merchant_mode, 'test'),
                  updated_at = now()
                returning
                  id::text as id,
                  tenant_id::text as tenant_id,
                  billing_email,
                  merchant_mode,
                  created_at,
                  updated_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "billing_email": billing_email,
                "merchant_mode": merchant_mode,
            },
        )
        row = result.mappings().first()
        return {
            "id": row["id"],
            "tenant_id": row["tenant_id"],
            "billing_email": row["billing_email"],
            "merchant_mode": row["merchant_mode"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    async def upsert_subscription(
        self,
        *,
        tenant_id: str,
        billing_account_id: str | None,
        plan_code: str,
        status: str,
        started_at: datetime,
        ended_at: datetime | None = None,
    ) -> dict[str, str | None]:
        latest_result = await self.session.execute(
            text(
                """
                select id::text as id
                from subscriptions
                where tenant_id = cast(:tenant_id as uuid)
                order by updated_at desc nulls last, created_at desc nulls last
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        )
        latest_row = latest_result.mappings().first()

        if latest_row and latest_row.get("id"):
            result = await self.session.execute(
                text(
                    """
                    update subscriptions
                    set
                      billing_account_id = cast(:billing_account_id as uuid),
                      status = :status,
                      plan_code = :plan_code,
                      started_at = :started_at,
                      ended_at = :ended_at,
                      updated_at = now()
                    where id = cast(:subscription_id as uuid)
                    returning
                      id::text as id,
                      tenant_id::text as tenant_id,
                      billing_account_id::text as billing_account_id,
                      status,
                      plan_code,
                      started_at,
                      ended_at,
                      created_at,
                      updated_at
                    """
                ),
                {
                    "subscription_id": latest_row["id"],
                    "billing_account_id": billing_account_id,
                    "status": status,
                    "plan_code": plan_code,
                    "started_at": started_at,
                    "ended_at": ended_at,
                },
            )
        else:
            result = await self.session.execute(
                text(
                    """
                    insert into subscriptions (
                      id,
                      tenant_id,
                      billing_account_id,
                      status,
                      plan_code,
                      started_at,
                      ended_at
                    )
                    values (
                      cast(:subscription_id as uuid),
                      cast(:tenant_id as uuid),
                      cast(:billing_account_id as uuid),
                      :status,
                      :plan_code,
                      :started_at,
                      :ended_at
                    )
                    returning
                      id::text as id,
                      tenant_id::text as tenant_id,
                      billing_account_id::text as billing_account_id,
                      status,
                      plan_code,
                      started_at,
                      ended_at,
                      created_at,
                      updated_at
                    """
                ),
                {
                    "subscription_id": str(uuid4()),
                    "tenant_id": tenant_id,
                    "billing_account_id": billing_account_id,
                    "status": status,
                    "plan_code": plan_code,
                    "started_at": started_at,
                    "ended_at": ended_at,
                },
            )

        row = result.mappings().first()
        return {
            "id": row["id"],
            "tenant_id": row["tenant_id"],
            "billing_account_id": row["billing_account_id"],
            "status": row["status"],
            "plan_code": row["plan_code"],
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    async def replace_subscription_period(
        self,
        *,
        subscription_id: str,
        period_days: int = 30,
        status: str = "open",
    ) -> dict[str, str | None]:
        period_start = datetime.now(timezone.utc)
        period_end = period_start + timedelta(days=period_days)

        await self.session.execute(
            text(
                """
                delete from subscription_periods
                where subscription_id = cast(:subscription_id as uuid)
                """
            ),
            {"subscription_id": subscription_id},
        )
        result = await self.session.execute(
            text(
                """
                insert into subscription_periods (
                  id,
                  subscription_id,
                  period_start,
                  period_end,
                  status
                )
                values (
                  cast(:period_id as uuid),
                  cast(:subscription_id as uuid),
                  :period_start,
                  :period_end,
                  :status
                )
                returning
                  id::text as id,
                  subscription_id::text as subscription_id,
                  period_start,
                  period_end,
                  status,
                  created_at
                """
            ),
            {
                "period_id": str(uuid4()),
                "subscription_id": subscription_id,
                "period_start": period_start,
                "period_end": period_end,
                "status": status,
            },
        )
        row = result.mappings().first()
        return {
            "id": row["id"],
            "subscription_id": row["subscription_id"],
            "period_start": row["period_start"],
            "period_end": row["period_end"],
            "status": row["status"],
            "created_at": row["created_at"],
        }

    async def update_subscription_period_status(
        self,
        *,
        period_id: str,
        status: str,
    ) -> dict[str, str | None] | None:
        result = await self.session.execute(
            text(
                """
                update subscription_periods
                set
                  status = :status
                where id = cast(:period_id as uuid)
                returning
                  id::text as id,
                  subscription_id::text as subscription_id,
                  period_start,
                  period_end,
                  status,
                  created_at
                """
            ),
            {
                "period_id": period_id,
                "status": status,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_subscription_period(
        self,
        *,
        period_id: str,
    ) -> dict[str, str | None] | None:
        result = await self.session.execute(
            text(
                """
                select
                  sp.id::text as id,
                  sp.subscription_id::text as subscription_id,
                  sp.period_start,
                  sp.period_end,
                  sp.status,
                  sp.created_at,
                  s.plan_code,
                  s.status as subscription_status,
                  t.id::text as tenant_id,
                  t.slug as tenant_slug,
                  t.name as tenant_name,
                  ba.billing_email,
                  ba.merchant_mode
                from subscription_periods sp
                join subscriptions s on s.id = sp.subscription_id
                join tenants t on t.id = s.tenant_id
                left join billing_accounts ba on ba.id = s.billing_account_id
                where sp.id = cast(:period_id as uuid)
                limit 1
                """
            ),
            {"period_id": period_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None
