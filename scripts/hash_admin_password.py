#!/usr/bin/env python3
"""Generate an ``ADMIN_PASSWORD_HASH`` value for BookedAI.

Format: ``pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>`` (Django-compatible
PBKDF2-HMAC-SHA256). Paste the printed string into your environment as
``ADMIN_PASSWORD_HASH=...`` and remove the deprecated ``ADMIN_PASSWORD``.

USAGE
-----
Recommended (no shell history leak):
    python scripts/hash_admin_password.py
        -> prompts for password via getpass

Inline (NOT recommended for shared machines):
    python scripts/hash_admin_password.py --password 'super-secret'

Pipe via stdin (CI / automation):
    printf '%s' "$ADMIN_PASSWORD_PLAIN" | \
        python scripts/hash_admin_password.py --stdin

The optional ``--iterations`` flag tunes the work factor; leave it unset
unless you know what you are doing. 600,000 iterations matches OWASP /
Django 5.x recommendations for PBKDF2-HMAC-SHA256.
"""

from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.admin_auth import DEFAULT_ITERATIONS, hash_admin_password  # noqa: E402


def _read_password(args: argparse.Namespace) -> str:
    if args.password is not None:
        return args.password
    if args.stdin:
        data = sys.stdin.read()
        # Trim a single trailing newline if present so ``echo`` works without
        # corrupting the hash, but preserve any embedded whitespace.
        if data.endswith("\n"):
            data = data[:-1]
        return data
    return getpass.getpass("Admin password: ")


def main() -> int:
    parser = argparse.ArgumentParser(description="Hash an admin password for BookedAI.")
    parser.add_argument(
        "--password",
        help=(
            "Plaintext password. WARNING: passing this on the CLI will leak "
            "into shell history. Prefer interactive prompt or --stdin."
        ),
    )
    parser.add_argument(
        "--stdin",
        action="store_true",
        help="Read password from stdin (single line, trailing newline stripped).",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=DEFAULT_ITERATIONS,
        help=f"PBKDF2 iterations (default {DEFAULT_ITERATIONS}).",
    )
    args = parser.parse_args()

    plaintext = _read_password(args)
    if not plaintext:
        print("error: password is empty", file=sys.stderr)
        return 2

    digest = hash_admin_password(plaintext, iterations=args.iterations)
    print(digest)
    print(
        "\nPaste into your environment:",
        f"  ADMIN_PASSWORD_HASH={digest}",
        sep="\n",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
