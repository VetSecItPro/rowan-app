-- Migration: drop_digest_view_and_fix_handle_new_user
-- Applied via MCP on 2026-02-12
-- Drops the digest_summary view (digest feature removed) and fixes handle_new_user trigger
-- to remove beta/trial logic

-- Drop the digest view if it exists
DROP VIEW IF EXISTS digest_summary CASCADE;

-- Recreate handle_new_user without beta/trial logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Try to insert user profile
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      name,
      pronouns,
      color_theme
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
      NEW.raw_user_meta_data->>'pronouns',
      COALESCE(NEW.raw_user_meta_data->>'color_theme', 'emerald')
    );

    RAISE LOG 'Successfully created user profile for user %', NEW.id;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DON'T re-raise to prevent rollback
    RAISE WARNING 'Error in handle_new_user trigger for user %: % (SQLSTATE: %)',
      NEW.id, SQLERRM, SQLSTATE;
    RAISE LOG 'Auth user % will be created without profile - profile can be created manually', NEW.id;
  END;

  -- Always return NEW to allow auth user creation to succeed
  RETURN NEW;
END;
$$;
