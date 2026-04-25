-- Admin runtime schema hardening
--
-- The admin messaging workspace and outbox dispatcher need retry and processing
-- metadata on outbox_events. Older live databases may have the base outbox table
-- without these additive columns.

alter table if exists outbox_events
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz,
  add column if not exists processed_at timestamptz;

create index if not exists idx_outbox_events_last_error_at
  on outbox_events(last_error_at desc)
  where last_error_at is not null;

