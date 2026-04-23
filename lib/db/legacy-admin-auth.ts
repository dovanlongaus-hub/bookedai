import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __bookedaiLegacyAdminPool: Pool | undefined;
}

function normalizeDatabaseUrl(url?: string) {
  if (!url) {
    return null;
  }

  return url.replace(/^postgresql\+asyncpg:\/\//, "postgresql://");
}

function shouldSuppressLegacyDbErrors() {
  return process.env.NODE_ENV !== "production";
}

function getPool() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    return null;
  }

  if (!global.__bookedaiLegacyAdminPool) {
    global.__bookedaiLegacyAdminPool = new Pool({
      connectionString,
    });
  }

  return global.__bookedaiLegacyAdminPool;
}

export function isLegacyAdminDatabaseConfigured() {
  return Boolean(normalizeDatabaseUrl(process.env.DATABASE_URL));
}

export function parseLegacyAdminUserId(userId: string) {
  const match = /^legacy:(.+?):(.+)$/.exec(String(userId || "").trim());
  if (!match) {
    return null;
  }

  return {
    tenantId: match[1],
    email: match[2].trim().toLowerCase(),
  };
}

export async function findLegacyAdminMembership(input: {
  email: string;
  tenantSlug?: string;
}) {
  const pool = getPool();
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query<{
      tenant_id: string;
      tenant_slug: string;
      tenant_name: string;
      email: string;
      full_name: string | null;
      role: string;
    }>(
      `
        select
          tum.tenant_id,
          tum.tenant_slug,
          coalesce(t.name, tum.tenant_slug) as tenant_name,
          tum.email,
          tum.full_name,
          tum.role
        from tenant_user_memberships tum
        left join tenants t on t.id::text = tum.tenant_id
        where lower(tum.email) = lower($1)
          and lower(tum.status) = 'active'
          and ($2::text is null or lower(tum.tenant_slug) = lower($2))
        order by tum.updated_at desc, tum.id desc
        limit 1
      `,
      [input.email.trim(), input.tenantSlug?.trim() || null],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    if (shouldSuppressLegacyDbErrors()) {
      return null;
    }
    throw error;
  }
}

export async function listLegacyAdminTenants(input: { email: string }) {
  const pool = getPool();
  if (!pool) {
    return [];
  }

  try {
    const result = await pool.query<{
      id: string;
      slug: string;
      name: string;
      timezone: string;
      locale: string;
    }>(
      `
        select distinct
          t.id::text as id,
          t.slug,
          t.name,
          t.timezone,
          t.locale
        from tenant_user_memberships tum
        inner join tenants t on t.id::text = tum.tenant_id
        where lower(tum.email) = lower($1)
          and lower(tum.status) = 'active'
        order by t.name asc
      `,
      [input.email.trim()],
    );

    return result.rows;
  } catch (error) {
    if (shouldSuppressLegacyDbErrors()) {
      return [];
    }
    throw error;
  }
}

export async function storeLegacyAdminEmailLoginCode(input: {
  email: string;
  tenantId?: string;
  tenantSlug?: string;
  codeHash: string;
  codeLast4: string;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}) {
  const pool = getPool();
  if (!pool) {
    return null;
  }

  try {
    await pool.query(
      `
        update tenant_email_login_codes
        set consumed_at = now()
        where lower(email) = lower($1)
          and auth_intent = 'admin-sign-in'
          and consumed_at is null
      `,
      [input.email.trim()],
    );

    const result = await pool.query<{
      id: number;
      tenant_id: string | null;
      tenant_slug: string | null;
      email: string;
      metadata_json: Record<string, unknown> | null;
      expires_at: Date;
    }>(
      `
        insert into tenant_email_login_codes (
          tenant_id,
          tenant_slug,
          email,
          auth_intent,
          code_hash,
          code_last4,
          metadata_json,
          expires_at
        )
        values ($1, $2, lower($3), 'admin-sign-in', $4, $5, $6::json, $7::timestamptz)
        returning id, tenant_id, tenant_slug, email, metadata_json, expires_at
      `,
      [
        input.tenantId || null,
        input.tenantSlug || null,
        input.email.trim(),
        input.codeHash,
        input.codeLast4,
        JSON.stringify(input.metadata ?? {}),
        input.expiresAt,
      ],
    );

    return result.rows[0] ?? null;
  } catch (error) {
    if (shouldSuppressLegacyDbErrors()) {
      return null;
    }
    throw error;
  }
}

export async function consumeLegacyAdminEmailLoginCode(input: {
  email: string;
  codeHash: string;
}) {
  const pool = getPool();
  if (!pool) {
    return null;
  }

  try {
    const result = await pool.query<{
      id: number;
      tenant_id: string | null;
      tenant_slug: string | null;
      metadata_json: Record<string, unknown> | null;
      expires_at: Date;
    }>(
      `
        select id, tenant_id, tenant_slug, metadata_json, expires_at
        from tenant_email_login_codes
        where lower(email) = lower($1)
          and auth_intent = 'admin-sign-in'
          and code_hash = $2
          and consumed_at is null
        order by created_at desc, id desc
      `,
      [input.email.trim(), input.codeHash],
    );

    const now = new Date();

    for (const row of result.rows) {
      if (row.expires_at <= now) {
        await pool.query("update tenant_email_login_codes set consumed_at = now() where id = $1", [row.id]);
        continue;
      }

      await pool.query("update tenant_email_login_codes set consumed_at = now() where id = $1", [row.id]);
      return {
        tenantId: row.tenant_id ?? undefined,
        tenantSlug: row.tenant_slug ?? undefined,
        metadata:
          row.metadata_json && typeof row.metadata_json === "object" && !Array.isArray(row.metadata_json)
            ? row.metadata_json
            : {},
      };
    }

    return null;
  } catch (error) {
    if (shouldSuppressLegacyDbErrors()) {
      return null;
    }
    throw error;
  }
}
