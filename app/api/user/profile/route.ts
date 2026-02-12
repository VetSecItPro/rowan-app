import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import DOMPurify from 'isomorphic-dompurify';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';

// SECURITY: Strip all HTML tags from text input - only allow plain text for names
function stripHtml(input: string): string {
  // First use DOMPurify to sanitize, then strip any remaining tags
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  // Also remove any script/style blocks and decode HTML entities
  return sanitized
    .replace(/<[^>]*>/g, '') // Remove any remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * PUT /api/user/profile
 * Update user profile information (name, email)
 */
export async function PUT(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limiting with automatic fallback
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, email, avatar_url } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate avatar_url if provided
    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json(
        { error: 'Avatar URL must be a string' },
        { status: 400 }
      );
    }

    // Validate email format (RFC 5322 compliant)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // SECURITY: Strip HTML from name to prevent XSS when displayed
    const sanitizedName = stripHtml(name);
    const sanitizedEmail = email.trim().toLowerCase();

    // Validate sanitized name isn't empty after stripping
    if (sanitizedName.length === 0) {
      return NextResponse.json(
        { error: 'Name cannot be empty or contain only HTML' },
        { status: 400 }
      );
    }

    // Check if email is being changed
    const isEmailChange = sanitizedEmail !== user.email?.toLowerCase();

    // Prepare update data (don't include email if it's being changed - that goes through verification)
    const updateData: { name: string; updated_at: string; email?: string; avatar_url?: string | null } = {
      name: sanitizedName,
      updated_at: new Date().toISOString(),
    };

    // Only include email if it's NOT being changed (to avoid bypassing verification)
    if (!isEmailChange) {
      updateData.email = sanitizedEmail;
    }

    // Include avatar_url if provided (with URL validation)
    if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
      // SECURITY: Validate avatar_url is a proper URL and uses HTTPS
      try {
        const avatarUrlObj = new URL(avatar_url);
        if (avatarUrlObj.protocol !== 'https:') {
          return NextResponse.json(
            { error: 'Avatar URL must use HTTPS' },
            { status: 400 }
          );
        }
        updateData.avatar_url = avatar_url;
      } catch {
        return NextResponse.json(
          { error: 'Invalid avatar URL format' },
          { status: 400 }
        );
      }
    } else if (avatar_url === null || avatar_url === '') {
      // Allow clearing avatar
      updateData.avatar_url = null;
    }

    // Update user profile in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('[API] Profile update database error', updateError, {
        component: 'ProfileUpdateAPI',
        action: 'UPDATE',
        userId: user.id,
      });

      // Check for unique constraint violations (email already exists)
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'This email address is already in use by another account' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Handle email change through verification flow
    let emailChangeInitiated = false;
    if (isEmailChange) {
      try {
        // Import the email change functionality
        const { sendEmailChangeEmail } = await import('@/lib/services/email-service');
        const { supabaseAdmin } = await import('@/lib/supabase/admin');
        const { buildAppUrl } = await import('@/lib/utils/app-url');
        const crypto = await import('crypto');

        // Check if new email is already in use
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', sanitizedEmail)
          .single();

        if (existingUser) {
          return NextResponse.json(
            { error: 'This email address is already in use by another account.' },
            { status: 409 }
          );
        }

        // Get user's name for the email
        const userName = updatedUser?.name || user.user_metadata?.name || 'there';

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate any existing email change tokens for this user
        await supabaseAdmin
          .from('email_change_tokens')
          .delete()
          .eq('user_id', user.id);

        // Store the email change token
        const { error: tokenError } = await supabaseAdmin
          .from('email_change_tokens')
          .insert({
            user_id: user.id,
            current_email: user.email,
            new_email: sanitizedEmail,
            token: token,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (!tokenError) {
          // Send verification email to the NEW email address
          // Note: /verify-email-change is the correct path because (auth) is a Next.js route group
          const verificationUrl = buildAppUrl('/verify-email-change', { token });
          const emailResult = await sendEmailChangeEmail({
            currentEmail: user.email!,
            newEmail: sanitizedEmail,
            verificationUrl,
            userName,
          });

          if (emailResult.success) {
            emailChangeInitiated = true;
            logger.info('[API] Email change verification sent', {
              component: 'ProfileUpdateAPI',
              action: 'EMAIL_CHANGE_INITIATED',
              userId: user.id,
              newEmail: sanitizedEmail.substring(0, 3) + '***',
            });
          }
        }
      } catch (emailChangeError) {
        logger.error('[API] Failed to initiate email change', emailChangeError, {
          component: 'ProfileUpdateAPI',
          action: 'EMAIL_CHANGE_ERROR',
          userId: user.id,
        });
        // Continue with other updates, but note the email change failed
      }
    }

    logger.info('[API] Profile updated successfully', {
      component: 'ProfileUpdateAPI',
      action: 'UPDATE_SUCCESS',
      userId: user.id,
      nameChanged: sanitizedName !== user.user_metadata?.name,
      emailChangeInitiated,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: emailChangeInitiated
        ? 'Profile updated. A verification email has been sent to your new email address.'
        : 'Profile updated successfully',
      emailChangeInitiated,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/user/profile',
        method: 'PUT',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    logger.error('[API] /api/user/profile PUT error', error, {
      component: 'ProfileUpdateAPI',
      action: 'PUT',
    });

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/profile
 * Get current user profile information
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.error('[API] Profile fetch error', profileError, {
        component: 'ProfileUpdateAPI',
        action: 'GET',
        userId: user.id,
      });

      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userProfile,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/user/profile',
        method: 'GET',
      },
    });

    logger.error('[API] /api/user/profile GET error', error, {
      component: 'ProfileUpdateAPI',
      action: 'GET',
    });

    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
