import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'user_signup';
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

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify admin authentication (checks both middleware header and cookie)
    const auth = await verifyAdminAuth(request);
    if (!auth.isValid) {
      return NextResponse.json(
        { error: auth.error || 'Admin authentication required' },
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

    // Recent user signups from profiles table (using admin client to bypass RLS)
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
