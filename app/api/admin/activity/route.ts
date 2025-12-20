import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/utils/admin-check';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'beta_granted' | 'beta_feedback' | 'feedback';
  title: string;
  description: string;
  timestamp: string;
  email?: string;
}

interface ProfileRecord {
  id: string;
  email?: string;
  full_name?: string;
  created_at: string;
}

interface BetaGrantRecord {
  id: string;
  email?: string;
  access_granted_at: string;
}

interface BetaFeedbackRecord {
  id: string;
  title?: string;
  category?: string;
  created_at: string;
  user_id: string;
  profiles: { email?: string; full_name?: string } | null;
}

interface FeedbackSubmissionRecord {
  id: string;
  description?: string;
  feedback_type?: string;
  created_at: string;
  user_id: string;
  profiles: { email?: string; full_name?: string } | null;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
    try {
      const sessionData = await decryptSessionData(adminSession.value);
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const hours = parseInt(searchParams.get('hours') || '24');

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    const cutoffIso = cutoffDate.toISOString();

    const activities: ActivityItem[] = [];

    // 1. Recent user signups from profiles table (using admin client to bypass RLS)
    const { data: recentUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, created_at')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!usersError && recentUsers) {
      (recentUsers as ProfileRecord[]).forEach((user) => {
        activities.push({
          id: `signup-${user.id}`,
          type: 'user_signup',
          title: 'New user signup',
          description: user.full_name || user.email?.split('@')[0] || 'New user',
          timestamp: user.created_at,
          email: user.email,
        });
      });
    }

    // 2. Recent beta access grants
    const { data: betaGrants, error: betaError } = await supabaseAdmin
      .from('beta_access_requests')
      .select('id, email, access_granted_at')
      .eq('access_granted', true)
      .not('access_granted_at', 'is', null)
      .gte('access_granted_at', cutoffIso)
      .order('access_granted_at', { ascending: false })
      .limit(limit);

    if (!betaError && betaGrants) {
      (betaGrants as BetaGrantRecord[]).forEach((grant) => {
        activities.push({
          id: `beta-${grant.id}`,
          type: 'beta_granted',
          title: 'Beta access granted',
          description: grant.email?.split('@')[0] || 'User',
          timestamp: grant.access_granted_at,
          email: grant.email,
        });
      });
    }

    // 3. Recent beta feedback
    const { data: betaFeedback, error: feedbackError } = await supabaseAdmin
      .from('beta_feedback')
      .select(`
        id,
        title,
        category,
        created_at,
        user_id,
        profiles!inner(email, full_name)
      `)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!feedbackError && betaFeedback) {
      (betaFeedback as BetaFeedbackRecord[]).forEach((fb) => {
        const profile = fb.profiles as unknown as { email?: string; full_name?: string } | null;
        activities.push({
          id: `feedback-${fb.id}`,
          type: 'beta_feedback',
          title: fb.category === 'bug' ? 'Bug report' : 'Feature request',
          description: fb.title || 'Feedback submitted',
          timestamp: fb.created_at,
          email: profile?.email,
        });
      });
    }

    // 4. Recent feedback submissions
    const { data: feedbackSubmissions, error: submissionsError } = await supabaseAdmin
      .from('feedback_submissions')
      .select(`
        id,
        description,
        feedback_type,
        created_at,
        user_id,
        profiles!inner(email, full_name)
      `)
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!submissionsError && feedbackSubmissions) {
      (feedbackSubmissions as FeedbackSubmissionRecord[]).forEach((fb) => {
        const profile = fb.profiles as unknown as { email?: string; full_name?: string } | null;
        activities.push({
          id: `submission-${fb.id}`,
          type: 'feedback',
          title: fb.feedback_type === 'bug' ? 'Bug report' : 'Feedback submitted',
          description: fb.description?.slice(0, 50) || 'New feedback',
          timestamp: fb.created_at,
          email: profile?.email,
        });
      });
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      activities: limitedActivities,
      total: activities.length,
    });
  } catch (error) {
    logger.error('Error fetching admin activity:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
