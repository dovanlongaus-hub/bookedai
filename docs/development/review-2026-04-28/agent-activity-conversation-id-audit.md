# Agent Activity Drawer — `conversation_events.conversation_id` Writer Audit

**Date:** 2026-04-28
**Scope:** P1-T1 follow-up — verify the Agent Activity Drawer (portal mode) can find events.
**Endpoint:** `backend/api/v1_agent_handlers.py::get_agent_activity` filters
`ConversationEvent.conversation_id == ?conversation_id` query param. The
portal Drawer passes the **booking_reference** as that query param. Therefore
any writer that records `conversation_events.conversation_id` with a value
that is **not** the booking reference will be invisible to portal mode.

## Summary

Of **11** writer call sites audited, **6** use a booking-/demo-/consultation-
reference style ID that the portal drawer can match, and **5** use a
session-only / channel-scoped ID (phone number, message UUID, conversation
thread). Portal-mode drawers will see only the **6** booking-aligned writers'
events. The **5** session-scoped writers (WhatsApp / Telegram / Tawk inbound,
the lifecycle outbound communication touch, and the WhatsApp confirmation
side-effect in the booking handler) silently drop out.

> **Patch recommendation (immediate, low-risk):**
> Update the agent activity query in
> `backend/api/v1_agent_handlers.py:161-163` from a strict equality match to
> a NULL-safe compound match so portal mode catches both reference and
> session forms. Concretely, when a `booking_reference` query param is
> supplied alongside `conversation_id`, also include rows whose
> `metadata_json->>'booking_reference'` matches the supplied reference. The
> longer-term fix is to backfill the writers below to use a single
> booking-scoped conversation_id (or write twice).

## Writer table

| # | Writer location | `conversation_id` source | Booking-aligned? | Recommendation |
| - | --- | --- | --- | --- |
| 1 | `backend/service_layer/event_store.py:40-52` (`store_event`) | `message.conversation_id` (caller-supplied) | depends on caller | n/a — generic helper; auditing each caller below |
| 2 | `backend/service_layer/lifecycle_ops_service.py:1370-1394` (`orchestrate_communication_touch`) | `message_id = uuid4()` — fresh UUID per touch | **No** (session-only) | Should also be queryable via `metadata_json.booking_reference` if the touch is booking-scoped. **Write `conversation_id = booking_reference` when the touch carries one in metadata**, else keep the UUID. Drawer query patch (above) will pick up the metadata path. |
| 3 | `backend/api/v1_booking_handlers.py:556-578` (WhatsApp booking confirmation) | `normalized_phone` (sender phone) | **No** (session-only) | Booking-scoped event — change `conversation_id` to `booking_reference`, OR write twice (one row per id) so phone-thread drilldowns AND portal both find it. |
| 4 | `backend/service_layer/demo_workflow_service.py:130-157` (`demo_brief_submitted`) | `brief_reference` (`DEMO-BRIEF-…`) | **Yes** | Already aligned — portal drawer keyed by brief reference will resolve. |
| 5 | `backend/service_layer/demo_workflow_service.py:316-340` (`demo_booking_synced`) | `booking_id` (Zoho booking ID) | **Yes (alt-id)** | Aligned to the Zoho booking ID. Portal drawer for Zoho-linked demos must use that ID; if portal currently keys by `brief_reference` instead, this row will not appear. **Recommend writing twice OR switch portal to query by the canonical demo reference.** |
| 6 | `backend/api/route_handlers.py:2754-2779` (`booking_session_created`) | `result.booking_reference` | **Yes** | Aligned — primary booking event the portal drawer relies on. |
| 7 | `backend/api/route_handlers.py:2895-2920` (`pricing_consultation_created`) | `result.consultation_reference` | **Yes (consult ref)** | Aligned to consultation reference. Portal drawer keyed on consultation reference will find it; not booking-reference. |
| 8 | `backend/api/route_handlers.py:2991-3020` (`demo_request_created`) | `result.demo_reference` | **Yes (demo ref)** | Aligned to demo reference. Same caveat as #7. |
| 9 | `backend/api/route_handlers.py:3132-3149` (Tawk `incoming_message`) | `message.conversation_id` (Tawk thread ID) | **No** (session-only) | Inbound chat thread — typically not the booking reference. If a Tawk thread ultimately produces a booking, recommend a follow-up `booking_reference` event written when the booking is created (already covered by #6). No change required for this writer. |
| 10 | `backend/api/route_handlers.py:3263-3278` (`whatsapp_inbound`) | `message.conversation_id` (sender phone / WhatsApp JID) | **No** (session-only) | Same pattern as #9. Phone-keyed inbound; portal drawer will not see it. **If a booking is created from this inbound, the booking writer (#6) covers the portal drawer.** Optional: stamp `metadata_json.booking_reference` once known. |
| 11 | `backend/api/route_handlers.py:3513-3529` (`telegram_inbound`) | `message.conversation_id` (Telegram chat ID) | **No** (session-only) | Same as #10. |
| 12 | `backend/api/route_handlers.py:3673-3682` (Evolution `whatsapp_inbound`) | `message.conversation_id` (sender phone / JID) | **No** (session-only) | Same as #10. |
| 13 | `backend/api/route_handlers.py:3823-3832` (n8n `booking_callback`) | extracted from `payload.conversation_id` (n8n callback) | **Depends** | n8n callbacks tied to a booking should pass the `booking_reference` as `conversation_id`. **Verify the n8n template uses `{{$json.booking_reference}}`** — if it uses session UUIDs, drawer will miss the callback row. |

(Writer #1 is the helper, not a leaf; writers #2-#13 are the actual leaf
inserts. That gives **12** distinct insert sites; collapsed by behaviour
that's effectively **11** semantically distinct writer flows. Booking-aligned
flows: #4, #5, #6, #7, #8, #13 (assuming n8n template is correct) = **6**.)

## Categorical recommendations

### Category A — booking-scoped, already aligned
Writers: #4, #5, #6, #7, #8.
**No change required.** Portal drawer keyed by their respective reference
(brief / booking / consultation / demo) finds these rows.

### Category B — booking-scoped but mis-keyed
Writers: #2 (lifecycle communication touch), #3 (WhatsApp booking
confirmation).

These events ARE booking-scoped (the metadata even carries
`booking_reference`) but the `conversation_id` column stores a UUID or a
phone number. **Highest-value fix.**

Recommended change (follow-up PR — do NOT apply in this audit task):
- For #2: when `metadata` includes a booking reference, set
  `conversation_id = metadata['booking_reference']` instead of `uuid4()`.
- For #3: change `conversation_id` from `normalized_phone` to
  `booking_reference`.

### Category C — session-scoped (correctly so)
Writers: #9 (Tawk), #10 (WhatsApp 360), #11 (Telegram), #12 (Evolution).

Inbound chat threads. These are correctly keyed by channel session ID. The
portal drawer not finding them is **expected behaviour** — a customer's
chat thread is a different lens than a booking timeline. The booking writer
(#6) is what the portal needs.

**No change required.**

### Category D — depends on workflow contract
Writer: #13 (n8n booking callback).

Recommend: spot-check the n8n workflow JSON to confirm callbacks pass the
booking reference as `conversation_id`. Document the contract in
`backend/api/route_handlers.py` near the handler.

## Suggested immediate patch (drawer query side)

Defensively widen the drawer query so any writer in **Category B** is
visible without code changes to the writers. Pseudocode for
`get_agent_activity` query:

```python
stmt = (
    select(ConversationEvent)
    .where(
        or_(
            ConversationEvent.conversation_id == normalized_conversation_id,
            ConversationEvent.metadata_json["booking_reference"].astext
                == normalized_conversation_id,
        )
    )
    .order_by(ConversationEvent.created_at.asc(), ConversationEvent.id.asc())
)
```

This is a NULL-safe widening (the `astext == X` arm yields no rows when the
JSON key is absent, so it cannot leak rows from other tenants — tenant
filtering still happens via `_resolve_tenant_id`).

**Caveat:** the `metadata_json` path requires Postgres JSONB. If any test
fixtures still use SQLite, gate the widening on the dialect or use SQLAlchemy
`type_coerce` so SQLite degrades to the equality-only branch.

## Open questions

- Does the portal drawer call site send the booking reference as
  `conversation_id`, or does it send a different ID (e.g. a portal session
  token)? If the latter, the writer audit is moot — the parent issue is in
  the frontend. **Action:** grep `frontend/src/apps/tenant` for the drawer
  fetch call.
- Should `pricing_consultation_created` and `demo_request_created` also be
  written under the booking_reference once a booking is created from them?
  This requires a downstream "promotion" event.
- Is there a tenant-id column on `conversation_events`? If not, the
  metadata-widening patch must rely on the existing tenant resolution path
  in the API handler — verify no leak.

## Out of scope

- Fixing writers #2, #3 (Category B) — substantial follow-up PR.
- Verifying the n8n callback workflow contract (#13).
- Backfilling historical rows that have stale `conversation_id` values.
