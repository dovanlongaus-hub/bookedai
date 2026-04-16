from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from repositories.base import RepositoryContext
from repositories.feature_flag_repository import FeatureFlagRepository


class FeatureFlagRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_get_flag_uses_tenant_slug_or_uuid_resolution(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                scalar_one_or_none=lambda: True,
            )
        )
        repository = FeatureFlagRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        enabled = await repository.get_flag("semantic_matching_model_assist_v1")

        self.assertTrue(enabled)
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["tenant_ref"], "default-production-tenant")

    async def test_upsert_flag_accepts_tenant_slug_reference(self):
        execute = AsyncMock(return_value=None)
        repository = FeatureFlagRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        await repository.upsert_flag("semantic_matching_model_assist_v1", enabled=True)

        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["tenant_ref"], "default-production-tenant")
        self.assertTrue(params["enabled"])
