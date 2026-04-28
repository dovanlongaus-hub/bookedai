"""CORS / TrustedHost hardening regression tests (P1-S3, 2026-04-28).

These guard the production CORS posture set up in `backend/app.py`:

* localhost is NOT in the production default `CORS_ALLOW_ORIGINS`
* `Access-Control-Allow-Methods` is a fixed list (never `*`)
* `Access-Control-Allow-Headers` is a fixed list (never `*`)
* Mismatched origins do not get an `Access-Control-Allow-Origin` echo
* Preflight `OPTIONS` succeeds for trusted origins
* `*` + `allow_credentials=True` is rejected at startup
"""

from __future__ import annotations

import importlib
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@asynccontextmanager
async def _noop_lifespan(_: object):
    yield


_PRISTINE_MODULES = {
    name: sys.modules.get(name)
    for name in ("app", "config", "api.route_handlers")
}


@pytest.fixture(autouse=True)
def _restore_modules_after_cors_reload():
    """Restore the ORIGINAL module objects after each cors test.

    `_reload_app` rips ``app`` / ``config`` / ``api.route_handlers`` out of
    ``sys.modules`` and re-imports them with cors-test env. Other test files
    captured the ORIGINAL ``api`` router (the FastAPI APIRouter object) at
    their own import time; after the reload, those captured references are
    "orphaned" — they reference the module-level ``get_session`` from the
    PRE-reload module graph, while ``patch("api.route_handlers.get_session",
    ...)`` would patch the POST-reload module. The patch goes to the new
    module, but the routes still execute via the old module's ``get_session``
    that was never patched, hence ``session_factory = object()`` runs as-is
    and errors with ``'object' object is not callable``.

    Restore the PRISTINE module objects (captured at conftest collection
    time) so subsequent test files see the same module instances they
    imported from at suite startup.
    """

    yield
    for name, original_module in _PRISTINE_MODULES.items():
        if original_module is not None:
            sys.modules[name] = original_module


def _reload_app(monkeypatch: pytest.MonkeyPatch, **env: str):
    """Reload the FastAPI app with a fresh environment.

    `backend.app` builds the middleware stack at import time using the
    cached `settings` snapshot, so we have to clear the relevant modules
    from `sys.modules` and re-import after setting env vars.
    """
    for var in ("BOOKEDAI_ENVIRONMENT", "ENVIRONMENT", "CORS_ALLOW_ORIGINS"):
        monkeypatch.delenv(var, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    for mod in [
        "app",
        "config",
        "api.route_handlers",
    ]:
        sys.modules.pop(mod, None)

    config_module = importlib.import_module("config")
    importlib.reload(config_module)
    route_handlers_module = importlib.import_module("api.route_handlers")
    importlib.reload(route_handlers_module)
    app_module = importlib.import_module("app")
    importlib.reload(app_module)

    fastapi_app = app_module.app
    fastapi_app.router.lifespan_context = _noop_lifespan
    fastapi_app.state.session_factory = object()
    return app_module, fastapi_app


def _client(fastapi_app):
    # Use a Host header that is in the trusted_hosts derived from CORS_ALLOW_ORIGINS
    # (the project .env may not include api.bookedai.au so we anchor on the apex domain).
    return TestClient(fastapi_app, base_url="http://bookedai.au")


# ---------------------------------------------------------------------------
# Default-origin tests
# ---------------------------------------------------------------------------


def test_production_default_origins_exclude_localhost(monkeypatch):
    from config import default_cors_allow_origins

    default = default_cors_allow_origins("production")
    assert "localhost" not in default
    assert "127.0.0.1" not in default
    assert "https://bookedai.au" in default
    assert "https://api.bookedai.au" in default
    assert "https://aimentor.bookedai.au" in default


def test_staging_default_includes_staging_subdomains(monkeypatch):
    from config import default_cors_allow_origins

    default = default_cors_allow_origins("staging")
    assert "https://staging.bookedai.au" in default
    assert "localhost" not in default


def test_development_default_includes_localhost(monkeypatch):
    from config import default_cors_allow_origins

    default = default_cors_allow_origins("development")
    assert "http://localhost:5173" in default
    assert "http://localhost:3000" in default
    assert "https://bookedai.au" in default


# ---------------------------------------------------------------------------
# Middleware behavior tests
# ---------------------------------------------------------------------------


PREFLIGHT_PATH = "/api/health"


def test_production_localhost_origin_is_rejected(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert "access-control-allow-origin" not in {
        key.lower() for key in response.headers.keys()
    }


def test_production_canonical_origin_is_allowed(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "https://bookedai.au",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://bookedai.au"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_allow_methods_response_is_explicit_list(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "https://bookedai.au",
                "Access-Control-Request-Method": "POST",
            },
        )

    methods_header = response.headers.get("access-control-allow-methods", "")
    assert "*" not in methods_header
    for verb in ("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"):
        assert verb in methods_header


def test_allow_headers_response_is_explicit_list(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "https://bookedai.au",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization,X-Portal-Token,Idempotency-Key",
            },
        )

    headers_header = (response.headers.get("access-control-allow-headers") or "").lower()
    assert "*" not in headers_header
    assert "authorization" in headers_header
    assert "x-portal-token" in headers_header
    assert "idempotency-key" in headers_header


def test_preflight_returns_max_age(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "https://bookedai.au",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers.get("access-control-max-age") == "600"


def test_mismatched_evil_origin_has_no_acao_header(monkeypatch):
    _, fastapi_app = _reload_app(monkeypatch, BOOKEDAI_ENVIRONMENT="production")

    with _client(fastapi_app) as client:
        response = client.options(
            PREFLIGHT_PATH,
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert "access-control-allow-origin" not in {
        key.lower() for key in response.headers.keys()
    }


def test_wildcard_origin_with_credentials_is_fatal(monkeypatch):
    with pytest.raises(RuntimeError) as excinfo:
        _reload_app(
            monkeypatch,
            BOOKEDAI_ENVIRONMENT="production",
            CORS_ALLOW_ORIGINS="*",
        )

    assert "CORS misconfiguration" in str(excinfo.value)
