CREATE TABLE IF NOT EXISTS messaging_channel_sessions (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(50) NOT NULL,
  conversation_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(64),
  customer_identity_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  service_search_query TEXT,
  service_options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_controls_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_ai_intent VARCHAR(100),
  last_workflow_status VARCHAR(100),
  last_reply_delivery_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_callback_ack_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_channel_sessions_channel_conversation
  ON messaging_channel_sessions (channel, conversation_id);

CREATE INDEX IF NOT EXISTS idx_messaging_channel_sessions_channel
  ON messaging_channel_sessions (channel);

CREATE INDEX IF NOT EXISTS idx_messaging_channel_sessions_tenant
  ON messaging_channel_sessions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_messaging_channel_sessions_updated_at
  ON messaging_channel_sessions (updated_at);
