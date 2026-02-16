import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { withCache, ADMIN_CACHE_TTL } from '@/lib/services/admin-cache-service';
import { logger } from '@/lib/logger';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

const FUNNEL_CACHE_KEY = 'admin:funnel:v2';

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  color: string;
  description: string;
}

interface FunnelData {
  steps: FunnelStep[];
  conversionRates: {
    signupToSpace: number;
    spaceToAction: number;
    actionToActive: number;
    activeToPower: number;
    overallConversion: number;
  };
  topActivationFeatures: { feature: string; users: number }[];
  timeToMilestones: {
    medianSignupToSpace: number | null;
    medianSpaceToAction: number | null;
  };
  lastUpdated: string;
}

/**
 * GET /api/admin/analytics/funnel
 * Real user activation funnel: Signup → Space → First Action → Weekly Active → Power User
 */
export async function GET(req: NextRequest) {
  try {
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
      }
    } catch (error) {
      logger.error('Admin session decryption failed:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const funnel = await withCache<FunnelData>(
      FUNNEL_CACHE_KEY,
      async () => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all funnel metrics in parallel
        const [
          totalUsersResult,
          spaceUsersResult,
          firstActionUsersResult,
          weeklyActiveResult,
          powerUsersResult,
          topFeaturesResult,
          timeToSpaceResult,
          timeToActionResult,
        ] = await Promise.allSettled([
          // Stage 1: Total real signups (auth.users is source of truth, not users table which has test orphans)
          supabaseAdmin.auth.admin.listUsers(),

          // Stage 2: Users who created/joined a space (fetch data to filter by real auth users)
          supabaseAdmin
            .from('space_members')
            .select('user_id'),

          // Stage 3: Users who took a meaningful action (non-page_view)
          supabaseAdmin
            .from('feature_events')
            .select('user_id')
            .neq('action', 'page_view'),

          // Stage 4: Weekly active users (events in last 7 days)
          supabaseAdmin
            .from('feature_events')
            .select('user_id')
            .gte('created_at', sevenDaysAgo),

          // Stage 5: Power users (5+ distinct active days in last 7 days)
          // We'll compute this from the weekly active data
          supabaseAdmin
            .from('feature_events')
            .select('user_id, created_at')
            .gte('created_at', sevenDaysAgo),

          // Top activation features
          supabaseAdmin
            .from('feature_events')
            .select('feature, user_id')
            .neq('action', 'page_view')
            .limit(5000),

          // Time-to-space: users with their first space join date
          supabaseAdmin
            .from('space_members')
            .select('user_id, joined_at')
            .order('joined_at', { ascending: true })
            .limit(2000),

          // Time-to-first-action: first non-page_view event per user
          supabaseAdmin
            .from('feature_events')
            .select('user_id, created_at')
            .neq('action', 'page_view')
            .order('created_at', { ascending: true })
            .limit(5000),
        ]);

        // Extract counts — auth.users returns { data: { users: User[] } }
        const authUsers = totalUsersResult.status === 'fulfilled'
          ? (totalUsersResult.value.data?.users ?? []) : [];
        const totalUsers = authUsers.length;
        // Build a set of real auth user IDs to filter orphans from other queries
        const realUserIds = new Set(authUsers.map((u: { id: string }) => u.id));

        // Filter space_members to only real auth users
        const spaceUsersData = spaceUsersResult.status === 'fulfilled'
          ? (spaceUsersResult.value.data ?? []) : [];
        const spaceUsers = new Set(
          (spaceUsersData as { user_id: string }[]).map(r => r.user_id).filter(id => realUserIds.has(id))
        ).size;

        // Distinct users with first action (filtered to real auth users)
        const firstActionData = firstActionUsersResult.status === 'fulfilled'
          ? (firstActionUsersResult.value.data ?? []) : [];
        const firstActionUsers = new Set(
          firstActionData.map((r: { user_id: string }) => r.user_id).filter((id: string) => realUserIds.has(id))
        ).size;

        // Weekly active (distinct real users)
        const weeklyData = weeklyActiveResult.status === 'fulfilled'
          ? (weeklyActiveResult.value.data ?? []) : [];
        const weeklyActiveUsers = new Set(
          weeklyData.map((r: { user_id: string }) => r.user_id).filter((id: string) => realUserIds.has(id))
        ).size;

        // Power users: 5+ distinct active days in last 7 days (real auth users only)
        const powerData = powerUsersResult.status === 'fulfilled'
          ? (powerUsersResult.value.data ?? []) : [];
        const userDayCounts = new Map<string, Set<string>>();
        for (const row of powerData as { user_id: string; created_at: string }[]) {
          if (!realUserIds.has(row.user_id)) continue;
          const day = row.created_at.slice(0, 10);
          if (!userDayCounts.has(row.user_id)) {
            userDayCounts.set(row.user_id, new Set());
          }
          userDayCounts.get(row.user_id)!.add(day);
        }
        let powerUserCount = 0;
        for (const days of userDayCounts.values()) {
          if (days.size >= 5) powerUserCount++;
        }

        // Top activation features (distinct real users per feature)
        const featureData = topFeaturesResult.status === 'fulfilled'
          ? (topFeaturesResult.value.data ?? []) : [];
        const featureUserCounts = new Map<string, Set<string>>();
        for (const row of featureData as { feature: string; user_id: string }[]) {
          if (!realUserIds.has(row.user_id)) continue;
          if (!featureUserCounts.has(row.feature)) {
            featureUserCounts.set(row.feature, new Set());
          }
          featureUserCounts.get(row.feature)!.add(row.user_id);
        }
        const topActivationFeatures = Array.from(featureUserCounts.entries())
          .map(([feature, users]) => ({ feature, users: users.size }))
          .sort((a, b) => b.users - a.users)
          .slice(0, 6);

        // Time-to-milestones (median calculation)
        // Use auth.users created_at (already fetched above) — no orphan pollution
        const userCreatedMap = new Map<string, string>();
        for (const u of authUsers as { id: string; created_at: string }[]) {
          userCreatedMap.set(u.id, u.created_at);
        }

        // Median time: signup → space creation
        const spaceTimeData = timeToSpaceResult.status === 'fulfilled'
          ? (timeToSpaceResult.value.data ?? []) : [];
        const signupToSpaceHours: number[] = [];
        const seenSpaceUsers = new Set<string>();
        for (const row of spaceTimeData as { user_id: string; joined_at: string }[]) {
          if (seenSpaceUsers.has(row.user_id)) continue;
          seenSpaceUsers.add(row.user_id);
          const createdAt = userCreatedMap.get(row.user_id);
          if (createdAt) {
            const hours = (new Date(row.joined_at).getTime() - new Date(createdAt).getTime()) / 3600000;
            if (hours >= 0 && hours < 8760) signupToSpaceHours.push(hours);
          }
        }

        // Median time: space → first action
        const actionTimeData = timeToActionResult.status === 'fulfilled'
          ? (timeToActionResult.value.data ?? []) : [];
        const spaceToActionHours: number[] = [];
        const seenActionUsers = new Set<string>();
        for (const row of actionTimeData as { user_id: string; created_at: string }[]) {
          if (seenActionUsers.has(row.user_id)) continue;
          seenActionUsers.add(row.user_id);
          const createdAt = userCreatedMap.get(row.user_id);
          if (createdAt) {
            const hours = (new Date(row.created_at).getTime() - new Date(createdAt).getTime()) / 3600000;
            if (hours >= 0 && hours < 8760) spaceToActionHours.push(hours);
          }
        }

        const median = (arr: number[]): number | null => {
          if (arr.length === 0) return null;
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0
            ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10
            : Math.round(sorted[mid] * 10) / 10;
        };

        // Build steps
        const steps: FunnelStep[] = [
          { id: 'signups', label: 'Signed Up', count: totalUsers, color: 'blue', description: 'Created an account' },
          { id: 'space', label: 'Created Space', count: spaceUsers, color: 'purple', description: 'Joined or created a household' },
          { id: 'action', label: 'First Action', count: firstActionUsers, color: 'green', description: 'Used a feature' },
          { id: 'active', label: 'Weekly Active', count: weeklyActiveUsers, color: 'emerald', description: 'Active in last 7 days' },
          { id: 'power', label: 'Power User', count: powerUserCount, color: 'amber', description: '5+ active days this week' },
        ];

        // Conversion rates
        const pct = (num: number, denom: number) => denom > 0 ? Math.round((num / denom) * 100) : 0;

        return {
          steps,
          conversionRates: {
            signupToSpace: pct(spaceUsers, totalUsers),
            spaceToAction: pct(firstActionUsers, spaceUsers),
            actionToActive: pct(weeklyActiveUsers, firstActionUsers),
            activeToPower: pct(powerUserCount, weeklyActiveUsers),
            overallConversion: pct(powerUserCount, totalUsers),
          },
          topActivationFeatures,
          timeToMilestones: {
            medianSignupToSpace: median(signupToSpaceHours),
            medianSpaceToAction: median(spaceToActionHours),
          },
          lastUpdated: new Date().toISOString(),
        };
      },
      { ttl: ADMIN_CACHE_TTL.dashboardStats, skipCache: forceRefresh }
    );

    return NextResponse.json({ success: true, funnel });

  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: '/api/admin/analytics/funnel', method: 'GET' },
    });
    logger.error('[API] /api/admin/analytics/funnel GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 });
  }
}
