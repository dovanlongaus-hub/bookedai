import "server-only";

import { createHash, randomInt } from "node:crypto";

import { Prisma } from "@prisma/client";

import {
  consumeLegacyAdminEmailLoginCode,
  isLegacyAdminDatabaseConfigured,
  storeLegacyAdminEmailLoginCode,
} from "@/lib/db/legacy-admin-auth";
import { getPrismaClient, isDatabaseConfigured } from "@/lib/db/prisma";

const ADMIN_EMAIL_CODE_TTL_MINUTES = 10;

declare global {
  // eslint-disable-next-line no-var
  var __bookedaiAdminEmailLoginCodes:
    | Map<
        string,
        {
          userId: string;
          email: string;
          tenantId?: string;
          tenantSlug?: string;
          codeHash: string;
          codeLast4: string;
          expiresAt: string;
          consumedAt?: string;
          metadata?: Record<string, unknown>;
        }
      >
    | undefined;
}

function getMemoryStore() {
  if (!global.__bookedaiAdminEmailLoginCodes) {
    global.__bookedaiAdminEmailLoginCodes = new Map();
  }

  return global.__bookedaiAdminEmailLoginCodes;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code.trim()}`)
    .digest("hex");
}

function nextExpiryDate() {
  return new Date(Date.now() + ADMIN_EMAIL_CODE_TTL_MINUTES * 60 * 1000);
}

export async function issueAdminEmailLoginCode(input: {
  userId: string;
  email: string;
  tenantId?: string;
  tenantSlug?: string;
  metadata?: Record<string, unknown>;
}) {
  const email = normalizeEmail(input.email);
  const code = buildCode();
  const codeHash = hashCode(email, code);
  const codeLast4 = code.slice(-4);
  const expiresAt = nextExpiryDate();

  if (isDatabaseConfigured()) {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.adminEmailLoginCode.updateMany({
        where: {
          email,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await prisma.adminEmailLoginCode.create({
        data: {
          userId: input.userId,
          email,
          tenantId: input.tenantId,
          tenantSlug: input.tenantSlug,
          codeHash,
          codeLast4,
          metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
          expiresAt,
        },
      });

      return {
        code,
        codeLast4,
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: ADMIN_EMAIL_CODE_TTL_MINUTES,
      };
    }
  }

  if (isLegacyAdminDatabaseConfigured()) {
    await storeLegacyAdminEmailLoginCode({
      email,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      codeHash,
      codeLast4,
      expiresAt: expiresAt.toISOString(),
      metadata: input.metadata,
    });

    return {
      code,
      codeLast4,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: ADMIN_EMAIL_CODE_TTL_MINUTES,
    };
  }

  getMemoryStore().set(email, {
    userId: input.userId,
    email,
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    codeHash,
    codeLast4,
    expiresAt: expiresAt.toISOString(),
    metadata: input.metadata,
  });

  return {
    code,
    codeLast4,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: ADMIN_EMAIL_CODE_TTL_MINUTES,
  };
}

export async function consumeAdminEmailLoginCode(input: {
  email: string;
  code: string;
  userId?: string;
}) {
  const email = normalizeEmail(input.email);
  const expectedHash = hashCode(email, input.code);
  const now = new Date();

  if (isDatabaseConfigured()) {
    const prisma = getPrismaClient();
    if (prisma) {
      const records = await prisma.adminEmailLoginCode.findMany({
        where: {
          email,
          codeHash: expectedHash,
          consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      for (const record of records) {
        if (input.userId && record.userId !== input.userId) {
          continue;
        }
        if (record.expiresAt <= now) {
          await prisma.adminEmailLoginCode.update({
            where: { id: record.id },
            data: { consumedAt: now },
          });
          continue;
        }
        await prisma.adminEmailLoginCode.update({
          where: { id: record.id },
          data: { consumedAt: now },
        });
        return {
          userId: record.userId,
          tenantId: record.tenantId ?? undefined,
          tenantSlug: record.tenantSlug ?? undefined,
          metadata:
            record.metadataJson && typeof record.metadataJson === "object" && !Array.isArray(record.metadataJson)
              ? (record.metadataJson as Record<string, unknown>)
              : {},
        };
      }

      return null;
    }
  }

  if (isLegacyAdminDatabaseConfigured()) {
    return consumeLegacyAdminEmailLoginCode({
      email,
      codeHash: expectedHash,
    });
  }

  const record = getMemoryStore().get(email);
  if (!record || record.codeHash !== expectedHash) {
    return null;
  }
  if (input.userId && record.userId !== input.userId) {
    return null;
  }
  if (record.consumedAt) {
    return null;
  }
  if (new Date(record.expiresAt) <= now) {
    record.consumedAt = now.toISOString();
    return null;
  }
  record.consumedAt = now.toISOString();
  return {
    userId: record.userId,
    tenantId: record.tenantId,
    tenantSlug: record.tenantSlug,
    metadata: record.metadata ?? {},
  };
}
