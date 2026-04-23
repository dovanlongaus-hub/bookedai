# BookedAI doc sync - docs/architecture/ai-router-matching-search-strategy.md

- Timestamp: 2026-04-21T12:49:45.522420+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/ai-router-matching-search-strategy.md` from the BookedAI repository into the Notion workspace. Preview: # AI Router, Matching Engine, and Grounded Search Strategy ## Purpose This document defines the official Prompt 9-level strategy for the AI router, matching engine, and grounded search stack of `BookedAI.au`. It is written for a production system that is already running.

## Details

Source path: docs/architecture/ai-router-matching-search-strategy.md
Synchronized at: 2026-04-21T12:49:45.369223+00:00

Repository document content:

# AI Router, Matching Engine, and Grounded Search Strategy

## Purpose

This document defines the official Prompt 9-level strategy for the AI router, matching engine, and grounded search stack of `BookedAI.au`.

It is written for a production system that is already running.

The goal is not to design a generic chatbot. The goal is to design a trust-first AI system that helps BookedAI:

- understand user requests
- normalize service needs
- retrieve and rank the best-fit candidates
- account for location and nearby relevance
- overlay booking trust and availability certainty
- route users to the safest next step
- continue operating safely when models or providers degrade

This strategy inherits and aligns with:

- Prompt 1 product and trust direction
- Prompt 2 repo and module structure direction
- Prompt 3 AI/search/integration foundations
- Prompt 4 data architecture direction
- Prompt 5 API and contract strategy
- Prompt 6 public growth strategy
- Prompt 7 tenant visibility strategy
- Prompt 8 internal admin and ops strategy

## Section 1 — Executive summary

- BookedAI AI core mission:
  - use AI to understand demand, retrieve and rank relevant services, explain booking trust clearly, and route to the right booking, callback, or payment path
- Target AI architecture direction:
  - server-side AI router
  - multi-task routing
  - multi-provider capable
  - grounded retrieval first
  - deterministic fallback always available
  - booking-trust-aware response contracts
- Biggest AI and trust risks:
  - hallucinated availability
  - hallucinated pricing or policy
  - generic chatbot behavior without grounded retrieval
  - single-provider dependency
  - letting natural-language fluency override trust policy
- Biggest provider and search decisions:
- current stack already fits an OpenAI-compatible first path
- OpenAI Responses API with built-in `web_search` should be the official public internet-search fallback after tenant-catalog miss
- the public assistant should preserve `tenant-first` truth and only surface OpenAI web results after tenant relevance gates fail
- Google should be treated as a strong grounding option for web freshness and local discovery
- a second high-quality synthesis provider should exist for fallback
- low-cost extraction and classification can use cheaper compatible models
  - deterministic retrieval mode must exist for degraded or unsafe cases

## Section 2 — Role of AI in BookedAI

### What AI does

AI is responsible for:

- understanding natural-language input
- extracting service need, location, timing, budget, preferences, and constraints
- asking clarifying questions when needed
- normalizing requests into structured intent
- helping retrieval and ranking
- synthesizing a readable recommendation
- explaining why an option fits
- explaining booking trust state in clear terms
- recommending the safest next action:
  - book now
  - request slot
  - book on partner site
  - call provider
  - request callback
  - pay now
  - pay after confirmation

### What AI must never do

AI must not:

- claim a slot is available unless the backend or verified source supports it
- claim a provider has capacity just because a website exists
- invent prices, payment policy, or booking policy
- confirm bookings
- confirm payment success
- bypass booking trust verification
- bypass payment orchestration rules
- replace CRM or system-of-record state
- replace source verification and provenance

## Section 3 — AI Router architecture

### Logical components

Recommended server-side AI router components:

- request classifier
- intent and entity extractor
- task router
- model selector
- provider selector
- grounding and search orchestrator
- retrieval orchestrator
- ranking and explanation layer
- output validator
- confidence scorer
- booking trust gate
- deterministic fallback renderer
- escalation and handoff router
- logging and telemetry collector

### Domain integrations

The AI router should integrate with:

- conversations
- matching
- availability and booking trust
- booking path resolver
- payment orchestration
- CRM lifecycle
- email lifecycle where suggestions are needed
- integration hub
- search and grounding providers

### Request lifecycle

1. receive contextual request
2. classify task type
3. choose retrieval and grounding strategy
4. choose model and provider
5. perform extraction or synthesis
6. validate structured output
7. apply trust policy and confidence gate
8. package response envelope
9. log model, provider, grounding, fallback, confidence, trust state, and latency

### Confirmed current-repo reality

Current repo already contains:

- an early AI router seam in [backend/domain/ai_router/service.py](../../backend/domain/ai_router/service.py)
- current OpenAI-compatible provider configuration in [backend/config.py](../../backend/config.py)
- a current provider loop in [backend/services.py](../../backend/services.py)
- current service-ranking heuristics and local relevance logic in [backend/services.py](../../backend/services.py)
- current web and local grounding helpers:
  - DuckDuckGo HTML result parsing
  - Nominatim geocoding
  - Google Maps URL and map image generation

Current maturity is therefore:

- not greenfield
- but still concentrated in `backend/services.py`

## Section 4 — Task taxonomy

### Task types

A. Request understanding and extraction  
B. Service discovery and candidate matching  
C. Nearby provider matching  
D. Availability trust explanation  
E. Booking path explanation  
F. Payment path explanation  
G. Lead qualification and next-step guidance  
H. CRM and lifecycle summarization  
I. Follow-up or email suggestion  
J. Internal ops summarization  
K. Deterministic fallback rendering  
L. Human or provider escalation recommendation

### Cost, latency, and trust implications

- Request extraction:
  - latency: low
  - cost: should be low
  - grounding: moderate
  - structured output: mandatory
  - creativity: dangerous if too high
  - deterministic logic: strong
- Candidate matching:
  - latency: medium
  - cost: medium
  - grounding: high
  - structured output: high
  - creativity: low
  - deterministic logic: strong
- Nearby matching:
  - latency: medium
  - cost: medium
  - grounding: very high
  - deterministic logic: dominant
- Availability trust explanation:
  - latency: low-medium
  - grounding: must use verified state
  - creativity: dangerous
- Booking or payment explanation:
  - latency: low-medium
  - deterministic policy: dominant
- Lifecycle summarization:
  - latency: medium
  - cost: moderate
  - creativity: moderate but controlled
- Internal ops summarization:
  - latency: medium
  - structured output: useful
  - cost sensitivity: lower than customer chat, but still bounded

## Section 5 — Provider and model strategy

### Current production-aware baseline

Current repo reality confirms:

- OpenAI-compatible provider path exists now
- a fallback provider seam exists now
- current implementation is best described as:
  - OpenAI-first
  - compatible-fallback capable
  - not yet fully multi-provider by task class

### OpenAI

- Strengths:
  - strong structured output support
  - mature responses-style integration path
  - good general synthesis and extraction
  - good developer ergonomics for server-side orchestration
- Weaknesses:
  - should not be the only provider
  - not a dedicated search system by itself
- Cost suitability:
  - good for primary synthesis if task routing is disciplined
- Structured output suitability:
  - strong
- Tool use suitability:
  - strong
- Recommendation:
  - primary synthesis provider
  - primary structured extraction provider

Source:

- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses/retrieve)

### Gemini

- Strengths:
  - first-class grounding with Google Search
  - Google Maps grounding support
  - strong web freshness and local discovery fit
  - structured outputs supported
- Weaknesses:
  - should not be treated as availability truth
  - must still sit behind booking trust policies
- Cost suitability:
  - useful for grounding-heavy tasks
- Grounding suitability:
  - excellent for web freshness and local signals
- Recommendation:
  - strongest candidate for grounding-heavy retrieval and local discovery assistance
  - optional synthesis provider, but most valuable as grounding layer

Source:

- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Gemini Grounding with Google Maps](https://ai.google.dev/gemini-api/docs/maps-grounding)

### Claude

- Strengths:
  - strong reasoning and tool use patterns
  - good summarization and complex synthesis
  - good for nuanced explanation and hard escalation cases
- Weaknesses:
  - grounding still depends on external tools and policy control
  - not the best default primary for every low-cost path
- Cost suitability:
  - better as premium or secondary path for harder cases
- Structured output suitability:
  - good with tool and schema guidance
- Recommendation:
  - premium secondary provider for hard-case synthesis, summarization, and escalation-quality responses

Source:

- [Anthropic Tool Use Overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)
- [Anthropic Build with Claude](https://docs.anthropic.com/en/docs/build-with-claude)

### DeepSeek

- Strengths:
  - cost-efficient compatible API path
  - function calling and JSON support
- Weaknesses:
  - should not be the sole provider for customer-facing high-trust synthesis
  - requires tighter validation and fallback discipline
- Cost suitability:
  - good for lower-cost extraction, classification, or secondary parsing
- Recommendation:
  - low-cost extraction or fallback path
  - not recommended as the core customer-facing synthesis provider

Source:

- [DeepSeek Function Calling](https://api-docs.deepseek.com/guides/function_calling/)

### Qwen / Alibaba Model Studio

- Strengths:
  - structured output support
  - function calling support
  - cost-flexible model catalog
- Weaknesses:
  - should be introduced only if there is clear cost or regional value
  - requires provider-specific maturity work and evaluation
- Cost suitability:
  - potentially strong for low-cost extraction and classification
- Recommendation:
  - optional low-cost extraction or classification provider
  - not core on day one unless cost pressure justifies it

Source:

- [Qwen API reference](https://www.alibabacloud.com/help/en/model-studio/use-qwen-by-calling-api)
- [Qwen function calling](https://www.alibabacloud.com/help/en/model-studio/user-guide/qwen-function-calling)

### Grok / xAI

- Strengths:
  - structured outputs exist
  - can serve as optional compatible provider
- Weaknesses:
  - not yet a strong default choice for the core trust-first customer path
- Recommendation:
  - optional experimental or secondary provider
  - not core for initial customer-facing matching

Source:

- [xAI Structured Outputs](https://docs.x.ai/docs/guides/structured-outputs)

### Copilot / GitHub-related model options

- Strengths:
  - useful for developer workflows, evaluations, and prompt iteration
- Weaknesses:
  - not a core runtime provider strategy for customer-facing matching
- Recommendation:
  - useful for internal experimentation and eval tooling
  - not core for live matching or booking-trust routing

Source:

- [GitHub Models overview](https://docs.github.com/en/github-models/about-github-models)

### Role recommendations

- Primary provider for synthesis:
  - OpenAI
- Best provider for local and nearby grounding:
  - Gemini with Maps and Search grounding
- Best provider for web freshness grounding:
  - Gemini
- Best low-cost provider for extraction and classification:
  - DeepSeek or Qwen, only behind strict validation
- Best fallback provider:
  - Claude for premium reasoning fallback
  - DeepSeek or Qwen for low-cost extraction fallback
- Providers that should not be core initially:
  - Grok
  - Copilot/GitHub runtime use for customer-facing matching

## Section 6 — Search and grounding strategy

### Internal data retrieval

Use first whenever available:

- tenant service catalogs
- provider and branch data
- native slots and capacity
- verified payment methods
- CRM-linked business data
- imported and curated provider records

This is the highest-trust source class.

### External structured sources

Use second:

- imported partner feeds
- external booking links
- integrated booking or POS or accounting systems
- synced provider metadata

This is structured and useful, but not always availability truth.

### Web grounding

Use third:

- provider website discovery
- public service and location info
- booking link discovery
- payment link discovery
- freshness checks for public-facing facts

Rules:

- web info may improve discovery
- web info may improve explanation
- web info must not become slot truth automatically

### Local and nearby grounding

Use as an overlay across internal and external retrieval:

- user latitude and longitude
- known suburb, city, locality
- provider location metadata
- maps and geocoding signals

### When to use which

- Internal first:
  - when tenant or verified provider data exists
- External structured second:
  - when integration or import data exists
- Web grounding third:
  - when discovery or freshness is needed
- Local grounding:
  - whenever location matters
- Refuse certainty and downgrade to unknown:
  - when only web evidence exists and no booking verification exists
- Recommend provider website directly:
  - when partner booking only is known

## Section 7 — Matching pipeline

### Step-by-step pipeline

#### Step 1 — Input ingestion

- What happens:
  - receive user request plus channel, tenant, attribution, and context
- AI role:
  - minimal
- Deterministic role:
  - validate and normalize input envelope

#### Step 2 — Request normalization

- What happens:
  - normalize text, language, spelling, session memory, and channel context
- AI role:
  - optional light extraction
- Deterministic role:
  - strong

#### Step 3 — Structured extraction

- What happens:
  - derive service need, location, timing, budget, constraints, preferences
- AI role:
  - primary
- Deterministic role:
  - schema validation and field cleanup

#### Step 4 — Candidate retrieval

- What happens:
  - query internal verified catalog, integrated data, imported data, and optional public web
- AI role:
  - retrieval brief assistance only
- Deterministic role:
  - dominant

#### Step 5 — Location and geo filtering

- What happens:
  - reduce candidates by distance and location fit
- AI role:
  - low
- Deterministic role:
  - dominant

#### Step 6 — Ranking and scoring

- What happens:
  - score fit, location, freshness, category match, constraints, and source quality
- AI role:
  - optional tie-break explanation
- Deterministic role:
  - dominant

#### Step 7 — Availability and booking trust overlay

- What happens:
  - apply verified availability state, partner path, unknown state, or confirmation need
- AI role:
  - explain only
- Deterministic role:
  - dominant

#### Step 8 — Payment path awareness

- What happens:
  - apply who-collects-payment and whether payment is allowed now
- AI role:
  - explain options
- Deterministic role:
  - dominant

#### Step 9 — Recommendation synthesis

- What happens:
  - generate readable ranked options and explanation
- AI role:
  - primary
- Deterministic role:
  - guardrails and envelope assembly

#### Step 10 — Response packaging

- What happens:
  - produce validated API-first response contract
- AI role:
  - none
- Deterministic role:
  - mandatory

#### Step 11 — Next-step routing

- What happens:
  - choose:
    - book now
    - request slot
    - partner site
    - callback
    - waitlist
    - safe escalation
- Deterministic role:
  - dominant

#### Step 12 — Logging and evaluation

- What happens:
  - persist model, provider, grounding class, confidence, trust state, fallback, latency, and cost

## Section 8 — Booking trust and payment-aware AI behavior

### Trust states

The AI router must understand:

- available
- limited availability
- fully booked
- temporarily held
- availability unknown
- availability unverified
- partner booking only
- needs provider confirmation
- native slot managed by BookedAI
- external listing found but not verified

### Case-by-case semantics

#### Case A — Native BookedAI-managed slot verified available

- AI may say:
  - the slot is available
  - booking can proceed
- AI must not say:
  - anything beyond verified scope
- Allowed CTA:
  - book now
- Payment mention:
  - pay now or allowed payment options if backend policy permits

#### Case B — Native slot fully booked

- AI may say:
  - the requested slot is fully booked
- AI must not say:
  - book now
- Allowed CTA:
  - join waitlist
  - request callback
  - try another time

#### Case C — Native slot limited availability

- AI may say:
  - limited availability remains
- Allowed CTA:
  - reserve or hold slot if backend allows
- Payment mention:
  - only if booking and trust policy allow

#### Case D — External result found, availability unknown

- AI may say:
  - this looks like a relevant option, but live availability is not verified
- AI must not say:
  - the slot is available
- Allowed CTA:
  - request callback
  - call provider
  - partner website
- Payment:
  - no pay-now claim

#### Case E — Partner booking only

- AI may say:
  - booking is handled via the provider or partner path
- Allowed CTA:
  - book on partner site
- Payment:
  - partner payment or provider-controlled payment only, if known

#### Case F — Needs provider confirmation

- AI may say:
  - availability needs manual confirmation
- Allowed CTA:
  - request slot confirmation
  - request callback
- Payment:
  - defer unless deposit policy specifically allows it

#### Case G — Data conflict or low confidence

- AI may say:
  - there is not enough certainty to confirm a booking path yet
- Allowed CTA:
  - clarify
  - callback
  - safe escalation
- Payment:
  - do not recommend pay now

### Payment-aware AI behavior

AI may explain:

- card payment
- bank transfer or QR
- partner payment link
- BookedAI-collected path
- SME-direct path

AI must not:

- confirm payment success before backend confirmation
- call a booking fully confirmed when payment or booking confirmation is pending
- ignore invoice, due, overdue, or manual confirmation state

## Section 9 — Structured output contracts

### Recommended objects

- `ParsedUserRequest`
- `MatchingCandidate`
- `MatchingResult`
- `AvailabilityTrustResult`
- `BookingPathRecommendation`
- `PaymentPathRecommendation`
- `AIResponseEnvelope`
- `EscalationRecommendation`
- `SearchGroundingResult`
- `FallbackDecision`

### Important fields

#### ParsedUserRequest

- intent
- service_type
- location
- date_preference
- time_preference
- budget_max
- constraints
- preferences
- missing_fields
- parsing_confidence

#### MatchingCandidate

- candidate_id
- provider_id
- service_id
- label
- location
- distance_km
- fit_score
- source_type
- source_freshness
- availability_state
- verified
- explanation_points

#### MatchingResult

- request_id
- candidates
- top_candidate_id
- overall_confidence
- warnings

#### AvailabilityTrustResult

- trust_state
- verified_source_type
- freshness_note
- requires_confirmation
- payment_allowed_now

#### BookingPathRecommendation

- path_type
- allowed
- reason
- warnings

#### PaymentPathRecommendation

- options
- requires_booking_confirmation
- collector_type
- invoice_required
- warnings

#### AIResponseEnvelope

- reply_text
- task_type
- intent
- extracted_entities
- candidates
- booking_trust_state
- payment_path_options
- confidence_score
- source_summary
- warnings
- next_actions
- requires_human
- model_used
- provider_used
- fallback_used

#### EscalationRecommendation

- escalate_to
- reason
- urgency

#### SearchGroundingResult

- source_types
- source_count
- freshness_summary
- provenance_summary

#### FallbackDecision

- activated
- tier
- strategy
- reason

### Validation needs

- frontend/web/widget-facing objects:
  - must be tightly validated
- internal-only objects:
  - can be richer but still schema-validated
- loggable objects:
  - redact sensitive data where needed
- degradable objects:
  - synthesis summaries and explanations can degrade gracefully
- must-validate objects:
  - parsed request
  - trust result
  - booking path recommendation
  - payment path recommendation

## Section 10 — Confidence and trust gating

### Confidence inputs

Confidence must combine:

- parsing confidence
- source quality
- source freshness
- provider verification
- availability verification
- conflict detection
- booking path certainty
- payment certainty

### Confidence tiers

- high confidence
- medium confidence
- low confidence
- unsafe or requires confirmation

### Allowed actions per tier

- High:
  - allow book now if trust state supports it
  - allow pay now if backend rules support it
- Medium:
  - allow shortlist and explanation
  - may allow request slot or confirmation-first flow
  - payment may be deferred
- Low:
  - ask for more info
  - avoid strong certainty
  - prefer callback or safer routing
- Unsafe:
  - no book now
  - no pay now
  - force confirmation, provider contact, or human fallback

## Section 11 — Fallback strategy

### Multi-layer fallback tree

#### Fallback 1 — Same-provider retry or smaller model

- Trigger:
  - transient failure, formatting issue, latency issue
- User sees:
  - nothing special if successful
- Risk avoided:
  - needless hard failure

#### Fallback 2 — Cross-provider model fallback

- Trigger:
  - provider outage or repeated schema failure
- User sees:
  - same response contract, maybe slightly shorter
- Risk avoided:
  - hard dependency on one provider

#### Fallback 3 — Retrieval-only deterministic mode

- Trigger:
  - AI outputs unreliable or unavailable
- User sees:
  - safe shortlist and next-step guidance without overclaimed certainty
- Risk avoided:
  - hallucination

#### Fallback 4 — Provider or human confirmation route

- Trigger:
  - trust too low, availability uncertain, conflicts present
- User sees:
  - callback, provider confirmation, or partner route
- Risk avoided:
  - unsafe booking or payment action

#### Fallback 5 — Graceful degradation to safe recommendation

- Trigger:
  - multiple upstream degradations
- User sees:
  - useful but conservative response
- Risk avoided:
  - service interruption

### Safe degradation policy

- service should continue even if the primary provider degrades
- deterministic mode should still help users move forward safely
- ambiguity is preferable to confident hallucination

## Section 12 — Cost, latency, and quality strategy

### Model-per-task matrix

- low-cost extraction and classification:
  - DeepSeek or Qwen, tightly validated
- primary synthesis:
  - OpenAI
- grounding-heavy search assistance:
  - Gemini
- premium hard-case synthesis:
  - Claude
- deterministic fallback:
  - no model required

### Cost-control logic

- do not use premium reasoning for every request
- use cheap extraction for:
  - request classification
  - entity parsing
  - summarization where risk is low
- use stronger models for:
  - difficult synthesis
  - ambiguous multi-constraint matching
  - escalation-quality explanation

### Latency guidance

- extraction:
  - low latency target
- customer-facing synthesis:
  - medium latency okay if trust improves
- admin or ops summaries:
  - can tolerate slightly higher latency

### Heavy local model note

Do not default to heavy local deployment.

Only consider local or private models when:

- regulatory or contractual isolation requires it
- unit economics clearly justify it
- the team is ready to operate that infrastructure

No such need is confirmed in the current repo today.

## Section 13 — Prompt, policy, and guardrail architecture

### Policy layering

- system policy
- tenant and business context
- deployment mode context
- search and grounding results
- booking trust policy
- payment policy
- response style layer

### Mandatory guardrails

- do not invent availability
- do not invent payment confirmation
- do not invent provider policy
- do not overstate certainty
- distinguish verified from unverified
- route to safest next step
- preserve user trust over conversational flair

## Section 14 — Evaluation and observability strategy

### Quality metrics

- parse accuracy
- candidate relevance
- ranking quality
- nearby relevance quality
- conversation helpfulness

### Trust metrics

- availability trust correctness
- false available risk
- false book now risk
- payment-path correctness
- escalation appropriateness

### Cost and resilience metrics

- cost per matched interaction
- fallback rate
- provider degradation rate
- latency by task class

### Logging and alerts

What should be logged:

- task type
- provider
- model
- fallback used
- source types
- confidence tier
- booking trust state
- next action chosen
- latency
- token cost
- validation errors
- unsafe output catches

What should be redacted:

- sensitive PII in prompts and logs where not needed
- raw payment-sensitive details

What should be shown in internal admin:

- parsed request
- candidate scores
- provenance
- provider and model used
- fallback chain
- confidence internals
- downgraded and unsafe cases

What should be shown in tenant app:

- business-safe confidence
- why recommendation was made
- booking trust state
- whether external or unverified path is in play

What should feed ops alerts:

- provider degradation spikes
- unsafe output catches
- rising low-confidence rate
- fallback spikes
- rising stale-source rate

## Section 15 — Channel-agnostic behavior

### Public web

- context:
  - attribution, page source, session context
- style:
  - concise and trust-building
- CTA:
  - try AI, demo, quote, callback, partner path

### Embedded widget

- context:
  - tenant, page context, installation context
- style:
  - shorter, faster, conversion-focused
- CTA:
  - booking, callback, chat continuation

### WhatsApp

- context:
  - lower screen space, message-by-message interaction
- style:
  - shorter outputs, stronger clarification prompts
- CTA:
  - callback, partner path, request slot, safe next step

### Future mobile

- context:
  - authenticated or semi-authenticated app context
- style:
  - compact cards and concise options

### Provider interaction

- context:
  - operational, confirmation-oriented
- style:
  - structured and short
- CTA:
  - confirm, update, escalate

## Section 16 — Final recommendations

### What to implement first

1. formalize the AI router envelope and structured contracts
2. separate extraction, retrieval, ranking, trust overlay, and synthesis stages
3. keep OpenAI as primary synthesis path first
4. add Gemini grounding path for web freshness and local discovery
5. add deterministic fallback mode before broad multi-provider rollout
6. add a premium fallback provider only after baseline metrics are in place

### What to avoid

- generic chatbot architecture
- single-model-for-everything
- using AI as availability truth
- payment or booking confirmation by model text alone
- no deterministic fallback
- hiding uncertainty
- paying premium model cost for every low-risk task

### Which provider and search stack to use first

- synthesis:
  - OpenAI
- grounding:
  - internal verified retrieval first
  - Gemini for web freshness and local grounding
- fallback:
  - deterministic retrieval mode first
  - premium synthesis fallback second
- low-cost parsing:
  - DeepSeek or Qwen later, only behind strict validation

### How to phase rollout safely

- phase 1:
  - standardize output contracts and trust gating on current OpenAI-compatible stack
- phase 2:
  - introduce grounding orchestration and deterministic fallback
- phase 3:
  - add second provider fallback
- phase 4:
  - add task-specific cost optimization

## Confirmed current-repo references

- [backend/services.py](../../backend/services.py)
- [backend/config.py](../../backend/config.py)
- [backend/domain/ai_router/service.py](../../backend/domain/ai_router/service.py)
- [backend/core/contracts/ai_router.py](../../backend/core/contracts/ai_router.py)
- [backend/domain/matching/service.py](../../backend/domain/matching/service.py)
- [backend/domain/booking_trust/service.py](../../backend/domain/booking_trust/service.py)

## Assumptions

- Current production repo confirms OpenAI-compatible primary and fallback seams, but not a fully implemented multi-provider task router yet.
- Current repo confirms heuristic local matching and web discovery helpers, but not a full production grounding orchestration layer yet.
- Current repo does not confirm live Gemini, Claude, DeepSeek, Qwen, or xAI integrations yet; those are treated here as target provider strategy options, not current production reality.
