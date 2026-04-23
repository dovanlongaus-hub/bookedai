import assert from 'node:assert/strict';
import test from 'node:test';

import { assertLeadsMutationAllowed } from '@/app/admin/leads/action-guard';

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

test('assertLeadsMutationAllowed accepts a trusted matching handoff', () => {
  const result = assertLeadsMutationAllowed({
    formData: buildFormData({
      expectedTenantId: 'tenant-harbour-glow',
      expectedTenantSlug: 'harbour-glow',
      admin_return: '1',
      admin_scope: '/admin#overview',
      admin_scope_label: 'Overview',
    }),
    resolvedTenantId: 'tenant-harbour-glow',
    resolvedTenantSlug: 'harbour-glow',
    supportModeActive: false,
  });

  assert.equal(result.guard.leadsReadOnly, false);
});

test('assertLeadsMutationAllowed rejects tenant mismatch even if UI was bypassed', () => {
  assert.throws(
    () =>
      assertLeadsMutationAllowed({
        formData: buildFormData({
          expectedTenantId: 'tenant-harbour-glow',
          expectedTenantSlug: 'harbour-glow',
          admin_return: '1',
          admin_scope: '/admin#overview',
        }),
        resolvedTenantId: 'tenant-future-swim',
        resolvedTenantSlug: 'future-swim',
        supportModeActive: false,
      }),
    /requested tenant no longer matches the resolved admin tenant/,
  );
});

test('assertLeadsMutationAllowed rejects missing tenant hints', () => {
  assert.throws(
    () =>
      assertLeadsMutationAllowed({
        formData: buildFormData({
          admin_return: '1',
          admin_scope: '/admin#overview',
        }),
        resolvedTenantId: 'tenant-harbour-glow',
        resolvedTenantSlug: 'harbour-glow',
        supportModeActive: false,
      }),
    /tenant context was missing/,
  );
});

test('assertLeadsMutationAllowed rejects unsafe return paths', () => {
  assert.throws(
    () =>
      assertLeadsMutationAllowed({
        formData: buildFormData({
          expectedTenantId: 'tenant-harbour-glow',
          expectedTenantSlug: 'harbour-glow',
          admin_return: '1',
          admin_scope: 'https://evil.example/not-trusted',
        }),
        resolvedTenantId: 'tenant-harbour-glow',
        resolvedTenantSlug: 'harbour-glow',
        supportModeActive: false,
      }),
    /return path was not trusted/,
  );
});

test('assertLeadsMutationAllowed rejects support-mode mutation attempts', () => {
  assert.throws(
    () =>
      assertLeadsMutationAllowed({
        formData: buildFormData({
          expectedTenantId: 'tenant-harbour-glow',
          expectedTenantSlug: 'harbour-glow',
          admin_return: '1',
          admin_scope: '/admin#overview',
        }),
        resolvedTenantId: 'tenant-harbour-glow',
        resolvedTenantSlug: 'harbour-glow',
        supportModeActive: true,
      }),
    /support-mode or handoff read-only protection is active/,
  );
});
