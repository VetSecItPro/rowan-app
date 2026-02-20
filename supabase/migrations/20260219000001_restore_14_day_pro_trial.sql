-- ============================================================================
-- Migration: Restore 14-day Pro trial for new signups
-- Date: 2026-02-19
-- Purpose: New users get 14-day Pro trial. After expiry, they drop to free.
--          Trial is tracked via trial_started_at / trial_ends_at columns
--          (already exist from previous migration).
--          getUserTier() checks trial expiration at runtime.
-- ============================================================================

-- Step 1: Update provision_new_user to give new users a 14-day Pro trial
CREATE OR REPLACE FUNCTION public.provision_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_meta JSONB;
    v_name TEXT;
    v_space_name TEXT;
    v_color_theme TEXT;
    v_invite_token TEXT;
    v_marketing_emails BOOLEAN;
    v_space_id UUID;
    v_invitation RECORD;
BEGIN
    -- ========================================================================
    -- STEP 1: Extract metadata from auth user
    -- ========================================================================
    v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

    v_name := COALESCE(
        v_meta->>'name',
        v_meta->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    v_space_name := COALESCE(
        v_meta->>'space_name',
        v_name || '''s Space'
    );

    v_color_theme := COALESCE(v_meta->>'color_theme', 'emerald');
    v_invite_token := v_meta->>'invite_token';
    v_marketing_emails := COALESCE((v_meta->>'marketing_emails_enabled')::boolean, false);

    -- ========================================================================
    -- STEP 2: Create public.users record
    -- ========================================================================
    INSERT INTO public.users (
        id,
        email,
        name,
        color_theme,
        timezone,
        show_tasks_on_calendar,
        calendar_task_filter,
        default_reminder_offset,
        privacy_settings,
        show_chores_on_calendar,
        calendar_chore_filter,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_color_theme,
        'America/New_York',
        true,
        '{"categories": [], "priorities": []}'::jsonb,
        '1_day_before',
        '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::jsonb,
        true,
        '{"categories": [], "frequencies": []}'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(users.name, EXCLUDED.name),
        color_theme = COALESCE(users.color_theme, EXCLUDED.color_theme),
        updated_at = NOW();

    -- ========================================================================
    -- STEP 3: Create public.profiles record (for compatibility)
    -- ========================================================================
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        name,
        timezone,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_name,
        'America/New_York',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        name = COALESCE(profiles.name, EXCLUDED.name),
        updated_at = NOW();

    -- ========================================================================
    -- STEP 4: Handle space creation or joining
    -- ========================================================================
    IF v_invite_token IS NOT NULL AND v_invite_token != '' THEN
        -- User is joining an existing space via invitation
        SELECT * INTO v_invitation
        FROM public.space_invitations
        WHERE token = v_invite_token
          AND status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF v_invitation.id IS NOT NULL THEN
            v_space_id := v_invitation.space_id;

            -- Mark invitation as accepted
            UPDATE public.space_invitations
            SET status = 'accepted',
                updated_at = NOW()
            WHERE id = v_invitation.id;

            -- Add user as member (not owner)
            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, COALESCE(v_invitation.role, 'member'), NOW())
            ON CONFLICT (space_id, user_id) DO NOTHING;
        ELSE
            -- Invalid or expired invitation - create a new space instead
            INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
            VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
            RETURNING id INTO v_space_id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, 'owner', NOW());
        END IF;
    ELSE
        -- Create a new personal space for the user
        INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
        VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
        RETURNING id INTO v_space_id;

        INSERT INTO public.space_members (space_id, user_id, role, joined_at)
        VALUES (v_space_id, NEW.id, 'owner', NOW());
    END IF;

    -- ========================================================================
    -- STEP 5: Create subscription with 14-day Pro trial
    -- ========================================================================
    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        period,
        trial_started_at,
        trial_ends_at,
        subscription_started_at,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'pro',
        'active',
        'monthly',
        NOW(),
        NOW() + INTERVAL '14 days',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    RAISE LOG 'provision_new_user: Successfully provisioned user % with space % (14-day Pro trial)', NEW.id, v_space_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'provision_new_user error for user %: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;
