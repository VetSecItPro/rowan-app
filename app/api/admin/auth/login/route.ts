import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { randomBytes, createHash } from 'crypto';

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

    // Create Supabase client
    const supabase = createClient();

    // Check if admin user exists in our admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role, permissions, is_active, login_count')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      // Log failed attempt
      console.warn(`Failed admin login attempt for email: ${normalizedEmail} from IP: ${ip}`);

      return NextResponse.json(
        { error: 'Invalid credentials or access denied' },
        { status: 401 }
      );
    }

    // For this demo, we'll check against the regular Supabase auth
    // In production, you'd want a separate admin auth system
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (authError || !authData.user) {
      // Log failed attempt
      console.warn(`Failed admin login attempt for email: ${normalizedEmail} from IP: ${ip}`);

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update admin user login tracking
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        last_login: new Date().toISOString(),
        login_count: (adminUser.login_count || 0) + 1,
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('Failed to update admin login tracking:', updateError);
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

    // For now, encode session data in the token itself (encrypted)
    const sessionPayload = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Set admin session cookie
    const cookieStore = safeCookies();
    cookieStore.set('admin-session', sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_DURATION,
      path: '/admin',
    });

    // Log successful admin login
    console.log(`Successful admin login: ${adminUser.email} (${adminUser.role}) from IP: ${ip}`);

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
    console.error('[API] /api/admin/auth/login POST error:', error);
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}