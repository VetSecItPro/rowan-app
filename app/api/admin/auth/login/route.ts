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

    // Check if admin user exists in our admin_users table (using admin client to bypass RLS)
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, permissions, is_active')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single();

    console.log('Admin user lookup result:', { adminUser, adminError, normalizedEmail });

    if (adminError || !adminUser) {
      // Log failed attempt with more detail
      console.warn(`Failed admin login attempt for email: ${normalizedEmail} from IP: ${ip}`);
      console.warn('Admin error:', adminError);

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

    // Update admin user login tracking (if last_login column exists)
    try {
      const { error: updateError } = await supabaseAdmin
        .from('admin_users')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminUser.id);

      if (updateError) {
        console.error('Failed to update admin login tracking:', updateError);
      }
    } catch (error) {
      // Fail silently if column doesn't exist
      console.log('Admin login tracking update skipped');
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