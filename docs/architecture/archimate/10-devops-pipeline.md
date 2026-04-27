# 10 — DevOps Pipeline (Commit → Deploy → Monitor)

Sơ đồ pipeline phát hành cho BookedAI: từ commit local, qua release gate, beta rehearsal, production promotion, và monitoring.

Nguồn: [devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md), [system-overview.md](../system-overview.md), `scripts/`.

## Diagram — Delivery Pipeline (Implementation + Technology)

```plantuml
@startuml
!include <archimate/Archimate>

title BookedAI Delivery Pipeline

rectangle "Implementation Layer" {
  Implementation_WorkPackage(commit, "Local Implement & Commit")
  Implementation_WorkPackage(localTest, "Local Validation (typecheck + tests)")
  Implementation_WorkPackage(releaseGate, "Release Gate (release-gate verify)")
  Implementation_WorkPackage(betaDeploy, "Beta Rehearsal Deploy")
  Implementation_WorkPackage(prodDeploy, "Production Deploy (telegram_workspace_ops.py)")
  Implementation_WorkPackage(verify, "Post-deploy Verify (Playwright + healthcheck)")
  Implementation_WorkPackage(docs, "Docs + Notion + Discord Sync")
}

rectangle "Technology / Tooling" {
  Technology_SystemSoftware(playwright, "Playwright")
  Technology_SystemSoftware(pytest, "pytest / unittest")
  Technology_SystemSoftware(tsc, "tsc + vite build")
  Technology_SystemSoftware(scripts, "scripts/*.sh & *.py")
  Technology_SystemSoftware(nginxBeta, "beta-web + beta-backend")
  Technology_SystemSoftware(nginxProd, "web + backend")
  Technology_SystemSoftware(healthchk, "scripts/healthcheck_stack.sh")
  Technology_SystemSoftware(notion, "Notion API")
  Technology_SystemSoftware(discord, "Discord Webhooks")
}

Rel_Triggering(commit, localTest)
Rel_Triggering(localTest, releaseGate)
Rel_Triggering(releaseGate, betaDeploy)
Rel_Triggering(betaDeploy, prodDeploy)
Rel_Triggering(prodDeploy, verify)
Rel_Triggering(verify, docs)

Rel_Used(localTest, tsc)
Rel_Used(localTest, pytest)
Rel_Used(releaseGate, playwright)
Rel_Used(betaDeploy, scripts)
Rel_Used(betaDeploy, nginxBeta)
Rel_Used(prodDeploy, scripts)
Rel_Used(prodDeploy, nginxProd)
Rel_Used(verify, healthchk)
Rel_Used(verify, playwright)
Rel_Used(docs, notion)
Rel_Used(docs, discord)
@enduml
```

## Bình luận

### Mô hình hiện tại

[devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md) §1A xác nhận BookedAI **chưa phải push-to-prod CI/CD**, mà là một *release-controlled delivery system* với:

1. Repo-local validation
2. Release gate discipline
3. Beta rehearsal trên `beta.bookedai.au`
4. Host-level scripted production deploy
5. Verify (Playwright + healthcheck)
6. Notion / Discord operator write-back

### 8 bước collaboration flow

```
1. Implement change
2. Run local validation + release gate
3. Rehearse on beta
4. Promote from VPS
5. Verify production health
6. Update repo docs
7. Sync detail to Notion
8. Post summary to Discord
```

### Tooling sử dụng

| Stage | Tool / Script |
|---|---|
| Typecheck | `npm --prefix frontend exec tsc -- --noEmit` |
| Build | `npm --prefix frontend run build` |
| Backend tests | `python -m pytest backend/tests/` |
| Playwright smoke | `frontend/tests/*.spec.ts` |
| Public surface smoke | `scripts/healthcheck_stack.sh`, `frontend/scripts/run_portal_auto_login_smoke.mjs` |
| Deploy (prod) | `python3 scripts/telegram_workspace_ops.py deploy-live` |
| Healthcheck | `scripts/healthcheck_stack.sh` |
| Customer-agent UAT | `scripts/customer_agent_uat.py` |

### Release gate ví dụ (theo `project.md`)

> "verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --workers=1 --reporter=line`"

> "live deployment completed through `python3 scripts/telegram_workspace_ops.py deploy-live`; stack health passed, production returned `200` for `https://tenant.bookedai.au/?tenant_variant=revenue_ops`"

### Phase execution operating system

Theo [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md): mỗi phase phải đóng đủ 5 cổng:

1. UAT
2. Deployment
3. Documentation
4. Notion / Discord
5. Next-phase handoff

Trước khi chuyển phase tiếp theo.

## Findings

- **F-10-01** — Chưa có CI tự động (Github Actions, GitLab CI...). Toàn bộ pipeline phụ thuộc vào discipline cá nhân.
- **F-10-02** — Beta share DB với prod — release gate khó phát hiện schema migration risk.
- **F-10-03** — Không có canary / blue-green / rolling deploy. Promote = restart container — có downtime ngắn.
- **F-10-04** — Không có centralized observability (metrics, logs, traces) — verify dựa trên healthcheck shallow + Playwright smoke.
- **F-10-05** — Notion / Discord sync là manual operator ghi chép — dễ bỏ sót, nên có tooling tự động.
- **F-10-06** — Backup & restore drill chưa được automate — cần policy định kỳ.
