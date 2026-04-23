import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { InvestigationTimelineCard } from "@/components/admin/tenants/investigation-timeline-card";
import { buildTenantInvestigationTimeline } from "@/server/admin/tenant-investigation-timeline";

test("buildTenantInvestigationTimeline orders mixed tenant investigation signals newest first", () => {
  const timeline = buildTenantInvestigationTimeline({
    team: {
      summary: {
        total_members: 4,
        active_members: 3,
        invited_members: 1,
        admin_members: 1,
        finance_members: 1,
      },
      activity: {
        summary: "Team role posture was updated.",
        last_updated_at: "2026-04-22T09:00:00.000Z",
        last_updated_by: "ops@bookedai.au",
      },
      invite_activity: [
        {
          id: "invite-1",
          summary: "Invite bounced and needs a resend.",
          created_at: "2026-04-22T10:00:00.000Z",
          recipient_email: "ops@tenant.example.com",
          delivery_status: "failed",
        },
      ],
    },
    billing: {
      activity: {
        summary: "Billing settings changed.",
        last_updated_at: "2026-04-22T08:00:00.000Z",
        last_updated_by: "finance@tenant.example.com",
      },
      subscription: {
        status: "past_due",
        plan_code: "pro",
        current_period_end: "2026-04-25T00:00:00.000Z",
      },
      collection: {
        has_billing_account: true,
        has_active_subscription: false,
        can_charge: false,
        recommended_action: "Collect a replacement payment method.",
        operator_note: "Outstanding invoice needs follow-up.",
      },
      invoice_summary: {
        total_invoices: 4,
        open_invoices: 2,
        paid_invoices: 2,
        currency: "AUD",
      },
      gateway: {
        provider: "stripe",
        checkout_enabled: true,
        portal_enabled: true,
        customer_id_present: true,
        note: "Gateway connected.",
      },
    },
    integrations: {
      activity: {
        summary: "Zoho CRM credentials were reviewed.",
        last_updated_at: "2026-04-22T07:00:00.000Z",
        last_updated_by: "ops@bookedai.au",
      },
      providers: [
        {
          provider: "zoho_crm",
          status: "connected",
          sync_mode: "live",
        },
      ],
      attention: [
        {
          source: "crm_retry_backlog",
          issue_type: "manual_review",
          severity: "warning",
          item_count: 2,
          recommended_action: "Review CRM payload mismatches.",
        },
      ],
      crm_retry_backlog: {
        summary: {
          retrying_records: 1,
          manual_review_records: 2,
          failed_records: 0,
          operator_note: "Three CRM records still need review.",
        },
      },
    },
  });

  assert.equal(timeline[0]?.id, "invite-invite-1");
  assert.equal(timeline[0]?.tone, "warning");
  assert.equal(timeline[1]?.id, "team-activity");
  assert.ok(timeline.some((item) => item.id === "crm-backlog" && item.tone === "warning"));
  assert.ok(timeline.some((item) => item.id === "billing-summary" && item.tone === "warning"));
});

test("InvestigationTimelineCard renders support-case items and empty state correctly", () => {
  const filledMarkup = renderToStaticMarkup(
    <InvestigationTimelineCard
      items={[
        {
          id: "crm-backlog",
          occurredAt: "2026-04-22T10:00:00.000Z",
          source: "crm",
          title: "3 CRM records need attention",
          description: "Review payload mismatches before retry.",
          tone: "warning",
        },
      ]}
      formatDateLabel={() => "22 Apr 2026, 10:00 am"}
    />,
  );

  assert.match(filledMarkup, /Unified investigation timeline/);
  assert.match(filledMarkup, /3 CRM records need attention/);
  assert.match(filledMarkup, /crm/);

  const emptyMarkup = renderToStaticMarkup(
    <InvestigationTimelineCard items={[]} formatDateLabel={() => "Not recorded"} />,
  );

  assert.match(emptyMarkup, /No investigation signals are available yet for this tenant/);
});
