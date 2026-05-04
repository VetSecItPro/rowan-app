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
    -- Pre-flight: deleting orphans triggers cascades that hit NOT NULL
    -- constraints elsewhere (e.g. task_handoffs.to_user_id). Skip the
    -- FK add if orphans exist — they signal earlier migration seed
    -- data that should be reconciled separately. Production already
    -- has the FK in place (per ADR 0020), so this branch only fires
    -- on fresh-DB replay where prior migrations may have seeded a
    -- public.users row without a matching auth.users entry.
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)
    ) THEN
      RAISE NOTICE 'Skipping users_id_fkey: % orphan public.users rows; clean up upstream then re-run.',
        (SELECT COUNT(*) FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id));
    ELSE
      ALTER TABLE public.users
        ADD CONSTRAINT users_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- COMMENT only fires when the constraint actually exists (NOTICE'd skip path leaves it absent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name='users_id_fkey' AND table_schema='public' AND table_name='users') THEN
    EXECUTE $cmd$
      COMMENT ON CONSTRAINT users_id_fkey ON public.users IS
        'CASCADE delete on auth.users removal. Added 2026-04-30 to prevent the orphan accumulation pattern surfaced during the ghost-migration cleanup (see ADR 0020).'
    $cmd$;
  END IF;
END $$;
-- (Original COMMENT statement is gated inside the DO block above to handle
--  the orphan-skip path where the constraint may not exist on a fresh DB.)
