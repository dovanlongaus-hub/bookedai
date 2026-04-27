-- BookedAI Phase C — customer_handoff_sessions
-- Adds the table that backs `?start=hsess_<id>` Telegram deep-links from
-- product.bookedai.au. Carries pre-filled context (booking_reference,
-- service_query, location_hint, locale, notes, selected_service_ids) into
-- the bot so the customer doesn't re-state intent after switching surfaces.
--
-- Single-use: bot consumes the session on /start hsess_<id> pickup.
-- TTL ≈ 1h by default; expired rows are simply ignored (no janitor needed
-- at current volume; 1h × ~hundreds-per-day = trivial table size).
-- Additive only — no existing tables touched.

create table if not exists customer_handoff_sessions (
    id varchar(64) primary key,
    source varchar(50) not null default 'product_homepage',
    payload_json jsonb not null default '{}'::jsonb,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    consumed_by_chat_id varchar(64),
    created_at timestamptz not null default now()
);

-- Hot-path index: bot.lookup-by-id when the customer taps the deep-link.
-- The PK already covers this, but we add an index on expires_at to support
-- a future "drop expired rows" janitor without a full scan.
create index if not exists idx_customer_handoff_sessions_expires_at
    on customer_handoff_sessions (expires_at)
    where consumed_at is null;

-- Source breakdown for analytics (which surface drove the most successful
-- handoffs into Telegram).
create index if not exists idx_customer_handoff_sessions_source_created_at
    on customer_handoff_sessions (source, created_at desc);
