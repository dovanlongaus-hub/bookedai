import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLeadsHandoffReturnHref,
  getLeadsHandoffGuardState,
  parseLeadsHandoff,
} from '@/server/admin/leads-handoff-core';

test('parseLeadsHandoff keeps the trusted shell handoff contract', () => {
  const handoff = parseLeadsHandoff({
    tenantId: 'tenant-harbour-glow',
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: '/admin#overview',
    admin_scope_label: 'Overview',
  });

  assert.deepEqual(handoff, {
    requestedTenantId: 'tenant-harbour-glow',
    requestedTenantSlug: 'harbour-glow',
    adminReturn: true,
    adminScope: '/admin#overview',
    adminScopeLabel: 'Overview',
    invalidAdminScope: false,
    missingTenantHint: false,
  });
  assert.equal(buildLeadsHandoffReturnHref(handoff), '/admin#overview');
});

test('parseLeadsHandoff rejects an unsafe return path and marks re-entry risk', () => {
  const handoff = parseLeadsHandoff({
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: 'https://evil.example/steal-context',
    admin_scope_label: 'Unsafe path',
  });

  assert.equal(handoff.adminScope, null);
  assert.equal(handoff.invalidAdminScope, true);
  assert.equal(buildLeadsHandoffReturnHref(handoff), null);
});

test('getLeadsHandoffGuardState locks mutation when tenant mismatches the request', () => {
  const handoff = parseLeadsHandoff({
    tenantId: 'tenant-harbour-glow',
    tenantSlug: 'harbour-glow',
    admin_return: '1',
    admin_scope: '/admin#overview',
  });

  const guard = getLeadsHandoffGuardState({
    handoff,
    resolvedTenantId: 'tenant-future-swim',
    resolvedTenantSlug: 'future-swim',
    supportModeActive: false,
  });

  assert.deepEqual(guard, {
    tenantMismatch: true,
    handoffRequiresReentry: false,
    leadsReadOnly: true,
  });
});

test('getLeadsHandoffGuardState locks mutation when shell handoff omitted tenant hints', () => {
  const handoff = parseLeadsHandoff({
    admin_return: '1',
    admin_scope: '/admin#overview',
  });

  const guard = getLeadsHandoffGuardState({
    handoff,
    resolvedTenantId: 'tenant-harbour-glow',
    resolvedTenantSlug: 'harbour-glow',
    supportModeActive: false,
  });

  assert.deepEqual(guard, {
    tenantMismatch: false,
    handoffRequiresReentry: true,
    leadsReadOnly: true,
  });
});
