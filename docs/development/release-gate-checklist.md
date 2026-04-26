# Release Gate Checklist

## Purpose

This checklist turns the current local release gate into a clear promote, hold, or rollback decision.

Primary gate command:

- `./scripts/run_release_gate.sh`
- optional root-gate search replay mode: `RUN_SEARCH_REPLAY_GATE=true ./scripts/run_release_gate.sh`
- optional rehearsal wrapper: `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck`
- optional search replay gate: `python3 scripts/run_search_replay_gate.py`

This command already runs:

1. `.env.production.example` checksum verification against `checksums/env-production-example.sha256`
2. representative Playwright smoke suites for `legacy`, `live-read`, `admin-smoke`, and `tenant-smoke`, with each suite rebuilding under its own mode-specific frontend flags
3. backend v1 route, lifecycle, security, chat-send, Telegram webhook, and WhatsApp webhook unit tests
4. Phase 23 capture-to-retention security fixtures for confirmation email HTML escaping, provider URL allowlisting, and private-channel identity policy
5. fixed-query search eval pack

When `RUN_SEARCH_REPLAY_GATE=true` is set, it also runs:

6. production-shaped search replay gate

The broader `@admin` regression suite remains separate from the release gate and should still be used for deeper admin passes.
The broader `@legacy` and `@live-read` tagged suites also remain available for wider regression passes; the release gate now uses smaller representative slices so promote-or-hold checks stay stable enough to run repeatedly.
For live-read specifically, the gate currently centers on the authoritative-write-boundary path rather than the more detailed request-counter assertions, because that narrower slice has proven more repeatable in chained rehearsal runs.
The broader live-read regression lane now also includes a dedicated homepage truth check for `near me -> needs location -> no stale shortlist`, and that scenario should be treated as a required search-truth smoke case whenever homepage search-state logic changes.
The tenant-smoke lane locks the tenant gateway's outcome-led copy, create-account path, Google re-verification chooser, and email-code accessible-name regression so `tenant.bookedai.au` remains safe as a public SaaS proof route.
The backend gate now includes `backend.tests.test_release_gate_security`, `backend.tests.test_chat_send_routes`, `backend.tests.test_telegram_webhook_routes`, and `backend.tests.test_whatsapp_webhook_routes`, so message-intake, provider URL, and private-channel identity regressions are part of the normal promote-or-hold check.

The frontend Playwright commands now clear the standard preview ports before each run, so the release gate is less likely to fail because a previous smoke pass left a local preview server behind.
The root release gate no longer relies on one shared prebuilt `dist` for all smoke lanes; mode-specific rebuilds are required so `legacy` and `live-read` can exercise the correct public-assistant feature flags.

## Search replay gate

Sprint 15-16 now also treats production-shaped search replay as a formal release input for the intelligent search lane.

Required replay cohorts:

- `tenant-positive` cohort:
  - `gp clinic Adelaide`
  - `housing Melbourne`
  - `membership renewal Wollongong`
  - `kids swimming Brisbane`
  - `wedding hair Fortitude Valley`
- `public-web fallback` cohort:
  - `men's haircut in Sydney`
  - `restaurant table for 6 in Sydney tonight`
  - `physio for shoulder pain near Parramatta tomorrow morning`
  - `dentist checkup in Sydney CBD this weekend`
  - `childcare near Sydney for a 4 year old`
  - `NDIS support worker at home in Western Sydney tomorrow`
  - `private dining in Melbourne for 8 this Friday night`

Current threshold policy:

- tenant-positive cohort:
  - must return `tenant_hit = 5/5`
  - must return `expectation_mismatches = 0`
  - must not surface `public_web_search` ahead of a qualifying tenant result
- public-web fallback cohort:
  - must not surface wrong-domain tenant rows in any case
  - must not regress below `4/7` display-safe sourced fallback outcomes in the current baseline
  - may fail safe to no-result when no display-safe fallback survives, but those cases count against the fallback-coverage target
  - repeated runs should be reviewed if hospitality cases (`restaurant`, `private dining`) alternate between success and safe empty-result states

Promote interpretation for the current lane:

- `promote_ready` when:
  - the tenant-positive cohort stays perfect
  - the public-web fallback cohort returns at least `4/7` sourced fallback outcomes
  - no replay case leaks a wrong-domain tenant result
  - fixed-query eval and representative smoke suites remain green
- `hold` when:
  - tenant-positive cohort drops below `5/5`
  - any replay case shows a wrong-domain tenant leak
  - public-web fallback drops below `4/7`
  - hospitality instability increases enough that both dining cases fail in the same replay pass

## Rehearsal

Use the rehearsal wrapper when you want a timestamped promote-or-hold artifact rather than only raw command output.

Recommended local command:

- `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck`

Optional commands:

- `./scripts/run_release_rehearsal.sh`
- `./scripts/run_release_rehearsal.sh --beta-healthcheck`

Rehearsal output:

- writes a report under `artifacts/release-rehearsal/`
- records whether the run is `promote_ready` or `hold`
- keeps rollback reminders close to the release result instead of relying on memory

Search replay gate output:

- writes a decision report under `artifacts/search-replay-gate/`
- returns exit code `0` for `promote_ready`
- returns exit code `1` for `hold`
- can be enabled directly inside the root gate through:
  - `RUN_SEARCH_REPLAY_GATE=true ./scripts/run_release_gate.sh`
- can be included in the rehearsal wrapper through:
  - `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck --search-replay-gate`

## Documentation sync gate

Before a live promotion is considered complete, confirm all of the following in the same closure pass:

- `docs/development/implementation-progress.md` records the delivered result and, when relevant, the live promotion outcome
- the requirement-facing or description-facing document for the affected module, workflow, or sprint has been updated
- the matching roadmap, sprint, plan, or phase document has been updated
- if the change closes a P0 or P1 from `docs/development/full-stack-review-2026-04-26.md`, that backlog item is marked closed in the same pass with a link to the implementation-progress entry
- the release should be treated as `hold` if the code is ready but the documentation write-back is still missing

## Cross-stack security and reliability gates (2026-04-26 review)

These gates inherit from `docs/development/full-stack-review-2026-04-26.md` and apply to the canonical journey `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`. Once each item ships, it must be exercised on every promote.

- portal `GET /api/v1/portal/bookings/v1-{ref}` returns `200` for a fresh `v1-*` reference created in the same release; structured error envelope returns on degraded paths and CORS headers are present on error responses (`P0-1`)
- WhatsApp outbound delivery has one documented active provider posture (Meta Cloud or Twilio) and the bot status command reports `attention required` only when the active provider is intentionally unconfigured (`P0-2`)
- `/api/webhooks/telegram` and `/api/webhooks/bookedai-telegram` reject missing or invalid `X-Telegram-Bot-Api-Secret-Token` when configured; `/api/webhooks/evolution` rejects missing or invalid HMAC-SHA256 signatures when `WHATSAPP_EVOLUTION_WEBHOOK_SECRET` is configured (`P0-3`)
- inbound webhook deliveries from Tawk, WhatsApp, Telegram, Evolution, and Zoho are deduplicated through the `webhook_events` table; a replayed delivery does not re-trigger downstream side effects (`P0-4`)
- public assistant routes return `403` when `actor_context.tenant_id` does not match the authenticated session (`P0-5`)
- `.github/workflows/release-gate.yml` blocks any PR or `main` push that fails the same root release gate used locally; `main` branch protection still needs to enforce the check in GitHub settings (`P0-6`)
- `.env.production.example` has a committed SHA-256 baseline at `checksums/env-production-example.sha256`; `scripts/run_release_gate.sh` rejects drift unless the checksum is intentionally refreshed with `scripts/verify_env_production_example_checksum.sh --update`. Full required-vs-optional env markers remain a carried follow-up (`P0-7`)
- the OpenClaw container does not run as `root`; the host mount is scoped to the BookedAI deploy directory; the operator authority boundary is documented in `deploy/openclaw/README.md` (`P0-8`)
- tenant authenticated UAT for catalog edit, billing activation, and team controls is green and recorded (`P1-1`)
- WhatsApp outbound replies carry inline action controls equivalent to the Telegram `View n` / `Book n` / `Find more` row, and the sender identity reflects `BookedAI Manager Bot` (`P1-2`)
- WhatsApp webhook integration tests cover identity-gate, queued cancel, queued reschedule, and Internet expansion at parity with the Telegram suite (`P1-3`)
- `backend/service_layer/tenant_app_service.py` is split into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service` and each has at least ten unit tests (`P1-4`)
- `backend/api/route_handlers.py` does not run `session.execute(text(...))` for tenant-scoped reads; admin reads go through repository read models (`P1-5`)
- the production beta runtime tier points at a beta database that is not the production database; tagged image rollback works in under five minutes on staging (`P1-6`)
- the phone field in `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` links its helper text via `aria-describedby`; the admin booking table has a responsive card layout below `720px` (`P1-7`)
- `frontend/src/apps/public/PitchDeckApp.tsx` has Playwright coverage at desktop and `390px` mobile (`P1-8`)
- the Future Swim Miranda booking URL hotfix migration `020_future_swim_miranda_booking_url_hotfix.sql` is applied on production (`P1-9`)
- customer-facing email templates are channel-aware; support copy names `info@bookedai.au` and the available chat channel (`P1-10`)
- a `BaseRepository` validator fails any tenant-scoped query that is missing a `tenant_id` filter; a chaos test verifies the validator catches drift

Closed gate additions:

- `backend/tests/test_release_gate_security.py` now blocks confirmation email HTML injection, unsafe confirmation CTA links, unsafe provider URLs in Telegram/service-search controls, unsafe provider URLs in chat-compatible response payloads, and private-channel identity drift that would treat Telegram chat id as booking identity
- `scripts/run_release_gate.sh` now runs the chat-send, Telegram webhook, and WhatsApp webhook fixtures alongside the v1/lifecycle/backend security tests, keeping customer-channel identity and reply-control regressions inside the root gate
- `scripts/run_release_gate.sh` now verifies `.env.production.example` against `checksums/env-production-example.sha256` before running frontend/backend checks, and `.github/workflows/release-gate.yml` runs that same script in CI

## Collaboration handoff gate

Before another team member treats the change as ready for beta or live promotion, confirm:

- the owner can point to the changed requirement-facing document
- the owner has updated `docs/development/implementation-progress.md`
- the matching sprint, roadmap, or phase artifact has been updated
- the intended deploy path is clear:
  - beta rehearsal with `bash scripts/deploy_beta.sh`
  - production promotion with `bash scripts/deploy_live_host.sh`
- the owner can explain the rollback boundary in one short paragraph
- the closeout summary is ready for:
  - Notion as full detail
  - Discord as concise direct text

## Promote

Promote the current rollout slice when all of the following are true:

- `./scripts/run_release_gate.sh` passes without reruns
- fixed-query search eval pack passes without wrong-topic or wrong-location regressions
- tenant-positive replay cohort remains `5/5 tenant_hit`
- public-web fallback replay cohort remains at or above `4/7` sourced fallback outcomes with no wrong-domain tenant leak
- homepage `near me` live-read smoke keeps the shortlist empty and warning-led when location permission is missing
- admin Prompt 5 preview still shows the legacy-write boundary clearly
- live-read smoke still confirms visible reads can fall back without changing authoritative writes
- admin protected-action re-auth coverage stays green on both representative mutations
- CRM retry preview remains additive and operator-facing only
- no new drift or retry wording suggests provider replay completed when it is only queued
- implementation tracking, sprint or requirement documentation, and roadmap or phase documentation have all been updated for the delivered live slice

## Hold

Hold promotion when any of the following appears:

- the root release gate fails on first run
- tenant-positive replay cohort drops below `5/5`
- any replay case leaks a wrong-domain tenant result
- public-web fallback replay cohort drops below `4/7`
- homepage `near me` live-read smoke revives legacy shortlist rows or hides the location-permission warning
- a smoke test passes only after manual retries and no root cause is understood
- admin preview copy is ambiguous about `queued`, `retrying`, or `manual review`
- live-read guidance leaks into authoritative write expectations
- retry preview UI implies automatic provider recovery rather than queued operator-supervised work
- backend unit tests pass but the admin preview or smoke contract is visually broken
- the release candidate has been deployed or marked ready, but implementation progress, sprint docs, or roadmap docs have not yet been updated

## Rollback

Use the smallest rollback that restores operator clarity and release confidence:

1. disable or stop surfacing the newest additive UI control or wording first
2. keep the underlying stable v1 read paths and route contracts intact where possible
3. fall back from `./scripts/run_release_gate.sh` to manual command sequencing only if the script itself is the issue
4. do not revert legacy-authoritative write boundaries as part of a UI-only rollback

## Current lane mapping

- `Member I`: owns the overall release-gate standard and promote-or-hold discipline
- `Member I2`: owns the root script command contract
- `Member I3`: owns this checklist and the explicit promote, hold, and rollback framing

## Related references

- [CI/CD And Deployment Runbook](./ci-cd-deployment-runbook.md)
- [Rollout Feature Flags](./rollout-feature-flags.md)
- [Implementation Progress](./implementation-progress.md)
- [Next Sprint Protected Reauth Retry Gate Plan](./next-sprint-protected-reauth-retry-gate-plan.md)
- [Full-Stack Review and Next-Phase Plan](./full-stack-review-2026-04-26.md)
