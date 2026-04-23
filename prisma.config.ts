import "dotenv/config";

import { defineConfig } from "prisma/config";

function normalizeDatabaseUrl(url?: string) {
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  return url.replace(/^postgresql\+asyncpg:\/\//, "postgresql://");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL),
  },
});
