import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __bookedaiPrisma: PrismaClient | undefined;
}

function normalizeDatabaseUrl(url?: string) {
  if (!url) {
    return null;
  }

  return url.replace(/^postgresql\+asyncpg:\/\//, "postgresql://");
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL) && process.env.BOOKEDAI_ENABLE_PRISMA === "1";
}

export function getPrismaClient() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!global.__bookedaiPrisma) {
    const pool = new Pool({
      connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) ?? undefined,
    });
    const adapter = new PrismaPg(pool);
    global.__bookedaiPrisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return global.__bookedaiPrisma;
}
