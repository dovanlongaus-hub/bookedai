import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { WorkspaceSettingsForm } from '@/components/admin/settings/workspace-settings-form';

test('WorkspaceSettingsForm renders hidden handoff metadata for release-gate protection', () => {
  const html = renderToStaticMarkup(
    <WorkspaceSettingsForm
      action={() => {}}
      profile={{
        id: 'tenant-harbour-glow',
        slug: 'harbour-glow',
        name: 'Harbour Glow Spa',
        status: 'active',
        timezone: 'Australia/Sydney',
        locale: 'en-AU',
        currency: 'AUD',
        createdAt: '2026-04-23T00:00:00Z',
        updatedAt: '2026-04-23T00:00:00Z',
      }}
      settings={{
        tenantId: 'tenant-harbour-glow',
        values: {
          branding: {
            logoUrl: 'https://cdn.example.com/logo.png',
            introductionHtml: '<p>Premium spa treatments</p>',
          },
        },
      }}
      tenantId="tenant-harbour-glow"
      tenantSlug="harbour-glow"
    />,
  );

  assert.match(html, /name="expectedTenantId" value="tenant-harbour-glow"/);
  assert.match(html, /name="expectedTenantSlug" value="harbour-glow"/);
  assert.match(html, /name="admin_return" value="1"/);
  assert.match(html, /name="admin_scope" value="\/admin#platform-settings"/);
  assert.match(html, /name="admin_scope_label" value="Platform Settings"/);
});

test('WorkspaceSettingsForm shows a read-only explanation when mutation is blocked', () => {
  const html = renderToStaticMarkup(
    <WorkspaceSettingsForm
      action={() => {}}
      profile={{
        id: 'tenant-harbour-glow',
        slug: 'harbour-glow',
        name: 'Harbour Glow Spa',
        status: 'active',
        timezone: 'Australia/Sydney',
        locale: 'en-AU',
        currency: 'AUD',
        createdAt: '2026-04-23T00:00:00Z',
        updatedAt: '2026-04-23T00:00:00Z',
      }}
      settings={{
        tenantId: 'tenant-harbour-glow',
        values: {},
      }}
      tenantId="tenant-harbour-glow"
      tenantSlug="harbour-glow"
      disabled
      readOnlyReason="Support mode keeps this workspace investigation-first."
    />,
  );

  assert.match(html, /Workspace settings is read-only right now/);
  assert.match(html, /Support mode keeps this workspace investigation-first/);
  assert.match(html, /<fieldset disabled="" class="contents">/);
});
