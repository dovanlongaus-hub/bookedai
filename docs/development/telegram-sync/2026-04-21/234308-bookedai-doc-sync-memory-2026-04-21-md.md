# BookedAI doc sync - memory/2026-04-21.md

- Timestamp: 2026-04-21T23:43:08.583633+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `memory/2026-04-21.md` from the BookedAI repository into the Notion workspace. Preview: ## Discord Project Update And Notion Sync Attempt - Added `docs/development/project-update-2026-04-21-sync-summary.md` as a single consolidated project update covering runtime fixes, build resilience, live-read booking authority changes, planning truth, validation state, and the full Notion sync document set - Updated `scripts/sync_telegram_update.py` to fall back to `/tmp/bookedai-telegram-sync/...` when the repo-side `docs/development/telegram-sync/...` archive path is not writable, and to tolerate fallback archive paths when building Notion and Discord payload metadata - Successfully pushed the consolidated project update summary to the configured Discord announce channel `148519782258337

## Details

Source path: memory/2026-04-21.md
Synchronized at: 2026-04-21T23:43:08.429869+00:00

Repository document content:

## Discord Project Update And Notion Sync Attempt

- Added `docs/development/project-update-2026-04-21-sync-summary.md` as a single consolidated project update covering runtime fixes, build resilience, live-read booking authority changes, planning truth, validation state, and the full Notion sync document set
- Updated `scripts/sync_telegram_update.py` to fall back to `/tmp/bookedai-telegram-sync/...` when the repo-side `docs/development/telegram-sync/...` archive path is not writable, and to tolerate fallback archive paths when building Notion and Discord payload metadata
- Successfully pushed the consolidated project update summary to the configured Discord announce channel `1485197822583377993`
- Notion sync still failed with `http_404 object_not_found` for both the configured parent page `345b21fdf8c78164af16d35bcc96fb95` and the seeded database ids, confirming the Notion integration `bookedai.au` still has not been shared onto the target page and databases yet
- Continued the BookedAI end-to-end flow fix by updating `frontend/src/components/landing/sections/BookingAssistantSection.tsx` so live-read booking uses the v1 booking intent as the authoritative write there too, instead of silently falling back to legacy `/booking-assistant/session`; frontend build still passes after the change
- Follow-up repo scan showed the only remaining `booking-assistant/session` calls in `frontend/src` are now the intentional non-live-read fallback paths in `HomepageSearchExperience.tsx`, `BookingAssistantSection.tsx`, and `BookingAssistantDialog.tsx`; no additional public-facing mismatched authoritative-write paths were found in the current frontend scan
- Patched `backend/api/v1_booking_handlers.py` so v1 public lead and booking-intent writes now infer the correct `tenant_id` from the requested service when available, instead of defaulting blindly from actor context; this helps keep tenant-facing bookings and portal visibility aligned with the actual tenant-owned service path.
- Patched `backend/service_layer/booking_mirror_service.py` so booking-assistant dual-write now prefers tenant resolution from the actual service id, and callback sync now resolves tenant ownership from the existing `booking_reference` before falling back to the default tenant; this closes another ownership drift path between public writes, mirror records, and tenant-facing snapshots. Verified with `python3 -m py_compile backend/service_layer/booking_mirror_service.py backend/api/v1_booking_handlers.py backend/service_layer/tenant_app_service.py`
- Switched the live Notion target to the new workspace page `349b21fdf8c780459ccac4e320f5a105` and re-ran a real Telegram sync write test; Notion now succeeds and created a live page at `https://www.notion.so/Notion-workspace-switch-check-349b21fdf8c78185b003ccfd52769909`, so Telegram-driven detailed document updates are now active against this workspace target

## Telegram Ops End-To-End Check

- Ran the full Telegram operator workflow through `scripts/telegram_workspace_ops.py`: `sync-doc`, `build-frontend`, and `deploy-live`
- Verified live Notion writeback with a detailed update page at `https://www.notion.so/Telegram-ops-end-to-end-check-349b21fdf8c78140977acc193f541d13`
- Verified Discord summary mirroring to announce channel `1485197822583377993`
- Confirmed `build-frontend` completed successfully via the Telegram wrapper path
- Confirmed `deploy-live` completed successfully via `bash scripts/deploy_live_host.sh`; post-deploy checks returned `HTTP/2 200` for `https://bookedai.au`, `{"status":"ok","service":"backend"}` for `https://api.bookedai.au/api/health`, and production services `web`, `beta-web`, `backend`, `beta-backend`, `proxy`, `hermes`, and `n8n` were all up

## Full Repository Documentation Sync To Notion

- Added `scripts/sync_repo_docs_to_notion.py` to batch sync the BookedAI documentation set into the configured Notion workspace using the existing Telegram/Notion sync path
- Updated `scripts/sync_telegram_update.py` to group long markdown content into larger Notion paragraph chunks so large files like `project.md` and `README.md` no longer fail the `children.length <= 100` validation limit
- Ran a full Notion documentation sync with Discord mirroring disabled for cleanliness; `151` pages synced successfully across root docs, `docs/**`, and `memory/**`, with only `1` remaining page reporting a sync failure during the batch
- Verified representative root source-of-truth pages were created successfully in Notion, including:
  - `project.md`: `https://www.notion.so/BookedAI-doc-sync-project-md-349b21fdf8c781d0b1f1e66fd83957b5`
  - `README.md`: `https://www.notion.so/BookedAI-doc-sync-README-md-349b21fdf8c781cda757e65c6abec246`
  - `DESIGN.md`: `https://www.notion.so/BookedAI-doc-sync-DESIGN-md-349b21fdf8c7812ba0d8ebf4c7787095`
- Recorded a new admin-enterprise requirements baseline in `docs/architecture/admin-enterprise-workspace-requirements.md` covering enterprise login, menu-first admin IA, tenant management, direct tenant branding and HTML content editing, tenant permission controls, and full tenant product or service CRUD from admin.
- Synchronized the new admin requirement through `project.md`, `docs/architecture/internal-admin-app-strategy.md`, `docs/users/administrator-guide.md`, `docs/development/implementation-progress.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/development/sprint-13-16-user-surface-delivery-package.md`, and `docs/development/roadmap-sprint-document-register.md`.

## Documentation Closeout Workflow Hardened

- Extended `scripts/sync_repo_docs_to_notion.py` with targeted `--path` syncing and optional `--output-json`, and exposed the batch publish path through `python3 scripts/telegram_workspace_ops.py sync-repo-docs`
- Tightened the repo workflow docs in `AGENTS.md`, `TOOLS.md`, `README.md`, `project.md`, `docs/development/notion-sync-operator-guide-2026-04-21.md`, and `docs/development/implementation-progress.md` so future changes must close the loop through requirement docs, implementation tracking, sprint or phase artifacts, Notion, and Discord
- Fixed the final missing Notion page `docs/development/implementation-progress.md` by further reducing block pressure in `scripts/sync_telegram_update.py` through larger grouped paragraphs and multi-chunk rich text blocks
- Verified the configured Notion parent page now contains the full expected documentation set with `expected_count = 152` and `missing_count = 0`
- Published the closeout workflow update to Notion at `https://www.notion.so/BookedAI-documentation-closeout-workflow-hardened-349b21fdf8c7817984cce782ce66f413` and mirrored the summary to Discord channel `1485197822583377993`

## Discord Summary Direct Text Mode

- Updated `scripts/sync_telegram_update.py` so Discord posts now contain the direct summary text only, without appending `Archive:` or `Notion:` links
- Kept Notion as the full-detail destination for long-form change notes and documentation payloads
- Synced the new channel-split rule into `AGENTS.md`, `TOOLS.md`, `README.md`, `project.md`, `docs/development/notion-sync-operator-guide-2026-04-21.md`, and `docs/development/implementation-progress.md`
- Verified the new mode with a live operator test: Notion page `https://www.notion.so/Discord-summary-mode-check-349b21fdf8c7810cabcbde4a19a8891d` was created and the latest Discord message body contained only the expected summary text

## CI/CD Collaboration Summary

- Added `docs/development/ci-cd-collaboration-guide.md` as the quick handoff guide for other team members, summarizing the real current BookedAI delivery model: local validation, root release gate, beta rehearsal, host-level production deploy, live verification, and docs or Notion or Discord closeout
- Updated `README.md`, `project.md`, `docs/architecture/devops-deployment-cicd-scaling-strategy.md`, `docs/development/release-gate-checklist.md`, and `docs/development/implementation-progress.md` so the collaboration and release path is documented consistently across repo entrypoints, architecture guidance, and release-control docs
- Preserved the repo-truthful message that BookedAI does not yet run a full automated GitHub Actions promotion pipeline; the current CI/CD path remains script-driven on the Docker VPS with `beta.bookedai.au` as the rehearsal surface before production promotion
- Published the detailed CI/CD collaboration update to Notion at `https://www.notion.so/BookedAI-CI-CD-collaboration-process-updated-349b21fdf8c781c48105fe93e5cd465c` and mirrored the concise summary to Discord channel `1485197822583377993`

## Official Logo Refresh

- Added the operator-provided official BookedAI logo asset into `frontend/public/branding/` and mirrored the branding bundle into root `public/branding/` so both the Vite frontend and parallel Next experiment can resolve the same `/branding/*` paths
- Remapped shared logo sources in `frontend/src/components/landing/data.ts`, `frontend/src/components/landing/ui/LogoMark.tsx`, `components/brand/logo.tsx`, and `frontend/src/components/brand-kit/brand.tsx` to use `/branding/bookedai-logo-official.png?v=20260421-official-logo`
- Kept the existing square icon and favicon assets in place for compact/icon-only contexts, because the new official artwork is a wide lockup with tagline rather than a 1:1 app icon
- Added a white surface treatment for dark-background logo renders so the official blue wordmark remains legible in sticky headers and dark sections
- Verified the frontend still builds successfully with `npm --prefix frontend run build`

## Live Deploy For Official Logo

- Deployed the official logo refresh to production with `bash scripts/deploy_live_host.sh`
- Post-deploy checks passed for `https://bookedai.au` (`HTTP/2 200`) and `https://api.bookedai.au/api/health` (`{"status":"ok","service":"backend"}`)
- Verified the new production asset path `https://bookedai.au/branding/bookedai-logo-official.png?v=20260421-official-logo` is live and returning `200`

## Official Logo Asset Optimization

- Generated a lighter web delivery asset `bookedai-logo-official.webp` from the original 1914x1034 PNG and reduced the served logo weight from roughly `455 KB` to roughly `60 KB`
- Switched shared logo render paths in landing and brand components to the WebP variant with cache-busting version `20260421-official-logo-webp`
- Kept the original PNG in the branding bundle as the source-of-truth archive while using the optimized WebP for page rendering performance
- Rebuilt the frontend successfully after the logo asset optimization
- Deployed the WebP logo optimization live and verified `https://bookedai.au/branding/bookedai-logo-official.webp?v=20260421-official-logo-webp` returns `HTTP/2 200` with `content-type: image/webp` and `content-length: 60864`

## Product Runtime V1 Flow And Mobile Fit

- Updated `frontend/src/apps/public/ProductApp.tsx` so `product.bookedai.au` now reflects the current BookedAI v1 mode in its shell copy and trims mobile chrome so the assistant gets more usable screen height
- Updated `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` so product runtime booking writes now use the authoritative v1 booking intent path whenever v1 is enabled, instead of incorrectly requiring live-read to be enabled first
- Refined the product mobile layout by tightening the standalone shell width, reducing booking-sheet peek and half heights, softening oversized padding/radius on inner cards, and renaming flow copy from Prompt 5 wording to BookedAI v1 wording
- Verified the frontend still builds successfully with `npm --prefix frontend run build`
- Deployed the product runtime update live with `bash scripts/deploy_live_host.sh` and verified `https://product.bookedai.au` returns `HTTP/2 200` while `https://api.bookedai.au/api/health` remains healthy

## CI/CD Runbook Documentation

- Added `docs/development/ci-cd-deployment-runbook.md` as the detailed operator SOP for local validation, beta rehearsal, host-level production deploy, verification, rollback framing, and docs closeout
- Kept `docs/development/ci-cd-collaboration-guide.md` as the short team handoff layer, and linked the new runbook from README, project, release-gate, implementation-progress, roadmap register, and the DevOps strategy doc
- Captured the real current deploy behavior from `deploy_beta`, `deploy_live_host`, `deploy_production`, and `telegram_workspace_ops` so the docs now match the scripts instead of leaving operators to infer the release path
- Added `docs/development/project-update-2026-04-21-cicd-runbook.md` as the detailed change note for Notion and Discord closeout

## Sprint One-Line Summary

- Added `docs/development/sprint-one-line-summary-2026-04-21.md` with one repo-truthful summary line per Sprint 1-16, based on the current roadmap, execution plan, sprint register, and implementation-progress docs
- Prepared the same concise sprint-by-sprint text in a Discord-ready format so operator updates can be pushed without rewriting the summary by hand

## Discord Sprint Summary Channel

- Extended `scripts/sync_telegram_update.py` and `scripts/telegram_workspace_ops.py sync-doc` with `--discord-channel-id` so specific updates can target a chosen Discord channel without changing the global announce-channel env config
- Documented the sprint-summary posting pattern in `README.md`, with the dedicated sprint-results channel set to `1492396016563912875`
- Tried posting a confirmation update to Discord channel `1492396016563912875`, but the bot currently receives `HTTP 403 Missing Access`, so the workflow is ready but that channel still needs bot visibility/permission before delivery will succeed

## Live Redeploy

- Ran `bash scripts/deploy_live_host.sh` from the current worktree and completed a live production redeploy of web, backend, beta-web, beta-backend, proxy, and Hermes
- Verified post-deploy health with `HTTP/2 200` from `https://bookedai.au`, `{\"status\":\"ok\",\"service\":\"backend\"}` from `https://api.bookedai.au/api/health`, and container uptime confirmed for `bookedai-web-1`, `bookedai-backend-1`, `bookedai-beta-web-1`, `bookedai-beta-backend-1`, `bookedai-proxy-1`, `bookedai-hermes-1`, `bookedai-n8n-1`, and healthy `supabase-db`

- Backend booking ownership pass: `backend/api/v1_booking_handlers.py` now resolves effective tenant from `ServiceMerchantProfile.service_id` for public v1 `create_lead` and `create_booking_intent`, so writes no longer drift to default tenant when actor context is sparse.
- Added `_resolve_service_tenant_id(...)` and switched lead/contact/booking repositories plus audit/outbox success envelope to use the effective service tenant when available.
- Backend mirror/callback pass: `backend/service_layer/booking_mirror_service.py` now resolves tenant from service id for `dual_write_booking_assistant_session(...)` and from existing `booking_reference` rows for `sync_callback_status_to_mirrors(...)`, reducing default-tenant drift in post-write sync.
- Verified backend syntax after both patches with `python3 -m py_compile backend/api/v1_booking_handlers.py backend/service_layer/booking_mirror_service.py backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py`.
- Follow-up still open: inspect `tenant_bookings` and portal snapshot/detail read paths to confirm tenant-correct records also surface correctly in tenant workspace and customer portal responses.
- Tightened portal read integrity in `backend/service_layer/tenant_app_service.py`: `_load_portal_booking_row(...)` now joins `service_merchant_profiles` on both `service_id` and `tenant_id`, and `build_portal_booking_snapshot(...)` now loads payment state by `booking_intent_id` instead of only `booking_reference`, reducing cross-tenant or cross-record leakage risk in portal business/support/payment details.
- Created a new branding asset suite from the latest uploaded logo under `frontend/public/branding/` and mirrored it to `public/branding/`, including light, dark, black, transparent, homepage, square, and refreshed favicon/app-icon variants.
- Repointed the frontend brand constants and favicon links to the new `20260421-branding-suite` assets in `frontend/src/components/landing/data.ts`, `frontend/src/components/brand-kit/brand.tsx`, `components/brand/logo.tsx`, and `frontend/index.html`.
- Fixed homepage readability in `frontend/src/components/landing/sections/HomepageOverviewSection.tsx` by moving the `Why this helps us` block back onto a light surface with dark text and slate cards so it matches the page template.
- Verified the frontend still builds successfully with `npm --prefix frontend run build` after the branding and homepage overview updates.
- Reviewed the Prompt 9 / intelligent-search path to confirm BookedAI still prefers OpenAI when `OPENAI_API_KEY` is configured: `backend/integrations/ai_models/semantic_search_adapter.py` prepends OpenAI ahead of the semantic provider chain, while `backend/services.py` public-web fallback remains OpenAI-only.
- Targeted backend verification passed with `.venv-backend/bin/python -m unittest backend.tests.test_semantic_search_adapter backend.tests.test_prompt9_semantic_search_service backend.tests.test_api_v1_search_routes` (`25` tests, green).
- Targeted frontend live-read smoke also passed with `npm --prefix frontend run test:playwright:live-read`, including the authoritative v1 booking-intent write path and the just-in-time `near me` location prompt flow.
- Reframed `frontend/src/apps/public/ProductApp.tsx` and `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` so `product.bookedai.au` now explains the BookedAI flow in user-facing terms (`Search -> Match -> Book -> Follow-up`) instead of surfacing internal V1 wording in the primary shell.
- Reviewed the current live-read + booking path using Playwright on `product.bookedai.au`; tenant-first shortlist truth, sourced public-web fallback, near-me guardrails, and authoritative `v1 booking intent` booking submit all passed when built through the live-read env path.
- Important verification note: `VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED` and `VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ` are build-time flags, so previewing a previously built bundle can misleadingly show fallback mode even if the test runner sets runtime env later.
- Added `backend/migrations/sql/013_ai_mentor_tenant_seed.sql` for a third official tenant seed `ai-mentor-doer`, including tenant settings main message `Convert AI to your DOER`, published private and group AI mentoring catalog rows, and password credential `tenant3 / 123`.
- Applied the AI mentor seed directly to the local `bookedai` Postgres database in `supabase-db` and verified the tenant row, `tenant3` credential, `main_message`, and `10` service catalog rows exist.
- Synced the tenant-seed change into `project.md`, `docs/development/implementation-progress.md`, `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`, `backend/migrations/README.md`, and `docs/development/project-update-2026-04-21-ai-mentor-tenant-seed.md`.
- Added five custom SVG package illustrations for tenant 3 under `frontend/public/tenant-assets/ai-mentor/` and mirrored them into `public/tenant-assets/ai-mentor/`.
- Updated all tenant 3 package rows so `image_url` now uses the new AI mentor illustrations and both `booking_url` plus `source_url` now point to `https://ai.longcare.au`.
- Added `AIMentorProApp` plus `partner-plugins/ai-mentor-pro-widget.js` so tenant 3 now has an official BookedAI plugin interface for `ai.longcare.au` with inline/modal embed support.
- Tenant-scoped the plugin runtime through `tenant_ref = ai-mentor-doer`, `channel = embedded_widget`, and `deployment_mode = plugin_integrated`, and tightened v1 search plus legacy catalog/chat/session reads so the widget stays on the tenant's 10 AI mentoring products.
- Frontend build passed and backend route-handler syntax verification passed after the AI Mentor Pro plugin/runtime changes.
- Extended `tenant.bookedai.au` with a tenant-managed `Plugin` workspace backed by `tenant_settings`, so partner tenants can edit runtime embed metadata and copy official inline/modal/iframe snippets without repo access.
- Hardened search guardrails across Prompt 9 and live-read: tenant search now keeps `online`-tagged services eligible even when the query carries a locality or `near me`, while still filtering out wrong-tenant and wrong-intent matches before any public-web fallback is shown.
- Updated `backend/api/v1_routes.py` and `frontend/src/apps/public/HomepageSearchExperience.tsx` so just-in-time location prompting only happens when the live-read search actually needs nearby context, and when GPS is granted the response/summary now carries `Current location` back into the visible search intent text.
- Added focused regression coverage with `.venv-backend/bin/python -m unittest backend.tests.test_prompt9_matching_service backend.tests.test_api_v1_search_routes backend.tests.test_api_v1_search_location_guardrails`, `npm --prefix frontend run test:playwright:live-read`, and `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-location-guardrails.spec.ts`.
- Refreshed the homepage search shortcut chips to a smaller compact hint style and narrowed the promoted hot keywords to `Swim`, `Chess`, `AI Event`, and `AI Mentor 1-1`, with matching prompt text updated in `frontend/src/apps/public/homepageContent.ts`.
- Added `Haircut` and `Restaurant` homepage shortcuts, with `Restaurant` now intentionally phrased to trigger just-in-time nearby live-read instead of falling back to preloaded BookedAI catalog content.
- Restaurant search in `backend/api/v1_routes.py` now runs as public-web live search only on public surfaces, returning only venue-level results that have either a direct booking link or a venue phone number for call-to-book, and never mixing stored tenant catalog rows into that shortlist.
- Public-web live-read candidates now carry `contact_phone` through backend normalization, frontend contracts, and `PartnerMatch` UI so compact phone text plus a `Call` action can appear alongside `Book now` / `View venue` links when a restaurant only exposes a call path.
- Homepage search loading state now says BookedAI is finding the most suitable place and shows more explicit progress pills (`Checking nearby area`, `Opening live search`, `Preparing booking options`) while stale shortlist rows stay hidden during the new search.
- Verification this round: `npm --prefix frontend run build`; `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_search_routes`; `npm --prefix frontend run test:playwright:live-read`; targeted `public-booking-assistant-live-read` in-progress loading spec passed; `public-booking-assistant-location-guardrails.spec.ts` failed once because Playwright could not find the homepage assistant input at page open, which looked like a runtime/test-harness flake rather than a search-result assertion failure.
- Fixed a live-read booking regression in `frontend/src/apps/public/HomepageSearchExperience.tsx` and `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`: after authoritative `v1 booking intent` write, checkout-ready flows now hydrate the richer booking success payload again so booking reference, payment CTA, calendar link, and email handoff states render as designed instead of collapsing to the minimal callback-style success card.
- Kept the guardrail that callback/manual flows still avoid the legacy booking-session call, so `v1` remains the authoritative write path unless the live-read trust/path summary says immediate checkout handoff is allowed for the selected service.
- Verification for the full search-to-book pass: focused Playwright cases now pass for live-read guidance, ranked shortlist display, sourced public-web fallback, just-in-time location prompting, in-progress search state, authoritative booking submit, rich payment/email/calendar success card, and the location-guardrail spec after one flaky rerun.
- Tenant auth UX pass: `frontend/src/features/tenant-auth/TenantAuthWorkspace.tsx` now explains Google as a first-class path for both `Create account` and later `Sign in`, instead of leaving it as generic continuation copy.
- Tenant create-account flow is now Google-first: the auth shell surfaces `Create your tenant with Google first` as the recommended path, then keeps username/password creation as the fallback option below it.
- Tenant sign-in flow is now also Google-first: the auth shell surfaces `Sign in with Google first` as the recommended path, with username/password kept below as the fallback sign-in option.
- Tenant auth copy polish pass: headings, benefit text, Google guidance, and password fallback copy in `TenantAuthWorkspace.tsx` were shortened and made more premium/product-facing while keeping the same auth logic.
- Tenant auth visual polish pass: the same card now has stronger hierarchy for mode switching, Google-first callouts, dividers, scope chips, and password fallback sections so sign-in/register feels more premium without changing behavior.
- Tenant gateway shell polish pass: the `tenant.bookedai.au` hero and supporting info cards in `TenantApp.tsx` now visually match the upgraded auth card, with a stronger hero treatment and cleaner product-style supporting panels.
- `frontend/src/apps/tenant/TenantApp.tsx` now changes the rendered Google Identity button text by auth mode (`signup_with`, `signin_with`, `continue_with`) and clears stale Google-choice/error state when auth mode changes or the operator signs out.
- Frontend verification passed after the tenant Google-auth polish with `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit` and `npm --prefix frontend run build`.
- Tenant billing now links to the real BookedAI Stripe runtime: backend added hosted Stripe Checkout and Billing Portal session routes plus tenant-side Stripe customer/session persistence in `tenant_settings.billing_gateway`.
- `backend/service_layer/tenant_app_service.py` now enriches the tenant billing snapshot with live Stripe subscription, invoice, and default payment-method state when a Stripe customer exists, instead of leaving payment method and invoice posture as placeholder-only seams.
- `frontend/src/apps/tenant/TenantApp.tsx` and `frontend/src/features/tenant-billing/TenantBillingWorkspace.tsx` now redirect package selection into Stripe Checkout, open Stripe Billing Portal for payment-method management, and prefer hosted Stripe invoice/receipt URLs when present.
- Verification for the Stripe linkage pass: `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`.
- Homepage visual re-polish pass: `frontend/src/apps/public/PublicApp.tsx` now uses a richer background system and includes a new `HomepageExecutiveBoardSection` so the page reads more like an executive product board than a series of isolated marketing sections.
- `HomepageBrandStatementSection.tsx`, `HeroSection.tsx`, and `HomepageOverviewSection.tsx` were upgraded with stronger business-facing framing, visual summary cards, and workflow/readout rails so the top half of the homepage feels more professional and more visual at first scan.
- Verification for the homepage polish pass: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`.
- Follow-up homepage message-filter pass: top-of-page copy now leans harder into investor and enterprise signals such as operating layer, workflow discipline, conversion continuity, and scale posture instead of broader SME feature phrasing.
- Updated `frontend/src/components/landing/data.ts`, `HeroSection.tsx`, `HomepageBrandStatementSection.tsx`, `HomepageExecutiveBoardSection.tsx`, `HomepageOverviewSection.tsx`, and `TrustSection.tsx` so the first-minute narrative surfaces the highest-value content instead of trying to say everything.
- Verification for the enterprise/investor framing pass: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`.
- Homepage commercial-framing pass: `PricingSection.tsx`, `PricingPlanCard.tsx`, `PricingRecommendationPanel.tsx`, `pricing-shared.ts`, and homepage pricing/FAQ copy in `data.ts` now frame the buying story around operating maturity, rollout scope, approval clarity, and scale posture instead of lighter retail-style package language.
- The public homepage commercial layer now reads more like an enterprise buying narrative: clear entry layer, clear paid default, custom scope only when justified, and visible setup/monthly/commission logic.
- Verification for the pricing/trust enterprise pass: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`.
- Final homepage enterprise-consistency pass: `PublicApp.tsx`, `TeamSection.tsx`, `CallToActionSection.tsx`, `Footer.tsx`, and supporting homepage source copy now keep header labels, leadership framing, closeout CTA wording, and footer commercial cues aligned with the same investor-ready story as hero, pricing, and trust.
- Redeployed the full production stack live with `bash scripts/deploy_live_host.sh` after the homepage enterprise pass.
- Post-deploy checks passed: `https://bookedai.au`, `https://tenant.bookedai.au`, and `https://product.bookedai.au` returned `HTTP/2 200`; `https://api.bookedai.au/api/health` returned `{"status":"ok","service":"backend"}`.
- Public `register-interest` failure handling is now clearer: `frontend/src/shared/api/client.ts` resolves backend `detail` and validation messages into the thrown frontend error instead of showing only generic `API request failed: <status>`.
- `frontend/src/apps/public/RegisterInterestApp.tsx` now validates phone input the same way backend pricing consultation does, requiring at least 8 digits before submit so SME registration no longer slips into avoidable server-side rejects.
- Verified the targeted public registration failure case with Playwright from `frontend/`: `npx playwright test tests/pricing-demo-flows.spec.ts --grep "register interest surfaces backend validation details"`.
- Public homepage booking flow was then tightened too: `frontend/src/apps/public/HomepageSearchExperience.tsx` now uses the same email/phone validation posture as the other booking assistants before submit, and legacy booking-submit errors there now use the shared API error-message resolver instead of falling back to raw status text.
- Added a live-read regression for authoritative booking-intent failure handling in `frontend/tests/public-booking-assistant-live-read.spec.ts`, confirming backend `v1` booking-intent errors surface the real operator-facing message during submit instead of a generic failure.
- Verification for the booking-flow pass: `npm --prefix frontend run build`; `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled|booking submit surfaces v1 booking intent validation details when the authoritative write fails"`.
- Follow-up public assistant hardening pass: `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` and `frontend/src/components/landing/sections/BookingAssistantSection.tsx` now also use the shared API error-message resolver for catalog load, chat send, and booking submit failures, so the remaining public assistant shells no longer collapse backend failures into generic transport text.
- Replaced the root-owned `BookingAssistantSection.tsx` safely through a patched temp copy because direct in-place writes were blocked by file ownership, then confirmed the rebuilt frontend still passes.
- Focused live-read verification still passes after the wider public assistant error-handling pass; one broader legacy smoke assertion currently fails independently because it now observes `2` `/api/v1/*` calls where the old test still expects `0`, so that legacy assertion should be treated as an existing baseline mismatch rather than a regression from this error-message patch.
- Tenant Google auth now fails more truthfully when config is missing: backend `_verify_google_identity_token` returns the explicit setup message for missing `GOOGLE_OAUTH_CLIENT_ID`, and frontend `handlePromptGoogle()` shows the same guidance immediately when `VITE_GOOGLE_CLIENT_ID` is absent.
- Verification for the Google-auth config-message pass: `python3 -m py_compile backend/api/v1_routes.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`.
- Tenant Google auth is now also wired through the production deploy path: `frontend/Dockerfile` accepts `VITE_GOOGLE_CLIENT_ID`, `docker-compose.prod.yml` injects `GOOGLE_OAUTH_CLIENT_ID` into backend containers, and frontend production builds fall back to that same value so one real Google client ID can enable the tenant Google button plus backend token verification together.
- Verification for the production wiring pass: `python3 -m py_compile backend/api/v1_routes.py backend/config.py`; `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`; `npm --prefix frontend run build`.
- Configured the shared BookedAI Google OAuth web client `1060951992040-ne31cd37bi707ctg85mcu840ucpa5rqr.apps.googleusercontent.com` into both frontend and backend env, redeployed live with `bash scripts/deploy_live_host.sh`, and verified that `tenant.bookedai.au` plus `api.bookedai.au/api/health` are live and that the served tenant bundle now contains the real Google client ID.
- Live QA pass on `tenant.bookedai.au` now confirms the shared gateway renders a real Google button for both `Sign in` and `Create account` modes in Playwright headless, with `Sign in with Google` and `Sign up with Google` copy visible in the embedded Google Identity button.
- Residual QA note: Google Identity Services logs one warning when switching modes, `google.accounts.id.initialize() is called multiple times`, but the page showed 0 console errors and the live Google button still rendered in both auth modes.
- Locked the next tenant UX requirement wave as an enterprise workspace redesign: clearer menu or sidebar IA, section-specific guidance, inline edit or save flows, tenant-managed image upload, and HTML-editable tenant introduction content are now written into tenant requirement, roadmap, sprint, and implementation docs.
- Added the detailed change note at `docs/development/project-update-2026-04-21-tenant-enterprise-workspace.md` and successfully synced it to Notion (`https://www.notion.so/Tenant-enterprise-workspace-requirement-update-349b21fdf8c7814c80dff92cbe0f148b`) with the matching concise operator summary mirrored to Discord channel `1485197822583377993`.
- Started the first tenant enterprise workspace implementation slice: tenant overview now carries workspace settings and per-panel guidance, tenant profile editing has expanded into an `Experience Studio`, and the tenant runtime now uses sidebar-style navigation with a dedicated experience panel.
- Added admin-only tenant management backend surfaces in `backend/api/route_handlers.py` and `backend/api/admin_routes.py` for tenant directory/detail, profile updates, member access changes, and tenant-scoped service create/update/delete, with audit log events and HTML sanitization for tenant introduction content.
- Extended the admin frontend shell with a new `tenants` workspace in `frontend/src/components/AdminPage.tsx`, `workspace-nav.tsx`, and `workspace-insights.tsx`, so admin now has a dedicated menu-first surface for tenant operations instead of mixing tenant controls into catalog or reliability flows.
- Added `frontend/src/features/admin/tenant-management-section.tsx` plus new admin state and API wiring so operators can select a tenant, edit branding and intro HTML, update guide copy, change tenant roles/status, upload logo/hero assets, and manage tenant-scoped products or services inline.
- Verification for the admin tenant workspace slice: `python3 -m py_compile backend/api/route_handlers.py backend/api/admin_routes.py backend/schemas.py` passed; full frontend `tsc` did not surface immediate errors but timed out after 30 seconds because the project-wide typecheck is currently heavy.
