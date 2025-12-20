import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { z } from 'zod';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// Validation schema for generating codes
const generateCodesSchema = z.object({
  count: z.number().min(1).max(100),
  source: z.string().optional().default('admin'),
});

/**
 * GET /api/admin/beta/invite-codes
 * Get all invite codes with usage status
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = safeCookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get invite codes with user info
    const { data: codes, error: codesError } = await supabaseAdmin
      .from('beta_invite_codes')
      .select(`
        id,
        code,
        source,
        is_active,
        used_at,
        expires_at,
        created_at,
        notes,
        used_by,
        created_by
      `)
      .order('created_at', { ascending: false });

    if (codesError) {
      throw new Error(`Failed to fetch invite codes: ${codesError.message}`);
    }

    // Get user info for used codes
    const usedUserIds = codes?.filter(c => c.used_by).map(c => c.used_by) || [];
    let userMap: Record<string, { email: string; full_name: string }> = {};

    if (usedUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name')
        .in('id', usedUserIds);

      userMap = (users || []).reduce((acc, user) => {
        acc[user.id] = { email: user.email, full_name: user.full_name };
        return acc;
      }, {} as Record<string, { email: string; full_name: string }>);
    }

    // Get stats
    const { data: slotsData } = await supabaseAdmin.rpc('get_beta_slots_remaining');
    const slotsRemaining = slotsData ?? 100;

    const stats = {
      total_codes: codes?.length || 0,
      used_codes: codes?.filter(c => c.used_by).length || 0,
      available_codes: codes?.filter(c => !c.used_by && c.is_active).length || 0,
      expired_codes: codes?.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length || 0,
      slots_remaining: slotsRemaining,
      max_users: 100,
      beta_deadline: '2026-02-15T23:59:59Z',
    };

    // Enrich codes with user info
    const enrichedCodes = codes?.map(code => ({
      ...code,
      used_by_user: code.used_by ? userMap[code.used_by] : null,
    }));

    return NextResponse.json({
      codes: enrichedCodes,
      stats,
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/beta/invite-codes
 * Generate new invite codes
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = safeCookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { count, source } = generateCodesSchema.parse(body);

    // Get slots remaining
    const { data: slotsData } = await supabaseAdmin.rpc('get_beta_slots_remaining');
    const slotsRemaining = slotsData ?? 100;

    if (slotsRemaining <= 0) {
      return NextResponse.json(
        { error: 'Beta program is at capacity. Cannot generate more codes.' },
        { status: 400 }
      );
    }

    // Limit to available slots
    const actualCount = Math.min(count, slotsRemaining);

    // Generate codes using the database function
    const { data: generatedCodes, error: generateError } = await supabaseAdmin
      .rpc('generate_invite_codes', {
        p_count: actualCount,
        p_source: source,
        p_admin_id: sessionData.adminId || null,
      });

    if (generateError) {
      throw new Error(`Failed to generate codes: ${generateError.message}`);
    }

    return NextResponse.json({
      success: true,
      codes: generatedCodes,
      count: generatedCodes?.length || 0,
      requested: count,
      limited_to: actualCount,
      slots_remaining: slotsRemaining - (generatedCodes?.length || 0),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to generate invite codes' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/beta/invite-codes
 * Deactivate an invite code
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = safeCookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get code ID from query params
    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Deactivate the code
    const { error: updateError } = await supabaseAdmin
      .from('beta_invite_codes')
      .update({ is_active: false })
      .eq('id', codeId);

    if (updateError) {
      throw new Error(`Failed to deactivate code: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Invite code deactivated',
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to deactivate invite code' },
      { status: 500 }
    );
  }
}
