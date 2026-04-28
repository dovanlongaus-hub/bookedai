-- Customer portal access token columns for booking_intents.
--
-- Background: portal endpoints under /api/v1/portal/bookings/{booking_reference}/...
-- were previously protected only by the 8-10 hex booking_reference, which is
-- brute-forceable. We now mint a per-booking 256-bit URL-safe access token,
-- store only its SHA-256 digest, and require callers to present the plaintext
-- token on every portal call. The plaintext is delivered exactly once via the
-- confirmation email and continuation links.
--
-- Rollout: this migration only adds columns. New bookings written by the v1
-- booking handler will populate `portal_access_token_hash` and
-- `portal_access_token_expires_at`. Existing rows stay NULL. The application
-- layer treats NULL hashes as "legacy grace" and accepts portal calls without
-- a token while logging a WARNING. A follow-up flip of
-- BOOKEDAI_PORTAL_TOKEN_STRICT=true will enforce the token requirement after
-- legacy bookings expire. We intentionally do not backfill plaintext tokens
-- for existing rows because they cannot be safely shipped to customers
-- retroactively.

alter table booking_intents
  add column if not exists portal_access_token_hash text,
  add column if not exists portal_access_token_expires_at timestamptz,
  add column if not exists portal_access_token_revoked_at timestamptz;

create index if not exists idx_booking_intents_portal_token_lookup
  on booking_intents (booking_reference)
  where portal_access_token_hash is not null;
