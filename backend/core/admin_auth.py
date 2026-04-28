"""Admin password hashing helpers.

Hash format (Django-compatible PBKDF2):
    pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>

This module is intentionally stdlib-only (uses ``hashlib.pbkdf2_hmac`` and
``hmac.compare_digest``) so it can be imported during config bootstrap without
introducing a new dependency.

Usage::

    from core.admin_auth import hash_admin_password, verify_admin_password

    stored = hash_admin_password("super-secret")
    assert verify_admin_password("super-secret", stored) is True
    assert verify_admin_password("nope", stored) is False
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 600_000
DEFAULT_SALT_BYTES = 16
DEFAULT_HASH_BYTES = 32


def hash_admin_password(
    plaintext: str,
    *,
    iterations: int = DEFAULT_ITERATIONS,
    salt: bytes | None = None,
) -> str:
    """Return a ``pbkdf2_sha256$iter$salt_hex$hash_hex`` formatted hash.

    ``plaintext`` MUST be a non-empty string. ``iterations`` defaults to
    600,000 (current OWASP / Django 5.x recommendation for PBKDF2-HMAC-SHA256).
    """
    if not isinstance(plaintext, str) or not plaintext:
        raise ValueError("plaintext password must be a non-empty string")
    if iterations < 1_000:
        raise ValueError("iterations must be >= 1000")

    salt_bytes = salt if salt is not None else secrets.token_bytes(DEFAULT_SALT_BYTES)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        plaintext.encode("utf-8"),
        salt_bytes,
        iterations,
        dklen=DEFAULT_HASH_BYTES,
    )
    return f"{ALGORITHM}${iterations}${salt_bytes.hex()}${derived.hex()}"


def verify_admin_password(plaintext: str, stored_hash: str) -> bool:
    """Constant-time verify ``plaintext`` against a stored hash.

    Returns ``False`` for any malformed input rather than raising — callers
    should not need to differentiate "wrong password" from "bad hash format"
    because both must produce identical 401 responses to avoid timing/oracle
    leaks.
    """
    if not isinstance(plaintext, str) or not plaintext:
        return False
    if not isinstance(stored_hash, str) or not stored_hash:
        return False

    try:
        algorithm, iterations_raw, salt_hex, hash_hex = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != ALGORITHM:
        return False

    try:
        iterations = int(iterations_raw)
        salt_bytes = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except (ValueError, TypeError):
        return False

    if iterations < 1 or not salt_bytes or not expected:
        return False

    try:
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            plaintext.encode("utf-8"),
            salt_bytes,
            iterations,
            dklen=len(expected),
        )
    except Exception:
        return False

    return hmac.compare_digest(derived, expected)


__all__ = [
    "ALGORITHM",
    "DEFAULT_ITERATIONS",
    "hash_admin_password",
    "verify_admin_password",
]
