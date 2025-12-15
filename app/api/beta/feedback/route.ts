import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// GET - Load all feedback for beta testers
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Verify user is authenticated and is a beta tester
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a beta tester
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_beta_tester, beta_status')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_beta_tester || userData.beta_status !== 'approved') {
      return NextResponse.json(
        { error: 'Beta tester access required' },
        { status: 403 }
      );
    }

    // Load feedback with user info, vote counts, and user's vote
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('beta_feedback')
      .select(`
        id,
        title,
        description,
        category,
        severity,
        priority,
        status,
        page_url,
        upvotes,
        downvotes,
        created_at,
        updated_at,
        user_id,
        users!inner (
          id,
          display_name,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (feedbackError) {
      logger.error('Error loading feedback:', feedbackError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to load feedback' },
        { status: 500 }
      );
    }

    // Get user's votes
    const feedbackIds = feedbackData?.map((f: { id: string }) => f.id) || [];
    const { data: userVotes } = await supabase
      .from('beta_feedback_votes')
      .select('feedback_id, vote_type')
      .eq('user_id', user.id)
      .in('feedback_id', feedbackIds);

    // Get comment counts
    const { data: commentCounts } = await supabase
      .from('beta_feedback_comments')
      .select('feedback_id')
      .in('feedback_id', feedbackIds);

    const votesMap = new Map(userVotes?.map((v: { feedback_id: string; vote_type: string }) => [v.feedback_id, v.vote_type]) || []);
    const commentsCountMap = new Map<string, number>();
    commentCounts?.forEach((comment: { feedback_id: string }) => {
      const count = commentsCountMap.get(comment.feedback_id) || 0;
      commentsCountMap.set(comment.feedback_id, count + 1);
    });

    // Transform the data
    interface FeedbackUser {
      display_name?: string | null;
      full_name?: string | null;
      email: string;
    }
    interface FeedbackItem {
      id: string;
      title: string;
      description?: string;
      category?: string;
      severity?: string;
      priority?: string;
      status?: string;
      page_url?: string;
      upvotes?: number;
      downvotes?: number;
      created_at: string;
      users: FeedbackUser;
    }
    const feedback = feedbackData?.map((item: FeedbackItem) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      severity: item.severity,
      priority: item.priority,
      status: item.status,
      page_url: item.page_url,
      upvotes: item.upvotes || 0,
      downvotes: item.downvotes || 0,
      user_vote: votesMap.get(item.id) || null,
      created_at: item.created_at,
      user: {
        name: item.users.display_name || item.users.full_name || item.users.email.split('@')[0],
        email: item.users.email
      },
      _count: {
        comments: commentsCountMap.get(item.id) || 0
      }
    })) || [];

    return NextResponse.json({ feedback });

  } catch (error) {
    logger.error('Beta feedback API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Submit new feedback
const createFeedbackSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  category: z.enum(['bug', 'feature_request', 'ui_ux', 'performance', 'other']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  priority: z.enum(['must_have', 'should_have', 'could_have', 'wont_have']),
  page_url: z.string().url().optional().or(z.literal('')),
  browser_info: z.object({
    userAgent: z.string(),
    viewport: z.object({
      width: z.number(),
      height: z.number()
    }).optional(),
    url: z.string().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();
    const body = await request.json();

    // Verify user is authenticated and is a beta tester
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a beta tester
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_beta_tester, beta_status')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_beta_tester || userData.beta_status !== 'approved') {
      return NextResponse.json(
        { error: 'Beta tester access required' },
        { status: 403 }
      );
    }

    // Validate input
    const validatedData = createFeedbackSchema.parse(body);

    // Create feedback entry
    const { data: feedback, error: createError } = await supabase
      .from('beta_feedback')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        severity: validatedData.severity,
        priority: validatedData.priority,
        page_url: validatedData.page_url || null,
        browser_info: validatedData.browser_info || null,
        status: 'open'
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating feedback:', createError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Log beta tester activity
    await supabase
      .from('beta_tester_activity')
      .insert({
        user_id: user.id,
        activity_type: 'feedback_submission',
        page_url: validatedData.page_url || request.headers.get('referer'),
        feature_used: `${validatedData.category}_feedback`,
        device_info: {
          user_agent: request.headers.get('user-agent'),
          browser_info: validatedData.browser_info
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: feedback
    });

  } catch (error) {
    logger.error('Beta feedback creation error:', error, { component: 'api-route', action: 'api_request' });

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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}