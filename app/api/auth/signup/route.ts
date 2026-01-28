import { NextRequest, NextResponse } from 'next/server';

/**
 * SIGNUP API ROUTE (THIN)
 *
 * This route only handles:
 * 1. Rate limiting
 * 2. Input validation
 * 3. Invite token validation (for space invitations)
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
      invite_token: z.string().min(1).max(500).optional(),
    });

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
    // STEP 3: Validate invite token if provided (for space invitations)
    // ========================================================================
    if (validated.invite_token) {
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
    // STEP 5: Send custom verification email via Resend
    // ========================================================================
    let verificationSent = false;

    // Only send verification email if email is not already confirmed
    if (!data.user.email_confirmed_at) {
      try {
        const crypto = await import('crypto');
        const { sendEmailVerificationEmail } = await import('@/lib/services/email-service');
        const { buildAppUrl } = await import('@/lib/utils/app-url');

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store the verification token
        const { error: tokenError } = await supabaseAdmin
          .from('email_verification_tokens')
          .insert({
            user_id: data.user.id,
            email: validated.email,
            token: verificationToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (!tokenError) {
          // Send verification email via Resend
          // Note: /verify-email is the correct path because (auth) is a Next.js route group
          const verificationUrl = buildAppUrl('/verify-email', { token: verificationToken });
          const emailResult = await sendEmailVerificationEmail({
            userEmail: validated.email,
            verificationUrl,
            userName: sanitizedProfile.name,
          });

          if (emailResult.success) {
            verificationSent = true;
            logger.info('Signup verification email sent', {
              component: 'api-signup',
              action: 'verification_email_sent',
              userId: data.user.id,
              email: validated.email.substring(0, 3) + '***'
            });
          } else {
            logger.error('Failed to send signup verification email', undefined, {
              component: 'api-signup',
              action: 'verification_email_failed',
              error: emailResult.error
            });
          }
        } else {
          logger.error('Failed to store verification token', tokenError, {
            component: 'api-signup',
            action: 'token_storage_failed'
          });
        }
      } catch (emailError) {
        logger.error('Error in verification email flow', emailError instanceof Error ? emailError : new Error(String(emailError)), {
          component: 'api-signup',
          action: 'verification_flow_error'
        });
        // Continue with signup success even if email fails
      }
    }

    // ========================================================================
    // STEP 6: Success response
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
          : verificationSent
            ? 'Account created. Please check your email to verify your account.'
            : 'Account created. Email verification may be delayed.'
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
      { error: 'Password does not meet requirements. Please choose a stronger password.' },
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
    { error: 'Account creation failed. Please try again.' },
    { status: 500 }
  );
}
