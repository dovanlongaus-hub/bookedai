import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSettingsMutationAllowed } from '@/app/admin/settings/action-guard';

function buildFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

test('assertSettingsMutationAllowed accepts a trusted matching handoff', () => {
  const result = assertSettingsMutationAllowed({
    formData: buildFormData({
      expectedTenantId: 'tenant-harbour-glow',
      expectedTenantSlug: 'harbour-glow',
      admin_return: '1',
      admin_scope: '/admin#platform-settings',
      admin_scope_label: 'Platform Settings',
    }),
    resolvedTenantId: 'tenant-harbour-glow',
    resolvedTenantSlug: 'harbour-glow',
    supportModeActive: false,
  });

  assert.equal(result.guard.settingsReadOnly, false);
});

test('assertSettingsMutationAllowed rejects tenant mismatch even if UI was bypassed', () => {
  assert.throws(
    () =>
      assertSettingsMutationAllowed({
        formData: buildFormData({
          expectedTenantId: 'tenant-harbour-glow',
          expectedTenantSlug: 'harbour-glow',
          admin_return: '1',
          admin_scope: '/admin#platform-settings',
        }),
        resolvedTenantId: 'tenant-future-swim',
        resolvedTenantSlug: 'future-swim',
        supportModeActive: false,
      }),
    /requested tenant no longer matches the resolved admin tenant/,
  );
});

test('assertSettingsMutationAllowed rejects missing tenant hints', () => {
  assert.throws(
    () =>
      assertSettingsMutationAllowed({
        formData: buildFormData({
          admin_return: '1',
          admin_scope: '/admin#platform-settings',
        }),
        resolvedTenantId: 'tenant-harbour-glow',
        resolvedTenantSlug: 'harbour-glow',
        supportModeActive: false,
      }),
    /tenant context was missing/,
  );
});

test('assertSettingsMutationAllowed rejects unsafe return paths', () => {
  assert.throws(
    () =>
      assertSettingsMutationAllowed({
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

test('assertSettingsMutationAllowed rejects support-mode mutation attempts', () => {
  assert.throws(
    () =>
      assertSettingsMutationAllowed({
        formData: buildFormData({
          expectedTenantId: 'tenant-harbour-glow',
          expectedTenantSlug: 'harbour-glow',
          admin_return: '1',
          admin_scope: '/admin#platform-settings',
        }),
        resolvedTenantId: 'tenant-harbour-glow',
        resolvedTenantSlug: 'harbour-glow',
        supportModeActive: true,
      }),
    /support-mode or handoff read-only protection is active/,
  );
});
