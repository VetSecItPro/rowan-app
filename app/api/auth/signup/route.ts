import { NextRequest, NextResponse } from 'next/server';

/**
 * SIGNUP API ROUTE (THIN)
 *
 * This route only handles:
 * 1. Rate limiting
 * 2. Input validation
 * 3. Beta code / invite token validation
 * 4. Calling Supabase auth.signUp() with metadata
 *
 * All user provisioning (spaces, subscriptions, etc.) is handled by
 * the database trigger: provision_new_user()
 */

export async function POST(request: NextRequest) {
  // CRITICAL: Prevent any execution during build time
  if (!request ||
      !request.headers ||
      typeof request.json !== 'function' ||
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.NODE_ENV === 'test') {
    return NextResponse.json({ error: 'Build time - route disabled' }, { status: 503 });
  }

  try {
    // Lazy-load dependencies at runtime
    const [
      { createClient },
      { authRateLimit },
      { extractIP },
      { z },
      { supabaseAdmin },
      { sanitizePlainText },
      { logger }
    ] = await Promise.all([
      import('@/lib/supabase/server'),
      import('@/lib/ratelimit'),
      import('@/lib/ratelimit-fallback'),
      import('zod'),
      import('@/lib/supabase/admin'),
      import('@/lib/sanitize'),
      import('@/lib/logger')
    ]);

    // ========================================================================
    // STEP 1: Rate limiting
    // ========================================================================
    const ip = extractIP(request.headers);
    const { success, limit, remaining, reset } = authRateLimit
      ? await authRateLimit.limit(ip)
      : { success: true, limit: 3, remaining: 2, reset: Date.now() + 3600000 };

    if (!success) {
      const minutesUntilReset = Math.ceil((reset - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many signup attempts. Please wait ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} and try again.` },
        { status: 429, headers: rateLimitHeaders(limit, 0, reset) }
      );
    }

    // ========================================================================
    // STEP 2: Input validation
    // ========================================================================
    const SignUpSchema = z.object({
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
        name: z.string().min(1, 'Name is required').max(100).trim(),
        color_theme: z.string().optional(),
        space_name: z.string().min(1, 'Space name is required').max(100).trim(),
        marketing_emails_enabled: z.boolean().optional(),
      }),
      beta_code: z.string().min(8).max(20).optional(),
      invite_token: z.string().min(1).max(500).optional(),
    }).refine(
      (data) => data.beta_code || data.invite_token,
      { message: 'A beta invite code or invitation token is required' }
    );

    const body = await request.json();
    const validated = SignUpSchema.parse(body);

    // Sanitize user input
    const sanitizedProfile = {
      name: sanitizePlainText(validated.profile.name),
      space_name: sanitizePlainText(validated.profile.space_name),
      color_theme: validated.profile.color_theme || 'emerald',
      marketing_emails_enabled: validated.profile.marketing_emails_enabled ?? false,
    };

    // ========================================================================
    // STEP 3: Validate beta code OR invite token (fail fast)
    // ========================================================================
    if (validated.beta_code) {
      const normalizedCode = validated.beta_code.replace(/-/g, '').toUpperCase().trim();
      const originalCode = validated.beta_code.toUpperCase().trim();

      // Use .in() instead of .or() - safer for codes with special characters like hyphens
      const codesToCheck = [originalCode];
      if (normalizedCode !== originalCode) {
        codesToCheck.push(normalizedCode);
      }

      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('beta_invite_codes')
        .select('id, code, used_by, expires_at, is_active')
        .in('code', codesToCheck)
        .limit(1)
        .maybeSingle();

      if (codeError) {
        console.error('Beta code lookup error:', codeError);
        return NextResponse.json(
          { error: 'Error validating beta code. Please try again.' },
          { status: 500 }
        );
      }

      if (!codeData) {
        return NextResponse.json(
          { error: 'Invalid beta invite code. Please check your code and try again.' },
          { status: 400 }
        );
      }

      if (codeData.used_by) {
        return NextResponse.json(
          { error: 'This beta invite code has already been used.' },
          { status: 400 }
        );
      }

      if (!codeData.is_active) {
        return NextResponse.json(
          { error: 'This beta invite code is no longer active.' },
          { status: 400 }
        );
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This beta invite code has expired.' },
          { status: 400 }
        );
      }
    } else if (validated.invite_token) {
      const { data: inviteData, error: inviteError } = await supabaseAdmin
        .from('space_invitations')
        .select('id, status, expires_at')
        .eq('token', validated.invite_token)
        .maybeSingle();

      if (inviteError || !inviteData) {
        return NextResponse.json(
          { error: 'Invalid invitation link. Please ask for a new invitation.' },
          { status: 400 }
        );
      }

      if (inviteData.status !== 'pending') {
        return NextResponse.json(
          { error: `This invitation has already been ${inviteData.status}.` },
          { status: 400 }
        );
      }

      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        await supabaseAdmin
          .from('space_invitations')
          .update({ status: 'expired' })
          .eq('id', inviteData.id);

        return NextResponse.json(
          { error: 'This invitation has expired. Please ask for a new invitation.' },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // STEP 4: Create auth user (trigger handles provisioning)
    // ========================================================================
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Pass all metadata to the trigger via raw_user_meta_data
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: sanitizedProfile.name,
          space_name: sanitizedProfile.space_name,
          color_theme: sanitizedProfile.color_theme,
          beta_code: validated.beta_code || null,
          invite_token: validated.invite_token || null,
          marketing_emails_enabled: sanitizedProfile.marketing_emails_enabled,
        },
      },
    });

    if (error) {
      return handleSupabaseError(error);
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }

    // ========================================================================
    // STEP 5: Success response
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
        message: data.user.email_confirmed_at
          ? 'Account created successfully'
          : 'Account created. Please check your email to verify your account.'
      },
      { headers: rateLimitHeaders(limit, remaining, reset) }
    );

  } catch (error) {
    const { z: ZodImport } = await import('zod');

    if (error instanceof ZodImport.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { logger } = await import('@/lib/logger');
    logger.error('Signup failed', error instanceof Error ? error : new Error(String(error)), {
      component: 'api-signup',
      action: 'signup'
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Generate rate limit headers
function rateLimitHeaders(limit: number, remaining: number, reset: number): HeadersInit {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
}

// Helper: Handle Supabase auth errors
function handleSupabaseError(error: { message: string }) {
  const msg = error.message.toLowerCase();

  if (msg.includes('already registered') || msg.includes('already exists')) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in instead.' },
      { status: 409 }
    );
  }

  if (msg.includes('invalid email')) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  if (msg.includes('password')) {
    if (msg.includes('leaked') || msg.includes('breached') || msg.includes('pwned')) {
      return NextResponse.json(
        { error: 'This password has appeared in a data breach. Please choose a different password.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  if (msg.includes('rate') || msg.includes('limit') || msg.includes('too many')) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: `Account creation failed: ${error.message}` },
    { status: 500 }
  );
}
