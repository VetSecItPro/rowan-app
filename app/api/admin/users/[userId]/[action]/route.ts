import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

const AdminUserActionParamsSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['ban', 'delete']),
});

/**
 * POST /api/admin/users/[userId]/[action]
 * Perform admin actions on users (ban, delete)
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ userId: string; action: string }> }
) {
  const params = await props.params;
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
    const cookieStore = await safeCookiesAsync();
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
        return NextResponse.json(
          { error: 'Session expired or invalid' },
          { status: 401 }
        );
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { userId, action } = AdminUserActionParamsSchema.parse(params);

    // Perform action based on type
    switch (action) {
      case 'ban': {
        // Suspend user by updating user metadata
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: '876600h', // ~100 years = effectively permanent
          }
        );

        if (banError) {
          throw new Error(`Failed to suspend user: ${banError.message}`);
        }

        break;
      }

      case 'delete': {
        // Delete user from auth.users (cascades to related tables via RLS)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          throw new Error(`Failed to delete user: ${deleteError.message}`);
        }

        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `User ${action} action completed successfully`,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/users/[userId]/[action]',
        method: 'POST',
      },
      extra: {
        userId: params.userId,
        action: params.action,
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/users/[userId]/[action] POST error:', error, { component: 'api-route', action: 'api_request' });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}
