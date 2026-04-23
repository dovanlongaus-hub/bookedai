import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies, headers } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "bookedai_admin_session";
const ADMIN_SESSION_HEADER_NAME = "x-bookedai-admin-session";
const DEFAULT_SESSION_TTL_HOURS = 12;
const DEV_FALLBACK_SECRET = "bookedai-admin-dev-secret";

export type AdminRole =
  | "PLATFORM_OWNER"
  | "SUPER_ADMIN"
  | "TENANT_ADMIN"
  | "REVENUE_MANAGER"
  | "MANAGER"
  | "SALES_MANAGER"
  | "SALES_SUPPORT"
  | "OPERATIONS_MANAGER"
  | "STAFF"
  | "VIEWER";

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  activeTenantId: string;
  role: AdminRole;
  tenantIds: string[];
  issuedAt: string;
  expiresAt: string;
  impersonation?: {
    tenantId: string;
    tenantSlug: string;
    mode: "read_only";
    reason?: string;
    startedAt: string;
  } | null;
};

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  activeTenantId: string;
  role: AdminRole;
  tenantIds: string[];
  iat: number;
  exp: number;
  impersonation?: {
    tenantId: string;
    tenantSlug: string;
    mode: "read_only";
    reason?: string;
    startedAt: string;
  } | null;
};

const demoSession: AdminSession = {
  userId: "user_demo_owner",
  email: "ops@bookedai.au",
  name: "BookedAI Operator",
  activeTenantId: "tenant_harbour_glow",
  role: "PLATFORM_OWNER",
  tenantIds: ["tenant_harbour_glow", "tenant_ocean_studio"],
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + DEFAULT_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  impersonation: null,
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSessionSecret() {
  const configured =
    process.env.ADMIN_SESSION_SIGNING_SECRET ||
    process.env.SESSION_SIGNING_SECRET ||
    process.env.ADMIN_API_TOKEN ||
    process.env.ADMIN_PASSWORD;

  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  throw new Error("Missing admin session signing secret.");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(encodedPayload).digest("hex");
}

function getRawSessionToken(headerValue?: string | null, cookieValue?: string | null) {
  if (headerValue?.startsWith("Bearer ")) {
    return headerValue.slice("Bearer ".length).trim();
  }

  return headerValue || cookieValue || null;
}

function normalizeRole(role: string): AdminRole {
  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "PLATFORM_OWNER":
      return "PLATFORM_OWNER";
    case "TENANT_ADMIN":
    case "TENANT-ADMIN":
      return "TENANT_ADMIN";
    case "REVENUE_MANAGER":
    case "REVENUE-MANAGER":
      return "REVENUE_MANAGER";
    case "MANAGER":
      return "MANAGER";
    case "SALES_MANAGER":
    case "SALES-MANAGER":
      return "SALES_MANAGER";
    case "SALES_SUPPORT":
    case "SALES":
    case "SUPPORT":
      return "SALES_SUPPORT";
    case "OPERATIONS_MANAGER":
    case "OPERATIONS-MANAGER":
      return "OPERATIONS_MANAGER";
    case "STAFF":
      return "STAFF";
    default:
      return "VIEWER";
  }
}

export function createAdminSessionToken(input: {
  userId: string;
  email: string;
  name: string;
  activeTenantId: string;
  role: string;
  tenantIds: string[];
  ttlHours?: number;
  impersonation?: AdminSession["impersonation"];
}) {
  const issuedAt = new Date();
  const ttlHours = Math.max(input.ttlHours ?? DEFAULT_SESSION_TTL_HOURS, 1);
  const expiresAt = new Date(issuedAt.getTime() + ttlHours * 60 * 60 * 1000);
  const payload: TokenPayload = {
    sub: input.userId,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim() || input.email.trim().toLowerCase(),
    activeTenantId: input.activeTenantId,
    role: normalizeRole(input.role),
    tenantIds: [...new Set(input.tenantIds.filter(Boolean))],
    iat: Math.floor(issuedAt.getTime() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
    impersonation: input.impersonation ?? null,
  };

  if (!payload.tenantIds.includes(payload.activeTenantId)) {
    payload.tenantIds.unshift(payload.activeTenantId);
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  const token = `${encodedPayload}.${signature}`;

  return {
    token,
    session: {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      activeTenantId: payload.activeTenantId,
      role: payload.role,
      tenantIds: payload.tenantIds,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      impersonation: payload.impersonation ?? null,
    } satisfies AdminSession,
  };
}

export function verifyAdminSessionToken(token: string): AdminSession {
  if (!token || !token.includes(".")) {
    throw new Error("Authentication required.");
  }

  const [encodedPayload, providedSignature] = token.split(".", 2);
  const expectedSignature = signPayload(encodedPayload);

  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid admin session.");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<TokenPayload>;
  const expiresAt = Number(payload.exp ?? 0);
  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("Admin session expired.");
  }

  const tenantIds = Array.isArray(payload.tenantIds)
    ? payload.tenantIds.filter((value): value is string => typeof value === "string" && Boolean(value))
    : [];

  const activeTenantId =
    typeof payload.activeTenantId === "string" && payload.activeTenantId
      ? payload.activeTenantId
      : tenantIds[0];

  if (!payload.sub || !payload.email || !activeTenantId) {
    throw new Error("Invalid admin session.");
  }

  const issuedAtSeconds = Number(payload.iat ?? 0) * 1000;

  return {
    userId: payload.sub,
    email: String(payload.email).trim().toLowerCase(),
    name: String(payload.name || payload.email).trim(),
    activeTenantId,
    role: normalizeRole(String(payload.role || "VIEWER")),
    tenantIds: [...new Set([activeTenantId, ...tenantIds])],
    issuedAt: new Date(issuedAtSeconds || Date.now()).toISOString(),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    impersonation:
      payload.impersonation &&
      typeof payload.impersonation.tenantId === "string" &&
      typeof payload.impersonation.tenantSlug === "string"
        ? {
            tenantId: payload.impersonation.tenantId,
            tenantSlug: payload.impersonation.tenantSlug,
            mode: "read_only",
            reason:
              typeof payload.impersonation.reason === "string"
                ? payload.impersonation.reason
                : undefined,
            startedAt:
              typeof payload.impersonation.startedAt === "string"
                ? payload.impersonation.startedAt
                : new Date().toISOString(),
          }
        : null,
  };
}

function tryParseLegacySession(raw: string): AdminSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed?.userId || !parsed.email || !parsed.activeTenantId) {
      return null;
    }

    const now = new Date();
    return {
      userId: parsed.userId,
      email: parsed.email.trim().toLowerCase(),
      name: parsed.name?.trim() || parsed.email.trim().toLowerCase(),
      activeTenantId: parsed.activeTenantId,
      role: normalizeRole(String(parsed.role || "VIEWER")),
      tenantIds: parsed.tenantIds?.length ? parsed.tenantIds : [parsed.activeTenantId],
      issuedAt: parsed.issuedAt || now.toISOString(),
      expiresAt:
        parsed.expiresAt ||
        new Date(now.getTime() + DEFAULT_SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
      impersonation: parsed.impersonation ?? null,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession> {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const authorization = requestHeaders.get("authorization");
  const headerSession = requestHeaders.get(ADMIN_SESSION_HEADER_NAME);
  const cookieSession = requestCookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const raw = getRawSessionToken(authorization || headerSession, cookieSession);

  if (!raw && process.env.NODE_ENV !== "production") {
    return demoSession;
  }

  if (!raw) {
    throw new Error("Authentication required.");
  }

  try {
    return verifyAdminSessionToken(raw);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const legacy = tryParseLegacySession(raw);
      if (legacy) {
        return legacy;
      }
    }
    throw error;
  }
}
