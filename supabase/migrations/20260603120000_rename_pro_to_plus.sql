-- Rename subscription tier `pro` -> `plus` (3 June 2026)
--
-- Pairs with the application-code rename (SubscriptionTier 'pro' -> 'plus') and
-- the live Polar reprice/rename of the Rowan products. Uses the expand/contract
-- pattern so there is NO constraint-violation risk during the deploy window:
--   EXPAND (this migration): CHECK allows BOTH 'pro' and 'plus'; all existing
--     data is migrated to 'plus'; the three tier-emitting functions are updated
--     to emit 'plus'.
--   CONTRACT (future migration, tracked in rowan-backlog.md Phase 11): once we
--     confirm no 'pro' writes occur, drop 'pro' from the CHECK.
--
-- The application also carries a `normalizeTier()` shim (lib/types/subscription.ts)
-- that maps any stray legacy 'pro' to 'plus' at the read boundary - defense in depth.

-- ---------------------------------------------------------------------------
-- 1. Expand the CHECK constraint to allow both legacy 'pro' and new 'plus'.
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier = ANY (ARRAY['free'::text, 'pro'::text, 'plus'::text, 'family'::text, 'owner'::text]));

-- ---------------------------------------------------------------------------
-- 2. Migrate existing data 'pro' -> 'plus' (idempotent via WHERE clause).
--    subscription_events.from_tier / to_tier are plain text (no CHECK), so
--    they migrate freely.
-- ---------------------------------------------------------------------------
UPDATE public.subscriptions      SET tier      = 'plus' WHERE tier      = 'pro';
UPDATE public.subscription_events SET from_tier = 'plus' WHERE from_tier = 'pro';
UPDATE public.subscription_events SET to_tier   = 'plus' WHERE to_tier   = 'pro';

-- ---------------------------------------------------------------------------
-- 3. Recreate the three tier-emitting functions to emit 'plus'.
--    Bodies are copied verbatim from the squash baseline with ONLY the tier
--    literals and human-facing "Pro" wording changed.
-- ---------------------------------------------------------------------------

-- 3a. get_user_subscription_tier: returns the effective tier (trial -> plus).
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tier TEXT;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  SELECT tier, trial_ends_at INTO v_tier, v_trial_ends_at
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active';

  -- No subscription found = free tier
  IF v_tier IS NULL THEN
    RETURN 'free';
  END IF;

  -- Normalize any legacy 'pro' to 'plus' on the way out.
  IF v_tier = 'pro' THEN
    v_tier := 'plus';
  END IF;

  -- If user has paid tier, return it
  IF v_tier IN ('plus', 'family') THEN
    RETURN v_tier;
  END IF;

  -- If user is in active trial, give them Plus tier access
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN 'plus';  -- Trial users get Plus features
  END IF;

  -- Default to free tier
  RETURN 'free';
END;
$$;

-- 3b. provision_new_user: auth trigger that seeds a 14-day Plus trial.
CREATE OR REPLACE FUNCTION public.provision_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

    INSERT INTO public.users (
        id, email, name, color_theme, timezone,
        show_tasks_on_calendar, calendar_task_filter, default_reminder_offset,
        privacy_settings, show_chores_on_calendar, calendar_chore_filter,
        created_at, updated_at
    ) VALUES (
        NEW.id, NEW.email, v_name, v_color_theme, 'America/New_York',
        true, '{"categories": [], "priorities": []}'::jsonb, '1_day_before',
        '{"analytics": true, "readReceipts": true, "activityStatus": true, "profileVisibility": true}'::jsonb,
        true, '{"categories": [], "frequencies": []}'::jsonb,
        NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(users.name, EXCLUDED.name),
        color_theme = COALESCE(users.color_theme, EXCLUDED.color_theme),
        updated_at = NOW();

    INSERT INTO public.profiles (
        id, email, full_name, name, timezone, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.email, v_name, v_name, 'America/New_York', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        name = COALESCE(profiles.name, EXCLUDED.name),
        updated_at = NOW();

    IF v_invite_token IS NOT NULL AND v_invite_token != '' THEN
        SELECT * INTO v_invitation
        FROM public.space_invitations
        WHERE token = v_invite_token
          AND status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF v_invitation.id IS NOT NULL THEN
            v_space_id := v_invitation.space_id;

            UPDATE public.space_invitations
            SET status = 'accepted', updated_at = NOW()
            WHERE id = v_invitation.id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, COALESCE(v_invitation.role, 'member'), NOW())
            ON CONFLICT (space_id, user_id) DO NOTHING;
        ELSE
            INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
            VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
            RETURNING id INTO v_space_id;

            INSERT INTO public.space_members (space_id, user_id, role, joined_at)
            VALUES (v_space_id, NEW.id, 'owner', NOW());
        END IF;
    ELSE
        INSERT INTO public.spaces (name, is_personal, auto_created, user_id, created_by, created_at, updated_at)
        VALUES (v_space_name, true, true, NEW.id, NEW.id, NOW(), NOW())
        RETURNING id INTO v_space_id;

        INSERT INTO public.space_members (space_id, user_id, role, joined_at)
        VALUES (v_space_id, NEW.id, 'owner', NOW());
    END IF;

    -- Create subscription with 14-day Plus trial
    INSERT INTO public.subscriptions (
        user_id, tier, status, period,
        trial_started_at, trial_ends_at,
        subscription_started_at, created_at, updated_at
    ) VALUES (
        NEW.id, 'plus', 'active', 'monthly',
        NOW(), NOW() + INTERVAL '14 days',
        NOW(), NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();

    RAISE LOG 'provision_new_user: Successfully provisioned user % with space % (14-day Plus trial)', NEW.id, v_space_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'provision_new_user error for user %: % (SQLSTATE: %)',
        NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 3c. record_trial_expired: logs the trial -> free transition.
CREATE OR REPLACE FUNCTION public.record_trial_expired(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.record_subscription_event(
    p_user_id,
    'trial_expired',
    'plus', -- Was plus during trial
    'free', -- Now free
    'system',
    '{}'::jsonb
  );
END;
$$;
