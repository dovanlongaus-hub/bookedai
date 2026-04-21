# Future Swim Tenant Use Case

Date: `2026-04-20`

Document status: `active tenant-specific implementation reference`

## 1. Purpose

This document captures the full Future Swim tenant brief as a concrete implementation use case on top of the reusable BookedAI tenant framework.

It should be used for:

- Future Swim implementation continuation
- future swim-school tenant onboarding
- future kids-services tenant inheritance
- validation of tenant-scoped assistant and website-refactor patterns

Primary inherited framework:

- `docs/development/tenant-implementation-requirements-framework.md`

Related strategic references:

- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/architecture/devops-deployment-cicd-scaling-strategy.md`

## 2. Tenant summary

- Tenant name: `Future Swim`
- Tenant slug: `future-swim`
- Tenant host target: `futureswim.bookedai.au`
- Industry: `Kids Services`
- Business type: `multi-location swim school`
- Core audience: `parents of children aged 2-6`
- Geography: `Sydney locations seeded in current catalog`
- Primary business outcome: `turn the old website into a professional modern tenant website with BookedAI as receptionist, sales layer, and booking orchestrator`

## 3. Original requirement summary

The Future Swim request requires:

- full analysis of the current Future Swim website
- full website refactor into a new branded runtime on BookedAI
- new theme direction based on the strongest professional swim-school patterns for young children
- BookedAI engine embedded as receptionist and sales assistant
- assistant and booking logic restricted to Future Swim services only
- CRM linkage with Zoho as an additive recording layer
- BookedAI to remain the main workflow and management module
- email composition and automated reply capabilities connected to chat and booking context
- nginx and deploy configuration so the new active host can run on `futureswim.bookedai.au`

## 4. Business and UX intent

Future Swim is not a generic marketplace tenant.

It is a branded standalone-website tenant and should be implemented as:

- a premium swim-school website
- a trust-building destination for parents
- a conversion path for swim enquiries and booking requests
- a tenant-strict assistant surface
- a multi-location routing layer

The website should speak to the concerns of parents of young children:

- safety
- calm progression
- age-fit learning
- warm and welcoming environment
- clarity around next steps

## 5. Theme and design direction

### Required visual posture

The new Future Swim surface should feel:

- professional
- modern
- bright
- child-safe
- parent-reassuring
- premium but not corporate

### Approved design strategy

The Future Swim implementation should use:

- aqua and sky tones for clarity and trust
- warm coral or sand accents for friendliness and CTA energy
- rounded geometry and soft section framing
- clear age-group and progression storytelling
- less SaaS language and more parent-facing service language

### Design references reviewed during planning

- Future Swim: `https://futureswim.com.au/`
- Future Swim FAQs: `https://futureswim.com.au/faqs/`
- Aqua-Tots: `https://www.aqua-tots.com/`
- Nemo Swim School: `https://nemoswimschool.com/`

### Design conclusion

The best direction for Future Swim is not to copy another swim school literally.

It is to inherit the strongest common traits:

- safety-first messaging
- bright, family-oriented visual system
- clear age-based structure
- strong facility and trust presentation
- obvious enquiry and booking paths

## 6. Assistant and booking policy

### Assistant role

BookedAI should act as:

- receptionist
- sales qualifier
- location recommender
- enquiry capture agent
- booking-intent capture agent

### Mandatory scope rule

On `futureswim.bookedai.au`, the assistant must:

- recommend only Future Swim catalog entries
- shortlist only Future Swim locations or services
- create leads and booking intents only for Future Swim
- avoid public-web search fallback
- avoid recommending competitors or external venues

### Supported tasks

The assistant should help with:

- matching a child age and confidence level to a suitable Future Swim venue
- locating the best Future Swim centre by suburb or area
- collecting parent contact details
- collecting notes about the child
- recording booking or callback intent
- generating lifecycle follow-up communications

### Escalation tasks

The assistant should escalate or defer when:

- a specific class schedule must be confirmed manually
- a medical or special-needs requirement needs human review
- a parent asks for exceptions to pricing or policy
- integrations are not live and manual follow-up is required

## 7. Data and catalog rules

### Current catalog baseline

The current repo already contains a seeded `future-swim` tenant with published catalog rows for:

- Caringbah
- Kirrawee
- Leichhardt
- Miranda
- Rouse Hill
- St Peters

### Catalog truth rule

Future Swim runtime must use:

- tenant catalog first
- tenant catalog only for public tenant-strict assistant flows
- published tenant records as the discovery baseline

### Booking truth rule

If schedule certainty is not yet live, the UI should say:

- enquiry
- request callback
- booking request

It should not imply real-time confirmed slot availability unless the provider integration actually supports it.

## 8. CRM and communication requirements

### CRM

Requested CRM provider:

- `Zoho CRM`

Required posture:

- Zoho should receive customer and booking records additively
- BookedAI remains the main workflow and orchestration system
- retry and reconciliation should remain visible through BookedAI operations
- Future Swim should inherit the shared Zoho pattern defined in `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- Future Swim-specific stage, mapping, and rollout decisions should follow `docs/development/future-swim-zoho-crm-rollout.md`

### Email

Future Swim requires:

- the ability to draft and send replies from chat-derived context
- automated or semi-automated response capability after enquiry capture
- a tenant-specific communication trail

Required platform posture:

- BookedAI lifecycle messaging stays authoritative
- email provider delivery status remains explicit
- templates should be configurable without breaking auditability

## 9. Deploy and host requirements

Required host result:

- `futureswim.bookedai.au` should resolve as a first-class BookedAI tenant surface

Required infra tasks:

- frontend host mapping
- nginx host mapping
- HTTPS certificate coverage
- DNS record creation
- API path proxying under the new host

## 10. Implementation mapping to platform framework

| Framework area | Future Swim decision |
|---|---|
| tenant archetype | standalone branded website tenant |
| brand surface | full public website refactor |
| assistant mode | tenant-strict receptionist and sales assistant |
| catalog mode | tenant-scoped catalog only |
| public-web fallback | disabled for tenant runtime |
| lead capture | required |
| booking intent capture | required |
| lifecycle email | required |
| CRM sync | Zoho-ready, additive |
| payments | optional later |
| multi-location routing | required |

## 11. Code-aligned implementation state as of `2026-04-20`

The repo now includes:

- a dedicated `FutureSwimApp` runtime in `frontend/src/apps/public/FutureSwimApp.tsx`
- host routing for `futureswim.bookedai.au`
- frontend hosted artifact generation for `futureswim.html`
- nginx host mapping for the new domain
- deploy and DNS script updates for the new host
- v1 tenant-scoping enhancement via `tenant_ref`
- tenant-strict search behavior that disables public-web fallback when the runtime is tenant-scoped

## 12. Remaining go-live dependencies

The following still need environment-specific production completion:

- real DNS activation for `futureswim.bookedai.au`
- certificate issuance including the new host
- SMTP or production email provider secrets
- Zoho CRM production credentials and mapping
- any Future Swim-specific content assets, photography, or approved copy refinements

## 13. Acceptance criteria

Future Swim implementation should be considered complete when:

- the public host loads the Future Swim-branded runtime
- the UI clearly reads as a premium preschool swim-school website
- the assistant recommends only Future Swim entries
- the assistant does not fall back to external providers
- enquiry submission creates lead and booking-intent records in BookedAI
- lifecycle email can be triggered through BookedAI
- nginx and DNS configuration support the new host in production
- the tenant case can be reused as a template for later swim-school or kids-services tenants

## 14. Reuse lessons for future tenants

Future Swim should become the reference pattern for tenants that need:

- branded public-site replacement
- tenant-only assistant behavior
- multi-location service discovery
- reception and sales qualification in one flow
- CRM sync as an additive layer
- email drafting from chat and booking context

The reusable inheritance from this case should be:

- strict tenant search policy
- host-level tenant runtime pattern
- vertical-specific homepage theming
- lead plus booking-intent capture from a public branded experience
- BookedAI-first and CRM-second orchestration model
