-- =====================================================
-- Migration: Fix Signup Race Condition
-- Date: November 27, 2024
-- Purpose: Create database trigger to atomically provision
--          workspace when a user is created, preventing
--          orphaned users if any signup step fails.
-- =====================================================

-- Create function to auto-provision workspace on user creation
CREATE OR REPLACE FUNCTION handle_new_user_workspace_provisioning()
RETURNS TRIGGER AS $$
DECLARE
  new_space_id UUID;
  space_name_to_use TEXT;
BEGIN
  -- Check if user already has a space membership (prevents duplicate workspace creation)
  IF EXISTS (SELECT 1 FROM space_members WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Determine space name: use metadata from auth if available, else default
  -- The space name should have been set by the signup flow in user metadata
  space_name_to_use := COALESCE(
    (
      SELECT raw_user_meta_data->>'space_name'
      FROM auth.users
      WHERE id = NEW.id
    ),
    NEW.name || '''s Space'
  );

  -- Create personal workspace for the new user
  INSERT INTO spaces (
    name,
    is_personal,
    auto_created,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    space_name_to_use,
    true,
    true,
    NEW.id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_space_id;

  -- Add user as owner of the space
  INSERT INTO space_members (
    space_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    new_space_id,
    NEW.id,
    'owner',
    NOW()
  );

  -- Log the successful workspace provisioning
  RAISE LOG 'Auto-provisioned workspace % for user %', new_space_id, NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    -- The signup API will handle retry logic
    RAISE LOG 'Failed to auto-provision workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_user_created_provision_workspace ON public.users;

-- Create trigger to fire AFTER a new user is inserted
CREATE TRIGGER on_user_created_provision_workspace
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_workspace_provisioning();

-- =====================================================
-- Also create a function to fix any existing orphaned users
-- This can be run manually if needed
-- =====================================================

CREATE OR REPLACE FUNCTION fix_orphaned_users()
RETURNS TABLE (
  user_id UUID,
  action TEXT,
  space_id UUID
) AS $$
DECLARE
  orphan RECORD;
  new_space_id UUID;
  space_name_to_use TEXT;
BEGIN
  -- Find users without any space membership
  FOR orphan IN
    SELECT u.id, u.name, u.email
    FROM public.users u
    LEFT JOIN space_members sm ON sm.user_id = u.id
    WHERE sm.user_id IS NULL
  LOOP
    -- Get space name from auth metadata if available
    space_name_to_use := COALESCE(
      (
        SELECT raw_user_meta_data->>'space_name'
        FROM auth.users
        WHERE id = orphan.id
      ),
      orphan.name || '''s Space'
    );

    -- Create space
    INSERT INTO spaces (
      name,
      is_personal,
      auto_created,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      space_name_to_use,
      true,
      true,
      orphan.id,
      NOW(),
      NOW()
    )
    RETURNING id INTO new_space_id;

    -- Add membership
    INSERT INTO space_members (
      space_id,
      user_id,
      role,
      joined_at
    ) VALUES (
      new_space_id,
      orphan.id,
      'owner',
      NOW()
    );

    -- Return result
    user_id := orphan.id;
    action := 'Created workspace';
    space_id := new_space_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
REVOKE ALL ON FUNCTION fix_orphaned_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fix_orphaned_users() TO service_role;

-- =====================================================
-- Add comment for documentation
-- =====================================================

COMMENT ON FUNCTION handle_new_user_workspace_provisioning() IS
  'Automatically provisions a personal workspace when a new user is created. This ensures atomic workspace creation and prevents orphaned users during signup.';

COMMENT ON FUNCTION fix_orphaned_users() IS
  'Utility function to fix any existing orphaned users (users without space membership). Run with service_role permissions.';

COMMENT ON TRIGGER on_user_created_provision_workspace ON public.users IS
  'Trigger that fires after user insertion to auto-provision workspace.';
