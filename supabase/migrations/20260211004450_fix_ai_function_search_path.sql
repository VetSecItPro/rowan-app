-- Migration: fix_ai_function_search_path
-- Applied via MCP on 2026-02-11
-- Security: Set search_path on AI-related functions to prevent search_path hijacking
-- (Applied to any functions created alongside the AI tables)

-- This migration ensured all AI-related database functions
-- use explicit search_path = '' for security.
-- The actual function definitions are inline in the application layer.
-- This is a no-op placeholder to keep migration history in sync.
SELECT 1;
