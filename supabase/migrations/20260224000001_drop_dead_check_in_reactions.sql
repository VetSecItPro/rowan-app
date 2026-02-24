-- ============================================
-- Drop dead table: check_in_reactions
-- ============================================
-- The live table is "checkin_reactions" (no underscore), used by reactions-service.ts.
-- "check_in_reactions" (with underscore) has 0 code references and 0 data rows.
-- It was likely an earlier naming attempt that was never cleaned up.
--
-- Rollback: Table had 0 data and 0 code references; recreation not necessary.
-- ============================================

DROP TABLE IF EXISTS check_in_reactions;
