# 08 — Technology Infrastructure

Tầng triển khai mô tả nodes, devices, network, system software thực tế chạy BookedAI hôm nay.

Nguồn: [system-overview.md](../system-overview.md) §"Routed Subdomains", [devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md), `docker-compose.prod.yml`, `deploy/nginx/bookedai.au.conf`.

## Diagram — Deployment Topology

```plantuml
@startuml
!include <archimate/Archimate>

title BookedAI Production Topology — Single Docker Host

Technology_Node(cf, "Cloudflare Edge / DNS")

rectangle "VPS Docker Host" {
  Technology_SystemSoftware(nginx, "nginx (proxy container)")

  rectangle "Application containers" {
    Technology_SystemSoftware(web, "web (frontend SPA)")
    Technology_SystemSoftware(backend, "backend (FastAPI)")
    Technology_SystemSoftware(betaWeb, "beta-web")
    Technology_SystemSoftware(betaBackend, "beta-backend")
    Technology_SystemSoftware(hermes, "hermes (knowledge)")
    Technology_SystemSoftware(n8n, "n8n")
  }

  rectangle "Data containers" {
    Technology_SystemSoftware(supaKong, "supabase Kong")
    Technology_Device(pg, "Postgres")
    Technology_SystemSoftware(supaAuth, "supabase Auth")
    Technology_SystemSoftware(supaStorage, "supabase Storage")
  }

  Technology_Device(uploads, "Volume: /storage/uploads")
}

Technology_Node(devOps, "Operator Workstation (deploy scripts)")

Rel_Flow(cf, nginx, "443 / 80 TLS routing")
Rel_Composition(nginx, web)
Rel_Composition(nginx, backend)
Rel_Composition(nginx, betaWeb)
Rel_Composition(nginx, betaBackend)
Rel_Composition(nginx, hermes)
Rel_Composition(nginx, n8n)
Rel_Composition(nginx, supaKong)

Rel_Used(backend, pg)
Rel_Used(supaAuth, pg)
Rel_Used(supaKong, supaAuth)
Rel_Used(supaKong, supaStorage)
Rel_Used(backend, uploads)

Rel_Flow(devOps, nginx, "ssh + scripts/deploy_*.sh")
@enduml
```

## Bình luận

### Topology hiện tại

[devops-deployment-cicd-scaling-strategy.md](../devops-deployment-cicd-scaling-strategy.md) §2 xác nhận:

- 1 VPS Docker host duy nhất (single-host).
- Containers chính: `web`, `backend`, `beta-web`, `beta-backend`, `hermes`, `n8n`, `proxy`, plus self-hosted Supabase stack.
- Edge: Cloudflare DNS + nginx TLS termination.
- Storage: filesystem volume `storage/uploads`.

### Subdomain → container routing

| Subdomain | Container target |
|---|---|
| `bookedai.au` / `product.bookedai.au` / `pitch.bookedai.au` / `demo.bookedai.au` / `tenant.bookedai.au` | `web` (with subdomain-aware app routing) |
| `portal.bookedai.au` / `admin.bookedai.au` | `web` + `backend` |
| `api.bookedai.au` | `backend` |
| `beta.bookedai.au` | `beta-web` + `beta-backend` |
| `n8n.bookedai.au` | `n8n` |
| `supabase.bookedai.au` | `supaKong` |
| `hermes.bookedai.au` | `hermes` |
| `upload.bookedai.au` | volume `/storage/uploads` (qua nginx) |

### Boot & operations

- `deploy/systemd/` cho boot-time reconciliation.
- `scripts/healthcheck_stack.sh` chạy định kỳ.
- `scripts/telegram_workspace_ops.py deploy-live` được dùng làm deploy entrypoint chính ([project.md](../../../project.md) "Latest tenant A/B telemetry update").

### Trạng thái và rủi ro

- **Single-host risk**: mất host = mất toàn bộ. Chưa có HA, replication, hoặc multi-region.
- **Beta share DB với prod**: rehearsal nhưng chưa cô lập dữ liệu.
- **No confirmed automated backups**: scheduled Postgres backup + restore drill chưa có trong repo.
- **No centralized observability**: chỉ có healthcheck — chưa có metrics/log aggregation.

### Target near-term (theo `devops-deployment-cicd-scaling-strategy.md` §3)

- Tách worker runtime (cho email, CRM sync, reconciliation) khỏi API runtime.
- Webhook ingestion vẫn ở same backend trong giai đoạn đầu, nhưng chuyển sang `fast-ingest, queue-after-ingest` pattern.
- AI runtime có thể tách sau khi load tăng.

## Findings

- **F-08-01** — Single-host = single point of failure cho cả production. Chưa có failover plan.
- **F-08-02** — Postgres backup automation và restore drill chưa được repo-confirmed; rủi ro nếu cần khôi phục.
- **F-08-03** — Beta tier chưa có DB isolation — schema migration risk trên beta có thể ảnh hưởng prod.
- **F-08-04** — Chưa có observability stack (Prometheus/Grafana, log shipping); chỉ healthcheck có sẵn.
- **F-08-05** — Uploads ở filesystem volume chứ không phải object storage — gây khó scale và replicate.
