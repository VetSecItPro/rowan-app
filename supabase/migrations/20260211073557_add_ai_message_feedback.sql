-- Migration: add_ai_message_feedback
-- Applied via MCP on 2026-02-11
-- Adds feedback columns to ai_messages for thumbs up/down on AI responses

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('positive', 'negative', NULL)),
ADD COLUMN IF NOT EXISTS feedback_text TEXT;

CREATE INDEX idx_ai_messages_feedback ON ai_messages(feedback) WHERE feedback IS NOT NULL;
