# BookedAI CI/CD collaboration process updated

- Timestamp: 2026-04-21T13:18:47.242784+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Added a practical CI/CD collaboration summary for team members: local validation, release gate, beta rehearsal, host-level production deploy, health verification, then repo docs, Notion, and Discord closeout.

## Details

This update adds a practical CI/CD collaboration summary for BookedAI that matches the real current infrastructure and release discipline.

What was updated:
- Added `docs/development/ci-cd-collaboration-guide.md` as the quick handoff guide for team members.
- Updated `README.md` to point collaborators to the new guide and summarize the real delivery path.
- Updated `project.md` so the guide is treated as an active source-of-truth operational reference.
- Updated `docs/architecture/devops-deployment-cicd-scaling-strategy.md` with a short collaboration-oriented CI/CD summary.
- Updated `docs/development/release-gate-checklist.md` with a collaboration handoff gate.
- Updated `docs/development/implementation-progress.md` to record the new CI/CD collaboration baseline.

Collaboration summary now documented for BookedAI:
1. implement changes locally
2. run the release gate
3. rehearse on `beta.bookedai.au`
4. promote from the Docker VPS host
5. verify production health
6. write back the docs
7. publish full detail to Notion
8. post the short summary text to Discord

Important clarification preserved in the docs:
- BookedAI does not yet have a fully automated GitHub Actions promotion pipeline.
- The current CI/CD model is script-driven and host-centric, with `beta.bookedai.au` as the required rehearsal surface before production promotion.
