# Release Gate Checklist

## Purpose

This checklist turns the current local release gate into a clear promote, hold, or rollback decision.

Primary gate command:

- `./scripts/run_release_gate.sh`
- optional root-gate search replay mode: `RUN_SEARCH_REPLAY_GATE=true ./scripts/run_release_gate.sh`
- optional rehearsal wrapper: `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck`
- optional search replay gate: `python3 scripts/run_search_replay_gate.py`

This command already runs:

1. representative Playwright smoke suites for `legacy`, `live-read`, and `admin-smoke`, with each suite rebuilding under its own mode-specific frontend flags
2. backend v1 route and lifecycle unit tests
3. fixed-query search eval pack

When `RUN_SEARCH_REPLAY_GATE=true` is set, it also runs:

5. production-shaped search replay gate

The broader `@admin` regression suite remains separate from the release gate and should still be used for deeper admin passes.
The broader `@legacy` and `@live-read` tagged suites also remain available for wider regression passes; the release gate now uses smaller representative slices so promote-or-hold checks stay stable enough to run repeatedly.
For live-read specifically, the gate currently centers on the authoritative-write-boundary path rather than the more detailed request-counter assertions, because that narrower slice has proven more repeatable in chained rehearsal runs.
The broader live-read regression lane now also includes a dedicated homepage truth check for `near me -> needs location -> no stale shortlist`, and that scenario should be treated as a required search-truth smoke case whenever homepage search-state logic changes.

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
- the release should be treated as `hold` if the code is ready but the documentation write-back is still missing

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

- [Rollout Feature Flags](./rollout-feature-flags.md)
- [Implementation Progress](./implementation-progress.md)
- [Next Sprint Protected Reauth Retry Gate Plan](./next-sprint-protected-reauth-retry-gate-plan.md)
