import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logAdminAction } from '@/lib/utils/admin-audit';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

const AdminUserActionParamsSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['ban', 'delete']),
});

/**
 * POST /api/admin/users/[userId]/[action]
 * Perform admin actions on users (ban, delete)
 *
 * Order of gates is intentional: CSRF first (cheapest, blocks cross-site
 * forgery), rate limit next (protects auth check from brute force), then
 * admin auth, then the action. Audit log is written ONLY after the auth.admin
 * call succeeds — failed attempts are captured by Sentry, not the audit
 * trail (the audit trail is for "what actually happened to user data").
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ userId: string; action: string }> }
) {
  const params = await props.params;
  try {
    // CSRF validation FIRST — cookie-only auth + state-changing POST is the
    // classic CSRF target. Ban/delete is the most destructive admin action.
    const csrfError = validateCsrfRequest(req);
    if (csrfError) return csrfError;

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

    // Perform action based on type. Note: deleting from auth.users cascades
    // via FK ON DELETE CASCADE relationships, NOT via RLS (RLS doesn't
    // cascade — corrected from the previous comment which was wrong).
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
          logger.error('Failed to suspend user:', banError, { component: 'api-route', action: 'admin_ban', userId });
          throw new Error('Failed to suspend user');
        }

        break;
      }

      case 'delete': {
        // Delete user from auth.users (cascades to related tables via FK ON DELETE CASCADE)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          logger.error('Failed to delete user:', deleteError, { component: 'api-route', action: 'admin_delete', userId });
          throw new Error('Failed to delete user');
        }

        break;
      }
    }

    // Audit log AFTER success — only record actions that actually happened.
    // Best-effort: failure to log must not roll back the (already-completed)
    // user mutation. logAdminAction swallows its own errors.
    if (sessionData.adminId) {
      logAdminAction({
        adminUserId: sessionData.adminId,
        action: action === 'ban' ? 'user_banned' : 'user_deleted',
        targetResource: `user:${userId}`,
        metadata: { targetUserId: userId, performedBy: sessionData.email },
        ipAddress: ip,
      });
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
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
