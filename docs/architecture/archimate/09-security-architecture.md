# 09 — Security Architecture

Sơ đồ kiến trúc bảo mật kết hợp Motivation (mục tiêu/principle) và Technology (controls), bao gồm RBAC, multi-tenant isolation, và auth flow cho 5 actor classes.

Nguồn: [auth-rbac-multi-tenant-security-strategy.md](../auth-rbac-multi-tenant-security-strategy.md), `project.md`.

## Diagram 1 — Security Goals & Controls

```plantuml
@startuml
!include <archimate/Archimate>

title Security Goals → Controls → Technology

rectangle "Motivation (Security)" {
  Motivation_Goal(g_isolate, "Multi-tenant Data Isolation")
  Motivation_Goal(g_auth, "Strong Actor Authentication")
  Motivation_Goal(g_audit, "Auditable Sensitive Actions")
  Motivation_Principle(p_least, "Least Privilege")
  Motivation_Principle(p_noUiOnly, "No UI-only Auth Checks")
  Motivation_Requirement(r_idem, "Idempotent Webhooks")
  Motivation_Requirement(r_rls, "Tenant-scoped Repositories")
}

rectangle "Application Controls" {
  Application_Service(actorCtx, "Actor Context Service")
  Application_Service(permReg, "Permission Registry")
  Application_Service(tenantGuard, "Tenant Scope Guard")
  Application_Service(auditLog, "Audit Log Writer")
  Application_Service(webhookVer, "Webhook Verifier")
}

rectangle "Technology" {
  Technology_SystemSoftware(supabaseAuth, "Supabase Auth")
  Technology_SystemSoftware(rls, "Postgres RLS Policies")
  Technology_Device(secrets, "Secret Vault / Env")
  Technology_SystemSoftware(sigSign, "Session Signing (HMAC)")
}

Rel_Realization(actorCtx, g_auth)
Rel_Realization(permReg, p_least)
Rel_Realization(tenantGuard, g_isolate)
Rel_Realization(auditLog, g_audit)
Rel_Realization(webhookVer, r_idem)

Rel_Realization(supabaseAuth, actorCtx)
Rel_Realization(rls, tenantGuard)
Rel_Realization(rls, r_rls)
Rel_Realization(sigSign, actorCtx)
Rel_Used(webhookVer, secrets)
Rel_Influence(p_noUiOnly, permReg)
@enduml
```

## Diagram 2 — Actor Classes & Authentication Paths

```plantuml
@startuml
!include <archimate/Archimate>

title Actor Auth Paths

Business_Actor(anon, "Anonymous Public User")
Business_Actor(tenantUser, "Tenant User")
Business_Actor(internalAdmin, "Internal Admin")
Business_Actor(integ, "Integration Client")
Business_Actor(provider, "Webhook Provider")

Application_Service(rateLimit, "Rate Limit + Anti-abuse")
Application_Service(emailCode, "Email Code / OAuth Login")
Application_Service(adminLogin, "Admin Login (Email Code)")
Application_Service(apiKey, "API Key / OAuth")
Application_Service(sigVerify, "Signature Verification")

Application_DataObject(tenantSession, "Tenant Session (TENANT_SESSION_SIGNING_SECRET)")
Application_DataObject(adminSession, "Admin Session (ADMIN_SESSION_SIGNING_SECRET)")

Rel_Used(anon, rateLimit)
Rel_Used(tenantUser, emailCode)
Rel_Used(internalAdmin, adminLogin)
Rel_Used(integ, apiKey)
Rel_Used(provider, sigVerify)

Rel_Realization(emailCode, tenantSession)
Rel_Realization(adminLogin, adminSession)
@enduml
```

## Bình luận

### Actor classes (theo `auth-rbac-multi-tenant-security-strategy.md` §2)

| Actor | Auth method (current) | Auth method (target) | Storage hiện tại |
|---|---|---|---|
| Anonymous public user | none + rate limit | id. | n/a |
| Tenant user | partially wired | Supabase Auth + email code + Google OAuth | localStorage (legacy) → secure cookie (target) |
| Internal admin | custom email-code login + signed bearer | Supabase Auth or dedicated identity + MFA | localStorage signed bearer (legacy) → secure cookie |
| Integration client | API key (env) | scoped OAuth + service account | env / secret vault |
| Webhook provider | signature/secret token | id. + replay protection + idempotency | n/a |

### RBAC roles (current)

- **Tenant**: `tenant_admin`/`owner`, `manager`, `staff`, `support_agent`, `read_only`.
- **Internal**: `super_admin`, `support`, `ops`, `billing_ops`, `integration_support`.

### Permission families (vd)

`leads.{read,write,assign}`, `bookings.{read,update,confirm}`, `billing.{read,manage,collect}`, `crm.{read,sync}`, `integrations.{read,manage,retry}`, `tenant.settings.{read,manage}`, `feature_flags.{read,manage}`.

### Multi-tenant isolation rules

1. Mọi bảng tenant-owned phải có `tenant_id`.
2. Repository nhận `tenant_id` tường minh; không cho phép caller-supplied free-form scope.
3. Cross-tenant chỉ được trong internal admin path + audit log.
4. RLS policy ở Postgres làm second-line of defence.

### Webhook security

| Provider | Verification | Replay |
|---|---|---|
| Stripe | signature | event id dedupe |
| Telegram | `X-Telegram-Bot-Api-Secret-Token` | update_id dedupe |
| WhatsApp Evolution | HMAC-SHA256 (`X-BookedAI-Signature` / `X-Hub-Signature-256`) | event id dedupe |
| WhatsApp Twilio/Meta | provider signature | id dedupe |
| Tawk | signature seam | id dedupe |
| n8n callback | bearer secret | callback_id dedupe |

### Sensitive actions phải audit

Theo §11 `auth-rbac-multi-tenant-security-strategy.md`:
- login/logout/failed login
- session revocation
- role/permission changes
- booking/payment overrides
- integration credential changes
- feature flag changes
- internal cross-tenant access

## Findings

- **F-09-01** — Tenant auth chưa go-live đầy đủ; còn dùng compatibility path với `tenant_email_login_codes`. Mục tiêu là Supabase Auth + Google primary.
- **F-09-02** — Admin bearer còn lưu localStorage (`AdminPage.tsx`) — không phải target pattern; phải chuyển sang secure HttpOnly cookie cho privileged session.
- **F-09-03** — Permission registry chưa được hiện thực hoá tập trung; check còn rải rác trong handler/UI.
- **F-09-04** — RLS policies trên Postgres chưa được repo-confirmed; mới ở mức kế hoạch.
- **F-09-05** — MFA cho internal admin chưa có — đây là gap quan trọng cho privileged access.
- **F-09-06** — Webhook idempotency chưa thống nhất — một số endpoint có dedupe, một số không.
