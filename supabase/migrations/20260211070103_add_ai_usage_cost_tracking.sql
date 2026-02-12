-- Migration: add_ai_usage_cost_tracking
-- Applied via MCP on 2026-02-11
-- Adds daily AI usage tracking with cost estimation per feature

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  voice_seconds INTEGER NOT NULL DEFAULT 0,
  conversation_count INTEGER NOT NULL DEFAULT 0,
  tool_calls_count INTEGER NOT NULL DEFAULT 0,
  feature_source TEXT NOT NULL DEFAULT 'chat',
  estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
  ON ai_usage_daily FOR SELECT USING (auth.uid() = user_id);

-- Unique constraint: one row per user per date per feature
CREATE UNIQUE INDEX ai_usage_daily_user_date_feature_idx
  ON ai_usage_daily(user_id, date, feature_source);

CREATE INDEX idx_ai_usage_daily_user_date ON ai_usage_daily(user_id, date);
CREATE INDEX ai_usage_daily_space_date_idx ON ai_usage_daily(space_id, date);
CREATE INDEX ai_usage_daily_date_cost_idx ON ai_usage_daily(date, estimated_cost_usd);
CREATE INDEX ai_usage_daily_feature_source_idx ON ai_usage_daily(feature_source, date);
