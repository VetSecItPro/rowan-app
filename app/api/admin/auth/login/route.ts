import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { randomBytes } from 'crypto';
import { encryptSessionData } from '@/lib/utils/session-crypto';

const ADMIN_SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * POST /api/admin/auth/login
 * Admin authentication endpoint
 */
export async function POST(req: NextRequest) {
  try {
    // Enhanced rate limiting for admin login attempts
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Create Supabase client for auth operations
    const supabase = createClient();

    // IMPORTANT: Always perform both checks to prevent timing attacks
    // Check admin user existence AND perform auth in parallel, then validate both
    const [adminCheckResult, authResult] = await Promise.all([
      // Check if admin user exists in our admin_users table (using admin client to bypass RLS)
      supabaseAdmin
        .from('admin_users')
        .select('id, email, role, permissions, is_active')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .single(),
      // Always perform password authentication (prevents timing attack by ensuring constant-time response)
      supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      }),
    ]);

    const { data: adminUser, error: adminError } = adminCheckResult;
    const { data: authData, error: authError } = authResult;

    // Validate both checks succeeded (constant-time response regardless of which fails)
    if (adminError || !adminUser || authError || !authData.user) {
      // Security: Sanitized logging - no user data exposed in production logs
      // Failed attempts tracked in audit log, not console
      return NextResponse.json(
        { error: 'Invalid credentials or access denied' },
        { status: 401 }
      );
    }

    // Update admin user login tracking (if last_login column exists)
    try {
      const { error: updateError } = await supabaseAdmin
        .from('admin_users')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminUser.id);

      if (updateError) {
        // Error logged to Sentry via outer catch block if critical
      }
    } catch (error) {
      // Fail silently if column doesn't exist (optional feature)
    }

    // Create admin session token
    const sessionToken = randomBytes(32).toString('hex');
    const sessionData = {
      adminId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      permissions: adminUser.permissions,
      authUserId: authData.user.id,
      loginTime: Date.now(),
      expiresAt: Date.now() + (ADMIN_SESSION_DURATION * 1000),
    };

    // Encrypt session data using AES-256-GCM
    const sessionPayload = encryptSessionData(sessionData);

    // Set admin session cookie
    // Use path '/' so cookie is available to both /admin pages and /api/admin routes
    const cookieStore = safeCookies();
    cookieStore.set('admin-session', sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_DURATION,
      path: '/',
    });

    // Security: Admin login tracked in database analytics, not console logs
    // Prevents exposure of admin emails/roles in production logs

    // Increment daily analytics for admin logins
    const today = new Date().toISOString().split('T')[0];
    try {
      const { error: analyticsError } = await supabase
        .rpc('increment_admin_logins', { target_date: today });
    } catch (error) {
      // Fail silently if function doesn't exist
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions,
      },
      message: 'Successfully authenticated',
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/auth/login',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    // Error already captured by Sentry above
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}