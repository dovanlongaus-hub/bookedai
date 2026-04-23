import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { LeadForm } from '@/components/admin/leads/lead-form';

test('LeadForm renders hidden handoff metadata for release-gate protection', () => {
  const html = renderToStaticMarkup(
    <LeadForm
      action={() => {}}
      submitLabel="Create lead"
      tenantId="tenant-harbour-glow"
      tenantSlug="harbour-glow"
    />,
  );

  assert.match(html, /name="expectedTenantId" value="tenant-harbour-glow"/);
  assert.match(html, /name="expectedTenantSlug" value="harbour-glow"/);
  assert.match(html, /name="admin_return" value="1"/);
  assert.match(html, /name="admin_scope" value="\/admin#overview"/);
  assert.match(html, /name="admin_scope_label" value="Overview"/);
});

test('LeadForm shows a read-only explanation when mutation is blocked', () => {
  const html = renderToStaticMarkup(
    <LeadForm
      action={() => {}}
      submitLabel="Create lead"
      tenantId="tenant-harbour-glow"
      tenantSlug="harbour-glow"
      disabled
      readOnlyReason="Support mode keeps this workspace investigation-first."
    />,
  );

  assert.match(html, /Leads is read-only right now/);
  assert.match(html, /Support mode keeps this workspace investigation-first/);
  assert.match(html, /<fieldset disabled="" class="space-y-4">/);
});
