-- Migration: Add CASCADE FK from public.users.id → auth.users.id
-- Date: 2026-04-30
-- Purpose: Without this FK, deleting a user from auth.users left orphaned
-- rows in public.users. Tests creating throwaway users (concurrent-test-*,
-- redteam-*, smoke-test) accumulated 25-90 stale rows over time. Today's
-- cleanup surfaced this gap (PR #325 ghost-migration recovery + DB purge).
--
-- ON DELETE CASCADE means future user deletions from auth.users
-- automatically clean up public.users — no manual orphan sweep needed.
--
-- Idempotent: only adds the constraint if it doesn't already exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    -- Pre-flight: ensure no orphans exist (would block the FK add).
    -- Any orphans here are unintentional — fail loudly if seen.
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)
    ) THEN
      RAISE EXCEPTION 'Cannot add FK: % orphan rows in public.users (no matching auth.users)',
        (SELECT COUNT(*) FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id));
    END IF;

    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT users_id_fkey ON public.users IS
  'CASCADE delete on auth.users removal. Added 2026-04-30 to prevent the orphan accumulation pattern surfaced during the ghost-migration cleanup (see ADR 0020).';
