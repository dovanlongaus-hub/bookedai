import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSettingsHandoffReturnHref,
  getSettingsHandoffGuardState,
  parseSettingsHandoff,
} from '@/server/admin/settings-handoff-core';

test('parseSettingsHandoff keeps the trusted shell handoff contract', () => {
  const handoff = parseSettingsHandoff({
    tenantId: 'tenant-harbour-glow',
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: '/admin#platform-settings',
    admin_scope_label: 'Platform Settings',
  });

  assert.deepEqual(handoff, {
    requestedTenantId: 'tenant-harbour-glow',
    requestedTenantSlug: 'harbour-glow',
    adminReturn: true,
    adminScope: '/admin#platform-settings',
    adminScopeLabel: 'Platform Settings',
    invalidAdminScope: false,
    missingTenantHint: false,
  });
  assert.equal(buildSettingsHandoffReturnHref(handoff), '/admin#platform-settings');
});

test('parseSettingsHandoff rejects an unsafe return path and marks re-entry risk', () => {
  const handoff = parseSettingsHandoff({
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: 'https://evil.example/steal-context',
    admin_scope_label: 'Unsafe path',
  });

  assert.equal(handoff.adminScope, null);
  assert.equal(handoff.invalidAdminScope, true);
  assert.equal(buildSettingsHandoffReturnHref(handoff), null);
});

test('getSettingsHandoffGuardState locks mutation when tenant mismatches the request', () => {
  const handoff = parseSettingsHandoff({
    tenantId: 'tenant-harbour-glow',
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: '/admin#platform-settings',
  });

  const guard = getSettingsHandoffGuardState({
    handoff,
    resolvedTenantId: 'tenant-future-swim',
    resolvedTenantSlug: 'future-swim',
    supportModeActive: false,
  });

  assert.deepEqual(guard, {
    tenantMismatch: true,
    handoffRequiresReentry: false,
    settingsReadOnly: true,
  });
});

test('getSettingsHandoffGuardState locks mutation when shell handoff omitted tenant hints', () => {
  const handoff = parseSettingsHandoff({
    admin_return: '1',
    admin_scope: '/admin#platform-settings',
  });

  const guard = getSettingsHandoffGuardState({
    handoff,
    resolvedTenantId: 'tenant-harbour-glow',
    resolvedTenantSlug: 'harbour-glow',
    supportModeActive: false,
  });

  assert.deepEqual(guard, {
    tenantMismatch: false,
    handoffRequiresReentry: true,
    settingsReadOnly: true,
  });
});
