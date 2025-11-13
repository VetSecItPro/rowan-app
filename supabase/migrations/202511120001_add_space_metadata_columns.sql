-- =============================================
-- Add missing metadata columns to spaces table
-- Date: 2025-11-12
-- Purpose:
--   The application layer expects spaces to include description, type,
--   JSON settings, user ownership markers, and personal workspace flags.
--   Without these columns, creating a space from the UI fails because the
--   insert payload references non-existent fields.
-- =============================================

-- Add description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'description'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add type column (household, family, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'type'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN type TEXT DEFAULT 'household';
  END IF;
END $$;

-- Add JSON settings column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'settings'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add user_id column for personal workspace ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
END $$;

-- Add is_personal flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'is_personal'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN is_personal BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add auto_created flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spaces' AND column_name = 'auto_created'
  ) THEN
    ALTER TABLE spaces
      ADD COLUMN auto_created BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
