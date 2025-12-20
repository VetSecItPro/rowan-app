import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

const updateStatusSchema = z.object({
  feedbackId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  adminResponse: z.string().optional(),
  adminNotes: z.string().optional()
});

/**
 * PATCH /api/admin/feedback/status
 * Update feedback status and admin responses
 */
export async function PATCH(req: NextRequest) {
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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const validatedData = updateStatusSchema.parse(body);

    // Create Supabase client
    const supabase = await createClient();

    // Update feedback status
    const { data: feedback, error: updateError } = await supabase
      .from('beta_feedback')
      .update({
        status: validatedData.status,
        admin_response: validatedData.adminResponse || null,
        admin_notes: validatedData.adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.feedbackId)
      .select(`
        id,
        title,
        status,
        admin_response,
        admin_notes,
        updated_at,
        user_id
      `)
      .single();

    if (updateError) {
      throw new Error(`Failed to update feedback: ${updateError.message}`);
    }

    // Log admin action

    // Track admin activity
    await supabase
      .from('beta_tester_activity')
      .insert({
        user_id: sessionData.adminId,
        activity_type: 'admin_feedback_update',
        feature_used: `status_change_${validatedData.status}`,
        device_info: {
          feedback_id: validatedData.feedbackId,
          old_status: 'unknown', // We could track this if needed
          new_status: validatedData.status,
          admin_email: sessionData.email
        }
      });

    return NextResponse.json({
      success: true,
      feedback,
      message: `Feedback status updated to ${validatedData.status}`,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/feedback/status',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/feedback/status PATCH error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((issue: z.ZodIssue) => issue.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update feedback status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feedback/status (bulk update)
 * Update multiple feedback items at once
 */
export async function POST(req: NextRequest) {
  try {
    const bulkUpdateSchema = z.object({
      feedbackIds: z.array(z.string().uuid()),
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
      adminResponse: z.string().optional(),
      adminNotes: z.string().optional()
    });

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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const validatedData = bulkUpdateSchema.parse(body);

    // Create Supabase client
    const supabase = await createClient();

    // Bulk update feedback
    const { data: updatedFeedback, error: updateError } = await supabase
      .from('beta_feedback')
      .update({
        status: validatedData.status,
        admin_response: validatedData.adminResponse || null,
        admin_notes: validatedData.adminNotes || null,
        updated_at: new Date().toISOString()
      })
      .in('id', validatedData.feedbackIds)
      .select('id, title, status');

    if (updateError) {
      throw new Error(`Failed to bulk update feedback: ${updateError.message}`);
    }

    // Log admin action

    return NextResponse.json({
      success: true,
      updated: updatedFeedback,
      count: validatedData.feedbackIds.length,
      message: `${validatedData.feedbackIds.length} feedback items updated to ${validatedData.status}`,
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/feedback/status',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/feedback/status POST error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((issue: z.ZodIssue) => issue.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to bulk update feedback status' },
      { status: 500 }
    );
  }
}