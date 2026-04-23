import assert from "node:assert/strict";
import test from "node:test";

import type { AdminSession } from "@/lib/auth/session";
import {
  buildEndTenantSupportAuditLog,
  buildEndTenantSupportSession,
  buildStartTenantSupportAuditLog,
  buildStartTenantSupportSession,
} from "@/lib/admin/tenant-support";
import { verifyAdminSessionToken } from "@/lib/auth/session";

const baseSession: AdminSession = {
  userId: "user_platform_owner",
  email: "ops@bookedai.au",
  name: "BookedAI Operator",
  activeTenantId: "tenant_harbour_glow",
  role: "PLATFORM_OWNER",
  tenantIds: ["tenant_harbour_glow", "tenant_ocean_studio"],
  issuedAt: "2026-04-22T08:00:00.000Z",
  expiresAt: "2026-04-22T20:00:00.000Z",
  impersonation: null,
};

test("buildStartTenantSupportSession creates read-only impersonation for the selected tenant", () => {
  const next = buildStartTenantSupportSession(
    baseSession,
    { id: "tenant_ocean_studio", slug: "ocean-studio" },
    " investigate billing mismatch ",
  );
  const verified = verifyAdminSessionToken(next.token);

  assert.equal(verified.impersonation?.tenantId, "tenant_ocean_studio");
  assert.equal(verified.impersonation?.tenantSlug, "ocean-studio");
  assert.equal(verified.impersonation?.mode, "read_only");
  assert.equal(verified.impersonation?.reason, "investigate billing mismatch");
});

test("buildStartTenantSupportAuditLog records the correct support-mode start contract", () => {
  const auditLog = buildStartTenantSupportAuditLog({
    session: baseSession,
    targetTenant: { id: "tenant_ocean_studio", slug: "ocean-studio" },
    reason: " confirm crm backlog ",
  });

  assert.equal(auditLog.entityType, "tenant_support_session");
  assert.equal(auditLog.action, "admin.auth.start_tenant_support_mode");
  assert.equal(auditLog.metadata.tenantSlug, "ocean-studio");
  assert.equal(auditLog.metadata.supportMode, "read_only");
  assert.equal(auditLog.metadata.reason, "confirm crm backlog");
});

test("buildEndTenantSupportSession clears impersonation and preserves the operator session", () => {
  const activeSupportSession: AdminSession = {
    ...baseSession,
    impersonation: {
      tenantId: "tenant_ocean_studio",
      tenantSlug: "ocean-studio",
      mode: "read_only",
      reason: "review auth issue",
      startedAt: "2026-04-22T08:15:00.000Z",
    },
  };

  const next = buildEndTenantSupportSession(activeSupportSession);
  const verified = verifyAdminSessionToken(next.token);

  assert.equal(verified.userId, baseSession.userId);
  assert.equal(verified.activeTenantId, baseSession.activeTenantId);
  assert.equal(verified.impersonation, null);
});

test("buildEndTenantSupportAuditLog records the correct support-mode end contract", () => {
  const activeSupportSession: AdminSession = {
    ...baseSession,
    impersonation: {
      tenantId: "tenant_ocean_studio",
      tenantSlug: "ocean-studio",
      mode: "read_only",
      reason: "review auth issue",
      startedAt: "2026-04-22T08:15:00.000Z",
    },
  };

  const auditLog = buildEndTenantSupportAuditLog(activeSupportSession);

  assert.ok(auditLog);
  assert.equal(auditLog?.entityType, "tenant_support_session");
  assert.equal(auditLog?.action, "admin.auth.end_tenant_support_mode");
  assert.equal(auditLog?.metadata.tenantSlug, "ocean-studio");
  assert.equal(auditLog?.metadata.supportMode, "read_only");
});
