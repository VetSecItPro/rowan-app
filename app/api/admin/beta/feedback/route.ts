import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookies } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/beta/feedback
 * Get all beta feedback with user information and engagement metrics
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

    // Check admin authentication using secure AES-256-GCM encryption
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

    // Create Supabase client
    const supabase = await createClient();

    // Get all feedback with user information and engagement metrics
    const { data: feedback, error: feedbackError } = await supabase
      .from('beta_feedback')
      .select(`
        id,
        title,
        description,
        category,
        priority,
        status,
        user_id,
        created_at,
        updated_at,
        admin_response,
        admin_notes,
        users!inner (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
    }

    // Get engagement metrics (votes and comments count) for each feedback item
    interface FeedbackItem {
      id: string;
      title: string;
      description?: string;
      category?: string;
      priority?: string;
      status?: string;
      user_id: string;
      created_at: string;
      updated_at?: string;
      admin_response?: string;
      admin_notes?: string;
      users: {
        id: string;
        email: string;
        full_name?: string;
        avatar_url?: string;
      };
    }
    const feedbackWithMetrics = await Promise.all(
      (feedback || []).map(async (item: FeedbackItem) => {
        // Get votes count
        const { count: votesCount, error: votesError } = await supabase
          .from('beta_feedback_votes')
          .select('*', { count: 'exact', head: true })
          .eq('feedback_id', item.id);

        // Get comments count
        const { count: commentsCount, error: commentsError } = await supabase
          .from('beta_feedback_comments')
          .select('*', { count: 'exact', head: true })
          .eq('feedback_id', item.id);

        return {
          ...item,
          votes_count: votesError ? 0 : (votesCount || 0),
          comments_count: commentsError ? 0 : (commentsCount || 0),
          user: item.users
        };
      })
    );

    // Calculate summary statistics
    const stats = {
      total: feedbackWithMetrics.length,
      open: feedbackWithMetrics.filter(f => f.status === 'open').length,
      in_progress: feedbackWithMetrics.filter(f => f.status === 'in_progress').length,
      resolved: feedbackWithMetrics.filter(f => f.status === 'resolved').length,
      closed: feedbackWithMetrics.filter(f => f.status === 'closed').length,
      high_priority: feedbackWithMetrics.filter(f => f.priority === 'high' || f.priority === 'critical').length,
      total_votes: feedbackWithMetrics.reduce((sum, f) => sum + f.votes_count, 0),
      total_comments: feedbackWithMetrics.reduce((sum, f) => sum + f.comments_count, 0),
    };

    return NextResponse.json({
      success: true,
      feedback: feedbackWithMetrics,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/admin/beta/feedback',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/admin/beta/feedback GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}