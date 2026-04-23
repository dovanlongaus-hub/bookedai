import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorkspaceSettingsHandoffUrl } from './settings-handoff';

test('buildWorkspaceSettingsHandoffUrl preserves the Settings shell contract', () => {
  const href = buildWorkspaceSettingsHandoffUrl({
    tenant: {
      id: 'tenant-harbour-glow',
      slug: 'harbour-glow',
      name: 'Harbour Glow Spa',
    },
  });

  assert.equal(
    href,
    'https://admin.bookedai.au/admin/settings?admin_return=1&admin_scope=%2Fadmin%23platform-settings&admin_scope_label=Platform+Settings&tenantId=tenant-harbour-glow&tenantSlug=harbour-glow',
  );
});

test('buildWorkspaceSettingsHandoffUrl still returns a deterministic shell entry without tenant hints', () => {
  const href = buildWorkspaceSettingsHandoffUrl({});

  assert.equal(
    href,
    'https://admin.bookedai.au/admin/settings?admin_return=1&admin_scope=%2Fadmin%23platform-settings&admin_scope_label=Platform+Settings',
  );
});
