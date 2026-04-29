"""
BookedAI 5-minute pitch — content.

10 slides, ~30 seconds each. Designed for WSTI judges: hook fast, prove with
live evidence, close with a clear ask. Pulls the strongest signals from the
project — tenant proof, traction shipped, revenue moats, market math.

Edit here; run build_5min.py to regenerate the deck.
"""

from datetime import date


# ---------- Meta ----------
COMPANY = "BookedAI"
TAGLINE = "The AI Revenue Engine for Service Businesses"
SUBTAGLINE = "Never lose a service enquiry again."
PRESENTER = "Founder & CEO · admin@bookedai.au · +61 455 301 335"
DECK_DATE = date(2026, 4, 29)
AUDIENCE = "WSTI Judges · Pre-seed Investors · 5-minute pitch"
DEMO_URL = "bookedai.au?demo=wsti"


# ---------- Slide 02 — Problem ----------
PROBLEM = {
    "kicker": "The Problem",
    "big_stat": "38%",
    "big_stat_label": "of service enquiries never get a reply within 24 hours.",
    "narrative": (
        "Service SMEs — salons, clinics, tutors, swim schools, tradies — live in "
        "WhatsApp and Telegram. Their bookings, payments, and follow-ups still "
        "live in disconnected tools."
    ),
    "pains": [
        ("Lost first reply", "Customer messages on WhatsApp at 9pm. SME replies tomorrow morning. They booked someone else."),
        ("Stitched-together stack", "Calendar + Stripe + chat widget + CRM + email — five tools, none aware of each other."),
        ("No revenue truth", "No one can see which channel drove which booking, which booking is paid, who needs follow-up."),
    ],
}


# ---------- Slide 03 — Solution ----------
SOLUTION = {
    "kicker": "The Solution",
    "title": "One AI Revenue Engine. Every channel. Every booking. Audited.",
    "subtitle": "Customer message → Agent → Booking + Payment + Audit ledger.",
    "channels": ["WhatsApp", "Telegram", "Web chat", "Email", "SMS", "Widget"],
    "agents": [
        ("Search", "Intent → shortlist → book"),
        ("Revenue Ops", "Booking · Payment · Billing"),
        ("Customer Care", "Status · Reschedule · Retention"),
    ],
    "outputs": [
        ("Booking reference", "Issued in seconds"),
        ("Payment posture", "Paid · Pending · Overdue"),
        ("Audit ledger", "Every action, traceable"),
    ],
}


# ---------- Slide 04 — Live Proof ----------
LIVE_PROOF = {
    "kicker": "Live · production today",
    "title": "Real customers. Real bookings. Real revenue ledger.",
    "screenshot_caption": "product.bookedai.au — live ChatGPT-style search-to-booking flow",
    "phone_header": "Telegram · @BookedAI_Manager_Bot",
    "phone_lines": [
        ("customer", "Chess class for my 8 yo in Sydney, beginner level"),
        ("agent", "Top match: Co Mai Hung Chess · Sat 10:00 · A$45 trial.\nTap Book 1 to confirm."),
        ("customer", "[Book 1]"),
        ("agent", "Booked. Ref CMHC-2026-0428-014.\nPortal link sent. Studio confirms by 6pm."),
    ],
    "stats": [
        ("3", "tenants live"),
        ("11", "subdomains routed"),
        ("<30s", "intent → booking ref"),
    ],
}


# ---------- Slide 05 — Tenant Cases ----------
TENANT_CASES = [
    {
        "name": "Chess",
        "title": "Co Mai Hung Chess Class",
        "subdomain": "chess.bookedai.au",
        "image": "chess-screen-proof.png",
        "tagline": "First reusable vertical template — kids activity / academy.",
        "loop_short": "Intent → assess → book → pay → class → AI report → renew",
        "status": "LIVE",
        "evidence": "Telegram tenant notifications wired · verified-tenant chips · revenue loop end-to-end.",
    },
    {
        "name": "AI Mentor",
        "title": "AI Mentor 1-1 Pro",
        "subdomain": "aimentor.bookedai.au",
        "image": "aimentor-hero.png",
        "tagline": "Standalone tenant runtime · multi-tenant template proof.",
        "loop_short": "Discover → enrol → 1:1 mentor → progress → renewal",
        "status": "LIVE",
        "evidence": "Wave-17b activation · isolated brand kit · shared Messaging Automation Layer.",
    },
    {
        "name": "Future Swim",
        "title": "Future Swim · first commercial loop",
        "subdomain": "Sprint 20 · 2026-05",
        "image": None,  # rendered visual
        "tagline": "First paying tenant · validates SaaS + commission model.",
        "loop_short": "Enquiry → trial → subscription → reports → retention",
        "status": "Sprint 20",
        "evidence": "Anchors Tenant Revenue Proof dashboard · first A$ booked through agent stack.",
    },
]


# ---------- Slide 06 — Market ----------
MARKET = {
    "kicker": "Market",
    "title": "AU SAM A$2.9B. Global SAM US$30B+. Bottom-up to A$120M SOM.",
    "tiles": [
        ("AU SAM",  "A$2.9B",  "600k AU service SMEs × A$400/mo addressable ARR."),
        ("AU SOM",  "A$120M",  "5,000 paying tenants × A$2,000/mo blended ARR by 2031."),
        ("Global",  "US$30B+", "~30M service SMEs across UK, NZ, SG, US, EU."),
    ],
    "build_blocks": [
        ("Year 1",  "50 tenants × A$249/mo + 3% commission ≈ A$420k ARR"),
        ("Year 3",  "1,000 tenants × A$600 blended ARPU ≈ A$7.2M ARR"),
        ("Year 5",  "5,000 tenants × A$2,000 blended ARPU ≈ A$120M ARR"),
    ],
}


# ---------- Slide 07 — Why We Win ----------
WHY_WIN = {
    "kicker": "Why we win",
    "title": "Vertical depth × AI-native. Three moats compound.",
    "competitors": [
        ("Calendly",     18, 22),
        ("Mindbody",     76, 18),
        ("Booksy",       78, 28),
        ("GoHighLevel",  32, 58),
        ("BookedAI",     84, 88),
    ],
    "moats": [
        ("Data",
         "Every customer turn becomes booking evidence — channel → intent → revenue. AU dataset no LLM has."),
        ("Distribution",
         "One Messaging Automation Layer; every channel added compounds switching cost."),
        ("Workflow",
         "Tenants run daily revenue ops inside BookedAI. Replacing us = replacing the system of record."),
    ],
}


# ---------- Slide 08 — Traction & Roadmap ----------
TRACTION = {
    "kicker": "Traction · Roadmap",
    "title": "Production-grade today. First paying revenue in 30 days.",
    "shipped": [
        "23 phases planned · 18 shipped · production on a single VPS.",
        "11 routed subdomains live · 3 tenants in production.",
        "Telegram bot live (@BookedAI_Manager_Bot) · WhatsApp + Web + Email channels active.",
        "49 backend unit tests · 14/14 search eval · release-gate suite green.",
    ],
    "phases": [
        ("Phase 17",   "2026-04-30",  "GO-LIVE LOCK · first paying tenant"),
        ("Phase 18-19","2026-05-24",  "Tenant Revenue Proof · first A$5k MRR"),
        ("Phase 20",   "2026-06-01",  "Multi-tenant template GA · widget runtime"),
        ("Phase 21",   "2026-06-07",  "Commission lane live · target A$20k MRR"),
        ("Phase 22+",  "2026-Q3+",    "50+ paying tenants · UK/NZ/SG export"),
    ],
}


# ---------- Slide 09 — Money ----------
MONEY = {
    "kicker": "Business model · Unit economics",
    "title": "We win when you win — setup + SaaS + performance commission.",
    "components": [
        ("Setup fee",        "One-time",        "Covers AI setup + integrations + launch — true CAC ≈ 0."),
        ("SaaS subscription","Monthly",         "Tiers: Freemium · Pro · Pro Max · Custom."),
        ("Commission",       "Per booking / %", "3-5% on attributed revenue — aligned to outcome."),
    ],
    "unit_econ": [
        ("A$400",  "CAC target",   "Setup fee offsets onboarding cost."),
        ("A$6,000","LTV target",   "SaaS + commission · ~24-month tenure."),
        ("75%",    "Gross margin", "LLM + infra ~A$60/tenant/mo at Growth tier."),
        ("6 mo",   "Payback",      "Setup covers month-one CAC; recur compounds inside H1."),
    ],
}


# ---------- Slide 10 — Team ----------
# Pulled live from frontend/src/components/landing/data.ts (teamMembers)
# rendered on pitch.bookedai.au.
TEAM_KICKER = "Team Members"
TEAM_TITLE = "Built by engineers, founders, and service-growth operators."
TEAM_BODY = (
    "BookedAI combines technical depth, workflow thinking, and commercial pragmatism "
    "to build AI products that survive real rollout — not demo theatre."
)
TEAM_MEMBERS = [
    {
        "name": "Do Van Long",
        "role": "CEO",
        "image": "team-long.png",
        "badges": ["AI Builder", "Former CTO", "Tech Founder"],
        "bio": "26 years building digital products, platforms, and ventures. Turns emerging tech into products that scale in real operating environments.",
    },
    {
        "name": "Angus Hoy",
        "role": "CTO",
        "image": "team-angus.png",
        "badges": ["Systems Eng", "Backend & AI"],
        "bio": "Computer Science + Mathematics, University of Melbourne. Embedded systems → fraud-detection scale-up backend Python. AI-systems builder.",
    },
    {
        "name": "Yogesh Kumar",
        "role": "COO",
        "image": "team-yogesh.png",
        "badges": ["Operations", "IT & Markets"],
        "bio": "Master of IT, QUT. 6 years in financial markets. Currently IT Engineer at ASX. AI enthusiast bridging engineering and operations.",
    },
    {
        "name": "Tommy Dam",
        "role": "CMO",
        "image": "team-tommy.png",
        "badges": ["Quality Systems", "Service Growth"],
        "bio": "BSc Chemistry. QA across medical devices, clinical trials, NDIS, aged care. Brings service-industry credibility into BookedAI's go-to-market.",
    },
]


# ---------- Slide 11 — The Ask ----------
ASK = {
    "kicker": "The Ask",
    "headline": "Raising A$1.5M pre-seed.",
    "structure": "Convertible note · 18-month runway · A$10M post-money cap.",
    "use_of_funds": [
        ("40%", "Engineering",         "+2 hires · monolith debt · multi-tenant GA."),
        ("25%", "Go-to-market",        "BDR + CS playbook · 4 founder-led events."),
        ("20%", "Channel + AI infra",  "WhatsApp/SMS unit cost · LLM fallback layer."),
        ("15%", "Compliance + ops",    "Privacy Act · pen test · SOC 2 readiness."),
    ],
    "milestones": [
        "First A$5k MRR by 2026-05-24",
        "First A$20k MRR run-rate by 2026-06-07",
        "50 paying tenants + Tenant Revenue Proof dashboard live · Q4 2026",
        "1,000 paying tenants + UK/NZ/SG pilot · Q4 2028 (Series A trigger)",
    ],
}


# ---------- Slide 12 — Thank You / CTA ----------
THANK_YOU = {
    "headline": "Thank you.",
    "subhead": "Back the AI Revenue Engine for service businesses.",
    "image": "final-contact-proof.png",
    "ctas": [
        ("See it live",         "bookedai.au"),
        ("Talk to the agent",   "Telegram → @BookedAI_Manager_Bot"),
        ("Demo for WSTI",       DEMO_URL),
        ("Founder direct",      "admin@bookedai.au · +61 455 301 335"),
    ],
    "closer": "Production-grade. Live tenants. Auditable revenue evidence. Open category in AU/NZ/SG.",
}
