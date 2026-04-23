DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignStatus') THEN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "source_platform" TEXT NOT NULL DEFAULT 'manual',
  "source_key" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "budget_cents" INTEGER NOT NULL DEFAULT 0,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaigns_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_tenant_id_source_key_key"
  ON "campaigns"("tenant_id", "source_key");

CREATE INDEX IF NOT EXISTS "campaigns_tenant_id_status_deleted_at_idx"
  ON "campaigns"("tenant_id", "status", "deleted_at");

CREATE INDEX IF NOT EXISTS "campaigns_tenant_id_channel_deleted_at_idx"
  ON "campaigns"("tenant_id", "channel", "deleted_at");
