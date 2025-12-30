import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import crypto from 'crypto';

// Beta program configuration
const MAX_BETA_USERS = 100;
const BETA_DEADLINE = '2026-02-15T23:59:59Z';

/**
 * Constant-time string comparison to prevent timing attacks
 * Returns true if strings are equal, false otherwise
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Normalize invite code for comparison (remove dashes, uppercase)
 */
function normalizeCode(code: string): string {
  return code.replace(/-/g, '').toUpperCase().trim();
}

/**
 * POST /api/beta/validate
 * Validate beta invite code and check user capacity
 *
 * Supports:
 * - Invite codes (new system): { inviteCode: "XXXX-XXXX-XXXX" }
 * - Legacy password (deprecated): { password: "..." }
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { inviteCode, password } = body;

    // Create Supabase client
    const supabase = await createClient();

    // Check if beta program has ended
    const now = new Date();
    const deadline = new Date(BETA_DEADLINE);
    if (now > deadline) {
      return NextResponse.json(
        {
          success: false,
          error: 'The beta program has ended. Please sign up for a regular account.',
          beta_ended: true
        },
        { status: 403 }
      );
    }

    // Get current beta user count using the database function
    const { data: slotsData, error: slotsError } = await supabase
      .rpc('get_beta_slots_remaining');

    const slotsRemaining = slotsError ? MAX_BETA_USERS : (slotsData ?? MAX_BETA_USERS);

    // Check if we've reached capacity
    if (slotsRemaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Beta program has reached capacity (100 users). Join our launch notification list to be notified when we launch!',
          at_capacity: true,
          slots_remaining: 0
        },
        { status: 403 }
      );
    }

    // === NEW: Invite Code Validation ===
    if (inviteCode) {
      const normalizedCode = normalizeCode(inviteCode);

      if (normalizedCode.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Invalid invite code format' },
          { status: 400 }
        );
      }

      // Check if invite code exists and is valid
      // Use admin client to bypass RLS (anonymous users can't read invite codes)
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('beta_invite_codes')
        .select('id, code, used_by, expires_at, is_active')
        .or(`code.eq.${inviteCode},code.eq.${normalizedCode}`)
        .single();

      if (codeError || !codeData) {
        // Log failed attempt
        await supabase.from('beta_access_requests').insert({
          email: null,
          ip_address: ip,
          user_agent: req.headers.get('user-agent') || null,
          access_granted: false,
          notes: `Invalid invite code: ${inviteCode.substring(0, 4)}****`,
          created_at: new Date().toISOString(),
        });

        return NextResponse.json(
          { success: false, error: 'Invalid invite code. Please check your code and try again.' },
          { status: 401 }
        );
      }

      // Check if code is already used
      if (codeData.used_by) {
        return NextResponse.json(
          { success: false, error: 'This invite code has already been used.' },
          { status: 401 }
        );
      }

      // Check if code is expired
      if (codeData.expires_at && new Date(codeData.expires_at) < now) {
        return NextResponse.json(
          { success: false, error: 'This invite code has expired.' },
          { status: 401 }
        );
      }

      // Check if code is active
      if (!codeData.is_active) {
        return NextResponse.json(
          { success: false, error: 'This invite code is no longer active.' },
          { status: 401 }
        );
      }

      // Log successful validation
      await supabase.from('beta_access_requests').insert({
        email: null,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || null,
        access_granted: true,
        notes: `Valid invite code: ${codeData.code}`,
        created_at: new Date().toISOString(),
      });

      // Increment daily analytics
      const today = new Date().toISOString().split('T')[0];
      await supabase.rpc('increment_beta_requests', { target_date: today });

      return NextResponse.json({
        success: true,
        message: `Welcome to Rowan Beta! You have until February 15, 2026 to explore all features.`,
        invite_code_id: codeData.id,
        slots_remaining: slotsRemaining - 1,
        beta_ends_at: BETA_DEADLINE,
        current_users: MAX_BETA_USERS - slotsRemaining,
        max_users: MAX_BETA_USERS
      });
    }

    // === LEGACY: Password Validation (for backward compatibility) ===
    if (password) {
      const BETA_PASSWORD = process.env.BETA_PASSWORD;

      // Check if legacy password is enabled
      const { data: configData } = await supabase
        .from('beta_config')
        .select('value')
        .eq('key', 'allow_legacy_password')
        .single();

      const legacyEnabled = configData?.value === true || configData?.value === 'true';

      if (!legacyEnabled && BETA_PASSWORD) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password-based beta access is no longer available. Please use an invite code.',
            require_invite_code: true
          },
          { status: 400 }
        );
      }

      if (!BETA_PASSWORD) {
        return NextResponse.json(
          { success: false, error: 'Beta access is currently unavailable.' },
          { status: 503 }
        );
      }

      const isValidPassword = timingSafeCompare(password, BETA_PASSWORD);

      // Log the attempt
      await supabase.from('beta_access_requests').insert({
        email: null,
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || null,
        access_granted: isValidPassword,
        notes: 'Legacy password validation',
        created_at: new Date().toISOString(),
      });

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, error: 'Invalid beta password.' },
          { status: 401 }
        );
      }

      // Increment daily analytics
      const today = new Date().toISOString().split('T')[0];
      await supabase.rpc('increment_beta_requests', { target_date: today });

      return NextResponse.json({
        success: true,
        message: `Welcome to Rowan Beta! You have until February 15, 2026 to explore all features.`,
        slots_remaining: slotsRemaining - 1,
        beta_ends_at: BETA_DEADLINE,
        current_users: MAX_BETA_USERS - slotsRemaining,
        max_users: MAX_BETA_USERS,
        legacy_access: true
      });
    }

    // No valid authentication method provided
    return NextResponse.json(
      { success: false, error: 'Invite code is required' },
      { status: 400 }
    );

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/beta/validate',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/beta/validate
 * Get beta program status (slots remaining, deadline, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get slots remaining
    const { data: slotsData } = await supabase.rpc('get_beta_slots_remaining');
    const slotsRemaining = slotsData ?? MAX_BETA_USERS;

    // Check if beta has ended
    const now = new Date();
    const deadline = new Date(BETA_DEADLINE);
    const betaEnded = now > deadline;

    return NextResponse.json({
      slots_remaining: betaEnded ? 0 : slotsRemaining,
      max_users: MAX_BETA_USERS,
      current_users: MAX_BETA_USERS - slotsRemaining,
      beta_ends_at: BETA_DEADLINE,
      beta_ended: betaEnded,
      at_capacity: slotsRemaining <= 0
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to get beta status' },
      { status: 500 }
    );
  }
}
