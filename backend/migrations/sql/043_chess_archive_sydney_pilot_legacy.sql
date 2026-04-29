-- 043_chess_archive_sydney_pilot_legacy.sql
--
-- Archives the legacy "co-mai-hung-chess-sydney-pilot-group" service profile
-- so it stops appearing alongside the 5 chess-academy tiers in the
-- /api/v1/chess/catalog/search response.
--
-- Why: that row was created by an earlier multi-tenant standardisation pass
-- with a uniform "A$35/hour public rate" — the same rate the AI Mentor
-- tenant uses. On chess.bookedai.au it visually looked like cross-tenant
-- contamination because A$35 stood out next to the new chess-academy
-- prices (49/65/80/80/90 AUD). The chess academy is a fully independent
-- product line; this archives the legacy listing so chess catalog only
-- ever returns the curated 5-tier ladder.
--
-- The row is preserved (publish_state='archived', metadata.archived_reason)
-- so historical FK references stay valid; only the public surface hides it.
--
-- Idempotent. Wrapped in BEGIN/COMMIT.

begin;

do $$
declare
  chess_tenant_id_text text;
begin
  select id::text into chess_tenant_id_text
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_text is null then
    raise notice 'chess tenant not found; skipping migration 043';
    return;
  end if;

  update service_merchant_profiles
  set
    publish_state = 'archived',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'archived_reason', 'sydney_pilot_legacy_decoupled_from_aimentor_2026_04_29',
        'archived_at', now()
      ),
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-sydney-pilot-group'
    and publish_state <> 'archived';

  raise notice 'sydney pilot legacy row archived from chess catalog';
end $$;

commit;
