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
          .min(8, 'Password must be at least 8 characters')
          .max(128, 'Password too long')
          .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
          .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
          .regex(/[0-9]/, 'Password must contain at least one number'),
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
      });
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

    // Simple text sanitization to prevent XSS (avoid DOMPurify during build)
    const stripTags = (str: string) => str.replace(/<[^>]*>/g, '').trim();

    const sanitizedProfile = {
      ...validated.profile,
      name: stripTags(validated.profile.name),
      space_name: validated.profile.space_name ? stripTags(validated.profile.space_name) : undefined,
    };

    // Create Supabase client (runtime only)
    let supabase;
    try {
      supabase = createClient();
    } catch (error) {
      console.error('Supabase client creation failed:', error);
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
      console.error('Supabase auth signup error:', error.message, error);

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

      // Log the actual error for debugging but return user-friendly message
      console.error('Unhandled signup error:', error);
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
      console.error('Public user creation failed:', publicUserError);
      // Clean up the auth user
      try {
        await supabaseServerClient.auth.admin.deleteUser(userId);
      } catch (error) {
        console.error('Failed to cleanup auth user after public user creation failure:', error);
      }

      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

    // Check if workspace was already created by database trigger
    // The trigger on public.users automatically provisions a workspace
    const { data: existingMembership } = await supabaseServerClient
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .single();

    if (existingMembership) {
      // Workspace already created by trigger - we're done
      console.log('Workspace already provisioned by trigger for user:', userId);
    } else {
      // Fallback: Create the initial space manually (trigger may not have fired)
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
        console.error('Space creation failed:', spaceError);
        // Clean up the auth user to avoid orphaned accounts
        try {
          await supabaseServerClient.auth.admin.deleteUser(userId);
        } catch (error) {
          console.error('Failed to cleanup auth user after signup failure:', error);
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
        console.error('Failed to add user to initial space:', memberError);
        try {
          await supabaseServerClient.from('spaces').delete().eq('id', newSpace.id);
          await supabaseServerClient.auth.admin.deleteUser(userId);
        } catch (error) {
          console.error('Cleanup after membership failure failed:', error);
        }

        return NextResponse.json(
          { error: 'Failed to finalize account setup. Please try again.' },
          { status: 500 }
        );
      }
    }

    // CRITICAL: Link user to beta_access_requests for tracking
    // Find the most recent successful beta access request (with no user_id yet)
    // and link it to this new user
    try {
      const { error: betaLinkError } = await supabaseServerClient
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

      if (betaLinkError) {
        // Non-critical - just log it, don't fail signup
        console.warn('Failed to link beta access request:', betaLinkError);
      } else {
        console.log('Successfully linked beta access request for user:', userId);
      }
    } catch (betaError) {
      // Non-critical - just log it
      console.warn('Beta access linking error:', betaError);
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        user: data.user,
        session: data.session,
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

    // Generic error handler
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
