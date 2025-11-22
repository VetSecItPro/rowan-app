import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { cookies } from 'next/headers';

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

    // Create Supabase client
    const supabase = createClient();

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
    const feedbackWithMetrics = await Promise.all(
      (feedback || []).map(async (item) => {
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
    console.error('[API] /api/admin/beta/feedback GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}