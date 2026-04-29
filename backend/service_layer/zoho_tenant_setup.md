# Connecting your tenant's own Zoho account / Kết nối tài khoản Zoho của bạn

> **Audience / Đối tượng**: tenant operators (e.g. `chess@bookedai.au`) who want
> bookings + CRM records + meeting events to land in **their own** Zoho One
> subscription, not BookedAI's platform-wide Zoho account.

There are two supported modes. Pick **Mode A** unless your compliance team
requires full credential isolation.

## Mode A — Connect via BookedAI's Zoho app (recommended)

You only need a Zoho login. BookedAI handles the OAuth client_id/secret on
its side; you just authorize the platform's app for *your* Zoho account.

### Step-by-step / Các bước

1. **Sign in / Đăng nhập**
   - EN: Open <https://tenant.bookedai.au/> and sign in with `chess@bookedai.au`.
   - VI: Mở <https://tenant.bookedai.au/> rồi đăng nhập bằng `chess@bookedai.au`.
2. **Open Integrations panel / Mở bảng Tích hợp**
   - EN: Workspace nav → **Integrations** → **Zoho Calendar**.
   - VI: Menu Workspace → **Integrations** → **Zoho Calendar**.
3. **Click "Connect" / Bấm "Kết nối"**
   - The frontend calls `GET /api/v1/tenants/me/integrations/zoho/calendar/authorize-url` and redirects you to Zoho.
4. **Approve scopes on Zoho / Phê duyệt quyền trên Zoho**
   - Calendar: `ZohoCalendar.calendar.ALL`, `ZohoCalendar.event.ALL`.
   - CRM:      `ZohoCRM.modules.ALL`, `ZohoCRM.settings.ALL`.
   - Sign in with the Zoho account you want events to land in (e.g. `chess@bookedai.au`'s personal Zoho login).
5. **Auto-redirect back / Chuyển hướng tự động**
   - Zoho redirects to `https://bookedai.au/api/v1/integrations/zoho/oauth/callback?code=...&state=...`.
   - The backend exchanges the `code` for a `refresh_token`, persists it under your tenant settings, and bounces you back to `https://tenant.bookedai.au/tenant/integrations?status=connected`.
6. **Test the connection / Kiểm tra kết nối**
   - In the Integrations panel, click **Test connection**.
   - The backend calls `POST /api/v1/tenants/me/integrations/zoho/{service}/test`. Expected diagnostic: `status: "ok"`, `credential_source: "tenant"`, plus a non-empty `api_domain`.
7. **You're done / Hoàn tất**
   - From now on, every booking confirmation, reschedule, cancellation, and Zoho Calendar event for your tenant lands in **your** Zoho One.
   - Customer-facing emails additionally CC `chess@bookedai.au` (configurable via `PATCH /api/v1/tenants/me/cc-emails`).

## Mode B — Bring your own Zoho dev app

Use this if you want the OAuth consent screen branded with your company's
name, or if your security team requires you to own the `client_id` /
`client_secret` end-to-end.

### Prerequisites / Chuẩn bị

- A Zoho Developer Console account at <https://api-console.zoho.com.au> (AU)
  or <https://api-console.zoho.com> (US).
- Tenant admin access on `tenant.bookedai.au`.

### Step-by-step / Các bước

1. **Create the Zoho dev app / Tạo ứng dụng Zoho dev**
   - In the Zoho API Console, click **Add Client** → **Server-based Applications**.
   - Name: e.g. "Co Mai Hung Chess".
   - Homepage URL: `https://tenant.bookedai.au/`.
   - **Authorized Redirect URIs** — add BOTH:
     - Production: `https://bookedai.au/api/v1/integrations/zoho/oauth/callback`
     - Local dev:   `http://localhost:8000/api/v1/integrations/zoho/oauth/callback`
2. **Copy credentials / Sao chép thông tin xác thực**
   - Note the `Client ID` and `Client Secret`. Treat the secret like a password.
3. **Upload to BookedAI / Nạp lên BookedAI**
   - Hit `PATCH /api/v1/tenants/me/integrations/zoho/{service}/client` with:
     ```json
     {
       "client_id": "1000.ABCD...",
       "client_secret": "1234abcd...",
       "accounts_base_url": "https://accounts.zoho.com.au",
       "api_base_url": "https://www.zohoapis.com.au/crm/v8"
     }
     ```
   - The Integrations panel exposes a "Use my own Zoho app" form that posts the same payload.
4. **Authorize / Cấp quyền**
   - Click **Connect** in the Integrations panel. The authorize URL now uses your `client_id`, so the OAuth screen shows *your* app's branding.
   - Complete the OAuth round-trip exactly as in Mode A. The persisted refresh_token is bound to your dev app.
5. **Test the connection / Kiểm tra kết nối**
   - Same `POST .../test` endpoint as Mode A. Diagnostic should report `client_mode: "tenant_app"`.

## Region awareness / Vùng máy chủ

BookedAI ships AU defaults (`accounts.zoho.com.au`,
`www.zohoapis.com.au/crm/v8`, `calendar.zoho.com/api/v1`). If your Zoho One
account lives in the US data centre:
- Set `accounts_base_url` to `https://accounts.zoho.com` in the `PATCH .../client` payload.
- Set `api_base_url` to `https://www.zohoapis.com/crm/v8` (CRM) or leave the calendar endpoint at `https://calendar.zoho.com/api/v1` (the calendar surface is region-agnostic).

If you connect via Mode A and Zoho returns a different `api_domain` in the
token response, BookedAI will record it automatically — no manual fix
needed.

## Troubleshooting / Xử lý sự cố

| Symptom                     | Likely cause                       | Fix                                                                 |
|-----------------------------|------------------------------------|---------------------------------------------------------------------|
| `nonce_mismatch` redirect   | Authorize URL clicked twice / state expired | Click **Connect** again to issue a fresh state.                     |
| `token_exchange_failed`     | Wrong region or revoked dev app    | Check `accounts_base_url`. Re-create the Zoho dev app if needed.    |
| Test reports `status: "transport_error"` | Outbound 443 blocked        | Ensure the BookedAI runtime can reach `accounts.zoho.com.au`.       |
| Customer email lacks CC     | Tenant has empty `cc_emails`       | `PATCH /api/v1/tenants/me/cc-emails` with `["chess@bookedai.au"]`.  |
| Zoho still hits platform's calendar | Tenant block missing `calendar_uid` | Set `tenant_settings.integrations.zoho_calendar.calendar_uid` after connect. |

## Disconnecting / Ngắt kết nối

`DELETE /api/v1/tenants/me/integrations/zoho/{service}` clears the
`refresh_token` + `connected` flag while preserving any Mode B
`client_id` / `client_secret` you uploaded — so you can reconnect later
without re-uploading dev app credentials.

## Endpoints summary / Tóm tắt API

| Method | Path                                                     | Purpose                                  |
|--------|----------------------------------------------------------|------------------------------------------|
| GET    | `/api/v1/tenants/me/integrations`                        | List all integration posture for tenant  |
| GET    | `/api/v1/tenants/me/integrations/zoho/{service}/authorize-url` | Issue an OAuth authorize URL (Mode A or B) |
| PATCH  | `/api/v1/tenants/me/integrations/zoho/{service}/client`  | Upload Mode B `client_id` / `client_secret` |
| DELETE | `/api/v1/tenants/me/integrations/zoho/{service}`         | Disconnect (clears refresh_token only)   |
| POST   | `/api/v1/tenants/me/integrations/zoho/{service}/test`    | Run an OAuth refresh probe + report     |
| PATCH  | `/api/v1/tenants/me/cc-emails`                           | Update auto-CC list for lifecycle emails |
| GET    | `/api/v1/integrations/zoho/oauth/callback`               | Public OAuth landing (Zoho redirects here) |

`{service}` is one of `calendar`, `crm`.
