from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class JobRunRepository(BaseRepository):
    """Repository seam for background job execution tracking."""

    async def create_job_run(
        self,
        *,
        job_name: str,
        status: str = "pending",
        detail: str | None = None,
        tenant_id: str | None = None,
    ) -> int | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                insert into job_runs (
                  tenant_id,
                  job_name,
                  status,
                  detail,
                  started_at
                )
                values (
                  {self.tenant_lookup_sql()},
                  :job_name,
                  :status,
                  :detail,
                  case when :status = 'running' then now() else null end
                )
                returning id
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "job_name": job_name.strip(),
                "status": status.strip() or "pending",
                "detail": (detail or "").strip() or None,
            },
        )
        return result.scalar_one_or_none()

    async def mark_running(self, job_run_id: int, *, detail: str | None = None) -> None:
        await self.session.execute(
            text(
                """
                update job_runs
                set
                  status = 'running',
                  attempt_count = attempt_count + 1,
                  detail = coalesce(:detail, detail),
                  started_at = coalesce(started_at, now())
                where id = :job_run_id
                """
            ),
            {
                "job_run_id": job_run_id,
                "detail": (detail or "").strip() or None,
            },
        )

    async def mark_finished(
        self,
        job_run_id: int,
        *,
        status: str,
        detail: str | None = None,
    ) -> None:
        await self.session.execute(
            text(
                """
                update job_runs
                set
                  status = :status,
                  detail = coalesce(:detail, detail),
                  finished_at = now()
                where id = :job_run_id
                """
            ),
            {
                "job_run_id": job_run_id,
                "status": status.strip(),
                "detail": (detail or "").strip() or None,
            },
        )

    async def list_recent_runs(
        self,
        *,
        tenant_id: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, object | None]]:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                select
                  id,
                  tenant_id::text as tenant_id,
                  job_name,
                  status,
                  attempt_count,
                  detail,
                  started_at,
                  finished_at,
                  created_at
                from job_runs
                where (
                  :tenant_ref is null
                  or tenant_id = {self.tenant_lookup_sql()}
                )
                order by coalesce(finished_at, started_at, created_at) desc, id desc
                limit :limit
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "limit": limit,
            },
        )
        return [dict(row) for row in result.mappings().all()]
