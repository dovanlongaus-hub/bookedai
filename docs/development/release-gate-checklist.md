# Release Gate Checklist

## Purpose

This checklist turns the current local release gate into a clear promote, hold, or rollback decision.

Primary gate command:

- `./scripts/run_release_gate.sh`
- `./scripts/run_search_eval_pack.py`

This command already runs:

1. frontend build
2. Playwright smoke suites for `legacy`, `live-read`, and `admin`
3. backend v1 route and lifecycle unit tests

## Promote

Promote the current rollout slice when all of the following are true:

- `./scripts/run_release_gate.sh` passes without reruns
- fixed-query search eval pack passes without wrong-topic or wrong-location regressions
- admin Prompt 5 preview still shows the legacy-write boundary clearly
- live-read smoke still confirms visible reads can fall back without changing authoritative writes
- admin protected-action re-auth coverage stays green on both representative mutations
- CRM retry preview remains additive and operator-facing only
- no new drift or retry wording suggests provider replay completed when it is only queued

## Hold

Hold promotion when any of the following appears:

- the root release gate fails on first run
- a smoke test passes only after manual retries and no root cause is understood
- admin preview copy is ambiguous about `queued`, `retrying`, or `manual review`
- live-read guidance leaks into authoritative write expectations
- retry preview UI implies automatic provider recovery rather than queued operator-supervised work
- backend unit tests pass but the admin preview or smoke contract is visually broken

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
