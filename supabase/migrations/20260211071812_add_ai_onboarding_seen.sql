-- Migration: add_ai_onboarding_seen
-- Applied via MCP on 2026-02-11
-- Adds ai_onboarding_seen flag to ai_user_settings

ALTER TABLE ai_user_settings
ADD COLUMN IF NOT EXISTS ai_onboarding_seen BOOLEAN NOT NULL DEFAULT false;
