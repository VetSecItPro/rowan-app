import { NextRequest, NextResponse } from 'next/server';

// Lazy-loaded validation schema (will be created at runtime)
let SignUpSchema: any;
let supabaseServerClient: any;

export async function POST(request: NextRequest) {
  // CRITICAL: Prevent any execution during build time
  // Check for various build-time indicators
  if (!request ||
      !request.headers ||
      typeof request.json !== 'function' ||
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NODE_ENV === 'test' ||
      !globalThis.Request) {
    return NextResponse.json({ error: 'Build time - route disabled' }, { status: 503 });
  }

  try {
    // Lazy-load dependencies at runtime to prevent build-time issues
    const [
      { createClient },
      { authRateLimit },
      { extractIP },
      { z },
      { supabaseAdmin }
    ] = await Promise.all([
      import('@/lib/supabase/server'),
      import('@/lib/ratelimit'),
      import('@/lib/ratelimit-fallback'),
      import('zod'),
      import('@/lib/supabase/admin')
    ]);

    supabaseServerClient = supabaseAdmin;

    // Create validation schema at runtime
    if (!SignUpSchema) {
      SignUpSchema = z.object({
        email: z.string()
          .email('Invalid email format')
          .max(254, 'Email too long')
          .toLowerCase()
          .trim(),
        password: z.string()
          .min(10, 'Password must be at least 10 characters')
          .max(128, 'Password too long')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number')
          .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
        profile: z.object({
          name: z.string()
            .min(1, 'Name is required')
            .max(100, 'Name too long')
            .trim(),
          color_theme: z.enum([
            'emerald', 'blue', 'purple', 'pink', 'orange', 'rose',
            'cyan', 'amber', 'indigo', 'teal', 'red', 'lime',
            'fuchsia', 'violet', 'sky', 'mint', 'coral', 'lavender', 'sage', 'slate'
          ]).optional(),
          space_name: z.string()
            .min(1, 'Space name is required')
            .max(100, 'Space name too long')
            .trim(),
          marketing_emails_enabled: z.boolean().optional(),
        }),
        // Beta invite code - optional when invite_token is provided
        beta_code: z.string()
          .min(8, 'A valid beta invite code is required to sign up')
          .max(20, 'Invalid beta code format')
          .optional(),
        // Invitation token - for users invited to a space (alternative to beta_code)
        invite_token: z.string()
          .min(1, 'Invalid invitation token')
          .max(500, 'Invalid invitation token')
          .optional(),
      }).refine(
        (data) => data.beta_code || data.invite_token,
        { message: 'Either a beta invite code or an invitation token is required to sign up' }
      );
    }

    // Extract IP for rate limiting (deployment fix)
    const ip = extractIP(request.headers);

    // Apply rate limiting (more restrictive for signup: 3 attempts per hour)
    const { success, limit, remaining, reset } = authRateLimit
      ? await authRateLimit.limit(ip)
      : { success: true, limit: 3, remaining: 2, reset: Date.now() + 3600000 };

    if (!success) {
      const minutesUntilReset = Math.ceil((reset - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Too many signup attempts. Please wait ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} and try again.`,
          resetTime: reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = SignUpSchema.parse(body);

    // Sanitize user input to prevent XSS attacks
    const { sanitizePlainText } = await import('@/lib/sanitize');

    const sanitizedProfile = {
      ...validated.profile,
      name: sanitizePlainText(validated.profile.name),
      space_name: validated.profile.space_name ? sanitizePlainText(validated.profile.space_name) : undefined,
    };

    // BETA PERIOD: Validate authorization BEFORE creating user
    // Users can sign up with either:
    // 1. A beta invite code (original 100 beta users)
    // 2. An invitation token (users invited to a space by existing members)
    let authorizationType: 'beta_code' | 'invite_token' = 'beta_code';
    let betaCodeData: { id: string; code: string; used_by: string | null; expires_at: string | null; is_active: boolean } | null = null;
    let invitationData: { id: string; space_id: string; email: string; status: string; expires_at: string } | null = null;

    if (validated.beta_code) {
      // Validate beta invite code
      const normalizedBetaCode = validated.beta_code.replace(/-/g, '').toUpperCase().trim();

      const { data, error: betaCodeError } = await supabaseServerClient
        .from('beta_invite_codes')
        .select('id, code, used_by, expires_at, is_active')
        .or(`code.eq.${validated.beta_code},code.eq.${normalizedBetaCode}`)
        .single();

      if (betaCodeError || !data) {
        return NextResponse.json(
          { error: 'Invalid beta invite code. Please check your code and try again.' },
          { status: 400 }
        );
      }

      // Check if code is already used
      if (data.used_by) {
        return NextResponse.json(
          { error: 'This beta invite code has already been used.' },
          { status: 400 }
        );
      }

      // Check if code is active
      if (!data.is_active) {
        return NextResponse.json(
          { error: 'This beta invite code is no longer active.' },
          { status: 400 }
        );
      }

      // Check if code has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This beta invite code has expired.' },
          { status: 400 }
        );
      }

      betaCodeData = data;
      authorizationType = 'beta_code';

    } else if (validated.invite_token) {
      // Validate invitation token - users invited to a space don't need a beta code
      const { data, error: inviteError } = await supabaseServerClient
        .from('space_invitations')
        .select('id, space_id, email, status, expires_at')
        .eq('token', validated.invite_token)
        .single();

      if (inviteError || !data) {
        return NextResponse.json(
          { error: 'Invalid invitation link. Please ask for a new invitation.' },
          { status: 400 }
        );
      }

      // Check if invitation has already been used
      if (data.status !== 'pending') {
        return NextResponse.json(
          { error: `This invitation has already been ${data.status}.` },
          { status: 400 }
        );
      }

      // Check if invitation has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Update status to expired
        await supabaseServerClient
          .from('space_invitations')
          .update({ status: 'expired' })
          .eq('id', data.id);

        return NextResponse.json(
          { error: 'This invitation has expired. Please ask for a new invitation.' },
          { status: 400 }
        );
      }

      invitationData = data;
      authorizationType = 'invite_token';
    } else {
      // This shouldn't happen due to schema validation, but just in case
      return NextResponse.json(
        { error: 'A beta invite code or invitation is required to sign up.' },
        { status: 400 }
      );
    }

    // Create Supabase client (runtime only)
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Attempt signup with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: sanitizedProfile.name,
          color_theme: sanitizedProfile.color_theme || 'purple',
          space_name: sanitizedProfile.space_name,
          marketing_emails_enabled: sanitizedProfile.marketing_emails_enabled ?? false,
        },
      },
    });

    if (error) {
      // Handle specific signup errors with clear messages
      if (error.message.includes('User already registered') ||
          error.message.includes('already been registered') ||
          error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid email') || error.message.includes('invalid email')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400 }
        );
      }

      // Handle password-related errors - show actual Supabase message for clarity
      if (error.message.includes('Password') || error.message.includes('password')) {
        // Check for leaked/breached password (HIBP check)
        if (error.message.includes('leaked') ||
            error.message.includes('breached') ||
            error.message.includes('pwned') ||
            error.message.includes('compromised') ||
            error.message.includes('data breach')) {
          return NextResponse.json(
            { error: 'This password has appeared in a data breach. Please choose a different, more secure password.' },
            { status: 400 }
          );
        }

        // For all other password errors, show the actual Supabase error
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message.includes('rate') || error.message.includes('limit') || error.message.includes('too many')) {
        return NextResponse.json(
          { error: 'Too many signup attempts. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Connection error. Please check your internet and try again.' },
          { status: 503 }
        );
      }

      // Return user-friendly message
      return NextResponse.json(
        { error: `Account creation failed: ${error.message || 'Unknown error'}. Please try again.` },
        { status: 500 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }

    const userId = data.user.id;
    const spaceName = sanitizedProfile.space_name;

    // CRITICAL FIX: Create or update user record in public.users table
    // Using upsert because auth trigger may have already created a minimal profile
    const { error: publicUserError } = await supabaseServerClient
      .from('users')
      .upsert({
        id: userId,
        email: validated.email,
        name: sanitizedProfile.name,
        color_theme: sanitizedProfile.color_theme || 'purple',
        timezone: 'America/New_York', // Default timezone
        show_tasks_on_calendar: true,
        calendar_task_filter: { categories: [], priorities: [] },
        default_reminder_offset: '1_day_before',
        privacy_settings: { analytics: true, readReceipts: true, activityStatus: true, profileVisibility: true },
        show_chores_on_calendar: true,
        calendar_chore_filter: { categories: [], frequencies: [] },
        created_at: data.user.created_at,
        updated_at: data.user.created_at
      }, { onConflict: 'id' });

    if (publicUserError) {
      // Clean up the auth user
      try {
        await supabaseServerClient.auth.admin.deleteUser(userId);
      } catch {
        // Cleanup failed - orphaned auth user may exist
      }

      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

    // Check if workspace was already created by database trigger
    // The trigger on public.users automatically provisions a workspace
    // For invited users, the trigger adds them to the invited space instead
    const { data: existingMembership } = await supabaseServerClient
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMembership) {
      // Workspace already handled by trigger - we're done
      // For invited users: trigger added them to the invited space
      // For regular users: trigger created their default space
    } else {
      // Fallback: Trigger may not have fired - handle manually
      if (invitationData) {
        // INVITED USER: Add to the invited space (don't create a new space)
        const { error: memberError } = await supabaseServerClient
          .from('space_members')
          .insert({
            space_id: invitationData.space_id,
            user_id: userId,
            role: 'member',  // Invited users start as members
          });

        if (memberError) {
          try {
            await supabaseServerClient.auth.admin.deleteUser(userId);
          } catch {
            // Cleanup failed
          }

          return NextResponse.json(
            { error: 'Failed to join the invited space. Please try again.' },
            { status: 500 }
          );
        }

        // Mark invitation as accepted
        await supabaseServerClient
          .from('space_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitationData.id);

      } else {
        // REGULAR USER: Create the initial space manually
        const { data: newSpace, error: spaceError } = await supabaseServerClient
          .from('spaces')
          .insert({
            name: spaceName,
            is_personal: true,
            auto_created: true,
            user_id: userId
          })
          .select('id')
          .single();

        if (spaceError || !newSpace) {
          // Clean up the auth user to avoid orphaned accounts
          try {
            await supabaseServerClient.auth.admin.deleteUser(userId);
          } catch {
            // Cleanup failed - orphaned auth user may exist
          }

          return NextResponse.json(
            { error: 'Failed to create initial space. Please try again.' },
            { status: 500 }
          );
        }

        const { error: memberError } = await supabaseServerClient
          .from('space_members')
          .insert({
            space_id: newSpace.id,
            user_id: userId,
            role: 'owner',
          });

        if (memberError) {
          try {
            await supabaseServerClient.from('spaces').delete().eq('id', newSpace.id);
            await supabaseServerClient.auth.admin.deleteUser(userId);
          } catch {
            // Cleanup failed
          }

          return NextResponse.json(
            { error: 'Failed to finalize account setup. Please try again.' },
            { status: 500 }
          );
        }
      }
    }

    // Initialize subscription based on signup type
    // Beta users (via beta_code or invite_token during beta) get free access until Feb 15, 2026
    // Regular users (post-beta) get 14-day trial
    try {
      // During beta period, all signups get beta subscription (free until Feb 15, 2026)
      // This includes both beta code users AND users invited to spaces by beta users
      const isBetaPeriod = new Date() < new Date('2026-02-15T23:59:59Z');

      if (isBetaPeriod) {
        // Beta subscription: free Pro access until Feb 15, 2026
        const { error: subscriptionError } = await supabaseServerClient
          .rpc('initialize_beta_subscription', { p_user_id: userId });

        if (!subscriptionError) {
          // Record beta started event
          await supabaseServerClient
            .rpc('record_trial_started', { p_user_id: userId });
        }
      } else {
        // Post-beta: regular 14-day trial
        const { error: subscriptionError } = await supabaseServerClient
          .rpc('initialize_subscription', { p_user_id: userId });

        if (!subscriptionError) {
          // Record trial started event
          await supabaseServerClient
            .rpc('record_trial_started', { p_user_id: userId });
        }
      }
      // Non-critical - subscription will be created on first access if needed
    } catch {
      // Non-critical - subscription will be created on first access if needed
    }

    // CRITICAL: Grant beta access based on authorization type
    if (authorizationType === 'invite_token') {
      // Invited users get beta access automatically (doesn't count against 100 beta codes)
      try {
        await supabaseServerClient
          .from('beta_access_requests')
          .insert({
            email: validated.email,
            user_id: userId,
            access_granted: true,
            access_granted_at: new Date().toISOString(),
            source: 'space_invitation',
            notes: 'Granted via space invitation'
          });
      } catch {
        // Non-critical - don't fail signup if beta access creation fails
      }
    } else {
      // Beta code users - link to existing beta_access_requests record
      try {
        await supabaseServerClient
          .from('beta_access_requests')
          .update({
            user_id: userId,
            email: validated.email,
            approved_at: new Date().toISOString()
          })
          .eq('access_granted', true)
          .is('user_id', null)
          .order('created_at', { ascending: false })
          .limit(1);
      } catch {
        // Non-critical - beta access linking is optional
      }
    }

    // Mark beta invite code as used (only after ALL signup steps complete successfully)
    // This ensures the code isn't wasted if signup fails partway through
    if (validated.beta_code) {
      try {
        // Normalize the code (remove dashes, uppercase) to match stored format
        const normalizedCode = validated.beta_code.replace(/-/g, '').toUpperCase().trim();

        await supabaseServerClient
          .from('beta_invite_codes')
          .update({
            used_by: userId,
            used_at: new Date().toISOString(),
          })
          .or(`code.eq.${validated.beta_code},code.eq.${normalizedCode}`)
          .is('used_by', null); // Only update if not already used

        // Non-critical - don't fail signup if code marking fails
      } catch {
        // Non-critical - beta code marking is optional
      }
    }

    // Success response
    // SECURITY: Do NOT return full session object as it contains access/refresh tokens
    // Tokens are set via httpOnly cookies by Supabase SSR, not exposed in response body
    return NextResponse.json(
      {
        success: true,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
          created_at: data.user.created_at,
          updated_at: data.user.updated_at,
          user_metadata: data.user.user_metadata,
        } : null,
        // Only return non-sensitive session metadata, not tokens
        session: data.session ? {
          expires_at: data.session.expires_at,
        } : null,
        message: data.user?.email_confirmed_at
          ? 'Account created successfully'
          : 'Account created. Please check your email to verify your account.'
      },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );

  } catch (error) {
    // Handle validation errors
    const { z: ZodImport } = await import('zod');
    if (error instanceof ZodImport.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues[0].message
        },
        { status: 400 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Log error server-side for debugging (sanitized, not exposed to client)
    // Uses structured logger which redacts sensitive fields (passwords, tokens, etc.)
    const { logger } = await import('@/lib/logger');
    logger.error(
      'Signup failed',
      error instanceof Error ? error : new Error(String(error)),
      { component: 'api-signup', action: 'signup' }
    );

    // Generic error handler
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
