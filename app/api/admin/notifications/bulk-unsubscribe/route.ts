import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

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

    // Check admin authentication
    const cookieStore = cookies();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decode admin session
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(adminSession.value, 'base64').toString());

      // Check if session is expired
      if (sessionData.expiresAt < Date.now()) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { ids } = body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'IDs array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Limit bulk operations to prevent abuse
    if (ids.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 records can be processed at once' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient();

    // Get current timestamp for unsubscribed_at
    const unsubscribedAt = new Date().toISOString();

    // Perform bulk unsubscribe operation
    const { data: updatedRecords, error } = await supabase
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
    console.error('[API] /api/admin/notifications/bulk-unsubscribe POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk unsubscribe' },
      { status: 500 }
    );
  }
}