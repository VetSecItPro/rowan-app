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

    const supabase = createClient();

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
    } catch (error) {
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

    // Prepare update data
    const updateData: any = {
      name: sanitizedName,
      email: sanitizedEmail,
      updated_at: new Date().toISOString(),
    };

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

    // Update auth user metadata if email changed
    if (sanitizedEmail !== user.email) {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: sanitizedEmail,
      });

      if (authUpdateError) {
        logger.error('[API] Auth email update error', authUpdateError, {
          component: 'ProfileUpdateAPI',
          action: 'UPDATE_AUTH_EMAIL',
          userId: user.id,
        });

        // Note: We don't fail the request if auth update fails
        // because the database update succeeded
        logger.warn('[API] Profile updated in database but auth email update failed', {
          userId: user.id,
          newEmail: sanitizedEmail,
        });
      }
    }

    logger.info('[API] Profile updated successfully', {
      component: 'ProfileUpdateAPI',
      action: 'UPDATE_SUCCESS',
      userId: user.id,
      nameChanged: sanitizedName !== user.user_metadata?.name,
      emailChanged: sanitizedEmail !== user.email,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
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

    const supabase = createClient();

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
      .select('*')
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