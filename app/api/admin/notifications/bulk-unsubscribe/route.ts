import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const BulkUnsubscribeSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
}).strict();

/**
 * POST /api/admin/notifications/bulk-unsubscribe
 * Bulk unsubscribe users from launch notifications
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

    // Check admin authentication using secure AES-256-GCM encryption
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

      // Validate session data structure and expiration
      if (!validateSessionData(sessionData)) {
        return NextResponse.json(
          { error: 'Invalid or expired session' },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { ids } = BulkUnsubscribeSchema.parse(body);

    // Get current timestamp for unsubscribed_at
    const unsubscribedAt = new Date().toISOString();

    // Perform bulk unsubscribe operation
    const { data: updatedRecords, error } = await supabaseAdmin
      .from('launch_notifications')
      .update({
        subscribed: false,
        unsubscribed_at: unsubscribedAt,
      })
      .in('id', ids)
      .eq('subscribed', true) // Only unsubscribe currently subscribed users
      .select('id, email, name');

    if (error) {
      throw new Error(`Failed to bulk unsubscribe: ${error.message}`);
    }

    const processedCount = updatedRecords?.length || 0;

    // Log the bulk unsubscribe action

    // Optional: Send confirmation emails to unsubscribed users
    // This would typically be handled by a background job or queue

    // You could add this later:
    // if (processedCount > 0) {
    //   await scheduleUnsubscribeConfirmationEmails(updatedRecords);
    // }

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed ${processedCount} users`,
      processedCount,
      requestedCount: ids.length,
      unsubscribedAt,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/notifications/bulk-unsubscribe',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/notifications/bulk-unsubscribe POST error:', error, { component: 'api-route', action: 'api_request' });
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to process bulk unsubscribe' },
      { status: 500 }
    );
  }
}
