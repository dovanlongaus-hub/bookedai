"""
BookedAI investor pitch — slide content.

Single source of truth for the deck. Sourced from:
- docs/executive-briefing/00-08
- frontend/src/apps/public/pitch-investor-slides.ts
- README.md / DESIGN.md / prd.md

Edit here to update the deck. Run build_pitch_deck.py to regenerate the .pptx.
"""

from datetime import date


# ---------- Meta ----------
COMPANY = "BookedAI"
TAGLINE = "The AI Revenue Engine for Service Businesses"
SUBTAGLINE = "Never lose a service enquiry again."
DECK_TITLE = "BookedAI · Investor Pitch"
PRESENTER = "Founder & CEO · admin@bookedai.au"
DECK_DATE = date(2026, 4, 29)
AUDIENCE = "WSTI Judges · Pre-seed / Seed Investors"
URLS = {
    "homepage": "bookedai.au",
    "pitch": "pitch.bookedai.au",
    "demo": "demo.bookedai.au",
    "product": "product.bookedai.au",
    "chess": "chess.bookedai.au",
    "aimentor": "aimentor.bookedai.au",
    "tenant": "tenant.bookedai.au",
    "portal": "portal.bookedai.au",
    "admin": "admin.bookedai.au",
    "api": "api.bookedai.au",
    "supabase": "supabase.bookedai.au",
    "n8n": "n8n.bookedai.au",
}


# ---------- Slide 02 — Vision ----------
VISION = {
    "kicker": "Vision",
    "title": "We turn missed service enquiries into booked revenue.",
    "body": (
        "BookedAI is an omnichannel AI agent layer that captures intent across "
        "WhatsApp, SMS, Telegram, email, and web chat — then creates booking "
        "references, tracks payment posture, and records every revenue action "
        "in an auditable operating system."
    ),
    "pillars": [
        ("Capture", "Every message becomes structured intent."),
        ("Convert", "Match → Compare → Book in one flow."),
        ("Continue", "Portal, payment, follow-up, retention."),
    ],
}


# ---------- Slide 03 — Problem ----------
PROBLEM = {
    "kicker": "The Problem",
    "title": "Service SMEs lose more revenue to slow replies than to bad SEO.",
    "stats": [
        ("38%", "of service enquiries never get a reply within 24 hours."),
        ("$0", "spent on tools that turn DMs / WhatsApp into bookings."),
        ("3-5 apps", "stitched by hand: calendar, payments, chat, CRM, email."),
    ],
    "narrative": [
        "Salons, clinics, tutors, swim schools, tradies live in WhatsApp/SMS — but their booking, payment, and follow-up still live in disconnected tools.",
        "Calendly is generic. Mindbody/Booksy are vertical but pre-AI. There is no AU/NZ AI-native operating layer for service SMEs.",
        "Revenue leaks at every gap: missed first reply, dropped follow-up, no payment chase, no retention loop.",
    ],
}


# ---------- Slide 04 — Why Now ----------
WHY_NOW_STATS = [
    ("~10x", "AI inference cost down",
     "Frontier model token cost dropped ~10x since 2023. Always-on agents are now profitable at SME ARPU."),
    ("600k", "AU service SMEs",
     "Salons, clinics, tradies, schools, academies — English-first, Stripe-ready, mobile-led demand."),
    ("<30%", "Service-SME software penetration",
     "No Booksy/GoHighLevel local dominance; messaging-first booking is still a wide-open category."),
]
WHY_NOW_SIGNALS = [
    ("LLM cost curve",
     "Inference economics finally support always-on agents at A$249/mo SME pricing — what was demo-only in 2023 is profitable infra in 2026."),
    ("AU messaging shift",
     "WhatsApp + Telegram are the default consumer reply surface. Service SMEs lose more revenue to slow replies than to bad SEO."),
    ("Vertical SaaS gap",
     "No local Booksy or GoHighLevel; Calendly is generic. The operating-layer slot for AU/NZ/SG service SMEs is unclaimed."),
]


# ---------- Slide 05 — Solution ----------
SOLUTION = {
    "kicker": "The Solution",
    "title": "One AI Revenue Engine. Every channel. Every booking. Audited.",
    "loop_steps": ["Ask", "Match", "Compare", "Book", "Confirm", "Portal", "Follow-up"],
    "loop_caption": "The canonical journey is preserved on every surface — public, demo, product, portal, tenant, admin, and messaging.",
    "agent_classes": [
        ("Search & Conversation",
         "Natural-language intent → shortlist → booking on WhatsApp, Telegram, web, email."),
        ("Revenue Operations",
         "Booking references, payment posture, billing reminders, audit ledger."),
        ("Customer Care & Status",
         "Portal-grounded answers, request-safe cancel/reschedule, retention follow-up."),
    ],
}


# ---------- Slide 06 — Surfaces ----------
SURFACES = [
    ("bookedai.au", "Executive acquisition homepage + live search-to-booking workspace"),
    ("product.bookedai.au", "Live product runtime — ChatGPT-style composer, results-first booking flow"),
    ("portal.bookedai.au", "Returning-customer command center: status, payment, QR, reschedule"),
    ("tenant.bookedai.au", "Tenant workspace — auth, billing, team, catalog, ops queue"),
    ("admin.bookedai.au", "Admin oversight, partner management, QA workflows"),
    ("api.bookedai.au", "FastAPI + bounded-context /api/v1/* routers"),
    ("chess.bookedai.au", "Chess tenant — Co Mai Hung / Grandmaster booking surface"),
    ("aimentor.bookedai.au", "AI Mentor 1-1 Pro tenant — student/enrolment runtime"),
    ("pitch.bookedai.au", "Investor pitch + architecture visualization surface"),
    ("supabase.bookedai.au", "Self-hosted Postgres / Auth / REST / Storage"),
    ("n8n.bookedai.au", "Workflow automation — booking, billing, follow-up cron"),
    ("hermes.bookedai.au", "Knowledge / documentation service"),
]


# ---------- Slide 07 — Booking Journey ----------
JOURNEY = {
    "kicker": "Canonical Journey",
    "title": "Ask → Match → Compare → Book → Confirm → Portal → Follow-up",
    "steps": [
        ("Ask", "Customer types in any language, any channel — WhatsApp, Telegram, web."),
        ("Match", "Agent shortlists verified BookedAI tenants with capability chips."),
        ("Compare", "Compact cards — provider, price, location, confidence, reason."),
        ("Book", "Explicit Book action; contact captured; reference issued."),
        ("Confirm", "Portal link, payment posture, QR, channel-native reply."),
        ("Portal", "Returning customer command center for status & changes."),
        ("Follow-up", "Retention loop: payment chase, review, rebook, referral."),
    ],
    "footer": "Mobile no-overflow at 390px is a hard release gate.",
}


# ---------- Slide 08 — Three Agent Classes ----------
AGENTS = [
    {
        "title": "Search / Conversation Agent",
        "subtitle": "BookedAI Manager Bot",
        "channels": "Telegram · WhatsApp · web chat · email",
        "responsibilities": [
            "Natural-language intent extraction (any language).",
            "Shortlist verified BookedAI tenants by capability.",
            "Capture booking; issue reference; portal handoff.",
        ],
    },
    {
        "title": "Revenue Operations Agent",
        "subtitle": "Tenant Ops surface",
        "channels": "Tenant workspace · admin reconciliation",
        "responsibilities": [
            "Booking-linked revenue attribution.",
            "Payment posture: paid / pending / overdue / manual review.",
            "Commission summary, billing truth, audit drill-down.",
        ],
    },
    {
        "title": "Customer Care / Status Agent",
        "subtitle": "Portal-grounded replies",
        "channels": "WhatsApp · Telegram · portal · email",
        "responsibilities": [
            "Identity by booking reference + safe phone/email match.",
            "Request-safe cancel/reschedule queued to tenant queue.",
            "60-day conversation window, retention follow-up.",
        ],
    },
]


# ---------- Slide 09 — Live Evidence ----------
LIVE_EVIDENCE = [
    {
        "step": "01",
        "surface": "Telegram · @BookedAI_Manager_Bot",
        "title": "Customer types — agent books",
        "caption": "A parent types a chess class enquiry; agent shortlists, captures contact, issues reference.",
        "lines": [
            ("customer", "Chess class for my 8 year old in Sydney, beginner level"),
            ("agent", "Top match: Co Mai Hung Chess Academy · Saturday 10:00 · A$45 trial. Tap Book 1 to confirm."),
            ("customer", "[Book 1]"),
            ("agent", "Booked. Reference CMHC-2026-0428-014. Portal link sent. Studio will confirm by 6pm."),
        ],
    },
    {
        "step": "02",
        "surface": "Admin · Pending Handoffs",
        "title": "Booking surfaces in operator queue",
        "caption": "Operator sees the fresh handoff queued under 30 seconds — full conversation + tenant context attached.",
        "lines": [
            ("system", "CMHC-2026-0428-014 · Co Mai Hung Chess · channel=telegram · status=PENDING_TENANT_CONFIRM"),
            ("system", "Customer: Linh P. · +61 4xx xxx xxx · child age 8 · prefers Saturday morning"),
            ("system", "action_run: SHORTLIST → BOOK → CONFIRM_OUTBOUND queued · trace 9eb8…"),
        ],
    },
    {
        "step": "03",
        "surface": "Business workspace · audit history",
        "title": "Every step lands in the revenue ledger",
        "caption": "Search, shortlist, book, confirm — all rows for review and reporting.",
        "lines": [
            ("system", "run 8431 · search_intent · ok · 220ms · channel=telegram"),
            ("system", "run 8432 · shortlist_match · ok · matched=co-mai-hung-chess"),
            ("system", "run 8433 · booking_capture · ok · ref=CMHC-2026-0428-014"),
            ("system", "run 8434 · confirm_outbound · ok · channel=telegram · 412ms"),
        ],
    },
]


# ---------- Slides 10-12 — Tenant cases ----------
TENANT_CASES = [
    {
        "name": "Chess",
        "title": "Co Mai Hung Chess Class · Grandmaster Chess",
        "subdomain": "chess.bookedai.au",
        "tagline": "First reusable vertical template — kids activity / academy.",
        "loop": "Intent → assessment → placement → booking → payment → class → coach input → AI report → parent follow-up → monthly billing → retention.",
        "evidence": [
            "Tenant `co-mai-hung-chess-class` live with Telegram notifications to chat 8426853622.",
            "Verified-tenant chips: Book, Stripe, QR, calendar, email, WhatsApp Agent, portal edit.",
            "First commercial loop validated end-to-end on production stack.",
        ],
        "status": "LIVE — proof case",
    },
    {
        "name": "AI Mentor",
        "title": "AI Mentor 1-1 Pro",
        "subdomain": "aimentor.bookedai.au",
        "tagline": "Standalone tenant runtime — independent sub-project, shared backend + flows.",
        "loop": "Discover → enrol → schedule 1:1 → mentor session → progress tracking → renewal.",
        "evidence": [
            "Activated 2026-04 · default_server routing isolated, brand-kit isolated.",
            "Tenant `ai-mentor-doer` runs on shared Messaging Automation Layer.",
            "Demonstrates multi-tenant template generalisation thesis.",
        ],
        "status": "LIVE — Wave-17b activation",
    },
    {
        "name": "Future Swim",
        "title": "Future Swim — first commercial revenue loop",
        "subdomain": "futureswim.bookedai.au (Sprint 20)",
        "tagline": "First paying-tenant proof; first A$ booked through the production agent stack.",
        "loop": "Enquiry → assessment → trial booking → recurring class subscription → progress reports → renewal.",
        "evidence": [
            "Sprint 20 (2026-04-27 → 2026-05-10) target: full loop end-to-end.",
            "Anchors `Tenant Revenue Proof` dashboard — investor-grade KPIs (Sprint 22).",
            "Validates SaaS + commission monetization model on real revenue.",
        ],
        "status": "Sprint 20 — first revenue loop",
    },
]


# ---------- Slide 13 — Architecture ----------
ARCHITECTURE_LAYERS = [
    ("Experience", "frontend/", "React 18 + TypeScript + Vite · multi-surface (public, product, portal, tenant, admin, chess, aimentor)"),
    ("Application", "backend/", "FastAPI · bounded-context /api/v1/* routers (booking, search, tenant, communication, integration)"),
    ("Intelligence", "service_layer/", "MessagingAutomationService · Search/Conversation, Revenue Ops, Customer Care agents · LLM orchestration"),
    ("Data", "Supabase (self-hosted)", "Postgres + Auth + REST + Storage via Kong · audit_outbox · idempotency tables"),
    ("Automation", "n8n/", "Booking webhooks · Google Calendar · Stripe events · billing reminders · retention crons"),
    ("Platform", "deploy/", "Docker Compose · Nginx + Certbot · 11 routed subdomains · self-hosted on a single VPS"),
]


# ---------- Slide 14 — Tech Stack ----------
TECH_STACK = {
    "frontend": ["React 18", "TypeScript", "Vite", "Tailwind", "Apple-design tokens"],
    "backend": ["FastAPI", "Python 3.12", "Pydantic", "SQLAlchemy", "OpenAI SDK"],
    "data": ["PostgreSQL (Supabase)", "Storage (S3-compat)", "Pgvector (semantic search)"],
    "automation": ["n8n", "Stripe webhooks", "Telegram Bot API", "Twilio", "Meta WhatsApp"],
    "infra": ["Docker Compose", "Nginx", "Certbot", "Cloudflare DNS", "Hermes (docs)"],
    "ai": ["OpenAI GPT-4 class", "Embedding models", "Provider-abstracted (fallback layer)"],
}


# ---------- Slide 15 — Messaging Automation Layer ----------
MAL = {
    "kicker": "Messaging Automation Layer",
    "title": "One policy. Every channel.",
    "flow": "Channel webhook → BookedAI Inbox (conversation_events) → Agent policy → Booking / payment / follow-up / retention side effects → Provider reply",
    "channels": [
        ("Telegram", "live", "@BookedAI_Manager_Bot · /api/webhooks/bookedai-telegram"),
        ("WhatsApp (Twilio)", "queued", "Provider default · sender +61455301335"),
        ("WhatsApp (Meta)", "blocked", "Account verification pending"),
        ("WhatsApp (Evolution)", "off-path", "Personal QR fallback only"),
        ("Web chat", "live", "/api/chat/send · Tawk widget alias"),
        ("Email", "live", "Zoho Mail · info@bookedai.au · lifecycle templates"),
        ("SMS", "Sprint 22", "Twilio SMS adapter — commission lane"),
    ],
}


# ---------- Slide 16 — Channel coverage ----------
CHANNEL_COVERAGE = [
    ("Telegram", "LIVE", "@BookedAI_Manager_Bot — production", True),
    ("Web chat", "LIVE", "Public + product + tenant surfaces", True),
    ("Email", "LIVE", "Lifecycle + transactional via Zoho", True),
    ("WhatsApp (Twilio)", "QUEUED", "Default outbound — creds repair in flight", False),
    ("WhatsApp (Meta)", "BLOCKED", "Business verification pending", False),
    ("SMS (Twilio)", "PHASE 21", "Commission lane unlocks at +A$20k MRR", False),
    ("Embed widget", "PHASE 20", "Self-serve install for SME websites", False),
    ("iMessage", "HORIZON", "Phase 22+ multi-channel scale", False),
]


# ---------- Slide 17 — Market size ----------
MARKET_SIZE = [
    ("AU SAM (top-down)", "AU service-SME software", "A$2.9B",
     "600k businesses × A$400/mo addressable ARR average across Starter / Growth / Enterprise mix."),
    ("AU SOM (bottom-up · 5yr)", "AU paying tenants 2026-2031", "A$120M",
     "5,000 paying tenants × A$2,000/mo blended ARR (SaaS + commission attached)."),
    ("Global SAM", "Service SMEs worldwide", "US$30B+",
     "~30M service SMEs across UK, NZ, SG, US, EU; English-first export from AU base."),
]
MARKET_BUILD_BLOCKS = [
    ("Bottom-up · year 1", "50 paying tenants × A$249/mo SaaS + 3% commission ≈ A$420k ARR."),
    ("Bottom-up · year 3", "1,000 paying tenants × A$600 blended ARPU/mo ≈ A$7.2M ARR."),
    ("Bottom-up · year 5", "5,000 tenants × A$2,000 blended ARPU/mo ≈ A$120M ARR (AU SOM cap)."),
]


# ---------- Slide 18 — Competitive landscape ----------
COMPETITORS = [
    ("Calendly", 18, 22, "Generic scheduler"),
    ("Mindbody", 76, 18, "Vertical, no-AI"),
    ("Booksy", 78, 28, "Vertical, low-AI"),
    ("GoHighLevel", 32, 58, "Broad, sales-AI"),
    ("BookedAI", 84, 88, "AI-native + omnichannel"),
]


# ---------- Slide 19 — Defensibility ----------
DEFENSIBILITY_LEDE = (
    "OpenAI sells general intelligence. Google sells distribution. BookedAI sells "
    "booked-revenue truth for a vertical neither will own end-to-end. Three moats compound as we scale."
)
DEFENSIBILITY = [
    {
        "kicker": "Moat 1",
        "title": "Data moat — booking follow-up history",
        "body": "Every customer turn becomes structured booking evidence: channel, intent, booking reference, payment posture, retention next step. Across 1,000 businesses, this becomes an AU dataset linking acquisition channel → qualified intent → revenue outcome. No general-purpose LLM has access to this.",
    },
    {
        "kicker": "Moat 2",
        "title": "Distribution moat — omnichannel agent layer",
        "body": "BookedAI Manager Bot already operates on Telegram, WhatsApp, web chat, email, and embed widget through one shared messaging_automation_service. Every channel added compounds the switching cost — and locks customer identity to phone + booking reference, not a single app.",
    },
    {
        "kicker": "Moat 3",
        "title": "Workflow lock-in — operations truth",
        "body": "Tenants run their daily revenue-ops queue, billing reminders, and customer-care replies inside the BookedAI Ops surface. Replacing us means replacing the system of record — not a chat widget. Foundation models become commoditized inputs to our orchestration layer; the moat lives in the audited workflow customers operate inside every day.",
    },
]


# ---------- Slide 20 — Business model ----------
BUSINESS_MODEL = {
    "headline": "We win when you win.",
    "lede": "BookedAI starts with a one-time setup fee. After launch, pricing is tied to the bookings and revenue the system actually generates.",
    "components": [
        ("Setup fee", "One-time",
         "AI setup, channel workflow, integrations, dashboard, launch support. Covers human onboarding cost — true CAC trends to ~zero."),
        ("SaaS subscription", "Monthly",
         "Tiers: Freemium · Pro · Pro Max · Advance Customize. Keeps the lights on regardless of bookings."),
        ("Performance commission", "Per booking / % revenue",
         "3-5% on attributed bookings. Aligns BookedAI economics to the SME's actual revenue won."),
    ],
    "tiers": [
        ("Solo", "A$0", "Freemium · single channel · 50 bookings/mo cap"),
        ("Growing studio", "A$249/mo", "Pro · 2 channels · unlimited bookings · portal + ops"),
        ("Clinic / Multi-staff", "A$599/mo", "Pro Max · 4 channels · billing truth · revenue dashboard"),
        ("Enterprise / Custom", "A$1,500+/mo", "Advance Customize · widget runtime · dedicated agent"),
    ],
}


# ---------- Slide 21 — Unit economics ----------
UNIT_ECONOMICS = [
    ("A$400", "CAC target",
     "Setup fee on Growth + Enterprise tiers offsets human onboarding cost — true CAC trends to ~zero."),
    ("A$6,000", "LTV target",
     "A$249/mo SaaS + 3% commission on ~A$30k/yr attributed bookings · ~24 mo average tenure."),
    ("75%", "Gross margin",
     "LLM + infra cost ~A$60/tenant/mo at Growth tier; channel + Stripe pass-through priced separately."),
    ("6 mo", "Payback period",
     "Setup fee covers month-one CAC; SaaS + commission compound payback inside half a year."),
]
UNIT_ECONOMICS_NOTE = (
    "Setup fee covers CAC. SaaS keeps the lights on regardless of bookings. "
    "Commission aligns BookedAI economics to actual revenue won — the \"Revenue "
    "Engine\" name only stands up if we get paid more when the SME makes more."
)


# ---------- Slide 22 — Traction ----------
TRACTION = {
    "headline": "Production-grade, not a prototype.",
    "shipped": [
        ("23 phases planned · 18 shipped", "Phase 0-9 baseline live; Phase 17-23 active execution."),
        ("11 routed subdomains live", "Public, pitch, demo, product, portal, tenant, admin, api, supabase, n8n, beta."),
        ("3 tenants live", "Co Mai Hung Chess (revenue loop), AI Mentor 1-1 Pro, BookedAI fallback."),
        ("8 P0 closures in Sprint 19", "Portal continuity, channel parity, webhook idempotency, tenant scoping."),
        ("49 backend unit tests · 14/14 search eval", "Release-gate suite green; checksum guard live."),
        ("Telegram bot live", "@BookedAI_Manager_Bot active in production with webhook configured."),
    ],
    "next": [
        ("Sprint 20 — first revenue loop", "Future Swim end-to-end; observability stack; A/B Wave 1."),
        ("Sprint 21 — billing truth", "Tenant billing summaries; admin reconciliation; pricing tier reframe."),
        ("Sprint 22 — multi-tenant template", "BaseRepository validator; Tenant Revenue Proof dashboard; SMS adapter."),
    ],
}


# ---------- Slide 23 — Roadmap ----------
ROADMAP_PHASES = [
    ("Phase 17", "2026-04-30", "Stabilize", "M-02",
     "GO-LIVE LOCK · first paying tenant onboard",
     "First A$ booked through the production agent stack — 3 verified tenants live."),
    ("Phase 18-19", "2026-05-24", "Unlock retention revenue", "M-05",
     "Tenant revenue proof + billing truth · target first A$5k MRR",
     "Wallet + Stripe continuity (M-04) plus billing truth proves repeatable monthly revenue."),
    ("Phase 20", "2026-06-01", "Unlock distribution (widget)", "M-08",
     "Multi-tenant template GA · self-serve widget on first SME",
     "Widget runtime ships; channel mix expands beyond Telegram-primary; CAC compresses."),
    ("Phase 21", "2026-06-07", "Unlock commission revenue", "M-11",
     "SMS adapter + commission lane · target A$20k MRR run-rate",
     "3-5% commission on attributed bookings activates; ARPU lifts above A$600/mo blended."),
    ("Phase 22+", "2026-Q3+", "Multi-tenant scale", "M-09 / M-10",
     "WhatsApp + iMessage horizon · 50+ paying tenants",
     "Vertical templates (chess, swim, mentor) replicate; export-ready playbook for UK/NZ/SG."),
]


# ---------- Slide 24 — Team ----------
TEAM = [
    {
        "name": "Founder & CEO",
        "role": "Product · Engineering · Revenue",
        "bio": "Full-stack engineer + operator. Designs the AI Revenue Engine end-to-end, ships sprints with Claude code agents, owns the customer + investor narrative.",
    },
    {
        "name": "Claude Code Agents",
        "role": "AI engineering co-pilots",
        "bio": "Multi-agent code/operations workforce — Anthropic Claude across Sonnet/Opus tiers. Sustains 7-day sprint cadence at production-grade discipline.",
    },
]
HIRING_PLAN = [
    ("Backend Engineer", "Sprint 22 (2026-05-24)", "Bounded-context split, BaseRepository validator, multi-tenant safety."),
    ("DevOps / SRE", "Sprint 22", "GitHub Actions CI, observability stack, beta DB separation, image registry."),
    ("Customer Success / GTM", "Phase 22 (Q3 2026)", "Founder-led demos → BDR playbook handoff; vertical event motion."),
    ("Frontend Engineer", "Phase 23 (Q3 2026)", "Design-token consolidation, code-split, A/B wave coverage."),
]


# ---------- Slide 25 — Partners & Integrations ----------
PARTNERS = [
    ("Stripe", "Payments + receivables"),
    ("OpenAI", "LLM provider (frontier model class)"),
    ("Twilio", "SMS + WhatsApp messaging"),
    ("Meta", "WhatsApp Cloud (verification pending)"),
    ("Zoho", "Mail + Calendar + Bookings"),
    ("Telegram", "Bot API customer channel"),
    ("Cloudflare", "DNS + CDN + edge protection"),
    ("Supabase", "Postgres + Auth + Storage (self-hosted)"),
    ("n8n", "Workflow automation"),
    ("Tawk", "Web chat widget alias"),
    ("WSTI", "Western Sydney Tech Initiative · pitch program"),
    ("Anthropic", "Claude code agents (engineering)"),
]


# ---------- Slide 26 — Financial projection ----------
FINANCIAL_PROJECTION = {
    "rows": [
        # year, tenants, blended ARPU, ARR, gross margin, runway-burn
        ("Year 1 (FY27)",  "50",     "A$700/mo",   "A$420k",  "65%",  "Founder-led + 2 hires"),
        ("Year 2 (FY28)",  "300",    "A$700/mo",   "A$2.5M",  "72%",  "+ Sales 1 + CS 1"),
        ("Year 3 (FY29)",  "1,000",  "A$600/mo",   "A$7.2M",  "75%",  "+ BDR team · UK pilot"),
        ("Year 5 (FY31)",  "5,000",  "A$2,000/mo", "A$120M",  "78%",  "AU SOM cap · global expansion"),
    ],
    "assumptions": [
        "Setup fee A$400 amortised across new-tenant cohort each year.",
        "Commission ramps 0% → 3% → 5% from Phase 21 once attribution dashboard ships.",
        "LLM + infra unit cost A$60/tenant/mo at scale (Year 3+).",
        "Channel pass-through (Twilio/Meta) priced through to tenant; not in gross margin.",
    ],
}


# ---------- Slide 27 — The Ask ----------
ASK = {
    "headline": "We are raising A$1.5M pre-seed.",
    "structure": "Convertible note · 18-month runway · A$10M post-money cap.",
    "use_of_funds": [
        ("40%", "Engineering",
         "Backend engineer + DevOps/SRE + frontend hire — close P0 monolith debt, ship multi-tenant template GA."),
        ("25%", "Go-to-market",
         "Founder-led close → BDR + Customer Success playbook · 4 founder-led events Q2-Q3 2026."),
        ("20%", "Channel + AI infra",
         "WhatsApp/SMS unit-cost coverage during commission ramp · LLM provider abstraction + fallback."),
        ("15%", "Compliance + ops",
         "Australian Privacy Act posture · external pen test · SOC 2 readiness · finance + legal."),
    ],
    "milestones": [
        "First A$5k MRR by 2026-05-24 (Sprint 19 close).",
        "First A$20k MRR run-rate by 2026-06-07 (commission lane live).",
        "50 paying tenants + Tenant Revenue Proof dashboard live by Q4 2026.",
        "1,000 paying tenants + UK/NZ/SG pilot by Q4 2028 (Series A trigger).",
    ],
}


# ---------- Slide 28 — Call to Action ----------
CTA = {
    "headline": "Back the AI Revenue Engine for service businesses.",
    "subhead": "Production-grade. Live tenants. Auditable revenue evidence. Open category in AU/NZ/SG.",
    "ctas": [
        ("See the live product", "bookedai.au · product.bookedai.au"),
        ("Watch the agent in action", "Telegram → @BookedAI_Manager_Bot"),
        ("Deeper pitch + architecture", "pitch.bookedai.au"),
        ("Talk to the founder", "admin@bookedai.au · +61 455 301 335"),
    ],
    "closer": "Demo mode for WSTI judges: bookedai.au?demo=wsti",
}
