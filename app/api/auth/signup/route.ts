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
      { supabaseServer }
    ] = await Promise.all([
      import('@/lib/supabase/server'),
      import('@/lib/ratelimit'),
      import('@/lib/ratelimit-fallback'),
      import('zod'),
      import('@/lib/supabase-server')
    ]);

    supabaseServerClient = supabaseServer;

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
          pronouns: z.string()
            .max(50, 'Pronouns too long')
            .optional(),
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
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
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
      pronouns: validated.profile.pronouns ? stripTags(validated.profile.pronouns) : undefined,
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
          pronouns: sanitizedProfile.pronouns,
          color_theme: sanitizedProfile.color_theme || 'purple',
          space_name: sanitizedProfile.space_name,
          marketing_emails_enabled: sanitizedProfile.marketing_emails_enabled ?? false,
        },
      },
    });

    if (error) {
      // Handle specific signup errors
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid email')) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }

      if (error.message.includes('Password')) {
        return NextResponse.json(
          { error: 'Password does not meet requirements' },
          { status: 400 }
        );
      }

      // Generic error for other cases
      console.error('Signup error:', error);
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
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

    // Create the initial space using service role client
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
